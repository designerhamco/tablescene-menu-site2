# 테이블 QR 재다운로드 공개 ID migration

대상 migration: `20260901072048_add_persistent_table_qr_public_id.sql`

## 목적

기존 QR 원문 비밀값은 DB에 저장하지 않는 원칙을 유지하면서, 사장·Manager가 기존 테이블 QR을 나중에도 다시 다운로드할 수 있게 한다. 각 테이블에는 인증 권한을 부여하지 않는 불투명 UUID `qr_public_id`를 추가한다. 공개 `/table/[identifier]` route는 UUID만으로 권한을 부여하지 않고 active table, 메뉴판 lifecycle, 상품 기능, runtime allowlist를 서버에서 다시 검증한다.

## 변경 범위

- `public.menu_tables.qr_public_id uuid not null default gen_random_uuid()` 추가
- `qr_public_id` unique index 추가
- QR 교체 시 legacy `token_hash`, `qr_public_id`, 기존 방문 세션을 함께 회전·폐기
- 기존 RLS, table grant, service-role 최소 권한은 변경하지 않음
- 고객 데이터 hard delete, 결제·구독·entitlement 변경 없음

## 적용 전 확인

1. 대상이 `tablescene-prod`인지 확인한다.
2. migration history에 `20260901072048`이 아직 없는지 확인한다.
3. `public.menu_tables`와 `private.revoke_table_visit_sessions()`의 기존 정의를 백업한다.
4. 열린 Draft PR의 TypeScript, lint, build, 관련 테스트와 GitHub 필수 check가 통과했는지 확인한다.

## 적용

Supabase SQL Editor에서 migration 파일 전체를 한 번만 실행한다. 중간 문장만 재실행하지 않는다.

## 적용 후 확인 SQL

```sql
select
  count(*) as total_tables,
  count(qr_public_id) as tables_with_public_id,
  count(distinct qr_public_id) as unique_public_ids
from public.menu_tables;

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'menu_tables'
  and column_name = 'qr_public_id';

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'menu_tables'
  and indexname = 'menu_tables_qr_public_id_idx';

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('menu_tables', 'table_visit_sessions')
order by table_name, grantee, privilege_type;
```

성공 기준:

- 세 count가 모두 동일하다.
- `qr_public_id`가 `uuid`, `NOT NULL`, `gen_random_uuid()` 기본값이다.
- unique index가 존재한다.
- `anon`, `authenticated`에 새 table 권한이 생기지 않았다.

## 코드 후속 작업

1. Supabase generated types를 CLI로 다시 생성한다. generated 파일은 수동 편집하지 않는다.
2. 임시 호환 cast를 generated type 기반 query로 교체한다.
3. Owner 계정에서 대표 QR과 기존 테이블 QR 재다운로드를 확인한다.
4. 테이블 이름 변경 뒤 URL 유지, `QR 교체` 뒤 URL 변경과 기존 URL 차단을 확인한다.
5. 일반 메뉴 QR에서는 table context와 스마트호출이 생기지 않는지 확인한다.

## 복구 원칙

Production 적용 후 즉시 column을 삭제하지 않는다. 문제가 생기면 새 UUID route 사용을 코드에서 중지하고 legacy hash route를 유지한다. 실제 인쇄 QR이 발급된 뒤 column이나 값을 제거하면 복구할 수 없으므로 별도의 사람 승인과 영향 조사가 필요하다.
