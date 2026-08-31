# Shared menu catalog Production migration 기록

최종 갱신: 2026-08-28

## 대상과 승인

- Supabase project: `tablescene-prod`
- project ref: `kfbekbapwsyeanobyjsv`
- migration: `20260828040033_add_shared_menu_catalog.sql`
- 사용자 승인: 2026-08-28 현재 대화에서 Production 적용과 PR #51 병합을 명시적으로 승인

이 migration은 2026-08-28 Production에 정확히 1회 적용했다. **재실행하지 않는다.**

## 적용 전 확인

linked Production에 대한 read-only query에서 다음을 확인했다.

- `public.menu_site_content_links`: 없음
- `menu_categories.catalog_category_id`: 없음
- `menu_items.catalog_item_id`: 없음
- `public.import_menu_site_content(...)`: 없음
- `public.disconnect_menu_site_content(...)`: 없음
- 연결 메뉴판 삭제 방어 trigger: 없음

따라서 중복 적용 상태가 아니며 신규 schema 적용 대상으로 판정했다.

## 적용

Supabase CLI의 linked database query로 저장소 migration 파일을 그대로 1회 실행했다.

```bash
./node_modules/.bin/supabase db query --linked \
  --file supabase/migrations/20260828040033_add_shared_menu_catalog.sql
```

저장소의 기존 migration history는 원격 history table에 기록되지 않고 Management API/SQL Editor 수동 적용 기록으로 관리되어 있으므로 `supabase db push`나 linked `migration up`은 사용하지 않았다.

## 적용 후 확인

read-only postcheck 결과:

- `menu_site_content_links` RLS enabled: `true`
- 신규 link 행: `0`
- 기존 category 중 catalog ID가 생긴 행: `0`
- 기존 item 중 catalog ID가 생긴 행: `0`
- `anon` table select: `false`
- `authenticated` table select: `true`
- `anon` import/disconnect RPC execute: `false`
- `authenticated` import/disconnect RPC execute: `true`
- RLS policies: `4`
- 관련 triggers: `5`
- 공개 import/disconnect RPC: `SECURITY INVOKER`

즉 schema·RLS·RPC·trigger만 추가됐고 기존 고객 메뉴 데이터는 변경되지 않았다.

## Advisor와 generated types

- Supabase security advisor: 이번 migration에서 새 security warning 없음
- 기존 schema의 mutable search path·기존 SECURITY DEFINER grant·Auth leaked-password 설정 warning은 별도 기존 항목으로 유지
- performance advisor: 기존 schema의 다수 RLS·index warning과 함께 신규 정책의 `auth_rls_initplan` 권고가 있음. 권한 또는 정합성 오류는 아니며, 별도 Production RLS 변경 승인을 요구하는 최적화이므로 이번 rollout에는 추가 적용하지 않음
- `npm run supabase:types`로 `lib/supabase/types.ts`를 Production schema에서 공식 재생성했으며 수동 수정하지 않음

## 남은 검증

실제 가져오기는 대상 draft의 기존 메뉴를 명시적 확인 후 교체한다. 고객 데이터를 시험 대상으로 사용하지 않는다. 독립 복사·연결 유지·연결 해제 E2E는 교체 가능한 전용 Owner draft가 지정된 뒤 진행한다.
