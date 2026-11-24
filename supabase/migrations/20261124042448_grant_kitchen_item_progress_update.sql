begin;
set local lock_timeout = '5s';

-- The service-only kitchen RPC is SECURITY INVOKER. The existing order-item
-- grants allow reads and inserts, so grant only the new progress column.
grant update (cooking_completed_at) on public.menu_customer_order_items to service_role;

commit;
