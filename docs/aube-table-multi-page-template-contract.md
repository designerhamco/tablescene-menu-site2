# 오브 테이블 멀티페이지 템플릿 계약

최종 갱신: 2026-08-30

## 제품 범위

- 템플릿 key: `dining_aube_table_a`
- 고객 표시명: `오브 테이블`
- 상품 등급: 다이닝 멀티페이지 월 9,900원 / 연 106,900원
- 디자인 방향: 기존 오브 커피의 컬러·타이포 토큰을 바탕으로 한 파인다이닝 메뉴북
- 신규 판매 상태: Production migration과 최종 시각 확인 전까지 `hidden`
- Brew Chapter: 신규 생성·구매·교체에서 제외한 `retired` 호환 renderer
- Order/PG: 미지원·장기 비활성
- Smart Call: 템플릿 내부가 아닌 기존 공통 Call Layer와 멀티페이지 entitlement를 재사용하며 Production runtime은 별도 승인 전 fail closed

## 커버 계약

- 커버 페이지는 선택 사항이며 노출·미노출을 전환해도 입력한 내용은 보존한다.
- 편집 필드는 커버 제목, 설명, 배경 이미지, 배경색이다.
- 커버는 한 viewport 안에서 보이며 자체 세로 스크롤을 만들지 않는다.
- 커버를 끄면 첫 번째 노출 메뉴 페이지부터 표시한다.

## 메뉴 페이지 계약

- 커버와 별개로 최대 10개 메뉴 페이지를 등록한다.
- 각 페이지는 페이지명, 설명과 설명 노출 여부, 페이지 노출 여부, 순서를 가진다.
- 데스크톱·태블릿 배치는 1열 또는 2열을 선택하고 모바일은 항상 1열이다.
- 텍스트 정렬은 페이지 단위로 왼쪽 또는 가운데를 선택한다.
- 메뉴 페이지는 세로 스크롤을 허용하며 묶음형 배치만 사용한다.
- 상단 편집 탭의 drag handle로 순서를 바꾸고 최종 저장 때 반영한다. 키보드와 모바일 사용자를 위한 위·아래 이동 조작도 함께 제공한다.

## 코스와 메뉴 계약

- 오브 테이블 편집 화면에서는 기존 카테고리를 `코스`로 표시한다. 단일페이지 템플릿의 카테고리 명칭과 동작은 바꾸지 않는다.
- 코스는 코스 이름, 설명과 설명 노출 여부, 가격, 가격 라벨, 가격 안내와 안내 노출 여부를 가진다.
- 메뉴 항목은 한 코스에 소속하거나 페이지에 직접 소속한다.
- 한 페이지에서 직접 메뉴와 코스를 함께 사용할 수 있다.
- 기존 메뉴 가격 옵션은 그대로 사용할 수 있다.
- 노출 중인 코스는 노출 메뉴를 최소 1개 포함해야 한다. 비노출·작성 중인 빈 코스는 저장할 수 있다.
- 노출 메뉴는 노출 중인 페이지 또는 그 페이지의 코스에 속해야 공개할 수 있다.

## 탐색 계약

- 고정 하단 dot은 노출 커버와 노출 메뉴 페이지를 순서대로 연결한다.
- dot click, 좌우 swipe, 키보드 좌우 화살표로 이동한다.
- 자동 재생과 무한 반복은 사용하지 않는다.
- 페이지를 바꾸면 새 페이지의 scroll 위치를 맨 위로 초기화한다.
- 고정 탐색이 메뉴 내용을 덮지 않도록 하단 safe area를 확보한다.

## 데이터와 migration

Migration: `supabase/migrations/20260830072554_add_aube_table_multi_page_fields.sql`

Production 절차: `docs/runbooks/aube-table-multi-page-migration.md`

- `menu_pages`: `layout_columns`, `text_alignment`
- `menu_categories`: 코스 가격·라벨·가격 안내와 노출 필드
- `menu_items`: 코스 없이 페이지에 직접 연결하는 `menu_page_id`
- `menu_category_translations`: 코스 가격 라벨·가격 안내 번역
- 메뉴·페이지·코스가 같은 menu site에 속하는지 검증하는 trigger와 직접 메뉴 조회 index
- 기존 행을 수정하거나 삭제하지 않으며 RLS·grant·Storage policy를 변경하지 않는다.
- generated Supabase types는 수동 편집하지 않는다. Production migration 적용 후 공식 생성 절차로 갱신한다.

## 적용 및 승인 경계

- 로컬 구현·테스트·미리보기와 Draft PR 생성까지만 자동 진행한다.
- Production SQL/migration 적용, 실제 데이터 생성·수정, 판매 노출, Smart Call runtime 활성화, PR Ready·병합은 이 작업에서 수행하지 않는다.
- Production 적용 전 migration SQL 재감사, backup/rollback 판단, postcheck, generated types 재생성이 필요하다.

## 로컬 QA

- TypeScript, lint, production build, 관련 계약 테스트를 통과해야 한다.
- 데스크톱에서 커버, 1열 가운데 정렬 페이지, 2열 왼쪽 정렬 페이지, 직접 메뉴·코스 혼합을 확인한다.
- 모바일 390×844에서 2열 설정이 1열로 축소되고 가로 overflow가 없어야 한다.
- dot click·keyboard page 이동, page change scroll reset, 콘솔 오류 없음과 가격 0원인 코스 단계 메뉴의 가격 미노출을 확인한다.
