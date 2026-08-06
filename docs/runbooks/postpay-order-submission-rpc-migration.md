# Postpay Order Submission RPC Migration Runbook

대상 migration: `20260806131244_add_submit_postpay_order_rpc.sql`

상태: **Production 미적용. 사람 승인 전 실행 금지.**

## 포함 범위

- active table visit session 재검증
- 주문 가능·공개·미품절 메뉴와 active 주문 option 재검증
- required/min/max option 선택 검증
- 메뉴명·가격·option immutable snapshot 생성
- 주문 header/items/options 단일 transaction 저장
- session + client request UUID idempotency
- `service_role` 전용 `security definer` RPC

실제 상품 entitlement 활성화, 환경변수 변경, 기존 주문 데이터 변경, 결제·환불은 포함하지 않는다.

## 적용 전 read-only 확인

```sql
select to_regprocedure(
  'public.submit_postpay_order(uuid,uuid,uuid,text,jsonb)'
) as existing_function;
```

성공 기준: `existing_function`이 `null`이다. 이미 존재하면 migration을 실행하지 말고 function definition과 grant drift를 먼저 감사한다.

## 승인 후 적용

1. `20260806131244_add_submit_postpay_order_rpc.sql` 전체를 새 SQL Editor query에 붙여 넣는다.
2. **Run**을 한 번만 누른다.
3. 성공 후 같은 migration을 다시 실행하지 않는다.

`supabase db push`, linked `migration up`, 기존 migration 재실행은 사용하지 않는다.

## 적용 후 read-only 확인

```sql
select
  p.oid::regprocedure as function_name,
  p.prosecdef as security_definer,
  p.proconfig,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
where p.oid = 'public.submit_postpay_order(uuid,uuid,uuid,text,jsonb)'::regprocedure;
```

성공 기준:

- function이 정확히 한 행 조회됨
- `security_definer=true`
- `proconfig`에 빈 `search_path` 고정이 존재
- `anon_execute=false`, `authenticated_execute=false`
- `service_role_execute=true`

## 적용 후 다음 작업

1. Production schema에서 generated Supabase types를 다시 생성한다.
2. generated schema 부분을 수동 편집하지 않는다.
3. PR 전체 검증 후 병합한다.
4. 실제 상품 entitlement와 `POSTPAY_ORDER_ENABLED`, `POSTPAY_ORDER_ALLOWED_SITE_IDS` Production 설정은 별도 제품·운영 승인 전까지 유지한다.
