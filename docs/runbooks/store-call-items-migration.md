# Store Call Items Migration Runbook

최종 갱신: 2026-08-28

대상 migration: `supabase/migrations/20260828143000_add_store_call_items.sql`

상태: **2026-08-28 `tablescene-prod`에 1회 적용 완료 — 재실행 금지**

적용 결과:

- 적용 전 새 테이블·RPC 3개가 모두 없음을 확인
- 기존 호출 집계 `0`, 미처리 호출 집계 `0`을 적용 전후 동일하게 확인
- `menu_call_items` RLS·FORCE RLS 활성화 확인
- `anon`·`authenticated` 테이블/RPC 권한 없음, `service_role` 최소 권한 확인
- 새 RPC 3개 모두 security invoker, `search_path=""` 확인
- generated Supabase types 갱신 완료

## 목적

- server-only `menu_call_items` 설정 테이블 추가
- 설정 전 매장에 DB backfill 없이 6개 virtual default 제공
- 매장별 호출 항목의 이름·순서·사용 여부를 원자적으로 교체
- 제거 항목은 hard delete 없이 보관
- 호출 이력에 선택 항목 key·label snapshot 추가
- 기존 미처리 호출 dedupe, 2분 cooldown, 시간당 10회 제한 유지

## 적용 범위

- 새 테이블 1개와 service-role-only RPC 3개
- 기존 `menu_customer_calls`에 default가 있는 non-null snapshot column 2개
- 기존 호출 row는 column default로 `staff` / `직원 호출`이 채워짐
- 기존 메뉴판별 호출 설정 row를 일괄 생성하지 않음
- 실제 호출 생성·취소·상태 변경과 환경변수 활성화는 수행하지 않음

## 금지

- `supabase db push`
- linked Production 대상 `supabase migration up`
- 이미 존재하는 객체에 migration 재실행
- `menu_call_items` hard delete
- Production `CALL_ENABLED` 또는 allowlist 변경
- 확인용 고객 호출 생성

현재 Production migration history와 저장소의 과거 migration 목록이 일치하지 않아 `db push`는 과거 migration 다수를 재적용하려 할 수 있다. 이 파일만 승인된 query 방식으로 1회 적용한다.

## 적용 전 read-only 확인

```sql
select
  to_regclass('public.menu_call_items') as call_items_table,
  to_regprocedure('public.list_menu_call_items(uuid,boolean)') as list_rpc,
  to_regprocedure('public.replace_menu_call_items(uuid,jsonb)') as replace_rpc,
  to_regprocedure('public.submit_staff_call(uuid,uuid,text)') as submit_item_rpc;

select
  count(*) as call_count,
  count(*) filter (where call_type = 'staff') as staff_call_count,
  count(*) filter (where status in ('pending', 'acknowledged')) as unresolved_call_count
from public.menu_customer_calls;
```

성공 기준:

- 첫 query의 네 값이 모두 `null`
- 기존 호출 집계값을 적용 후 비교용으로 기록
- 하나라도 새 객체가 존재하면 적용을 중단하고 기존 정의를 감사

## 1회 적용

linked Production 프로젝트가 `tablescene-prod` / `kfbekbapwsyeanobyjsv`인지 재확인한 뒤 migration 파일 전체를 query 방식으로 한 번만 적용한다.

## 적용 후 확인

```sql
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where oid = 'public.menu_call_items'::regclass;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'menu_call_items'
order by grantee, privilege_type;

select
  p.oid::regprocedure as function_name,
  p.prosecdef as security_definer,
  p.proconfig,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.oid in (
    'public.list_menu_call_items(uuid,boolean)'::regprocedure,
    'public.replace_menu_call_items(uuid,jsonb)'::regprocedure,
    'public.submit_staff_call(uuid,uuid,text)'::regprocedure
  )
order by p.proname;

select column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'menu_customer_calls'
  and column_name in ('request_key', 'request_label')
order by column_name;

select
  count(*) as call_count,
  count(*) filter (where request_key = 'staff' and request_label = '직원 호출') as legacy_snapshot_count,
  count(*) filter (where status in ('pending', 'acknowledged')) as unresolved_call_count
from public.menu_customer_calls;
```

성공 기준:

- 새 테이블의 RLS와 FORCE RLS가 모두 `true`
- 테이블 권한은 `service_role`의 `SELECT`, `INSERT`, `UPDATE`뿐이고 DELETE 없음
- 새 RPC 3개 모두 `security_definer=false`, `search_path=""`
- `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`
- snapshot column 2개는 non-null이며 default가 있음
- 전체 호출 수와 미처리 호출 수가 적용 전과 같음
- 기존 호출 row가 모두 기본 snapshot을 가짐

## 적용 후 저장소 작업

1. `npm run supabase:types`로 공식 generated types 갱신
2. generated diff가 새 테이블·column·RPC에 한정되는지 감사
3. 임시 untyped RPC adapter를 generated type 기반 호출로 교체할 수 있는지 확인
4. TypeScript, lint, 전체 테스트, production build 재실행
5. Supabase security/performance advisor에서 새 객체 관련 오류가 없는지 확인
6. Production 배포 후 공개 일반 route와 호출관리 route의 fail-closed 상태 확인

실제 Call 상품 entitlement와 `CALL_ENABLED`, `CALL_ALLOWED_SITE_IDS` 활성화는 별도 승인 작업이다.
