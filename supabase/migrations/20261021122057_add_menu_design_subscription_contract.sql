-- Additive only. NULL means an existing per-template contract; never backfill prices/access.
begin;
alter table public.business_subscriptions
  add column if not exists menu_design_access text,
  add column if not exists menu_plan_version text,
  add column if not exists initial_design_id text;
alter table public.business_subscriptions
  add constraint business_subscriptions_menu_design_access_check
  check (menu_design_access is null or menu_design_access in ('standard','all')) not valid;
alter table public.business_subscriptions validate constraint business_subscriptions_menu_design_access_check;

-- Owner-editable menu settings are presentation data, never an entitlement source.
-- Protect direct Data API edits as well as application forms. Billing/service-role
-- writes remain separately authenticated and validated by the server.
create function public.enforce_menu_design_contract() returns trigger
language plpgsql security definer set search_path = '' as $$
declare access_kind text; product text; design_id text; expected_renderer text; is_dining boolean;
begin
  if auth.role() is distinct from 'authenticated' then return new; end if;
  select s.menu_design_access, s.product_key into access_kind, product
  from public.business_subscriptions s
  where s.menu_site_id = old.id and s.user_id = old.user_id and s.menu_design_access is not null
  order by s.created_at desc limit 1;
  if not found then return new; end if;
  design_id := new.settings->>'menu_design_id';
  is_dining := product = 'business_basic_multi_monthly';
  expected_renderer := case
    when design_id in ('basic-first-column','basic-top-row','basic-center-column','basic-upper-left','basic-first-column-album','basic-top-row-album') then 'cafe_design_a'
    when design_id in ('dining-full-page','dining-full-page-album') then 'dining_aube_table_a'
    when design_id in ('dining-sidebar','dining-sidebar-album') then 'dining_aube_table_b'
    else null end;
  if expected_renderer is not null then
    if new.template_key is distinct from expected_renderer or is_dining is distinct from (design_id like 'dining-%') then
      raise exception 'Design does not match the subscribed service' using errcode='42501';
    end if;
  elsif access_kind = 'all' and design_id = new.template_key and (
    (is_dining and new.template_key in ('dining_aube_table_a','dining_aube_table_b')) or
    (not is_dining and new.template_key in ('cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a'))
  ) then null;
  else raise exception 'Design is outside the subscribed access' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function public.enforce_menu_design_contract() from public, anon, authenticated;
create trigger enforce_menu_design_contract before update of template_key, settings on public.menu_sites
for each row execute function public.enforce_menu_design_contract();
comment on column public.business_subscriptions.menu_design_access is 'NULL=legacy contract; standard=neutral designs; all=neutral and designer within the subscribed service. Existing amounts remain immutable.';
commit;
