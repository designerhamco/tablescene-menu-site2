begin;

create or replace function public.save_menu_page_content_order(
  p_user_id uuid,
  p_menu_site_id uuid,
  p_menu_page_id uuid,
  p_blocks jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_page_site_id uuid;
  v_payload_count integer;
  v_category_payload_count integer;
  v_widget_payload_count integer;
  v_db_category_count integer;
  v_db_widget_count integer;
  v_updated_category_count integer;
  v_updated_widget_count integer;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_menu_site_id is null then
    raise exception 'menu site not found';
  end if;

  if p_menu_page_id is null then
    raise exception 'menu page not found';
  end if;

  if not exists (
    select 1
    from public.menu_sites
    where id = p_menu_site_id
  ) then
    raise exception 'menu site not found';
  end if;

  if not exists (
    select 1
    from public.menu_sites
    where id = p_menu_site_id
      and user_id = p_user_id
  ) then
    raise exception 'forbidden owner mismatch';
  end if;

  select menu_site_id
    into v_page_site_id
  from public.menu_pages
  where id = p_menu_page_id
  for update;

  if v_page_site_id is null then
    raise exception 'menu page not found';
  end if;

  if v_page_site_id <> p_menu_site_id then
    raise exception 'page/site mismatch';
  end if;

  if p_blocks is null or jsonb_typeof(p_blocks) <> 'array' then
    raise exception 'invalid JSON array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_blocks) as raw_block(value)
    where jsonb_typeof(raw_block.value) <> 'object'
  ) then
    raise exception 'invalid JSON array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_blocks) as raw_block(value)
    where not (raw_block.value ? 'block_type')
      or not (raw_block.value ? 'id')
      or not (raw_block.value ? 'sort_order')
  ) then
    raise exception 'invalid JSON array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_blocks) as raw_block(value)
    where jsonb_typeof(raw_block.value -> 'block_type') <> 'string'
      or jsonb_typeof(raw_block.value -> 'id') <> 'string'
      or jsonb_typeof(raw_block.value -> 'sort_order') <> 'number'
  ) then
    raise exception 'invalid JSON array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_blocks) as raw_block(value)
    where raw_block.value ->> 'block_type' not in ('category', 'widget')
  ) then
    raise exception 'invalid block type';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_blocks) as raw_block(value)
    where not (
      raw_block.value ->> 'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
  ) then
    raise exception 'invalid UUID';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_blocks) as raw_block(value)
    where not (raw_block.value ->> 'sort_order' ~ '^-?[0-9]+$')
  ) then
    raise exception 'invalid sort order';
  end if;

  create temporary table if not exists pg_temp.menu_page_content_order_payload (
    block_type text not null,
    block_id uuid not null,
    sort_order integer not null
  ) on commit drop;

  truncate table pg_temp.menu_page_content_order_payload;

  insert into pg_temp.menu_page_content_order_payload (block_type, block_id, sort_order)
  select
    raw_block.value ->> 'block_type',
    (raw_block.value ->> 'id')::uuid,
    (raw_block.value ->> 'sort_order')::integer
  from jsonb_array_elements(p_blocks) as raw_block(value);

  get diagnostics v_payload_count = row_count;

  if exists (
    select 1
    from pg_temp.menu_page_content_order_payload
    where sort_order < 0
  ) then
    raise exception 'invalid sort order';
  end if;

  if exists (
    select 1
    from pg_temp.menu_page_content_order_payload
    group by block_type, block_id
    having count(*) > 1
  ) then
    raise exception 'duplicate block id';
  end if;

  if exists (
    select 1
    from pg_temp.menu_page_content_order_payload
    group by sort_order
    having count(*) > 1
  ) then
    raise exception 'duplicate sort order';
  end if;

  if exists (
    select 1
    from pg_temp.menu_page_content_order_payload
    where sort_order >= v_payload_count
  ) then
    raise exception 'invalid sort order';
  end if;

  if (
    select count(distinct sort_order)
    from pg_temp.menu_page_content_order_payload
  ) <> v_payload_count then
    raise exception 'invalid sort order';
  end if;

  select count(*)
    into v_db_widget_count
  from public.menu_widgets
  where menu_site_id = p_menu_site_id
    and menu_page_id = p_menu_page_id;

  if exists (
    select 1
    from public.menu_widgets
    where menu_site_id = p_menu_site_id
      and menu_page_id = p_menu_page_id
      and widget_type in ('notice_text', 'image_banner', 'option_list', 'store_info')
  ) then
    raise exception 'Legacy widget rows require separate review before combined ordering.';
  end if;

  if v_db_widget_count > 3 then
    raise exception 'Page widget limit exceeded.';
  end if;

  if exists (
    select 1
    from pg_temp.menu_page_content_order_payload as payload
    left join public.menu_categories as category
      on category.id = payload.block_id
      and category.menu_site_id = p_menu_site_id
      and category.menu_page_id = p_menu_page_id
    where payload.block_type = 'category'
      and category.id is null
  ) then
    raise exception 'unknown block';
  end if;

  if exists (
    select 1
    from pg_temp.menu_page_content_order_payload as payload
    left join public.menu_widgets as widget
      on widget.id = payload.block_id
      and widget.menu_site_id = p_menu_site_id
      and widget.menu_page_id = p_menu_page_id
    where payload.block_type = 'widget'
      and widget.id is null
  ) then
    raise exception 'unknown block';
  end if;

  if exists (
    select 1
    from public.menu_categories as category
    left join pg_temp.menu_page_content_order_payload as payload
      on payload.block_type = 'category'
      and payload.block_id = category.id
    where category.menu_site_id = p_menu_site_id
      and category.menu_page_id = p_menu_page_id
      and payload.block_id is null
  ) then
    raise exception 'incomplete block set';
  end if;

  if exists (
    select 1
    from public.menu_widgets as widget
    left join pg_temp.menu_page_content_order_payload as payload
      on payload.block_type = 'widget'
      and payload.block_id = widget.id
    where widget.menu_site_id = p_menu_site_id
      and widget.menu_page_id = p_menu_page_id
      and payload.block_id is null
  ) then
    raise exception 'incomplete block set';
  end if;

  select count(*)
    into v_category_payload_count
  from pg_temp.menu_page_content_order_payload
  where block_type = 'category';

  select count(*)
    into v_widget_payload_count
  from pg_temp.menu_page_content_order_payload
  where block_type = 'widget';

  select count(*)
    into v_db_category_count
  from public.menu_categories
  where menu_site_id = p_menu_site_id
    and menu_page_id = p_menu_page_id;

  if v_category_payload_count <> v_db_category_count
    or v_widget_payload_count <> v_db_widget_count then
    raise exception 'incomplete block set';
  end if;

  with updated_categories as (
    update public.menu_categories as category
      set sort_order = payload.sort_order,
          updated_at = now()
    from pg_temp.menu_page_content_order_payload as payload
    where payload.block_type = 'category'
      and category.id = payload.block_id
      and category.menu_site_id = p_menu_site_id
      and category.menu_page_id = p_menu_page_id
    returning category.id
  )
  select count(*)
    into v_updated_category_count
  from updated_categories;

  with updated_widgets as (
    update public.menu_widgets as widget
      set sort_order = payload.sort_order,
          updated_at = now()
    from pg_temp.menu_page_content_order_payload as payload
    where payload.block_type = 'widget'
      and widget.id = payload.block_id
      and widget.menu_site_id = p_menu_site_id
      and widget.menu_page_id = p_menu_page_id
    returning widget.id
  )
  select count(*)
    into v_updated_widget_count
  from updated_widgets;

  if v_updated_category_count <> v_category_payload_count
    or v_updated_widget_count <> v_widget_payload_count then
    raise exception 'update count mismatch';
  end if;

  return jsonb_build_object(
    'menu_site_id', p_menu_site_id,
    'menu_page_id', p_menu_page_id,
    'updated_category_count', v_updated_category_count,
    'updated_widget_count', v_updated_widget_count,
    'total_block_count', v_payload_count
  );
end;
$$;

revoke execute on function public.save_menu_page_content_order(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_menu_page_content_order(uuid, uuid, uuid, jsonb) to service_role;

notify pgrst, 'reload schema';

commit;
