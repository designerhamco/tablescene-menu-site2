# 오브 테이블 스마트호출 Production 파일럿

최종 갱신: 2026-09-09

## 범위

- 사용자 제공 QA 계정 한 곳만 사용한다.
- 결제, 주문, 구독 레코드는 만들지 않는다.
- `dining_aube_table_a` 스타터와 14일짜리 QA entitlement만 생성한다.
- 테이블 관리와 스마트호출 runtime은 메뉴판 UUID allowlist를 모두 통과해야 열린다.
- 단일페이지, Display, 다른 멀티페이지 메뉴판에는 기능이 열리지 않아야 한다.

## QA 메뉴판

- slug: `aube-smart-call-qa`
- menu site id: `1b3d9a63-4bd8-480f-9527-a5c9737c2cf3`
- template: `dining_aube_table_a`
- product: `business_basic_multi_monthly`
- 생성일: 2026-09-09
- QA access 만료일: 2026-09-23

생성은 `scripts/seed-aube-smart-call-qa.ts`의 dry-run을 먼저 확인한 뒤 `--apply`로 한 번 실행했다. 동일 slug가 존재하면 중복 생성을 거부한다. 생성 중 스타터나 entitlement가 실패하면 방금 만든 메뉴판을 정리한다.

## Runtime 설정

코드 배포가 완료된 뒤 다음 네 값을 Production에 함께 설정한다.

- `TABLE_MANAGEMENT_ENABLED=true`
- `TABLE_MANAGEMENT_ALLOWED_SITE_IDS=1b3d9a63-4bd8-480f-9527-a5c9737c2cf3`
- `CALL_ENABLED=true`
- `CALL_ALLOWED_SITE_IDS=1b3d9a63-4bd8-480f-9527-a5c9737c2cf3`

전역 gate와 사이트 allowlist 중 하나라도 빠지면 기능은 fail closed 상태여야 한다. allowlist를 추가하기 전 버전에서는 테이블 관리 전역 gate를 켜지 않는다.

## 확인 순서

1. QA 계정의 `MY/메뉴판`에서 QA 오브 테이블이 활성 메뉴판으로 보이는지 확인한다.
2. `매장 운영`에서 QA 메뉴판만 선택할 수 있고 테이블·호출 메뉴가 활성화되는지 확인한다.
3. 테이블 두 개를 만들고 대표 QR과 테이블별 QR 주소·PNG 재다운로드를 확인한다.
4. 테이블 이름을 변경해도 QR 주소가 유지되는지 확인한다.
5. 테이블 QR로 접속해 테이블 번호, 호출 버튼, 저장된 호출 항목이 보이는지 확인한다.
6. 호출을 보내고 관리자 호출내역에서 항목·시간·테이블 번호가 일치하는지 확인한다.
7. 중복 요청과 완료 후 2분 cooldown이 동작하는지 확인한다.
8. 일반 메뉴 주소와 다른 메뉴판에서는 테이블 context와 호출 write가 열리지 않는지 확인한다.
9. QR 교체 후 이전 주소와 방문 세션이 차단되는지 확인한다.

## 2026-09-09 Production 확인 결과

- QA 계정의 `MY/메뉴판`과 `매장 운영`에서 QA 메뉴판 하나만 선택되는 것을 확인했다.
- 주문관리·매출요약·대기번호는 비활성이고, 호출관리·테이블·QR관리만 활성인 것을 확인했다.
- `창가 1번 테이블`, `2번 테이블`을 생성했다. 각 테이블은 서로 다른 `/table/[qr_public_id]` 주소를 발급받았다.
- `1번 테이블`을 `창가 1번 테이블`로 변경한 뒤에도 기존 공개 QR 식별자가 유지되는 것을 확인했다.
- `창가 1번 테이블` QR로 접속해 테이블명과 기본 호출 항목 네 개를 확인했다.
- `물 요청` 호출을 전송하고 관리자 호출내역의 항목·시간·테이블명이 일치하는 것을 확인했다. 접수 확인과 완료 전환, 손님 화면의 2분 재호출 제한도 확인했다.
- 호출 항목의 `테이블 정리`를 `냅킨 요청`으로 바꿔 저장한 뒤 손님 모달에 반영되는 것을 확인했고, 검증 후 `테이블 정리`로 원복했다.
- 이 과정에서 `replace_menu_call_items`의 `on conflict (menu_site_id, item_key)`가 PL/pgSQL 반환 컬럼과 충돌하는 Production 오류 `42702`를 발견했다. `20260909115000_fix_replace_menu_call_items_conflict.sql`로 제약조건명을 명시해 수정했고, 저장·공개 반영·원복을 재검증했다.
- Production DB의 마이그레이션 이력이 Supabase CLI의 remote 목록에 등록되어 있지 않아 `db push`는 사용하지 않았다. 검토한 SQL 파일 한 건만 Dashboard SQL Editor에서 직접 적용했다. 향후 CLI 일괄 적용 전에 원격 migration ledger 정리가 필요하다.

아직 남은 파일럿 확인은 QR 명시적 교체 후 이전 주소·기존 방문 세션이 폐기되는지 확인하는 한 건이다. 이 확인 전에는 allowlist를 다른 메뉴판으로 확장하지 않는다.

## 종료 및 복구

- 즉시 중지: 두 `*_ENABLED` 값을 `false`로 바꾸거나 두 allowlist에서 QA UUID를 제거하고 재배포한다.
- 파일럿 종료: 생성한 테이블과 방문 세션을 보관·폐기한 뒤 QA entitlement를 만료 처리하고 메뉴판을 보관한다.
- QA 메뉴판을 삭제해야 한다면 실제 고객 메뉴판이 아닌 위 UUID인지 다시 확인하고, entitlement를 먼저 정리한 뒤 QA 메뉴판을 정리한다.
