create table if not exists public.ai_menu_credit_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  included_credits integer not null default 0 check (included_credits >= 0),
  used_included_credits integer not null default 0 check (used_included_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_menu_credit_balances_menu_site_unique unique (menu_site_id)
);

create table if not exists public.ai_account_credit_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purchased_credits integer not null default 0 check (purchased_credits >= 0),
  used_purchased_credits integer not null default 0 check (used_purchased_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_account_credit_balances_user_unique unique (user_id)
);

create table if not exists public.ai_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_site_id uuid references public.menu_sites(id) on delete set null,
  transaction_type text not null,
  feature_key text,
  credit_amount integer not null,
  product_key text,
  payment_id text,
  order_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_credit_transactions add column if not exists credit_source text;
alter table public.ai_credit_transactions add column if not exists included_credits_used integer not null default 0;
alter table public.ai_credit_transactions add column if not exists purchased_credits_used integer not null default 0;
alter table public.ai_credit_transactions add column if not exists account_balance_after integer;
alter table public.ai_credit_transactions add column if not exists menu_balance_after integer;
alter table public.ai_credit_transactions add column if not exists balance_after integer;

create index if not exists ai_menu_credit_balances_user_idx on public.ai_menu_credit_balances(user_id);
create index if not exists ai_account_credit_balances_user_idx on public.ai_account_credit_balances(user_id);
create index if not exists ai_credit_transactions_user_idx on public.ai_credit_transactions(user_id);
create index if not exists ai_credit_transactions_menu_site_idx on public.ai_credit_transactions(menu_site_id);
create unique index if not exists ai_credit_transactions_purchase_payment_unique
  on public.ai_credit_transactions(payment_id)
  where transaction_type = 'purchase' and payment_id is not null;

create or replace function public.set_ai_menu_credit_balances_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
  if not exists (select 1 from pg_trigger where tgname = 'set_ai_menu_credit_balances_updated_at') then
    create trigger set_ai_menu_credit_balances_updated_at
      before update on public.ai_menu_credit_balances
      for each row execute function public.set_ai_menu_credit_balances_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_ai_account_credit_balances_updated_at') then
    create trigger set_ai_account_credit_balances_updated_at
      before update on public.ai_account_credit_balances
      for each row execute function public.set_ai_account_credit_balances_updated_at();
  end if;
end $$;

create or replace function public.consume_ai_credits_v2(
  p_user_id uuid,
  p_menu_site_id uuid,
  p_feature_key text,
  p_credit_cost integer,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  menu_remaining_credits integer,
  account_remaining_credits integer,
  total_remaining_credits integer,
  total_used_credits integer,
  included_credits_used integer,
  purchased_credits_used integer
)
language plpgsql
as $$
declare
  v_menu_balance public.ai_menu_credit_balances%rowtype;
  v_account_balance public.ai_account_credit_balances%rowtype;
  v_menu_remaining integer;
  v_account_remaining integer;
  v_included_to_use integer;
  v_purchased_to_use integer;
  v_credit_source text;
begin
  if p_credit_cost <= 0 then
    raise exception 'credit cost must be positive';
  end if;

  select *
    into v_menu_balance
    from public.ai_menu_credit_balances
    where user_id = p_user_id and menu_site_id = p_menu_site_id
    for update;

  if not found then
    return;
  end if;

  insert into public.ai_account_credit_balances (user_id, purchased_credits, used_purchased_credits)
  values (p_user_id, 0, 0)
  on conflict (user_id) do nothing;

  select *
    into v_account_balance
    from public.ai_account_credit_balances
    where user_id = p_user_id
    for update;

  v_menu_remaining := greatest(0, coalesce(v_menu_balance.included_credits, 0) - coalesce(v_menu_balance.used_included_credits, 0));
  v_account_remaining := greatest(0, coalesce(v_account_balance.purchased_credits, 0) - coalesce(v_account_balance.used_purchased_credits, 0));

  if v_menu_remaining + v_account_remaining < p_credit_cost then
    return;
  end if;

  v_included_to_use := least(v_menu_remaining, p_credit_cost);
  v_purchased_to_use := p_credit_cost - v_included_to_use;

  update public.ai_menu_credit_balances
    set used_included_credits = used_included_credits + v_included_to_use
    where id = v_menu_balance.id
    returning * into v_menu_balance;

  if v_purchased_to_use > 0 then
    update public.ai_account_credit_balances
      set used_purchased_credits = used_purchased_credits + v_purchased_to_use
      where id = v_account_balance.id
      returning * into v_account_balance;
  end if;

  v_menu_remaining := greatest(0, v_menu_balance.included_credits - v_menu_balance.used_included_credits);
  v_account_remaining := greatest(0, v_account_balance.purchased_credits - v_account_balance.used_purchased_credits);
  v_credit_source := case
    when v_included_to_use > 0 and v_purchased_to_use > 0 then 'mixed'
    when v_purchased_to_use > 0 then 'purchased'
    else 'included'
  end;

  insert into public.ai_credit_transactions (
    user_id,
    menu_site_id,
    transaction_type,
    credit_source,
    feature_key,
    credit_amount,
    included_credits_used,
    purchased_credits_used,
    account_balance_after,
    menu_balance_after,
    metadata
  )
  values (
    p_user_id,
    p_menu_site_id,
    'usage',
    v_credit_source,
    p_feature_key,
    -p_credit_cost,
    v_included_to_use,
    v_purchased_to_use,
    v_account_remaining,
    v_menu_remaining,
    coalesce(p_metadata, '{}'::jsonb)
  );

  menu_remaining_credits := v_menu_remaining;
  account_remaining_credits := v_account_remaining;
  total_remaining_credits := v_menu_remaining + v_account_remaining;
  total_used_credits := v_menu_balance.used_included_credits + v_account_balance.used_purchased_credits;
  included_credits_used := v_included_to_use;
  purchased_credits_used := v_purchased_to_use;
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
  v_existing_transaction public.ai_credit_transactions%rowtype;
