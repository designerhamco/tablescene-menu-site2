create or replace function public.expire_personal_trial_unused_grant_credits(
  p_menu_site_id uuid,
  p_reason text default 'personal_trial_retention_expired'
)
returns table (
  reclaimed_credits integer,
  already_processed boolean,
  skipped_reason text
)
language plpgsql
as $$
declare
  v_user_id uuid;
  v_account_balance public.ai_account_credit_balances%rowtype;
  v_grant_credits integer := 0;
  v_used_credits_for_menu_site integer := 0;
  v_used_grant_credits integer := 0;
  v_unused_grant_credits integer := 0;
  v_reclaimable_credits integer := 0;
  v_balance_after integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext(p_menu_site_id::text));

  if exists (
    select 1
    from public.service_entitlements
    where menu_site_id = p_menu_site_id
      and plan_type in ('business_basic', 'business_display')
      and status = 'active'
    limit 1
  ) then
    reclaimed_credits := 0;
    already_processed := false;
    skipped_reason := 'business_converted';
    return next;
    return;
  end if;

  if exists (
    select 1
    from public.ai_credit_transactions
    where menu_site_id = p_menu_site_id
      and transaction_type = 'expiration'
      and metadata @> jsonb_build_object('reason', p_reason)
    limit 1
  ) then
    reclaimed_credits := 0;
    already_processed := true;
    skipped_reason := 'already_reclaimed';
    return next;
    return;
  end if;

  select user_id
    into v_user_id
    from public.ai_credit_transactions
    where menu_site_id = p_menu_site_id
      and transaction_type in ('grant', 'included_grant')
      and credit_amount > 0
      and (
        product_key = 'personal_trial_basic_1month'
        or metadata ->> 'plan_type' = 'personal_trial'
        or metadata ->> 'reason' = 'personal_trial_created'
      )
    order by created_at asc
    limit 1;

  select coalesce(sum(greatest(0, credit_amount)), 0)::integer
    into v_grant_credits
    from public.ai_credit_transactions
    where menu_site_id = p_menu_site_id
      and transaction_type in ('grant', 'included_grant')
      and credit_amount > 0
      and (
        product_key = 'personal_trial_basic_1month'
        or metadata ->> 'plan_type' = 'personal_trial'
        or metadata ->> 'reason' = 'personal_trial_created'
      );

  if v_user_id is null or v_grant_credits <= 0 then
    reclaimed_credits := 0;
    already_processed := false;
    skipped_reason := 'no_personal_trial_grant';
    return next;
    return;
  end if;

  select coalesce(sum(
      case
        when metadata ? 'granted_credits_used'
          and (metadata ->> 'granted_credits_used') ~ '^[0-9]+$'
          then (metadata ->> 'granted_credits_used')::integer
        else abs(least(0, credit_amount))
      end
    ), 0)::integer
    into v_used_credits_for_menu_site
    from public.ai_credit_transactions
    where menu_site_id = p_menu_site_id
      and transaction_type = 'usage';

  v_used_grant_credits := least(v_grant_credits, v_used_credits_for_menu_site);
  v_unused_grant_credits := greatest(0, v_grant_credits - v_used_grant_credits);

  if v_unused_grant_credits <= 0 then
    reclaimed_credits := 0;
    already_processed := false;
    skipped_reason := 'no_unused_grant';
    return next;
    return;
  end if;

  insert into public.ai_account_credit_balances (user_id, granted_credits, purchased_credits, used_credits)
  values (v_user_id, 0, 0, 0)
  on conflict (user_id) do nothing;

  select *
    into v_account_balance
    from public.ai_account_credit_balances
    where user_id = v_user_id
    for update;

  v_reclaimable_credits := least(v_unused_grant_credits, greatest(0, v_account_balance.granted_credits));

  if v_reclaimable_credits <= 0 then
    reclaimed_credits := 0;
    already_processed := false;
    skipped_reason := 'no_granted_balance';
    return next;
    return;
  end if;

  update public.ai_account_credit_balances
    set granted_credits = greatest(0, granted_credits - v_reclaimable_credits)
    where id = v_account_balance.id
    returning * into v_account_balance;

  v_balance_after := greatest(
    0,
    v_account_balance.granted_credits + v_account_balance.purchased_credits - v_account_balance.used_credits
  );

  insert into public.ai_credit_transactions (
    user_id,
    menu_site_id,
    transaction_type,
    credit_source,
    credit_amount,
    balance_after,
    metadata
  )
  values (
    v_user_id,
    p_menu_site_id,
    'expiration',
    'granted',
    -v_reclaimable_credits,
    v_balance_after,
    jsonb_build_object(
      'reason', p_reason,
      'policy', 'personal_trial_unused_grant_reclaim',
      'grant_credits', v_grant_credits,
      'used_grant_credits', v_used_grant_credits,
      'unused_grant_credits', v_unused_grant_credits
    )
  );

  reclaimed_credits := v_reclaimable_credits;
  already_processed := false;
  skipped_reason := null;
  return next;
end;
$$;

revoke execute on function public.expire_personal_trial_unused_grant_credits(uuid, text) from public, anon, authenticated;
grant execute on function public.expire_personal_trial_unused_grant_credits(uuid, text) to service_role;
