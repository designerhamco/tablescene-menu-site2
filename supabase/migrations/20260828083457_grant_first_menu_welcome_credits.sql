create unique index if not exists ai_credit_transactions_first_menu_welcome_user_unique
  on public.ai_credit_transactions(user_id)
  where transaction_type = 'grant'
    and credit_source = 'granted'
    and metadata ->> 'policy' = 'account_first_menu_welcome_grant';

create or replace function public.grant_ai_first_menu_welcome_credits(
  p_user_id uuid,
  p_menu_site_id uuid
)
returns table (
  transaction_id uuid,
  granted_credits integer,
  purchased_credits integer,
  used_credits integer,
  remaining_credits integer,
  credited_amount integer,
  already_processed boolean,
  skipped_reason text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_account_balance public.ai_account_credit_balances%rowtype;
  v_existing_transaction public.ai_credit_transactions%rowtype;
  v_menu_site_created_at timestamptz;
  v_remaining_credits integer;
  v_welcome_credits constant integer := 6;
begin
  if p_user_id is null or p_menu_site_id is null then
    raise exception 'user_id and menu_site_id are required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('ai_first_menu_welcome_grant'),
    pg_catalog.hashtext(p_user_id::text)
  );

  select menu_site.created_at
    into v_menu_site_created_at
    from public.menu_sites as menu_site
    where menu_site.id = p_menu_site_id
      and menu_site.user_id = p_user_id;

  if v_menu_site_created_at is null then
    raise exception 'menu site ownership does not match';
  end if;

  insert into public.ai_account_credit_balances (
    user_id,
    granted_credits,
    purchased_credits,
    used_credits
  )
  values (p_user_id, 0, 0, 0)
  on conflict (user_id) do nothing;

  select account_balance.*
    into v_account_balance
    from public.ai_account_credit_balances as account_balance
    where account_balance.user_id = p_user_id
    for update;

  select transaction.*
    into v_existing_transaction
    from public.ai_credit_transactions as transaction
    where transaction.user_id = p_user_id
      and transaction.transaction_type in ('grant', 'included_grant')
      and transaction.credit_amount > 0
    order by transaction.created_at asc, transaction.id asc
    limit 1;

  v_remaining_credits := greatest(
    0,
    v_account_balance.granted_credits
      + v_account_balance.purchased_credits
      - v_account_balance.used_credits
  );

  if v_existing_transaction.id is not null then
    transaction_id := v_existing_transaction.id;
    granted_credits := v_account_balance.granted_credits;
    purchased_credits := v_account_balance.purchased_credits;
    used_credits := v_account_balance.used_credits;
    remaining_credits := v_remaining_credits;
    credited_amount := 0;
    already_processed := true;
    skipped_reason := 'existing_lifetime_grant';
    return next;
    return;
  end if;

  if exists (
    select 1
    from public.menu_sites as other_menu_site
    where other_menu_site.user_id = p_user_id
      and (
        other_menu_site.created_at < v_menu_site_created_at
        or (
          other_menu_site.created_at = v_menu_site_created_at
          and other_menu_site.id < p_menu_site_id
        )
      )
  ) then
    transaction_id := null;
    granted_credits := v_account_balance.granted_credits;
    purchased_credits := v_account_balance.purchased_credits;
    used_credits := v_account_balance.used_credits;
    remaining_credits := v_remaining_credits;
    credited_amount := 0;
    already_processed := true;
    skipped_reason := 'not_first_menu';
    return next;
    return;
  end if;

  update public.ai_account_credit_balances as account_balance
    set granted_credits = account_balance.granted_credits + v_welcome_credits,
        updated_at = pg_catalog.now()
    where account_balance.id = v_account_balance.id
    returning account_balance.* into v_account_balance;

  v_remaining_credits := greatest(
    0,
    v_account_balance.granted_credits
      + v_account_balance.purchased_credits
      - v_account_balance.used_credits
  );

  insert into public.ai_credit_transactions (
    user_id,
    menu_site_id,
    transaction_type,
    credit_source,
    credit_amount,
    balance_after,
    account_balance_after,
    menu_balance_after,
    included_credits_used,
    purchased_credits_used,
    metadata
  )
  values (
    p_user_id,
    p_menu_site_id,
    'grant',
    'granted',
    v_welcome_credits,
    v_remaining_credits,
    v_remaining_credits,
    0,
    0,
    0,
    pg_catalog.jsonb_build_object(
      'policy', 'account_first_menu_welcome_grant',
      'reason', 'first_menu_creation_succeeded',
      'welcome_credits', v_welcome_credits
    )
  )
  returning id into transaction_id;

  granted_credits := v_account_balance.granted_credits;
  purchased_credits := v_account_balance.purchased_credits;
  used_credits := v_account_balance.used_credits;
  remaining_credits := v_remaining_credits;
  credited_amount := v_welcome_credits;
  already_processed := false;
  skipped_reason := null;
  return next;
end;
$$;

revoke execute on function public.grant_ai_first_menu_welcome_credits(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.grant_ai_first_menu_welcome_credits(uuid, uuid)
  to service_role;

comment on function public.grant_ai_first_menu_welcome_credits(uuid, uuid)
  is 'Grants six lifetime welcome AI credits only after the account first menu creation succeeds.';

notify pgrst, 'reload schema';
