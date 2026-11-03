# 테이블·키오스크 및 방식별 주문·호출 허용

2026-11-03. 사용자의 운영 DB 적용 승인을 받은 뒤 아래 두 마이그레이션을 연결 프로젝트에 순서대로 적용했다. 마이그레이션 이력도 두 버전만 applied로 기록했다. 앱 코드의 GitHub 업로드·배포는 아직 진행하지 않았다.

1. `20261103053430_add_table_terminal_device_info.sql`
2. `20261103061618_add_order_points_and_channel_permissions.sql`

## 변경과 기본값

- 기존 `menu_tables`를 공통 접수 대상 기반으로 유지하되 `point_kind=table|kiosk`를 추가한다. 기존 FK·주문·호출·QR·세션 ID는 변경하지 않는다. UI에서는 테이블과 키오스크를 구분하며 키오스크 이용을 위해 별도의 물리적 테이블을 만들지 않는다.
- 기존 행은 모두 `table`이며 태블릿/QR × 주문/호출 네 허용 플래그 기본값은 true다. 매장 전체 설정·공개 상태·활성 상태·이용권·런타임·체크아웃 조건은 계속 상위 조건이다. 개별 플래그는 결제나 전역 기능을 활성화하지 않는다.
- 키오스크는 별도 번호/이름을 등록한다. `customer_*`는 false로 고정되며 관리자 권한으로 발급한 terminal 세션만 허용한다. 모델·OS·브라우저는 표시용 정보이며 인증 식별자로 쓰지 않는다.
- 같은 구분 내 이름 중복을 차단하고 테이블/키오스크별로 각각 운영 항목100개를 허용한다. 구분은 생성 후 바꿀 수 없다.
- 접수 BEFORE INSERT 트리거는 최신 공개/활성/전체/채널 설정과 매장·접수 대상·세션의 일치를 확인한다. retained V2/V3 및 direct service-role INSERT도 검사한다. 기존 주문·호출 UPDATE/결제/취소/직원 관리 내역은 삭제하거나 재작성하지 않는다.
- kiosk V3의 주문별 idempotency는 유지한다. 다음 손님이 새 request ID로 같은 메뉴를 주문하는 경우에는 이전 손님의 장바구니와 같다는 재주문 경고를 하지 않는다. 일반 QR/테이블 태블릿의 재주문 확인은 유지한다.
- 고객 API에서 키오스크는 현재 화면이 알고 있는 receipt ID 한 건만 조회할 수 있다. ID 없이 과거 주문을 나열하거나 다른 키오스크의 receipt를 조회할 수 없다. 화면 새 주문 시작/닫기/완료 화면2분 무활동은 현재 receipt를 초기화한다. 등록된 terminal 연결과 접수된 주문은 유지한다.

## 적용 전후 확인

- 기존 두 테이블의 RLS/force-RLS와 역할 ACL, 기존 주문·호출·방문 행 수를 읽기 전용으로 기록한다. 운영 세션을 임의로 만들거나 종료하지 않는다.
- 새 제약/열/인덱스/트리거와 private 함수의 `SECURITY INVOKER`, 빈 search_path를 확인한다. anon/authenticated의 함수 execute가 없어야 한다. service_role은 기존처럼 menu_sites SELECT/UPDATE와 접수 대상/세션 접근이 필요하다(검사 중 FOR SHARE 사용).
- 새 키오스크·방식별 설정은 마이그레이션 전 UI에서 비활성화된다. 기존 테이블의 관리/QR/주문은 호환 기본값으로 동작한다. DB 적용 후에는 새 화면 진입 또는 새로고침으로 설정 가능 상태가 된다.
- 앱 롤백을 하더라도 개별 차단 트리거를 유지한다. 구 앱은 새 키오스크 구분을 모르므로 UI를 롤백해야 할 경우 키오스크 운영 진입을 먼저 통제하고, 검증 없이 구 앱 전체를 다시 노출하지 않는다. 새 데이터가 생긴 뒤 point_kind를 삭제하거나 키오스크를 table로 바꾸는 파괴적 롤백은 하지 않는다.

## 격리 검증

`PGLITE_TEST_MODULE=<별도 설치된 PGlite 모듈> node --import tsx scripts/qa-visit-order-history-db.mjs`

실제 기반 마이그레이션과 신규 SQL을 메모리 PostgreSQL에 적용한다. 실제 방문·주문·호출 서버 서비스/API에 DB transport와 권한 adapter만 연결해 검증한다. 운영 URL/키를 쓰지 않는다. `scripts/qa-order-point-channels.mjs`는 혼용, 채널 위조 거부, SQL 자체 차단, 테이블 없이 키오스크2대, 전체 OFF, QR의 kiosk 접근 차단, 동일 메뉴 연속 접수, request 재시도, receipt 격리, 연결 해제 및 RLS/함수 권한을 확인한다.


## 운영 적용 후 읽기 전용 확인 (2026-11-03)

- 적용 전 세 변경 대상 함수의 실제 본문이 저장소 기반 SQL과 같은지 확인한 뒤 적용했다. 이번 변경 이외의 함수 본문을 덮어쓰지 않았다.
- 기존 테이블7개/방문·기기 세션28개/주문12건/호출5건이 그대로였다. 테이블·세션·주문·호출의 식별 정보 집계 hash가 적용 전후 동일했고 기존 RLS/force-RLS/테이블 ACL도 동일했다.
- 기존 행7개는 모두 table과 기존 채널 허용 기본값을 유지했다. 기존 세션28개는 빈 device_info 기본값으로 유지했다. 실제 매장 기기를 새로 연결하거나 해제하지 않았다.
- 신규 열6개·트리거4개·함수 본문을 확인했다. 새 함수3개는 invoker/빈 search_path이며 anon/authenticated 실행 불가, service_role만 실행 가능했다. 기존5인자 등록 함수 본문은 변하지 않았다.
- 앱과 같은 환경의 Supabase REST 클라이언트에서 신규 열을 읽을 수 있었다. PostgREST schema cache 갱신도 확인했다.
- Supabase security advisors에 이번 함수·테이블 관련 항목은 없었다. 프로젝트 전체에는 기존 다른 함수의 search_path/definer 권한 및 Auth 설정 WARN22건이 있어 이번 승인 범위에서 수정하지 않았다. ‘프로젝트 전체 보안 경고0건’이라는 의미는 아니다.
