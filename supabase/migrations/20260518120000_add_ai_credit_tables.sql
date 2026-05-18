grant usage on schema public to anon, authenticated;

create table if not exists public.ai_credit_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  included_credits integer not null default 0 check (included_credits >= 0),
  purchased_credits integer not null default 0 check (purchased_credits >= 0),
  used_credits integer not null default 0 check (used_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_credit_balances_menu_site_unique unique (menu_site_id)
);

create table if not exists public.ai_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('included_grant', 'purchase', 'usage', 'adjustment', 'refund')),
  feature_key text check (feature_key is null or feature_key in ('description_write', 'partial_translation', 'menu_cleanup', 'full_translation')),
  credit_amount integer not null,
  balance_after integer,
  product_key text,
  payment_id text,
  order_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_credit_balances_user_idx on public.ai_credit_balances(user_id);
create index if not exists ai_credit_transactions_menu_site_created_idx on public.ai_credit_transactions(menu_site_id, created_at desc);
create index if not exists ai_credit_transactions_user_created_idx on public.ai_credit_transactions(user_id, created_at desc);
create unique index if not exists ai_credit_transactions_payment_purchase_unique
  on public.ai_credit_transactions(payment_id)
  where transaction_type = 'purchase' and payment_id is not null;

create or replace function public.set_ai_credit_balances_updated_at()
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
  if not exists (select 1 from pg_trigger where tgname = 'set_ai_credit_balances_updated_at') then
    create trigger set_ai_credit_balances_updated_at
      before update on public.ai_credit_balances
      for each row execute function public.set_ai_credit_balances_updated_at();
  end if;
end $$;

create or replace function public.consume_ai_credits(
  p_user_id uuid,
  p_menu_site_id uuid,
  p_feature_key text,
  p_credit_cost integer,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  balance_id uuid,
  included_credits integer,
  purchased_credits integer,
  used_credits integer,
  total_credits integer,
  remaining_credits integer
)
language plpgsql
as $$
declare
  v_balance public.ai_credit_balances%rowtype;
  v_balance_after integer;
begin
  if p_credit_cost <= 0 then
    raise exception 'credit cost must be positive';
  end if;

  if p_feature_key not in ('description_write', 'partial_translation', 'menu_cleanup', 'full_translation') then
    raise exception 'unsupported AI feature key';
  end if;

  update public.ai_credit_balances
  set used_credits = used_credits + p_credit_cost
  where user_id = p_user_id
    and menu_site_id = p_menu_site_id
    and included_credits + purchased_credits - used_credits >= p_credit_cost
  returning * into v_balance;

  if not found then
    return;
  end if;

  v_balance_after := v_balance.included_credits + v_balance.purchased_credits - v_balance.used_credits;

  insert into public.ai_credit_transactions (
    user_id,
    menu_site_id,
    transaction_type,
    feature_key,
    credit_amount,
    balance_after,
    metadata
  ) values (
    p_user_id,
    p_menu_site_id,
    'usage',
    p_feature_key,
    -p_credit_cost,
    v_balance_after,
    p_metadata
  );

  return query
  select
    v_balance.id,
    v_balance.included_credits,
    v_balance.purchased_credits,
    v_balance.used_credits,
    v_balance.included_credits + v_balance.purchased_credits,
    v_balance_after;
end;
$$;

alter table public.ai_credit_balances enable row level security;
alter table public.ai_credit_transactions enable row level security;

revoke all on public.ai_credit_balances from anon, authenticated;
revoke all on public.ai_credit_transactions from anon, authenticated;
grant select on public.ai_credit_balances to authenticated;
grant select on public.ai_credit_transactions to authenticated;
grant select, insert, update on public.ai_credit_balances to service_role;
grant select, insert, update on public.ai_credit_transactions to service_role;
revoke execute on function public.set_ai_credit_balances_updated_at() from public, anon, authenticated;
revoke execute on function public.consume_ai_credits(uuid, uuid, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.consume_ai_credits(uuid, uuid, text, integer, jsonb) to service_role;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_credit_balances' and policyname = 'ai_credit_balances owner select') then
    create policy "ai_credit_balances owner select"
      on public.ai_credit_balances for select to authenticated
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.menu_sites
          where menu_sites.id = ai_credit_balances.menu_site_id
            and menu_sites.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_credit_balances' and policyname = 'ai_credit_balances service role all') then
    create policy "ai_credit_balances service role all"
      on public.ai_credit_balances for all to service_role
      using (true)
      with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_credit_transactions' and policyname = 'ai_credit_transactions owner select') then
    create policy "ai_credit_transactions owner select"
      on public.ai_credit_transactions for select to authenticated
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.menu_sites
          where menu_sites.id = ai_credit_transactions.menu_site_id
            and menu_sites.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_credit_transactions' and policyname = 'ai_credit_transactions service role all') then
    create policy "ai_credit_transactions service role all"
      on public.ai_credit_transactions for all to service_role
      using (true)
      with check (true);
  end if;
end $$;
