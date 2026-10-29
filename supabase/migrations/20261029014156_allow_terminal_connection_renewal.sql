-- Only permit rolling terminal expiry from its last server-observed activity.
-- Existing visit IDs, creation times, expiry values, orders, and permissions stay unchanged.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.table_visit_sessions
  drop constraint table_visit_sessions_expiry_check;
alter table public.table_visit_sessions
  add constraint table_visit_sessions_expiry_check check (
    expires_at > created_at
    and expires_at <= case
      when access_channel = 'terminal' then greatest(created_at, last_seen_at) + interval '30 days'
      else created_at + interval '24 hours'
    end
  );

commit;
