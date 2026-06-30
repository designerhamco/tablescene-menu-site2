alter table public.ai_credit_transactions
  add column if not exists business_subscription_id uuid references public.business_subscriptions(id) on delete set null;

create index if not exists ai_credit_transactions_business_subscription_idx
  on public.ai_credit_transactions(business_subscription_id)
  where business_subscription_id is not null;

create unique index if not exists ai_credit_transactions_subscription_included_grant_unique
  on public.ai_credit_transactions(business_subscription_id)
  where transaction_type = 'included_grant'
    and business_subscription_id is not null;

create unique index if not exists ai_credit_transactions_payment_included_grant_unique
  on public.ai_credit_transactions(payment_id)
  where transaction_type = 'included_grant'
    and payment_id is not null;

create or replace function public.grant_ai_subscription_included_credits(
  p_user_id uuid,
  p_menu_site_id uuid,
  p_business_subscription_id uuid,
  p_payment_id text,
  p_plan_type text,
  p_product_key text,
  p_credits integer,
  p_reason text default 'subscription_included_grant',
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  transaction_id uuid,
  granted_credits integer,
  purchased_credits integer,
  used_credits integer,
  remaining_credits integer,
  credited_amount integer,
  already_processed boolean
)
language plpgsql
as $$
declare
  v_account_balance public.ai_account_credit_balances%rowtype;
  v_existing_transaction public.ai_credit_transactions%rowtype;
  v_payment_id text := nullif(btrim(coalesce(p_payment_id, '')), '');
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_idempotency_key text;
  v_remaining_credits integer;
begin
  if p_credits <= 0 then
    raise exception 'credits must be positive';
  end if;

  if p_business_subscription_id is null and v_payment_id is null then
    raise exception 'business_subscription_id or payment_id is required';
  end if;

  if nullif(btrim(coalesce(p_plan_type, '')), '') is null then
    raise exception 'plan_type is required';
  end if;

  if nullif(btrim(coalesce(p_product_key, '')), '') is null then
    raise exception 'product_key is required';
  end if;

  v_idempotency_key := coalesce(p_business_subscription_id::text, v_payment_id);
  perform pg_advisory_xact_lock(hashtext('ai_subscription_included_grant'), hashtext(v_idempotency_key));

  insert into public.ai_account_credit_balances (user_id, granted_credits, purchased_credits, used_credits)
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
    where transaction.transaction_type = 'included_grant'
      and (
        (p_business_subscription_id is not null and transaction.business_subscription_id = p_business_subscription_id)
        or (v_payment_id is not null and transaction.payment_id = v_payment_id)
      )
    limit 1;

  v_remaining_credits := greatest(
    0,
    v_account_balance.granted_credits + v_account_balance.purchased_credits - v_account_balance.used_credits
  );

  if v_existing_transaction.id is not null then
    transaction_id := v_existing_transaction.id;
    granted_credits := v_account_balance.granted_credits;
    purchased_credits := v_account_balance.purchased_credits;
    used_credits := v_account_balance.used_credits;
    remaining_credits := v_remaining_credits;
    credited_amount := greatest(0, v_existing_transaction.credit_amount);
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
    business_subscription_id,
    transaction_type,
    credit_source,
    credit_amount,
    balance_after,
    account_balance_after,
    menu_balance_after,
    included_credits_used,
    purchased_credits_used,
    product_key,
    payment_id,
    metadata
  )
  values (
    p_user_id,
    p_menu_site_id,
    p_business_subscription_id,
    'included_grant',
    'granted',
    p_credits,
    v_remaining_credits,
    v_remaining_credits,
    0,
    0,
    0,
    p_product_key,
    v_payment_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'policy', 'account_shared_subscription_included_grant',
      'reason', coalesce(v_reason, 'subscription_included_grant'),
      'restore_menu_site_id', p_menu_site_id,
      'plan_type', p_plan_type,
      'product_key', p_product_key,
      'business_subscription_id', p_business_subscription_id,
      'payment_id', v_payment_id
    )
  )
  returning id into transaction_id;

  granted_credits := v_account_balance.granted_credits;
  purchased_credits := v_account_balance.purchased_credits;
  used_credits := v_account_balance.used_credits;
  remaining_credits := v_remaining_credits;
  credited_amount := p_credits;
  already_processed := false;
  return next;
end;
$$;

revoke execute on function public.grant_ai_subscription_included_credits(uuid, uuid, uuid, text, text, text, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.grant_ai_subscription_included_credits(uuid, uuid, uuid, text, text, text, integer, text, jsonb) to service_role;

comment on function public.grant_ai_subscription_included_credits(uuid, uuid, uuid, text, text, text, integer, text, jsonb)
  is 'Grants included AI credits for a paid subscription once per business_subscription_id or payment_id.';

notify pgrst, 'reload schema';
