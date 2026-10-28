# 매장 운영 네 메뉴 분리·전체 판매 메뉴 주문 정책

## 현재 상태

구현·격리 검증·로컬 실계정 검수를 완료했다. **운영 SQL과 운영 허용 대상 추가는 미실행·승인 대기**다. 승인 전에는 새 코드와 DB의 주문 판정을 다르게 배포하지 않는다. 다른 알림 채팅의 #404 변경은 최신 기준으로 포함했고 해당 파일은 수정하지 않았다.

## 화면과 권한

- `/tables`: 테이블 등록, 이름/사용 상태, 보관. 생성 시 QR ID는 기존 방식으로 자동 발급되지만 주소·다운로드·교체 UI는 이 화면에 두지 않는다.
- `/calls`: 기존 내역·처리와 사용 ON/OFF, 호출 항목. `/orders`: 기존 내역·상태와 전체 주문 ON/OFF. 상품별 주문 상품·옵션 및 코스별 opt-in UI는 제거한다. 기존 저장 옵션 선택/서버 가격 검증은 유지한다.
- `/qr`: 대표 메뉴 QR + 같은 menu_tables의 테이블별 주소·다운로드·매장 단말 링크·교체. 대표 QR만의 중복 페이지는 없다. 내 메뉴판 다운로드 팝업은 테이블 0개일 때 테이블 등록으로, 그 외에는 QR 관리로 연결한다.
- qr.manage와 table.manage를 구분한다. 테이블 전용 직원은 QR API를 사용할 수 없고 QR 전용 직원에게 테이블 목록을 추가 노출하지 않는다. QR 교체는 기존 table.manage 쓰기 검증을 그대로 사용한다.
- 활성 테이블 없는 ON 저장 차단, OFF 저장 가능, 주문·호출 독립 저장, 기존 내역 접근 유지. 테이블 변경은 QR·주문/호출/설정/대시보드를 함께 revalidate한다.

## 실제 주문 판정

현재 서버는 submit_postpay_order_v2만 사용한다. 카탈로그와 V2 모두 상품별 orderable·코스별 orderableCourseIds를 자격 조건에서 제거한다. 과거 필드/옵션 그룹/옵션 값은 삭제하거나 일괄 갱신하지 않는다. 유효한 코스는 전체 단위로 주문하며 구성 요리 개별 주문은 차단한다. 품절·숨김·가격 비공개·숨겨진 카테고리/페이지·유효하지 않은 가격과 잘못된 옵션은 기존대로 거절한다. 서버 가격·할인·필수 옵션·수량 제한·중복 요청·활성 테이블 방문·전역 주문 opt-in 검증을 유지한다. 레거시 V1과 과거 주문 스냅샷은 변경하지 않는다.

## 검증

- 전체 단위/계약 892건, 타입, 최적화 빌드 통과. 변경 파일 lint 오류 없음.
- `scripts/qa-global-order-catalog-db.mjs`: 격리 Postgres 29건. 과거 OFF 상품 주문 성공, DB 가격 사용, 자동 코스 전체 주문·구성품 차단, 품절/숨김/가격/페이지/카테고리/옵션/다른 메뉴판/비활성 방문 차단, 기존 상품 행·함수 owner/ACL/invoker/search_path 불변.
- 새 V2를 적용한 `scripts/qa-visit-order-history-db.mjs`: 실제 서버·API·내역·취소·상태·외부 결제 표시 79건 통과. 테스트 데이터는 격리 DB에만 생성한다.
- 실제 로그인한 사장 계정의 261022test에서 3001 테이블 폼 접근, QR 대표 다운로드/빈 테이블 안내, 주문 상품·옵션과 코스별 스위치 없음, 테이블 0개 ON 차단을 확인했다. 실제 DOM 1280×720·820×1180·390×844 가로 넘침 없음. 운영 데이터 쓰기 0회.
- 스크린샷은 `/private/tmp/artimenu-separated-tables.png`, `/private/tmp/artimenu-separated-qr.png`, `/private/tmp/artimenu-separated-orders-mobile.png`.

## 승인할 운영 변경

1. `supabase/migrations/20261028141514_simplify_menu_item_orderability.sql` 한 건만 tablescene-prod에 1회 적용한다. V2 함수만 교체하며 운영 원문 해시가 `2ad5cb39b931c262031df9976d1aa494`와 다르면 전체 트랜잭션을 중단한다. 새 테이블/권한/상품/옵션/결제/구독 데이터 변경이나 과거 migration 재실행은 없다.
2. 현재 사장 메뉴판 **261022test / b456dd24-6b7a-45ac-ad5f-8f36e23459c0** 한 곳만 테이블·후불 주문·주문관리·호출 연결 대상에 추가한다. 기존 허용 대상/값은 보존한다. TABLE_MANAGEMENT_ALLOWED_SITE_IDS, POSTPAY_ORDER_ALLOWED_SITE_IDS, ORDER_DASHBOARD_ALLOWED_SITE_IDS, CALL_ALLOWED_SITE_IDS를 대상으로 하며 전역 실행 설정을 무관한 범위로 확대하지 않는다.
3. 사장님의 저장된 주문·호출 OFF는 유지한다. 사용자가 직접 테이블을 등록·활성화하고 각 기능을 ON해야 접수할 수 있다. 직원 권한, 구독, 자동 청구, 실제 카드 결제는 바꾸지 않는다.

## 적용 순서와 복구

- 승인 직후 공식 CLI read-only precheck를 재실행한다. `/private/tmp/separate-operations-db-precheck.json`에는 운영 함수 원문/ACL과 9개 표 건수·행 지문이 저장돼 있다. 적용 전 최신 스냅샷을 별도 보존한다.
- 사전 운영 조회: 함수 invoker·빈 search_path·postgres owner·postgres/service_role만 execute. 상품 968, 카테고리 268, 테이블 4, 방문 26, 주문 10, 주문 항목 10, 주문 옵션 5, 옵션 그룹 1, 옵션 값 2. 261022test는 공개 cafe_design_a, 테이블 0개·주문/호출 false, 상품 22개·과거 orderable true 0개. 실제 적용 직전 값은 다시 확인한다.
- 승인 파일 원문 한 건만 공식 `supabase db query --linked --file ...`로 실행한다. db push/reset과 과거 SQL 일괄 적용은 금지한다.
- 사후 함수 본문/ACL·RLS와 전후 행 지문을 비교한다. 접수/옵션 함수의 인자·반환 타입은 같아 generated types 변경은 불필요하다.
- 기존 운영 변수 목록을 먼저 읽고 현재 메뉴판 UUID만 합집합으로 추가한다. 사용 설정 행을 자동 변경하지 않는다. 같은 검증 커밋의 Production 배포 성공과 실제 운영 화면을 확인한다. 검수를 위해 실제 테이블·주문·호출·결제 기록을 만들지 않는다.
- 실패 시 동작을 멈추고 기존 함수 원문(`/private/tmp/separate-operations-original-function.sql`)과 이전 코드·허용 목록으로 복구한다. 고객 데이터를 삭제/되돌려 쓰지 않는다.

운영 SQL 승인은 docs/project-state.md의 Production 적용 경계, 대상 추가 승인은 docs/order-call-product-contract.md의 현재 운영 경계를 따른다.
