alter table public.menu_promotions
  add column if not exists schedule_type text not null default 'once',
  add column if not exists daily_start_time time null,
  add column if not exists daily_end_time time null;

alter table public.menu_promotions
  drop constraint if exists menu_promotions_schedule_type_check;

alter table public.menu_promotions
  add constraint menu_promotions_schedule_type_check check (
    schedule_type in ('once', 'daily_window')
  );

alter table public.menu_promotions
  drop constraint if exists menu_promotions_daily_window_check;

alter table public.menu_promotions
  add constraint menu_promotions_daily_window_check check (
    schedule_type = 'once'
    or (
      schedule_type = 'daily_window'
      and daily_start_time is not null
      and daily_end_time is not null
      and daily_end_time > daily_start_time
    )
  );

alter table public.menu_promotions
  drop constraint if exists menu_promotions_time_display_mode_check;

alter table public.menu_promotions
  add constraint menu_promotions_time_display_mode_check check (
    not (settings ? 'time_display_mode')
    or settings ->> 'time_display_mode' in (
      'deadline',
      'countdown',
      'message',
      'message_and_countdown'
    )
  );

alter table public.menu_promotions
  drop constraint if exists menu_promotions_time_display_text_length_check;

alter table public.menu_promotions
  add constraint menu_promotions_time_display_text_length_check check (
    not (settings ? 'time_display_text')
    or char_length(btrim(settings ->> 'time_display_text')) <= 40
  );

create index if not exists menu_promotions_schedule_time_idx
  on public.menu_promotions (schedule_type, starts_at, ends_at);

create or replace function public.is_menu_promotion_active_now(
  p_active boolean,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_schedule_type text,
  p_daily_start_time time,
  p_daily_end_time time,
  p_timezone text,
  p_now timestamptz default now()
)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select
    case
      when p_active is not true then false
      when p_starts_at is null or p_ends_at is null then false
      when p_ends_at <= p_starts_at then false
      when p_now < p_starts_at or p_now >= p_ends_at then false
      when coalesce(p_schedule_type, 'once') = 'once' then true
      when coalesce(p_schedule_type, 'once') = 'daily_window'
        and p_daily_start_time is not null
        and p_daily_end_time is not null
        and p_daily_end_time > p_daily_start_time
      then
        ((p_now at time zone 'Asia/Seoul')::time >= p_daily_start_time)
        and ((p_now at time zone 'Asia/Seoul')::time < p_daily_end_time)
      else false
    end;
$$;

comment on function public.is_menu_promotion_active_now(
  boolean,
  timestamptz,
  timestamptz,
  text,
  time,
  time,
  text,
  timestamptz
) is
  'Returns true only when a time-sale promotion is public-active. Daily windows are evaluated in Asia/Seoul for the first MenuLink rollout.';

grant execute on function public.is_menu_promotion_active_now(
  boolean,
  timestamptz,
  timestamptz,
  text,
  time,
  time,
  text,
  timestamptz
) to anon, authenticated, service_role;

drop policy if exists "menu_promotions_select_public_active" on public.menu_promotions;

create policy "menu_promotions_select_public_active"
  on public.menu_promotions
  for select
  to anon, authenticated
  using (
    public.is_menu_promotion_active_now(
      active,
      starts_at,
      ends_at,
      schedule_type,
      daily_start_time,
      daily_end_time,
      timezone,
      now()
    )
    and exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_promotions.menu_site_id
        and menu_sites.status = 'published'
    )
  );

drop policy if exists "menu_promotion_items_select_public_active" on public.menu_promotion_items;

create policy "menu_promotion_items_select_public_active"
  on public.menu_promotion_items
  for select
  to anon, authenticated
  using (
    visible = true
    and exists (
      select 1
      from public.menu_promotions
      join public.menu_sites on menu_sites.id = menu_promotions.menu_site_id
      join public.menu_items on menu_items.id = menu_promotion_items.menu_item_id
      join public.menu_categories on menu_categories.id = menu_items.category_id
      left join public.menu_pages on menu_pages.id = menu_categories.menu_page_id
      where menu_promotions.id = menu_promotion_items.promotion_id
        and public.is_menu_promotion_active_now(
          menu_promotions.active,
          menu_promotions.starts_at,
          menu_promotions.ends_at,
          menu_promotions.schedule_type,
          menu_promotions.daily_start_time,
          menu_promotions.daily_end_time,
          menu_promotions.timezone,
          now()
        )
        and menu_sites.status = 'published'
        and menu_items.visible = true
        and menu_items.price_visible = true
        and menu_categories.visible = true
        and coalesce(menu_pages.visible, true) = true
        and menu_items.menu_site_id = menu_promotions.menu_site_id
        and menu_categories.menu_site_id = menu_promotions.menu_site_id
        and (
          menu_promotion_items.price_column_id is null
          or exists (
            select 1
            from public.menu_category_price_columns
            join public.menu_item_price_column_values
              on menu_item_price_column_values.price_column_id = menu_category_price_columns.id
             and menu_item_price_column_values.menu_item_id = menu_promotion_items.menu_item_id
            where menu_category_price_columns.id = menu_promotion_items.price_column_id
              and menu_category_price_columns.visible = true
              and menu_category_price_columns.menu_site_id = menu_promotions.menu_site_id
              and menu_category_price_columns.category_id = menu_items.category_id
              and menu_item_price_column_values.price_column_id = menu_promotion_items.price_column_id
              and menu_item_price_column_values.visible = true
              and menu_item_price_column_values.price is not null
          )
        )
    )
  );
