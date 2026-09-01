begin;

-- Give every physical table a stable, intentionally public QR identifier.
--
-- The original random QR token remains hash-only for backwards compatibility.
-- The UUID below is not an authentication secret: it is the opaque identifier
-- printed in the public QR. All table resolution still happens in server-only
-- code and remains subject to lifecycle, product, template, and runtime gates.

alter table public.menu_tables
  add column qr_public_id uuid not null default gen_random_uuid();

create unique index menu_tables_qr_public_id_idx
  on public.menu_tables(qr_public_id);

-- Rotating a table QR must invalidate both the legacy hash-only URL and the new
-- reproducible public URL. Existing visit sessions are revoked by the same
-- trigger before the new public identifier is returned to the owner.
create or replace function private.revoke_table_visit_sessions()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.token_hash is distinct from new.token_hash
    or (old.status = 'active' and new.status <> 'active') then
    update public.table_visit_sessions
    set revoked_at = coalesce(revoked_at, clock_timestamp())
    where menu_table_id = new.id
      and revoked_at is null
      and expires_at > clock_timestamp();
  end if;

  if old.token_hash is distinct from new.token_hash then
    new.token_rotated_at := clock_timestamp();
    new.qr_public_id := gen_random_uuid();
  end if;

  return new;
end;
$$;

revoke all on function private.revoke_table_visit_sessions()
  from public, anon, authenticated;

comment on column public.menu_tables.qr_public_id is
  'Opaque public identifier used to reproduce a table QR. Rotated together with token_hash.';

comment on table public.menu_tables is
  'Physical menu-site tables. Legacy QR secrets stay hash-only; qr_public_id is the intentionally public reproducible QR identifier.';

commit;
