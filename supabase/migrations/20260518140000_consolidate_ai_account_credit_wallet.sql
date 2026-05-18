create table if not exists public.ai_account_credit_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  granted_credits integer not null default 0 check (granted_credits >= 0),
  purchased_credits integer not null default 0 check (purchased_credits >= 0),
  used_credits integer not null default 0 check (used_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_account_credit_balances_user_unique unique (user_id)
);

alter table public.ai_account_credit_balances add column if not exists granted_credits integer not null default 0 check (granted_credits >= 0);
alter table public.ai_account_credit_balances add column if not exists purchased_credits integer not null default 0 check (purchased_credits >= 0);
alter table public.ai_account_credit_balances add column if not exists used_credits integer not null default 0 check (used_credits >= 0);
alter table public.ai_account_credit_balances add column if not exists created_at timestamptz not null default now();
alter table public.ai_account_credit_balances add column if not exists updated_at timestamptz not null default now();

create unique index if not exists ai_account_credit_balances_user_unique_idx
  on public.ai_account_credit_balances(user_id);

create table if not exists public.ai_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  menu_site_id uuid references public.menu_sites(id),
  transaction_type text not null,
  credit_source text,
  feature_key text,
  credit_amount integer not null,
  balance_after integer,
  product_key text,
  payment_id text,
  order_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_credit_transactions add column if not exists menu_site_id uuid references public.menu_sites(id);
alter table public.ai_credit_transactions add column if not exists transaction_type text;
alter table public.ai_credit_transactions add column if not exists credit_source text;
alter table public.ai_credit_transactions add column if not exists feature_key text;
alter table public.ai_credit_transactions add column if not exists credit_amount integer;
alter table public.ai_credit_transactions add column if not exists balance_after integer;
alter table public.ai_credit_transactions add column if not exists product_key text;
alter table public.ai_credit_transactions add column if not exists payment_id text;
alter table public.ai_credit_transactions add column if not exists order_id uuid;
alter table public.ai_credit_transactions add column if not exists metadata jsonb;
alter table public.ai_credit_transactions add column if not exists created_at timestamptz not null default now();

create index if not exists ai_account_credit_balances_user_idx on public.ai_account_credit_balances(user_id);
create index if not exists ai_credit_transactions_user_idx on public.ai_credit_transactions(user_id);
create index if not exists ai_credit_transactions_menu_site_idx on public.ai_credit_transactions(menu_site_id);
create unique index if not exists ai_credit_transactions_purchase_payment_unique
  on public.ai_credit_transactions(payment_id)
  where transaction_type = 'purchase' and payment_id is not null;
