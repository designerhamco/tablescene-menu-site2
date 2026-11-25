begin;
set local lock_timeout='5s';

-- A separate won wallet for each merchant account. Never touches AI credits.
-- Commercial activation is deliberately separate from deploying the ledger.
create table public.alimtalk_billing_policy (
  id boolean primary key default true check (id),
  unit_price integer check (unit_price between 1 and 1000),
  topup_enabled boolean not null default false,
  metering_enabled boolean not null default false,
  check (not (topup_enabled or metering_enabled) or unit_price is not null)
);
insert into public.alimtalk_billing_policy(id,unit_price) values(true,12); -- Approved VAT-inclusive retail price; activation stays OFF.
create table public.alimtalk_wallets (
  owner_id uuid primary key references auth.users(id),
  balance bigint not null default 0 check (balance between 0 and 1000000000),
  reserved bigint not null default 0 check (reserved>=0 and reserved<=balance),
  frozen boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.alimtalk_topups (
  payment_id text primary key check (payment_id ~ '^alimtalk_[a-f0-9-]{36}$'),
  owner_id uuid not null references auth.users(id),
  menu_site_id uuid not null, -- Immutable accounting context survives menu deletion.
  amount integer not null check (amount in (10000,30000,50000)),
  store_id text not null check (length(store_id) between 1 and 150),
  channel_key text not null check (length(channel_key) between 1 and 150),
  state text not null default 'pending' check (state in ('pending','credited','review')),
  created_at timestamptz not null default now(),
  credited_at timestamptz,
  check (state<>'credited' or credited_at is not null)
);
create index alimtalk_topups_owner_created on public.alimtalk_topups(owner_id,created_at desc);
create table public.alimtalk_wallet_holds (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid unique references public.menu_order_alimtalk_attempts(id) on delete set null,
  owner_id uuid not null references public.alimtalk_wallets(owner_id),
  menu_site_id uuid not null,
  amount integer not null check (amount between 1 and 1000),
  state text not null default 'held' check (state in ('held','charged','released')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((state='held')=(resolved_at is null)),
  check (state<>'held' or attempt_id is not null) -- Do not erase unresolved financial holds.
);
create index alimtalk_wallet_holds_owner on public.alimtalk_wallet_holds(owner_id);
create table public.alimtalk_wallet_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.alimtalk_wallets(owner_id),
  menu_site_id uuid not null,
  kind text not null check (kind in ('topup','hold','charge','release')),
  amount integer not null check (amount>0),
  balance_after bigint not null check (balance_after>=0),
  reserved_after bigint not null check (reserved_after>=0 and reserved_after<=balance_after),
  payment_id text references public.alimtalk_topups(payment_id),
  attempt_id uuid references public.menu_order_alimtalk_attempts(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((kind='topup' and payment_id is not null and attempt_id is null) or
    (kind<>'topup' and payment_id is null)),
  unique(payment_id), unique(attempt_id,kind)
);
create index alimtalk_wallet_entries_owner_created on public.alimtalk_wallet_entries(owner_id,created_at desc,id desc);
create index alimtalk_wallet_entries_menu on public.alimtalk_wallet_entries(menu_site_id);

alter table public.alimtalk_billing_policy enable row level security;
alter table public.alimtalk_wallets enable row level security;
alter table public.alimtalk_topups enable row level security;
alter table public.alimtalk_wallet_holds enable row level security;
alter table public.alimtalk_wallet_entries enable row level security;
revoke all on public.alimtalk_billing_policy,public.alimtalk_wallets,public.alimtalk_topups,public.alimtalk_wallet_holds,public.alimtalk_wallet_entries from public,anon,authenticated;
grant select on public.alimtalk_billing_policy to service_role;
grant select,insert,update on public.alimtalk_wallets,public.alimtalk_topups,public.alimtalk_wallet_holds to service_role;
grant select,insert on public.alimtalk_wallet_entries to service_role;

create function public.create_alimtalk_topup(p_menu_id uuid,p_actor_id uuid,p_payment_id text,p_amount integer,p_store_id text,p_channel_key text)
returns setof public.alimtalk_topups language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.menu_sites where id=p_menu_id and user_id=p_actor_id for share;
  if not found then raise exception 'WALLET_OWNER_REQUIRED'; end if;
  perform 1 from public.alimtalk_billing_policy where id and topup_enabled;
  if not found then raise exception 'WALLET_TOPUP_DISABLED'; end if;
  perform 1 from public.alimtalk_wallets where owner_id=p_actor_id and frozen;
  if found then raise exception 'WALLET_FROZEN'; end if;
  if (select count(*) from public.alimtalk_topups where owner_id=p_actor_id and created_at>now()-interval '1 hour')>=20 then raise exception 'WALLET_TOPUP_LIMIT'; end if;
  return query insert into public.alimtalk_topups(payment_id,owner_id,menu_site_id,amount,store_id,channel_key)
    values(p_payment_id,p_actor_id,p_menu_id,p_amount,p_store_id,p_channel_key) returning *;
end; $$;

-- Only after a fresh server-to-server PortOne verification, never client amounts.
-- Keep fulfillment available after checkout is disabled or a menu changes owner.
create function public.credit_alimtalk_topup(p_payment_id text,p_owner_id uuid,p_verified_amount integer)
returns setof public.alimtalk_wallets language plpgsql security invoker set search_path='' as $$
declare t public.alimtalk_topups; w public.alimtalk_wallets;
begin
  select * into t from public.alimtalk_topups where payment_id=p_payment_id for update;
  if not found or t.owner_id<>p_owner_id or t.amount<>p_verified_amount then raise exception 'WALLET_PAYMENT_MISMATCH'; end if;
  if t.state='review' then raise exception 'WALLET_PAYMENT_REVIEW'; end if;
  insert into public.alimtalk_wallets(owner_id) values(t.owner_id) on conflict do nothing;
  select * into w from public.alimtalk_wallets where owner_id=t.owner_id for update;
  if t.state='credited' then return next w; return; end if;
  update public.alimtalk_wallets set balance=balance+t.amount,updated_at=clock_timestamp() where owner_id=t.owner_id returning * into w;
  insert into public.alimtalk_wallet_entries(owner_id,menu_site_id,kind,amount,balance_after,reserved_after,payment_id)
    values(t.owner_id,t.menu_site_id,'topup',t.amount,w.balance,w.reserved,t.payment_id);
  update public.alimtalk_topups set state='credited',credited_at=clock_timestamp() where payment_id=t.payment_id;
  return next w;
end; $$;

-- A cancellation must never leave a previously funded wallet spendable.
-- Refund policy and financial resolution remain explicit operator actions.
create function public.flag_alimtalk_topup_review(p_payment_id text)
returns void language plpgsql security invoker set search_path='' as $$
declare t public.alimtalk_topups;
begin
  select * into t from public.alimtalk_topups where payment_id=p_payment_id for update;
  if not found then raise exception 'WALLET_PAYMENT_MISMATCH'; end if;
  update public.alimtalk_topups set state='review' where payment_id=t.payment_id;
  if t.credited_at is not null then
    update public.alimtalk_wallets set frozen=true,updated_at=clock_timestamp() where owner_id=t.owner_id;
  end if;
end; $$;

create function private.reserve_alimtalk_wallet() returns trigger
language plpgsql security invoker set search_path='' as $$
declare price integer; w public.alimtalk_wallets;
begin
  if new.status<>'pending' or new.channel_owner_id is null then raise exception 'WALLET_ATTEMPT_INVALID'; end if;
  select unit_price into price from public.alimtalk_billing_policy where id and metering_enabled;
  if not found or price is null then raise exception 'WALLET_METERING_DISABLED'; end if;
  insert into public.alimtalk_wallets(owner_id) values(new.channel_owner_id) on conflict do nothing;
  select * into w from public.alimtalk_wallets where owner_id=new.channel_owner_id for update;
  if w.frozen then raise exception 'WALLET_FROZEN'; end if;
  if w.balance-w.reserved<price then raise exception 'WALLET_INSUFFICIENT'; end if;
  update public.alimtalk_wallets set reserved=reserved+price,updated_at=clock_timestamp() where owner_id=w.owner_id returning * into w;
  insert into public.alimtalk_wallet_holds(attempt_id,owner_id,menu_site_id,amount) values(new.id,w.owner_id,new.menu_site_id,price);
  insert into public.alimtalk_wallet_entries(owner_id,menu_site_id,kind,amount,balance_after,reserved_after,attempt_id)
    values(w.owner_id,new.menu_site_id,'hold',price,w.balance,w.reserved,new.id);
  return new;
end; $$;
create trigger reserve_alimtalk_wallet after insert on public.menu_order_alimtalk_attempts
  for each row execute function private.reserve_alimtalk_wallet();

create function private.settle_alimtalk_wallet() returns trigger
language plpgsql security invoker set search_path='' as $$
declare h public.alimtalk_wallet_holds; w public.alimtalk_wallets;
begin
  if old.status<>'pending' and new.status<>old.status then raise exception 'WALLET_RESULT_FINAL'; end if;
  if old.status<>'pending' or new.status='pending' then return new; end if;
  select * into h from public.alimtalk_wallet_holds where attempt_id=new.id for update;
  if not found then return new; end if; -- Existing pre-wallet history is never retroactively billed.
  if h.state<>'held' then raise exception 'WALLET_HOLD_RESOLVED'; end if;
  update public.alimtalk_wallets set reserved=reserved-h.amount,
    balance=balance-case when new.status='sent' then h.amount else 0 end,updated_at=clock_timestamp()
    where owner_id=h.owner_id returning * into w;
  update public.alimtalk_wallet_holds set state=case when new.status='sent' then 'charged' else 'released' end,
    resolved_at=clock_timestamp() where attempt_id=new.id;
  insert into public.alimtalk_wallet_entries(owner_id,menu_site_id,kind,amount,balance_after,reserved_after,attempt_id)
    values(h.owner_id,h.menu_site_id,case when new.status='sent' then 'charge' else 'release' end,h.amount,w.balance,w.reserved,new.id);
  return new;
end; $$;
create trigger settle_alimtalk_wallet after update of status on public.menu_order_alimtalk_attempts
  for each row execute function private.settle_alimtalk_wallet();

revoke all on function public.create_alimtalk_topup(uuid,uuid,text,integer,text,text),public.credit_alimtalk_topup(text,uuid,integer),public.flag_alimtalk_topup_review(text),private.reserve_alimtalk_wallet(),private.settle_alimtalk_wallet() from public,anon,authenticated;
grant execute on function public.create_alimtalk_topup(uuid,uuid,text,integer,text,text),public.credit_alimtalk_topup(text,uuid,integer),public.flag_alimtalk_topup_review(text),private.reserve_alimtalk_wallet(),private.settle_alimtalk_wallet() to service_role;
notify pgrst,'reload schema';
commit;
