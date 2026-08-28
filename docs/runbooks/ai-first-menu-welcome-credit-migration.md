# AI 첫 메뉴 웰컴 크레딧 migration runbook

최종 갱신: 2026-08-28

대상 migration:

- `supabase/migrations/20260828083457_grant_first_menu_welcome_credits.sql`

현재 상태:

- 로컬 코드와 migration 초안 작성 완료
- Production 미적용
- 기존 크레딧 잔액과 거래 내역은 변경하지 않음

## 적용 목적

- 계정의 첫 메뉴판 생성이 성공한 시점에 AI 웰컴 크레딧 6개를 평생 1회 지급
- 추가 메뉴판·신규 구독·재구독·정기 결제 갱신에서는 미지급
- 기존에 `grant` 또는 `included_grant`를 받은 계정에는 추가 지급하지 않음
- 체험 종료나 메뉴판 보관만으로 기존 크레딧을 회수하지 않음

## 적용 전 확인

1. 애플리케이션 PR은 Draft 상태로 유지한다.
2. Production 프로젝트가 `tablescene-prod`인지 확인한다.
3. 적용 예정 migration이 위 파일 한 건인지 확인한다.
4. migration에 기존 데이터의 `update`, `delete`, backfill이 없는지 재확인한다.

## 안전한 배포 순서

1. 사람 승인을 받은 뒤 Production에 migration을 1회 적용한다.
2. 아래 postcheck로 함수·index·권한을 확인한다.
3. 애플리케이션 검증을 다시 실행한다.
4. PR을 Ready 처리하고 `tablescene-next`에 병합한다.
5. Vercel 배포 성공과 공개 route를 확인한다.
6. 별도 승인을 받은 신규 QA 계정에서 실제 첫 메뉴·추가 메뉴 동작을 확인한다.

## Production postcheck

```sql
select
  p.oid::regprocedure::text as function_name,
  p.prosecdef as security_definer,
  p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'grant_ai_first_menu_welcome_credits';

select
  has_function_privilege('anon', 'public.grant_ai_first_menu_welcome_credits(uuid, uuid)', 'execute') as anon_execute,
  has_function_privilege('authenticated', 'public.grant_ai_first_menu_welcome_credits(uuid, uuid)', 'execute') as authenticated_execute,
  has_function_privilege('service_role', 'public.grant_ai_first_menu_welcome_credits(uuid, uuid)', 'execute') as service_role_execute;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname = 'ai_credit_transactions_first_menu_welcome_user_unique';

select count(*) as welcome_transactions
from public.ai_credit_transactions
where transaction_type = 'grant'
  and credit_source = 'granted'
  and metadata ->> 'policy' = 'account_first_menu_welcome_grant';
```

성공 기준:

- 함수가 1개이며 `security_definer = false`
- `proconfig`에 빈 `search_path` 고정이 표시됨
- `anon_execute = false`, `authenticated_execute = false`, `service_role_execute = true`
- 부분 unique index가 1개 존재
- migration 직후 `welcome_transactions = 0`이며 기존 거래·잔액 수치가 변하지 않음

## 실제 QA 기준

- 신규 QA 계정의 첫 메뉴판 생성 완료 후 잔액이 6 증가
- 같은 결제 완료 요청 재처리 시 추가 지급 없음
- 같은 계정의 두 번째 메뉴판 생성 시 추가 지급 없음
- 재구독·복구·정기 결제 갱신 시 추가 지급 없음
- 기존 구매 크레딧과 사용 내역 유지

실제 QA는 메뉴판과 결제·구독 데이터가 생성될 수 있으므로 별도 사람 승인 없이는 실행하지 않는다.
