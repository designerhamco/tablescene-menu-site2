# Call MVP Foundation Migration Runbook

최종 갱신: 2026-08-06

대상 migration: `supabase/migrations/20260806142627_add_call_mvp_foundation.sql`

상태: **Production 미적용. 사람의 명시적 승인 전에는 실행하지 않는다.**

## 목적

- 서버 전용 `menu_customer_calls` 테이블 생성
- 직원 호출 단일 preset과 `pending → acknowledged → completed`, 손님 `pending → cancelled` 상태 강제
- 미처리 호출 중복 방지, 2분 cooldown, table visit session당 시간당 10회 제한
- service-role-only `submit_staff_call`, `cancel_pending_staff_call` RPC 제공

## 금지

- `supabase db push`
- linked Production 대상 `supabase migration up`
- 이미 존재하는 객체에 migration 재실행
- Production 환경변수나 실제 호출 데이터 생성

## 적용 전 read-only 확인

Supabase SQL Editor에서 다음을 실행한다.

```sql
select
  to_regclass('public.menu_customer_calls') as calls_table,
  to_regprocedure('public.submit_staff_call(uuid,uuid)') as submit_rpc,
  to_regprocedure('public.cancel_pending_staff_call(uuid,uuid,uuid)') as cancel_rpc;
```

성공 기준: 세 값이 모두 `null`. 하나라도 존재하면 적용을 중단하고 기존 객체를 감사한다.

## 승인 후 1회 적용

사람이 명시적으로 승인한 뒤 migration 파일 전체를 Supabase SQL Editor 또는 승인된 Management API로 한 번만 실행한다. 실행 성공 전까지 `CALL_ENABLED`와 `CALL_ALLOWED_SITE_IDS`는 설정하지 않는다.

## 적용 후 확인

```sql
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where oid = 'public.menu_customer_calls'::regclass;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'menu_customer_calls'
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
  and p.proname in ('submit_staff_call', 'cancel_pending_staff_call')
order by p.proname;
```

성공 기준:

- 테이블의 RLS와 FORCE RLS가 모두 `true`
- 테이블 권한은 `service_role`의 `SELECT`, `INSERT`, `UPDATE`뿐이며 `DELETE` 없음
- 두 함수 모두 `security_definer=false`, `search_path=""`
- `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`

## 코드 후속 작업

1. `npm run supabase:types`로 generated types 갱신
2. generated diff에서 `menu_customer_calls`와 두 RPC만 의도대로 추가됐는지 확인
3. TypeScript, lint, build, Call 관련 테스트 재실행
4. 별도 PR로 Production 적용 기록과 generated types 반영
5. 실제 Call 상품·사이트가 확정된 뒤에만 `CALL_ENABLED=true`와 명시적 `CALL_ALLOWED_SITE_IDS` 설정
