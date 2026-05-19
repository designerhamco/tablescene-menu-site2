create or replace function public.grant_ai_account_credits(
  p_user_id uuid,
  p_context_menu_site_id uuid,
  p_product_key text,
  p_payment_id text,
  p_order_id uuid,
  p_credits integer
)
returns table (
  purchased_credits integer,
  used_purchased_credits integer,
  account_remaining_credits integer,
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

  select id
    into v_existing_transaction_id
    from public.ai_credit_transactions
    where transaction_type = 'purchase'
      and payment_id = p_payment_id
    limit 1;

  insert into public.ai_account_credit_balances (user_id, granted_credits, purchased_credits, used_credits)
  values (p_user_id, 0, 0, 0)
  on conflict (user_id) do nothing;

  select *
    into v_account_balance
    from public.ai_account_credit_balances
    where user_id = p_user_id
    for update;

  if v_existing_transaction_id is not null then
    purchased_credits := v_account_balance.purchased_credits;
    used_purchased_credits := v_account_balance.used_credits;
    account_remaining_credits := greatest(0, v_account_balance.granted_credits + v_account_balance.purchased_credits - v_account_balance.used_credits);
    already_processed := true;
    return next;
    return;
  end if;

  update public.ai_account_credit_balances as account_balance
    set purchased_credits = account_balance.purchased_credits + p_credits
    where account_balance.id = v_account_balance.id
    returning account_balance.* into v_account_balance;

  insert into public.ai_credit_transactions (
    user_id,
    menu_site_id,
    transaction_type,
    credit_source,
    credit_amount,
    balance_after,
    product_key,
    payment_id,
    order_id,
    metadata
  )
  values (
    p_user_id,
    p_context_menu_site_id,
    'purchase',
    'purchased',
    p_credits,
    greatest(0, v_account_balance.granted_credits + v_account_balance.purchased_credits - v_account_balance.used_credits),
    p_product_key,
    p_payment_id,
    p_order_id,
    jsonb_build_object('policy', 'account_shared_ai_credits')
  );

  purchased_credits := v_account_balance.purchased_credits;
  used_purchased_credits := v_account_balance.used_credits;
  account_remaining_credits := greatest(0, v_account_balance.granted_credits + v_account_balance.purchased_credits - v_account_balance.used_credits);
  already_processed := false;
  return next;
end;
$$;

revoke execute on function public.grant_ai_account_credits(uuid, uuid, text, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.grant_ai_account_credits(uuid, uuid, text, text, uuid, integer) to service_role;
