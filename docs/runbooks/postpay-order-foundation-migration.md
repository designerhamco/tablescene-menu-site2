# Postpay Order Foundation Migration Runbook

대상 migration: `20260806124512_add_postpay_order_foundation.sql`

상태: **2026-08-06 `tablescene-prod`에 1회 적용 완료. 재실행 금지.**

적용 기록:

- linked Supabase Management API를 통한 read-only precheck 성공
- `20260806124512_add_postpay_order_foundation.sql` 전체를 1회 적용
- 다섯 테이블 존재, 다섯 테이블의 RLS/강제 RLS 활성화 확인
- `anon`, `authenticated` grant 없음 확인
- `service_role`은 문서화된 SELECT/INSERT/UPDATE만 보유하고 DELETE 없음 확인
- Production schema 기준 generated Supabase types 갱신

## 포함 범위

- `menu_items.orderable` default-false 분리
- 주문 전용 option group/value
- table visit session에 연결된 후불 주문 header
- 메뉴명·가격·선택 option immutable snapshot
- session 단위 `client_request_id` idempotency
- server-only 강제 RLS와 최소 `service_role` 권한

실제 결제, 환불, PG, 상품 entitlement 활성화, 기존 데이터 변경은 포함하지 않는다.

## 적용 전 read-only 확인

Supabase Dashboard의 `tablescene-prod` → SQL Editor에서 아래 쿼리만 실행한다.

```sql
select to_regclass('public.menu_customer_orders') as existing_order_table;

select conname
from pg_constraint
where conname in (
  'menu_items_site_id_id_key',
  'table_visit_sessions_site_table_id_key'
);

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'menu_items'
  and column_name = 'orderable';
```

성공 기준:

- `existing_order_table`은 `null`
- 두 constraint 이름은 조회되지 않음
- `orderable` 행이 조회되지 않음

하나라도 이미 존재하면 migration을 실행하지 말고 schema drift를 먼저 감사한다.

## 승인 후 적용

1. migration 파일 전체를 새 SQL Editor query에 붙여 넣는다.
2. **Run**을 한 번만 누른다.
3. 성공 후 같은 파일을 다시 실행하지 않는다.

`supabase db push`, linked `migration up`, 기존 migration 재실행은 사용하지 않는다.

## 적용 후 read-only 확인

```sql
select
  to_regclass('public.menu_order_option_groups') as option_groups,
  to_regclass('public.menu_order_option_values') as option_values,
  to_regclass('public.menu_customer_orders') as customer_orders,
  to_regclass('public.menu_customer_order_items') as order_items,
  to_regclass('public.menu_customer_order_item_options') as order_item_options;

select relname, relrowsecurity, relforcerowsecurity
from pg_class
where oid in (
  'public.menu_order_option_groups'::regclass,
  'public.menu_order_option_values'::regclass,
  'public.menu_customer_orders'::regclass,
  'public.menu_customer_order_items'::regclass,
  'public.menu_customer_order_item_options'::regclass
)
order by relname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'menu_order_option_groups',
    'menu_order_option_values',
    'menu_customer_orders',
    'menu_customer_order_items',
    'menu_customer_order_item_options'
  )
order by table_name, grantee, privilege_type;
```

성공 기준:

- 다섯 테이블이 모두 존재
- 다섯 테이블 모두 `relrowsecurity=true`, `relforcerowsecurity=true`
- `anon`, `authenticated` grant 없음
- `service_role`에 문서화된 SELECT/INSERT/UPDATE만 존재하고 DELETE 없음

## 적용 후 다음 작업

1. 별도 PR에서 server-side atomic order submission과 모바일 cart runtime을 구현한다.
2. 실제 주문 활성화와 Production feature gate는 별도 승인 전까지 유지한다.