begin
  if p_credits <= 0 then
    raise exception 'credits must be positive';
  end if;

  select *
    into v_existing_transaction
    from public.ai_credit_transactions
    where transaction_type = 'purchase' and payment_id = p_payment_id
    limit 1;

  insert into public.ai_account_credit_balances (user_id, purchased_credits, used_purchased_credits)
  values (p_user_id, 0, 0)
  on conflict (user_id) do nothing;

  select *
    into v_account_balance
    from public.ai_account_credit_balances
    where user_id = p_user_id
    for update;

  if found and v_existing_transaction.id is not null then
    purchased_credits := v_account_balance.purchased_credits;
    used_purchased_credits := v_account_balance.used_purchased_credits;
    account_remaining_credits := greatest(0, v_account_balance.purchased_credits - v_account_balance.used_purchased_credits);
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
    included_credits_used,
    purchased_credits_used,
    account_balance_after,
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
    0,
    0,
    greatest(0, v_account_balance.purchased_credits - v_account_balance.used_purchased_credits),
    p_product_key,
    p_payment_id,
    p_order_id,
    jsonb_build_object('policy', 'account_shared_ai_credits')
  );

  purchased_credits := v_account_balance.purchased_credits;
  used_purchased_credits := v_account_balance.used_purchased_credits;
  account_remaining_credits := greatest(0, v_account_balance.purchased_credits - v_account_balance.used_purchased_credits);
  already_processed := false;
  return next;
end;
$$;

alter table public.ai_menu_credit_balances enable row level security;
alter table public.ai_account_credit_balances enable row level security;
alter table public.ai_credit_transactions enable row level security;

revoke all on public.ai_menu_credit_balances from anon, authenticated;
revoke all on public.ai_account_credit_balances from anon, authenticated;
revoke all on public.ai_credit_transactions from anon, authenticated;

grant select on public.ai_menu_credit_balances to authenticated;
grant select on public.ai_account_credit_balances to authenticated;
grant select on public.ai_credit_transactions to authenticated;

grant select, insert, update on public.ai_menu_credit_balances to service_role;
grant select, insert, update on public.ai_account_credit_balances to service_role;
grant select, insert, update on public.ai_credit_transactions to service_role;

revoke execute on function public.set_ai_menu_credit_balances_updated_at() from public, anon, authenticated;
revoke execute on function public.set_ai_account_credit_balances_updated_at() from public, anon, authenticated;
revoke execute on function public.consume_ai_credits_v2(uuid, uuid, text, integer, jsonb) from public, anon, authenticated;
revoke execute on function public.grant_ai_account_credits(uuid, uuid, text, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_credits_v2(uuid, uuid, text, integer, jsonb) to service_role;
grant execute on function public.grant_ai_account_credits(uuid, uuid, text, text, uuid, integer) to service_role;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_menu_credit_balances' and policyname = 'ai_menu_credit_balances owner select') then
    create policy "ai_menu_credit_balances owner select"
      on public.ai_menu_credit_balances for select to authenticated
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.menu_sites
          where menu_sites.id = ai_menu_credit_balances.menu_site_id
            and menu_sites.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_menu_credit_balances' and policyname = 'ai_menu_credit_balances service role all') then
    create policy "ai_menu_credit_balances service role all"
      on public.ai_menu_credit_balances for all to service_role
      using (true)
      with check (true);
  end if;

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
