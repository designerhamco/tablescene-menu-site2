begin;

-- Additive: old sessions and the existing five-argument registration RPC remain usable.
alter table public.table_visit_sessions add column device_info jsonb not null default '{}'::jsonb;
alter table public.table_visit_sessions add constraint table_terminal_device_info_check
  check (jsonb_typeof(device_info) = 'object' and octet_length(device_info::text) <= 2048);

create function public.register_table_terminal_visit_with_device(
  p_menu_site_id uuid, p_table_id uuid, p_token_hash text,
  p_user_agent_hash text, p_previous_token_hash text, p_device_info jsonb
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
  if p_device_info is null or jsonb_typeof(p_device_info) <> 'object'
    or octet_length(p_device_info::text) > 2048 then
    raise exception using errcode = '22023', message = 'INVALID_DEVICE_INFO';
  end if;
  v_id := public.register_table_terminal_visit(p_menu_site_id, p_table_id, p_token_hash, p_user_agent_hash, p_previous_token_hash);
  update public.table_visit_sessions set device_info = p_device_info
    where id = v_id and menu_site_id = p_menu_site_id and access_channel = 'terminal';
  return v_id;
end;
$$;
revoke all on function public.register_table_terminal_visit_with_device(uuid,uuid,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.register_table_terminal_visit_with_device(uuid,uuid,text,text,text,jsonb) to service_role;

commit;
