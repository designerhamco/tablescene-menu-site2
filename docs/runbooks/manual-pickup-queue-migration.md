# 수동 대기번호 MVP migration 런북

최종 갱신: 2026-09-01

## 목적

Display 매장이 POS 연동 없이 대기번호를 직접 등록하고 `준비 중 → 픽업 요청 → 수령 완료`로 처리하는 무료 MVP를 제공한다. 이 기능은 ArtiMenu Order·PG·매출 데이터와 분리한다.

향후 POS 연동은 같은 행의 `source=external`, `external_order_ref`를 사용한다. POS 업체별 webhook·polling adapter는 계약과 API 문서가 확정된 뒤 별도 구현하며 관리자·고객 대기판 UI는 재사용한다.

## 변경 파일

- migration: `supabase/migrations/20260901030618_add_manual_pickup_queue.sql`
- server-only table: `public.menu_pickup_queue_entries`
- runtime: `PICKUP_QUEUE_ENABLED`, `PICKUP_QUEUE_ALLOWED_SITE_IDS`

## 보안 계약

- RLS와 FORCE RLS를 모두 활성화한다.
- `anon`, `authenticated`에는 직접 권한을 주지 않는다.
- server-side service role만 select/insert/update 가능하다.
- 앱 서버는 로그인 사용자의 `pickup.manage`, 활성 lifecycle, Display 템플릿, runtime/site allowlist를 다시 검증한다.
- 공개 대기판은 서버가 공개 가능한 메뉴판인지 확인한 뒤 오늘의 `waiting`, `ready` 번호만 반환한다.
- 고객명, 전화번호, 주문내용, 결제정보를 수집하지 않는다.
- delete 권한과 hard-delete UI를 제공하지 않고 `completed`·`cancelled` 상태로 보존한다.

## Production 적용 전 확인

1. 실제 운영할 Display pilot 메뉴판 UUID 한 개를 확정한다.
2. migration SQL과 RLS·grant·constraint를 최종 감사한다.
3. Production SQL 적용에 대한 사람 승인을 받는다.
4. migration 적용 후 generated types를 `npm run supabase:types`로 다시 생성한다. generated types를 손으로 편집하지 않는다.
5. Vercel Production에 다음 값을 설정하고 재배포한다.
   - `PICKUP_QUEUE_ENABLED=true`
   - `PICKUP_QUEUE_ALLOWED_SITE_IDS=<pilot menu_site UUID>`

## 적용 후 확인 SQL

```sql
select relrowsecurity, relforcerowsecurity
from pg_class
where oid = 'public.menu_pickup_queue_entries'::regclass;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'menu_pickup_queue_entries'
order by grantee, privilege_type;

select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'menu_pickup_queue_entries'
order by indexname;
```

성공 기준:

- `relrowsecurity=true`, `relforcerowsecurity=true`
- service role에 select/insert/update만 존재
- `(menu_site_id, business_date, queue_number)` unique index 존재
- pilot 메뉴판에서 수동 번호 등록, 픽업 요청, 수령 완료와 공개 대기판 자동 갱신 확인
- allowlist 밖 메뉴판과 비활성 lifecycle에서 관리자·공개 route 모두 fail closed

## 현재 상태

2026-09-01 명시적 사용자 승인 아래 `tablescene-prod`에 migration을 1회 적용했다.

- `relrowsecurity=true`, `relforcerowsecurity=true`
- `service_role`: `SELECT`, `INSERT`, `UPDATE`만 부여
- primary key, board index, site/date/number unique index, external-order partial unique index 확인
- Production schema로 generated types 재생성
- Production Display pilot `260630test` (`3f4a03e5-b85d-4536-91c5-6e1f5308abe9`)를 공개하고 Vercel Production에 `PICKUP_QUEUE_ENABLED=true`와 해당 UUID 한 개만 allowlist로 설정한 뒤 재배포
- 첫 등록 QA에서 Next.js `use server` 모듈의 객체 export 오류를 발견했으나 DB row는 생성되지 않았다. PR #104에서 action 모듈을 async function export로만 제한하고 회귀 테스트를 추가한 뒤 재배포
- QA 번호 `9999`를 관리자에서 등록하고 공개 `/pickup/260630test`의 `준비 중` 표시, `픽업 요청` 이동, `수령 완료` 후 공개 목록 제거를 확인
- Production DB에서 `source=manual`, `status=completed`, `ready_at`, `completed_at` 저장을 확인. 테스트 row는 감사 가능한 완료 이력으로 보존하고 활성 번호는 0건으로 정리