create or replace function public.set_ai_account_credit_balances_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_ai_account_credit_balances_updated_at') then
    create trigger set_ai_account_credit_balances_updated_at
      before update on public.ai_account_credit_balances
      for each row execute function public.set_ai_account_credit_balances_updated_at();
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_account_credit_balances'
      and column_name = 'used_purchased_credits'
  ) then
    execute '
      update public.ai_account_credit_balances
      set used_credits = greatest(used_credits, coalesce(used_purchased_credits, 0))
      where coalesce(used_purchased_credits, 0) > used_credits
    ';
  end if;

  if to_regclass('public.ai_menu_credit_balances') is not null then
    execute '
      insert into public.ai_account_credit_balances (user_id, granted_credits, purchased_credits, used_credits)
      select user_id, 0, 0, 0
      from public.ai_menu_credit_balances
      group by user_id
      on conflict (user_id) do nothing
    ';

    execute '
      update public.ai_account_credit_balances account_balance
      set granted_credits = greatest(account_balance.granted_credits, menu_grants.total_included_credits),
          used_credits = greatest(
            account_balance.used_credits,
            menu_grants.total_used_included_credits + coalesce(account_balance.used_purchased_credits, 0)
          )
      from (
        select
          user_id,
          sum(coalesce(included_credits, 0))::integer as total_included_credits,
          sum(coalesce(used_included_credits, 0))::integer as total_used_included_credits
        from public.ai_menu_credit_balances
        group by user_id
      ) menu_grants
      where account_balance.user_id = menu_grants.user_id
        and (
          menu_grants.total_included_credits > account_balance.granted_credits
          or menu_grants.total_used_included_credits > 0
        )
    ';
  end if;

  if to_regclass('public.ai_credit_balances') is not null then
    execute '
      insert into public.ai_account_credit_balances (user_id, granted_credits, purchased_credits, used_credits)
      select user_id, 0, 0, 0
      from public.ai_credit_balances
      group by user_id
      on conflict (user_id) do nothing
    ';

    execute '
      update public.ai_account_credit_balances account_balance
      set granted_credits = greatest(account_balance.granted_credits, legacy_balances.total_included_credits),
          purchased_credits = greatest(account_balance.purchased_credits, legacy_balances.total_purchased_credits),
          used_credits = greatest(account_balance.used_credits, legacy_balances.total_used_credits)
      from (
        select
          user_id,
          sum(coalesce(included_credits, 0))::integer as total_included_credits,
          sum(coalesce(purchased_credits, 0))::integer as total_purchased_credits,
          sum(coalesce(used_credits, 0))::integer as total_used_credits
        from public.ai_credit_balances
        group by user_id
      ) legacy_balances
      where account_balance.user_id = legacy_balances.user_id
        and (
          legacy_balances.total_included_credits > account_balance.granted_credits
          or legacy_balances.total_purchased_credits > account_balance.purchased_credits
          or legacy_balances.total_used_credits > account_balance.used_credits
        )
    ';
  end if;
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
    'included_grant',
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

  update public.ai_account_credit_balances
    set purchased_credits = purchased_credits + p_credits
    where id = v_account_balance.id
    returning * into v_account_balance;

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
  v_source := case
    when v_granted_remaining_before >= p_credit_cost then 'granted'
    when v_granted_remaining_before <= 0 then 'purchased'
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
    coalesce(p_metadata, '{}'::jsonb)
  );

  return next;
end;
$$;

alter table public.ai_account_credit_balances enable row level security;
alter table public.ai_credit_transactions enable row level security;

revoke all on public.ai_account_credit_balances from anon, authenticated;
revoke all on public.ai_credit_transactions from anon, authenticated;

grant select on public.ai_account_credit_balances to authenticated;
grant select on public.ai_credit_transactions to authenticated;

grant select, insert, update on public.ai_account_credit_balances to service_role;
grant select, insert, update on public.ai_credit_transactions to service_role;

revoke execute on function public.set_ai_account_credit_balances_updated_at() from public, anon, authenticated;
revoke execute on function public.grant_ai_menu_creation_credits(uuid, uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.grant_ai_account_credits(uuid, uuid, text, text, uuid, integer) from public, anon, authenticated;
revoke execute on function public.consume_ai_account_credits(uuid, uuid, text, integer, jsonb) from public, anon, authenticated;

grant execute on function public.grant_ai_menu_creation_credits(uuid, uuid, text, integer) to service_role;
grant execute on function public.grant_ai_account_credits(uuid, uuid, text, text, uuid, integer) to service_role;
grant execute on function public.consume_ai_account_credits(uuid, uuid, text, integer, jsonb) to service_role;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_account_credit_balances' and policyname = 'ai_account_credit_balances owner select') then
    create policy "ai_account_credit_balances owner select"
      on public.ai_account_credit_balances for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_account_credit_balances' and policyname = 'ai_account_credit_balances service role all') then
    create policy "ai_account_credit_balances service role all"
      on public.ai_account_credit_balances for all to service_role
      using (true)
      with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_credit_transactions' and policyname = 'ai_credit_transactions owner select') then
    create policy "ai_credit_transactions owner select"
      on public.ai_credit_transactions for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_credit_transactions' and policyname = 'ai_credit_transactions service role all') then
    create policy "ai_credit_transactions service role all"
      on public.ai_credit_transactions for all to service_role
      using (true)
      with check (true);
  end if;
end $$;
