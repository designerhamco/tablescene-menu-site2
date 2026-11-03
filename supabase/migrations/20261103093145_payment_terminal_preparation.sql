-- Preparation only: no payment authorization, order mutation, credentials or callback ingestion.
begin;

create schema if not exists private;
create table private.menu_payment_terminal_preparations (
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  provider text not null check (provider in ('nice_apppos_ios', 'ksnet_kscat_windows')),
  configuration jsonb not null check (jsonb_typeof(configuration) = 'object' and octet_length(configuration::text) <= 2048),
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  updated_by uuid not null,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (menu_site_id, provider)
);
alter table private.menu_payment_terminal_preparations enable row level security;
alter table private.menu_payment_terminal_preparations force row level security;
revoke all on private.menu_payment_terminal_preparations from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update on private.menu_payment_terminal_preparations to service_role;

create function public.list_payment_terminal_preparations(p_menu_site_id uuid, p_actor_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if p_actor_user_id is null then raise exception '사장님 권한이 필요합니다.' using errcode = '42501'; end if;
  perform 1 from public.menu_sites where id = p_menu_site_id and user_id = p_actor_user_id for share;
  if not found then raise exception '사장님만 결제 연결 준비 정보를 확인할 수 있습니다.' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'draft', configuration, 'revision', revision, 'updatedAt', updated_at
  ) order by provider) from private.menu_payment_terminal_preparations where menu_site_id = p_menu_site_id), '[]'::jsonb);
end;
$$;

create function public.save_payment_terminal_preparation(
  p_menu_site_id uuid, p_actor_user_id uuid, p_configuration jsonb, p_expected_revision bigint
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_provider text; v_current bigint; v_saved private.menu_payment_terminal_preparations%rowtype;
begin
  if p_actor_user_id is null then raise exception '사장님 권한이 필요합니다.' using errcode = '42501'; end if;
  perform 1 from public.menu_sites where id = p_menu_site_id and user_id = p_actor_user_id for update;
  if not found then raise exception '사장님 권한이 필요합니다.' using errcode = '42501'; end if;
  if p_configuration is null or jsonb_typeof(p_configuration) <> 'object' or octet_length(p_configuration::text) > 2048
    or p_expected_revision is null or p_expected_revision < 0 or p_expected_revision >= 9007199254740991
  then raise exception '연결 준비 정보를 확인해 주세요.' using errcode = '22023'; end if;
  if (select count(*) from jsonb_object_keys(p_configuration)) <> 5
    or exists (select 1 from jsonb_object_keys(p_configuration) k where k not in ('provider','terminalModel','businessNumber','terminalId','localPort'))
    or exists (select 1 from jsonb_each(p_configuration) e where jsonb_typeof(e.value) <> 'string')
  then raise exception '허용하지 않은 연결 설정입니다.' using errcode = '22023'; end if;
  v_provider := p_configuration->>'provider';
  if v_provider not in ('nice_apppos_ios', 'ksnet_kscat_windows')
    or length(p_configuration->>'terminalModel') > 100
    or (p_configuration->>'terminalModel') ~ '[[:cntrl:]]'
    or (p_configuration->>'businessNumber') !~ '^([0-9]{10})?$'
    or (p_configuration->>'terminalId') !~ '^([A-Za-z0-9-]{1,32})?$'
    or (p_configuration->>'localPort') !~ '^([0-9]{1,5})?$'
  then raise exception '연결 정보의 형식을 확인해 주세요.' using errcode = '22023'; end if;
  if (p_configuration->>'localPort') <> '' then
    if v_provider = 'nice_apppos_ios' or (p_configuration->>'localPort')::integer not between 1 and 65535
    then raise exception '프로그램 포트를 확인해 주세요.' using errcode = '22023'; end if;
  end if;
  select revision into v_current from private.menu_payment_terminal_preparations
    where menu_site_id = p_menu_site_id and provider = v_provider;
  if coalesce(v_current, 0) <> p_expected_revision then
    raise exception '다른 화면에서 준비 정보가 변경되었습니다. 새로고침 후 다시 확인해 주세요.' using errcode = '40001';
  end if;
  insert into private.menu_payment_terminal_preparations as saved
    (menu_site_id, provider, configuration, updated_by) values (p_menu_site_id, v_provider, p_configuration, p_actor_user_id)
  on conflict (menu_site_id, provider) do update set configuration = excluded.configuration,
    revision = saved.revision + 1, updated_by = excluded.updated_by, updated_at = clock_timestamp()
  returning * into v_saved;
  return jsonb_build_object('draft', v_saved.configuration, 'revision', v_saved.revision, 'updatedAt', v_saved.updated_at);
end;
$$;

revoke all on function public.list_payment_terminal_preparations(uuid, uuid) from public, anon, authenticated;
revoke all on function public.save_payment_terminal_preparation(uuid, uuid, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.list_payment_terminal_preparations(uuid, uuid) to service_role;
grant execute on function public.save_payment_terminal_preparation(uuid, uuid, jsonb, bigint) to service_role;
comment on table private.menu_payment_terminal_preparations is 'Owner-only preparation values; saving never activates payment or records an approval.';
commit;
