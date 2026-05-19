create or replace function public.grant_ai_menu_creation_credits(
  p_user_id uuid,
  p_menu_site_id uuid,
  p_plan_type text,
  p_credits integer
)
returns table (
  granted_credits integer,
  purchased_credits integer,
  used_credits integer,
  remaining_credits integer,
  already_processed boolean
)
language plpgsql
as $$
declare
  v_account_balance public.ai_account_credit_balances%rowtype;
  v_existing_transaction_id uuid;
begin
  if p_credits <= 0 then
    raise exception 'credits must be positive';
  end if;

  insert into public.ai_account_credit_balances (user_id, granted_credits, purchased_credits, used_credits)
  values (p_user_id, 0, 0, 0)
  on conflict (user_id) do nothing;

  select balance.*
    into v_account_balance
    from public.ai_account_credit_balances as balance
    where balance.user_id = p_user_id
    for update;

  select transaction.id
    into v_existing_transaction_id
    from public.ai_credit_transactions as transaction
    where transaction.transaction_type in ('grant', 'included_grant')
      and transaction.menu_site_id = p_menu_site_id
    limit 1;

  if v_existing_transaction_id is not null then
    granted_credits := v_account_balance.granted_credits;
    purchased_credits := v_account_balance.purchased_credits;
    used_credits := v_account_balance.used_credits;
    remaining_credits := greatest(0, v_account_balance.granted_credits + v_account_balance.purchased_credits - v_account_balance.used_credits);
    already_processed := true;
    return next;
    return;
  end if;

  update public.ai_account_credit_balances as balance
    set granted_credits = balance.granted_credits + p_credits,
        updated_at = now()
    where balance.id = v_account_balance.id;

  select balance.*
    into v_account_balance
    from public.ai_account_credit_balances as balance
    where balance.id = v_account_balance.id;

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
    p_user_id,
    p_menu_site_id,
    'grant',
    'granted',
    p_credits,
    greatest(0, v_account_balance.granted_credits + v_account_balance.purchased_credits - v_account_balance.used_credits),
    jsonb_build_object('plan_type', p_plan_type, 'policy', 'account_shared_menu_creation_grant')
  );

  granted_credits := v_account_balance.granted_credits;
  purchased_credits := v_account_balance.purchased_credits;
  used_credits := v_account_balance.used_credits;
  remaining_credits := greatest(0, v_account_balance.granted_credits + v_account_balance.purchased_credits - v_account_balance.used_credits);
  already_processed := false;
  return next;
end;
$$;

create or replace function public.consume_ai_account_credits(
  p_user_id uuid,
  p_menu_site_id uuid,
  p_feature_key text,
  p_credit_cost integer,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  remaining_credits integer,
  used_credits integer,
  credit_source text
)
language plpgsql
as $$
declare
  v_account_balance public.ai_account_credit_balances%rowtype;
  v_available_credits integer;
  v_granted_remaining_before integer;
  v_granted_to_use integer;
  v_purchased_to_use integer;
  v_source text;
begin
  if p_credit_cost <= 0 then
    raise exception 'credit cost must be positive';
  end if;

  insert into public.ai_account_credit_balances (user_id, granted_credits, purchased_credits, used_credits)
  values (p_user_id, 0, 0, 0)
  on conflict (user_id) do nothing;

  select *
    into v_account_balance
    from public.ai_account_credit_balances
    where user_id = p_user_id
    for update;

  v_available_credits := greatest(0, v_account_balance.granted_credits + v_account_balance.purchased_credits - v_account_balance.used_credits);

  if v_available_credits < p_credit_cost then
    return;
  end if;

  v_granted_remaining_before := greatest(0, v_account_balance.granted_credits - v_account_balance.used_credits);
  v_granted_to_use := least(p_credit_cost, v_granted_remaining_before);
  v_purchased_to_use := p_credit_cost - v_granted_to_use;
  v_source := case
    when v_granted_to_use = p_credit_cost then 'granted'
    when v_granted_to_use = 0 then 'purchased'
    else 'mixed'
  end;

  update public.ai_account_credit_balances
    set used_credits = used_credits + p_credit_cost
    where id = v_account_balance.id
    returning * into v_account_balance;

  remaining_credits := greatest(0, v_account_balance.granted_credits + v_account_balance.purchased_credits - v_account_balance.used_credits);
  used_credits := p_credit_cost;
  credit_source := v_source;

  insert into public.ai_credit_transactions (
    user_id,
    menu_site_id,
    transaction_type,
    credit_source,
    feature_key,
    credit_amount,
    balance_after,
    metadata
  )
  values (
    p_user_id,
    p_menu_site_id,
    'usage',
    v_source,
    p_feature_key,
    -p_credit_cost,
    remaining_credits,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'granted_credits_used', v_granted_to_use,
      'purchased_credits_used', v_purchased_to_use
    )
  );

  return next;
end;
$$;

revoke execute on function public.grant_ai_menu_creation_credits(uuid, uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.consume_ai_account_credits(uuid, uuid, text, integer, jsonb) from public, anon, authenticated;

grant execute on function public.grant_ai_menu_creation_credits(uuid, uuid, text, integer) to service_role;
grant execute on function public.consume_ai_account_credits(uuid, uuid, text, integer, jsonb) to service_role;
