do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ai_credit_transactions'::regclass
      and conname = 'ai_credit_transactions_transaction_type_check'
  ) then
    alter table public.ai_credit_transactions
      drop constraint ai_credit_transactions_transaction_type_check;
  end if;

  alter table public.ai_credit_transactions
    add constraint ai_credit_transactions_transaction_type_check
    check (transaction_type in ('grant', 'included_grant', 'usage', 'purchase', 'expiration', 'adjustment'));
end $$;

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
  v_remaining_credits integer;
begin
  if p_credits <= 0 then
    raise exception 'credits must be positive';
  end if;

  select transaction.id
    into v_existing_transaction_id
    from public.ai_credit_transactions as transaction
    where transaction.transaction_type in ('grant', 'included_grant')
      and transaction.menu_site_id = p_menu_site_id
    limit 1;

  insert into public.ai_account_credit_balances (user_id, granted_credits, purchased_credits, used_credits)
  values (p_user_id, 0, 0, 0)
  on conflict (user_id) do nothing;

  select account_balance.*
    into v_account_balance
    from public.ai_account_credit_balances as account_balance
    where account_balance.user_id = p_user_id
    for update;

  v_remaining_credits := greatest(
    0,
    v_account_balance.granted_credits + v_account_balance.purchased_credits - v_account_balance.used_credits
  );

  if v_existing_transaction_id is not null then
    granted_credits := v_account_balance.granted_credits;
    purchased_credits := v_account_balance.purchased_credits;
    used_credits := v_account_balance.used_credits;
    remaining_credits := v_remaining_credits;
    already_processed := true;
    return next;
    return;
  end if;

  update public.ai_account_credit_balances as account_balance
    set granted_credits = account_balance.granted_credits + p_credits,
        updated_at = now()
    where account_balance.id = v_account_balance.id
    returning account_balance.* into v_account_balance;

  v_remaining_credits := greatest(
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
    p_credits,
    v_remaining_credits,
    v_remaining_credits,
    0,
    0,
    0,
    jsonb_build_object('plan_type', p_plan_type, 'policy', 'account_shared_menu_creation_grant')
  );

  granted_credits := v_account_balance.granted_credits;
  purchased_credits := v_account_balance.purchased_credits;
  used_credits := v_account_balance.used_credits;
  remaining_credits := v_remaining_credits;
  already_processed := false;
  return next;
end;
$$;

revoke execute on function public.grant_ai_menu_creation_credits(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.grant_ai_menu_creation_credits(uuid, uuid, text, integer) to service_role;

notify pgrst, 'reload schema';
