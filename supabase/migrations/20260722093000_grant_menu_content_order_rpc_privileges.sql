begin;

-- `save_menu_page_content_order` is intentionally SECURITY INVOKER.
-- The server calls it with the service-role client, so the role needs only the
-- table/column privileges that the function body actually uses.

grant select on table public.menu_sites to service_role;

grant select on table public.menu_pages to service_role;
grant update (updated_at) on table public.menu_pages to service_role;

grant select on table public.menu_categories to service_role;
grant update (sort_order, updated_at) on table public.menu_categories to service_role;

grant select on table public.menu_widgets to service_role;
grant update (sort_order, updated_at) on table public.menu_widgets to service_role;

commit;
