# ArtiMenu 전체 작업 큐

최종 갱신: 2026-09-01

상태 의미:

- `TODO`: 아직 시작하지 않음
- `IN_PROGRESS`: 현재 작업 브랜치에서 진행 중
- `NEEDS_HUMAN`: Production 접근, 실제 결제, 디자인 또는 제품 결정이 필요함
- `BLOCKED`: 선행 작업 또는 외부 조건 때문에 진행할 수 없음
- `DONE`: 완료됨. 다시 구현하지 않음

## 1. 사장·직원 권한 시스템

- `DONE` 직원 권한 DB 기반과 `menu_site_members`, `menu_site_invitations`, `menu_site_audit_logs`
- `DONE` 초대 수락 RPC와 Phase A RLS/constraint/index/trigger
- `DONE` 역할별 permission matrix와 공통 menu-site access helper
- `DONE` 사장 소유 메뉴판과 활성 직원 membership 메뉴판 통합 서버 조회
- `DONE` 직원 역할 표시 view model과 마이페이지 목록 연결
- `DONE` `menu.read` 권한 기반 직원 목록 접근, Owner 우선, revoked 제외, 비활성 lifecycle 제외
- `DONE` 직원의 Owner/Staff 미리보기 접근
- `DONE` 실제 직원 계정 viewer E2E — 승인된 기존 Owner·직원 계정과 운영 가능한 기존 메뉴판으로 초대 발송·수락, 역할 배지, Owner-only 버튼 숨김, 읽기 전용 미리보기, 편집 route 차단을 Production에서 확인
- `DONE` Owner/Manager/Editor 메뉴 편집 action 연결
- `DONE` 공개·비공개 변경을 Owner/Manager로 제한
- `DONE` 결제·구독·환불·복구·추가 구매·보관·삭제의 Owner-only runtime 검증 — `docs/owner-only-runtime-audit.md`
- `DONE` 직원 초대 UI와 이메일 전송 — 실제 발송은 수락 화면·SMTP QA 전까지 feature gate로 비활성, `docs/staff-invitation-delivery.md`
- `DONE` 초대 수락 화면 — HttpOnly intent cookie, verified Auth email, 원자적 수락 RPC 연결
- `DONE` 초대 재전송·취소 — Owner 재검증, batch token 회전, 발송 실패 rollback, revoke·audit 연결
- `DONE` 직원 역할 변경과 접근 회수 — Owner-only active membership, role allowlist, revoke·audit·rollback 연결
- `DONE` 직원용 마이페이지 상세 경험 — 관계 배지, permission 기반 기능 안내, 사장 전용 보관·삭제 탭 제외
- `DONE` 계정 역할 정보 구조 — 반복되는 메뉴판별 `사장` 배지를 로그인 정보로 이동하고 직원의 메뉴판별 세부 역할은 유지
- `DONE` 권한 제한 UI — 마이페이지·편집기·매장 운영 메뉴를 숨기지 않고 비활성 상태와 사유로 안내하며 직접 URL 접근도 서버에서 fail closed
- `DONE` 이미지·동영상 Storage 권한 — Production Storage policy 변경 없이 권한 확인 후 서버 경계에서만 실행
- `DONE` 위젯·번역·AI 권한 연결 — AI 사용은 Owner 크레딧, 충전·결제 UI는 Owner-only
- `DONE` 감사 로그를 모든 직원 작업에 연결 — 공통 write gate에서 actor·role·permission·surface 기록, audit 실패 fail closed, `docs/staff-write-audit.md`

## 2. 메뉴판 미리보기 기기 프레임

- `DONE` PC 프레임 — 1440×900 동일 출처 iframe viewport
- `DONE` 태블릿 프레임 — 가로 1180×820 기본, 세로 820×1180 전환이 가능한 동일 출처 iframe viewport
- `DONE` 모바일 프레임 — 390×844 동일 출처 iframe viewport
- `DONE` PC·태블릿·모바일 선택 버튼에 기기 아이콘을 함께 표시하고 단일·멀티페이지가 같은 실제 renderer를 사용하도록 유지
- `DONE` 기존 preview 화면과 renderer 재사용 — 실제 렌더링 route와 `MenuPageRenderer`를 그대로 사용
- `DONE` 새 창에서 실제 크기 보기
- `DONE` 모바일 Order/PG 미리보기 제거 — 장기 비활성 제품 정책에 따라 PG 선택 UI와 장바구니 흐름을 제거하고 스마트호출만 멀티페이지에서 노출
- `DONE` 별도 scale 엔진을 만들지 않는 제품 정책 확정

## 3. 활성 템플릿 전체 기능 QA

- `DONE` 실제 활성 템플릿 목록 확정 — `hidden`은 임시 판매 노출 상태이며 QA 제외 사유가 아님, `docs/active-template-qa.md`
- `DONE` 오브 커피 — 반응형·dense/footer/widget/multi-page renderer와 격리 저장 round-trip
- `DONE` 모카 포레스트 — 반응형 renderer와 격리 저장 round-trip
- `DONE` 선데이 라인 — 반응형·dense·4개 locale 최대 길이 renderer와 격리 저장 round-trip
- `DONE` 라운드 포커스 — 반응형·대표 메뉴 없음 fallback renderer와 격리 저장 round-trip
- `DONE` Brew Chapter — cover/no-cover/no-image·페이지 이동 renderer와 격리 저장 round-trip
- `DONE` 기타 활성 템플릿 — 누아 메뉴 반응형 renderer·fail-closed capability·격리 저장 round-trip
- `DONE` 위젯·디자인·폰트·배지·가격 옵션·품절·타임세일·이미지·커버 QA — 지원 capability 기반 desktop/mobile stress fixture와 계약 테스트
- `DONE` 한국어·영어·중국어·일본어 QA — 7개 출시 템플릿의 52개 desktop/mobile route, 장문 overflow·이미지·언어 control 확인
- `DONE` 생성·편집·최종 저장·preview·public QA — 7개 starter final-save round-trip과 동일 fixture preview/public desktop/mobile 비교
- `DONE` Display 별도 정책 유지 결정
- `DONE` Display 타임세일 지원 — 다이닝 공통 관리자 편집·저장·번역 계약 재사용, 공개 배지·정상가·할인가·마감 표시, 전체/분할 레이아웃 QA

## 3-A. 메뉴판 간 메뉴 재사용

- `DONE` 다이닝↔디스플레이 메뉴 가져오기 제품 계약 — 연결 유지와 독립 복사, 공통 필드와 메뉴판별 필드 분리, `docs/shared-menu-catalog.md`
- `DONE` Owner 전용 가져오기·연결 해제 화면과 원자적 RPC·동일 Owner 동기화 trigger 구현 — Draft PR #51
- `DONE` 공개·보관 메뉴판 덮어쓰기 차단, explicit confirmation, target advisory lock, 타 계정 전파 차단
- `DONE` 활성 연결 양쪽 hard delete 차단과 대상 Storage 경로 오소유 방지
- `DONE` 신규 shared-menu migration Production 1회 적용과 generated types 재생성 — 2026-08-28 사용자 승인, `docs/runbooks/shared-menu-catalog-migration.md`
- `NEEDS_HUMAN` 실제 Owner 계정의 안전한 draft 대상에서 독립 복사·연결·연결 해제 E2E — 대상 기존 메뉴가 교체되므로 별도 테스트 draft 지정 필요

## 3-B. 템플릿 교체·상품 등급

- `DONE` 누아를 제외한 다이닝 5개 출시 템플릿 교체 계약 — 누아는 신규 노출·생성·교체에서 제외하고 기존 데이터 renderer 호환성만 유지
- `DONE` 단일·멀티페이지, 디스플레이 이미지·영상 기능 등급 코드 계약
- `DONE` 교체 시 메뉴·가격·이미지·번역·URL 보존, 할인 비활성·위젯 미노출 후 재검수
- `DONE` 템플릿별 배경·폰트·배지 디자인 스냅샷 보존·복원
- `DONE` Owner-only 편집 화면 교체 UI, 같은 서비스·출시 템플릿 제한, 동시 변경 fail closed
- `DONE` 단일↔단일·멀티↔멀티만 허용하는 서버 등급 제한과 썸네일 카드 교체 UI
- `DONE` 멀티페이지 다이닝의 공통 Call Layer·Order 비활성 Call-only 계약 회귀 검증
- `DONE` 다이닝 신규 SKU·결제 entitlement 연결과 Production 제약 적용 — 단일 월 5,900원·연 63,700원, 멀티 월 9,900원·연 106,900원, 서버 등급 검증·갱신·환불·복구 연결과 기존 고객 레거시 SKU 보존
- `DONE` 다이닝 기능 매트릭스 — 단일 5,900원은 할인·위젯 포함, 멀티 9,900원은 할인·스마트호출 포함, Order는 모든 등급 미제공
- `DONE` 판매 가능한 멀티페이지 다이닝 `오브 테이블` 디자인·데이터 계약 — 커버 선택 노출, 최대 10개 메뉴 페이지, 1·2열/정렬 설정, 코스·직접 메뉴 혼합, 페이지 탭 드래그 정렬, 고정 dot 이동과 공개 renderer를 구현. 템플릿명과 스타터 이름을 통일하고 기본 커버는 `THE MENU`·한글 설명으로 구성했으며 기본정보 로고가 있을 때만 표시하고 텍스트 매장명은 커버에서 반복하지 않는다. 시그니처·단품·드링크 완성형 스타터와 전용 커버 이미지를 연결. 모든 페이지의 제목·설명은 중앙 정렬한다. `Signature Course`는 코스·메뉴 정보까지 중앙 정렬하고 `A La Carte Menu`·`Drink Menu` 본문은 왼쪽 정렬한다. Pretendard/Tenor Sans 기본값, 역할별 폰트·색상 저장 연동, 문장형 영문 대소문자, 유동 타이포·여백을 적용했다. `나머지 글자`는 메뉴 본문·가격·품절·Prev/Next와 모바일 헤더·언어 UI·스마트호출 모달 전체에 연동하며 한글/CJK와 영문·숫자를 분리 렌더링한다. 0.4초 페이지 전환 뒤 페이지 제목·코스 제목·메뉴 묶음 reveal과 아래에서 올라오는 스마트호출 bottom sheet를 연결했다. 완료된 실제 번역 데이터가 모두 준비된 언어만 공개하고 그 외에는 KR로 fail closed 한다. 커버 이미지에는 선택 배경색을 기본 75%로 겹치고 편집 화면에서 0~100%로 조절한다. additive migration과 generated types 갱신은 2026-08-30 사용자 승인 아래 Production 완료. pilot 지정·판매 노출은 별도 승인 필요
- `DONE` 두 번째 멀티페이지 템플릿 `메종 마레` — A타입의 커버·메뉴 페이지·코스·직접 메뉴·편집·번역·스마트호출 계약과 schema를 재사용하고, PC·태블릿은 왼쪽 페이지 메뉴/오른쪽 콘텐츠, 모바일은 헤더 아래 가로 스와이프 페이지명 탭으로 분리. 버건디·아이보리 컬러, Noto Serif KR·Cormorant Garamond 기본 글꼴, 모던 프렌치 스타터 데이터를 독립 적용. 하단 dot·Prev/Next·페이지 swipe를 제거하고 실제 커버 제목·페이지명만 전체 폭의 상단 정렬 행 버튼으로 표시. 실제 생성·구매·교체 후보에는 노출하지 않는 `coming_soon` 상태
- `DONE` 멀티페이지 A·B 코드 기반 생성 계약 QA — 실제 Production write 없이 구매 프로비저닝 경로를 재현해 페이지·코스·직접 메뉴·가격 옵션의 참조 무결성, 페이지별 1·2열/정렬 설정과 공개 가능 구조를 두 스타터 모두 검증. 실제 계정 결제·생성 E2E와 판매 노출은 계속 분리
- `DONE` 디스플레이 이미지·동영상 템플릿 통합 가격 — 월 정가 19,900원·오픈할인 14,900원, 연 160,900원. 별도 동영상 addon 없이 MP4 직접 업로드를 포함하고 파일당 30MB·메뉴판당 2개 제한과 장기 캐시를 유지하며, 기존 연 결제의 현재 환불 기준은 소급 변경하지 않음
- `NEEDS_HUMAN` 디스플레이 신규 이미지·동영상 템플릿 연결 — 최종 템플릿 디자인과 콘텐츠가 확정된 뒤 진행

## 3-C. AI 크레딧 웰컴 정책

- `DONE` 계정 첫 메뉴판 생성 완료 시 6크레딧 평생 1회 제품 계약 — `docs/ai-credit-policy.md`
- `DONE` 계정 단위 advisory lock·고유 index·소유권·최초 메뉴 재검증 migration 초안
- `DONE` 체험·사업자 신규 메뉴 성공 경로만 웰컴 RPC 연결
- `DONE` 추가 메뉴판·재구독·갱신 재지급과 체험 만료 회수 경로 제거
- `DONE` 요금 안내·FAQ·약관·개인정보처리방침 문구 동기화
- `DONE` 신규 migration Production 1회 적용·postcheck와 generated types 갱신 — 2026-08-28 사용자 승인, `docs/runbooks/ai-first-menu-welcome-credit-migration.md`
- `NEEDS_HUMAN` 전용 신규 QA 계정의 첫 메뉴 6개 지급·추가 메뉴 미지급 E2E

## 3-D. 단일페이지 월결제 30일 무료체험

- `DONE` 연간 가격을 월 할인가 × 12 × 90% 후 100원 단위 내림으로 통일 — 단일 63,700원, 멀티 106,900원, Display 160,900원
- `DONE` 별도 6,600원 개인 체험의 신규 공개 판매 경로 제거 — 과거 결제 복구·만료·전환 호환 코드는 보존
- `DONE` 결제수단 필수 등록, 첫 30일 0원, 30일째 단일페이지 월 5,900원 첫 결제 코드 구현
- `DONE` 무료체험 중 해지 예약 시 30일까지 접근을 유지하고 첫 결제보다 만료를 우선하는 기존 갱신 정책 회귀 검증
- `DONE` 계정당 최초 1회와 과거 개인 체험 중복 제외를 서버에서 fail-closed 검증
- `DONE` 사용자별 1회 trial 기간 컬럼·constraint·partial unique index Production 적용과 generated types 갱신 — 2026-08-29 사용자 승인, `docs/runbooks/business-subscription-free-trial-migration.md`
- `DONE` 승인된 약관 기준으로 Vercel Production `BUSINESS_SINGLE_MONTHLY_FREE_TRIAL_ENABLED=true` 설정 — 2026-08-29
- `DONE` PR #68 병합·Production 배포·공개 route QA — merge commit `ce844e0`, Vercel Production `READY`
- `NEEDS_HUMAN` 신규 전용 QA 계정에서 빌링키 발급·0원 시작·해지 예약·30일 첫 결제 경계 확인 — 실제 첫 결제 실행은 별도 승인

## 4. 모든 활성 템플릿의 모바일 Order 호환

> 2026-08-29 정책 변경: 아래 항목은 기존 호환 코드 기록이다. 신규 판매·공개 UI·API write에서는 Order를 제품 정책으로 비활성화하며, 모바일 미리보기의 PG 선택 UI도 제거한다.

- `DONE` 공통 모바일 상단 헤더 — template 외부 `PublicMenuExperienceShell`, safe-area sticky shell
- `DONE` 왼쪽 언어 변경 — 공통 locale control, 기존 template mobile control 중복 숨김. 오브 테이블은 원형 globe·그림자 없이 `KR/EN/CN/JP` 텍스트 control과 화면 안쪽 왼쪽 정렬 menu 사용
- `DONE` 가운데 테이블 번호 — 오브 테이블 모바일 헤더에서는 중복 매장명을 제거하고 유효 세션의 table label만 표시
- `DONE` 오른쪽 호출과 장바구니 및 장바구니 수량 — 오브 테이블 모바일은 그림자·외곽 도형 없는 header 호출 아이콘, PC는 기존 하단 호출 진입 유지. 독립 visibility와 99+ 수량 shell, 실제 action은 방문 세션 이후 연결
- `DONE` 기존 카테고리 탭 충돌 방지 — normal-flow sticky header와 6개 Basic mobile route QA
- `DONE` 주문은 모바일만 지원하는 정책
- `DONE` Display는 Order 미지원 정책
- `DONE` 유효한 테이블 방문 세션이 없을 때 주문·호출 숨김 — UI fail-closed selector, 실제 server session 검증은 섹션 5에서 연결

## 5. 테이블 QR와 방문 세션

- `DONE` 제품 정책 확정 — 방문 세션 비밀값은 hash-only로 유지하고, 재다운로드 가능한 불투명 공개 UUID를 별도로 사용. 12시간 세션, 메뉴판당 비보관 테이블 100개
- `DONE` DB 기반 migration 초안 — server-only RLS, 테이블 수·세션 만료 constraint, token 회전·비활성 시 세션 revoke
- `DONE` migration 수동 적용과 generated Supabase types 갱신 — 2026-08-06 `tablescene-prod` 1회 적용, `docs/runbooks/table-qr-session-foundation-migration.md`
- `DONE` 테이블 관리 — Owner/Manager create·update·disable·token rotate·archive, default-off runtime gate
- `DONE` 일반 메뉴 QR과 테이블 주문 QR 분리 — 일반 slug는 세션을 만들지 않고 `/table/[token]`만 방문 세션 발급
- `DONE` 안전한 QR 식별자 분리 — 기존 무작위 token hash와 방문 세션 비밀값은 서버에만 유지하고, 인쇄 주소에는 인증 권한이 없는 공개 UUID만 사용
- `DONE` 방문 세션과 만료 — server 발급, 12시간 이내 expiry, Secure·HttpOnly·SameSite=Lax cookie
- `DONE` 세션 재사용·탈취 방지 — menu-site/table/status/revoke/expiry/User-Agent hash 검증, last-seen write throttle
- `DONE` 통합 QR 관리 화면 — 대표 메뉴 주소·QR과 테이블별 고유 주소·QR을 한 화면에서 복사·재다운로드하고, 테이블명 변경은 주소를 유지하며 명시적 QR 교체만 기존 주소·방문 세션을 폐기
- `DONE` 재다운로드 QR용 `qr_public_id` Production migration 적용·generated types 갱신·postcheck — 2026-09-01 사용자 승인 아래 linked `tablescene-prod`에 SQL 파일 한 건만 직접 적용, `docs/runbooks/persistent-table-qr-public-id-migration.md`
- `DONE` 테이블별 고유 QR 계약 — 각 테이블은 예측 가능한 `/table1` 대신 서로 다른 UUID `/table/[uuid]`를 사용하고 서버에서 active table·메뉴판 lifecycle·runtime gate를 재검증
- `DONE` 제품 번들 정책 — 테이블 QR/session은 멀티페이지 9,900원 스마트호출에만 연결하고 단일페이지와 Order에서는 비활성
- `BLOCKED` 실제 멀티페이지 디자인과 pilot 메뉴판 확정 후 Production `TABLE_MANAGEMENT_ENABLED`·site allowlist 활성화

## 6. 모바일 장바구니와 후불 주문

- `BLOCKED` 실제 Order 상품화·활성화 — 장기간 사용하지 않는 제품으로 확정. 기존 구현과 데이터는 보존하되 환경변수가 남아 있어도 제품 정책 상 UI와 server write를 fail closed

- `DONE` V1 정책 확정 — Postpay 우선, Order·Call 별도 add-on, tableSessions 포함, 기기별 cart, 20 lines·50 units·line 20
- `DONE` DB 기반 migration 초안 — orderable 분리, 주문 option, session-bound order, immutable snapshot, idempotency, server-only RLS
- `DONE` migration Production 1회 적용과 generated Supabase types 갱신 — 2026-08-06 `tablescene-prod`, `docs/runbooks/postpay-order-foundation-migration.md`
- `DONE` 메뉴·옵션 선택과 수량 — 공통 모바일 drawer, required/min/max option, line/total limit
- `DONE` 장바구니 — visit-session scope local cart와 retry request UUID 유지; 요청사항 입력은 현재 고객 UI에서 제외하고 기존 선택적 DB 필드만 호환 유지
- `DONE` 테이블 번호와 주문 전송 — HttpOnly session 재검증 API와 atomic RPC Production 적용 완료
- `DONE` 주문 당시 메뉴·가격 snapshot — 제출 transaction에서 immutable snapshot 생성
- `DONE` 품절 주문 차단 — 제출 transaction에서 `visible/orderable/is_sold_out` 재검증
- `DONE` 중복 주문 방지 — session + client request UUID advisory lock/idempotency
- `DONE` atomic 주문 RPC migration Production 1회 적용과 generated types 갱신 — 2026-08-06 `tablescene-prod`, `docs/runbooks/postpay-order-submission-rpc-migration.md`
- `BLOCKED` Order 재개 — 향후 별도 제품 결정 전에는 `POSTPAY_ORDER_ENABLED`, allowlist, PG를 활성화하지 않음

## 7. 주문관리와 수동 결제

- `DONE` 전용 `매장 운영` 허브 — MY/메뉴판의 기존 구매 CTA 위치에서 진입하고, 공개·활성 멀티페이지와 Display 메뉴판을 runtime 활성 전에도 상단 탭에 노출. Order·매출 기존 화면은 호환 코드로 보존하고 스마트호출·테이블·대기번호는 개별 runtime·site allowlist·권한에 따라 비활성 사유를 표시
- `DONE` 매장 운영·모바일 계정 UX — 운영 왼쪽에 AI 크레딧 없는 로그인 정보 제공, 모바일 알림을 햄버거 옆 숫자 배지 아이콘으로 이동, `1:1 문의` 로그인 복귀와 임시 `채팅상담` 동선 제공
- `DONE` 매장 운영 진입 위치 — 공통 PC·모바일 헤더에서는 제거하고 MY/메뉴판의 `메뉴판 추가 구매` 버튼을 `매장 운영`으로 교체
- `DONE` 주문 접수·조리 전·조리 중·조리 완료·제공 완료 — 전방향 단계별 conditional update
- `DONE` 미결제 주문 취소와 취소 사유 — 제공 전·미결제만 1–500자 사유로 취소
- `DONE` 기존 카드단말기 결제완료 — ArtiMenu 카드 승인 없이 `manual_card` 기록
- `DONE` 현금 결제완료 — `manual_cash` 기록
- `DONE` 처리 직원 기록 — 재인증 permission gate와 `status_updated_by`/`payment_completed_by`
- `DONE` 브라우저 영수증 — immutable snapshot 기반 인쇄 전용 영수증
- `BLOCKED` Order Dashboard 신규 활성화 — Order 재개 정책 전까지 기존 화면만 보존

## 8. Call 기능

- `DONE` 손님 직원 호출 MVP — 유효 table session과 공통 Call Layer, 직원 호출 단일 preset
- `DONE` 오브 테이블 스마트호출 경험 — 우측 하단 전용 호출 버튼, 테이블 번호와 관리자 항목명만 노출하는 white bottom sheet, 바깥 영역·handle 닫기, 실제 write 없는 공개 템플릿 미리보기, 호출 완료·취소 후 2분 cooldown 안내
- `DONE` 기본 호출 항목 미리보기 — 물·식기·테이블 정리 뒤 범용 직원 호출을 마지막 대안으로 두는 4개 선택지를 실제 write 없는 화면에서 확인 가능
- `DONE` 실제 매장별 호출 항목 관리·저장·전송 코드 — 기본 4개, 매장별 이름·순서·사용 설정, 보관 처리, 접수 당시 항목명 snapshot, 기존 제한 유지
- `DONE` 매장별 호출 항목 Production migration 1회 적용과 generated types 갱신 — 2026-08-28 사용자 승인, `docs/runbooks/store-call-items-migration.md`
- `DONE` 호출 목록과 처리 직원 — `call.manage` Owner/Manager/Order staff 권한과 actor 기록
- `DONE` 접수 확인과 처리 완료 — `pending → acknowledged → completed` conditional update
- `DONE` 중복·과다 호출 방지 — 미처리 호출 반환, 완료·취소 후 2분 cooldown, session당 시간당 10회
- `DONE` 호출 이력 — 최근 100건과 테이블·선택 호출 내용·상태·시간을 15초 갱신 대시보드에서 조회
- `DONE` Call MVP migration Production 1회 적용과 generated types 갱신 — 2026-08-07 `tablescene-prod`, `docs/runbooks/call-mvp-foundation-migration.md`
- `DONE` 실제 Call 상품 entitlement — 멀티페이지 다이닝 9,900원 번들에 포함하고 단일페이지·Display·Order에서는 fail closed
- `BLOCKED` 실제 Call Production 활성화 — 판매 가능한 멀티페이지 디자인과 pilot 메뉴판을 만든 뒤 `TABLE_MANAGEMENT_ENABLED`, `CALL_ENABLED`, 명시적 site allowlist를 함께 설정

## 8-A. Display 수동 대기번호

- `DONE` POS·Order·PG와 분리된 무료 수동 MVP 계약 — 사장이 숫자만 등록하고 `준비 중 → 픽업 요청 → 수령 완료`로 처리
- `DONE` 관리자 `매장 운영 > 대기번호` 화면과 공개 `/pickup/[slug]` 대기판 — 오늘 번호만 표시하고 10초 자동 갱신. 공개 대기판은 실제 메뉴판의 `template_key`와 저장된 글꼴 설정을 읽어 템플릿별 전용 디자인으로 연결하며, 현재 판매 가능한 Display `썸머 블루(display_menu_a)`는 청록·화이트 팔레트와 동일 타이포를 사용
- `DONE` Owner/Manager/Order staff의 `pickup.manage` 권한, 직원 write audit, Display·활성 lifecycle·runtime/site allowlist fail-closed 경계
- `DONE` 향후 POS adapter 경계 — `source=external`, `external_order_ref`를 예약하고 현재 UI·상태 모델 재사용
- `DONE` Production migration 적용과 generated types 재생성 — 2026-09-01 `tablescene-prod` 1회 적용, RLS·FORCE RLS·service-role 최소 권한·인덱스 postcheck 완료, `docs/runbooks/manual-pickup-queue-migration.md`
- `DONE` Production pilot 활성화와 E2E — 공개 `260630test` 한 곳에만 Vercel `PICKUP_QUEUE_ENABLED=true`·명시적 site allowlist를 설정하고 재배포. QA 번호 `9999`를 `준비 중 → 픽업 요청 → 수령 완료`로 전환해 관리자 화면·공개 대기판·DB 타임스탬프를 확인했으며 활성 목록에는 남기지 않음
- `BLOCKED` POS 자동 연동 — POS 업체·API·계약·인증·주문번호 규칙 확정 후 진행

## 9. 선결제 PG

- `DONE` 현재 PortOne 코드·공식 V2 문서 감사와 merchant 구조 권장안 — `docs/prepay-pg-decision.md`
- `DONE` PortOne 파트너 정산 자동화·오픈마켓 하위상점 전표 지원 추가 감사 — 배달 플랫폼·식당 정산 사용 사례는 확인했으나 직접 merchant 구조와는 구분, `docs/prepay-pg-decision.md`
- `NEEDS_HUMAN` PortOne에 독립 음식점 직접 merchant 구조와 ArtiMenu 플랫폼 하위 정산 구조의 계약·전표·정산 책임 서면 확인
- `NEEDS_HUMAN` 음식점 직접 merchant와 ArtiMenu 플랫폼 하위 정산 중 제품·법률·운영 모델 결정
- `BLOCKED` 사업자별 PG 온보딩 구현 — PortOne 답변과 첫 pilot 음식점 확정 후 진행
- `BLOCKED` 모바일 선결제 — Order/PG 장기 비활성 제품 정책이 해제되고 계약 구조가 확정될 때까지 구현하지 않음
- `BLOCKED` 웹훅과 idempotency — Order/PG 장기 비활성 제품 정책이 해제되고 계약 구조가 확정될 때까지 구현하지 않음
- `BLOCKED` 결제 실패 — Order/PG 장기 비활성 제품 정책이 해제되고 계약 구조가 확정될 때까지 구현하지 않음
- `BLOCKED` 취소·부분취소·환불 — Order/PG 장기 비활성 제품 정책이 해제되고 계약 구조가 확정될 때까지 구현하지 않음
- `BLOCKED` 주문 상태와 결제 상태 분리 — Order/PG 장기 비활성 제품 정책이 해제되고 계약 구조가 확정될 때까지 구현하지 않음
- `NEEDS_HUMAN` 실제 결제·취소·환불 검증

## 10. 매출관리와 알림

- `DONE` 일별·월별 매출과 주문 수 — 한국 시간 기준 주문 접수·결제 완료 시각 분리 집계, `sales.read`와 기존 Order Dashboard default-off gate 재사용
- `DONE` 메뉴별 판매량 — 결제 완료 주문의 immutable item snapshot을 메뉴명 기준으로 합산한 Top 10
- `DONE` 결제수단별 집계 — 외부 카드 단말기·현금·PG 완료 건수와 금액
- `DONE` 취소·미결제 집계 — 당월 생성 주문의 현재 취소·미결제 건수와 주문금액
- `DONE` 주문 알림과 호출 알림 — 최초 목록은 조용히 기준선으로 저장하고 이후 15초 갱신에서 새 ID만 session-scoped 앱 내 배너·문서 제목으로 표시
- `DONE` 사용자 선택형 브라우저 알림 — 관리 화면에서 직접 켠 경우에만 비활성 탭·창에서도 기존 15초 갱신을 유지해 새 ID를 일반화된 문구로 표시, 자동 권한 요청·소리·외부 전송·백그라운드 push 없음
- `NEEDS_HUMAN` 알림톡·문자·백그라운드 push 같은 외부 채널의 업체·비용·동의·fallback 정책 결정

## 11. 전체 고객 흐름 QA

- `DONE` 반복 가능한 전체 계약 테스트 — `npm test` 한 명령으로 28개 파일·142개 테스트 실행, 해지 예약 구독 재결제 차단과 Order/Call 공통 gate 회귀 포함
- `DONE` Production `menu_site_id is null` 결제 주문 읽기 전용 감사 — 3건 중 AI 크레딧 10개 충전 2건은 계정 단위 정상 완료로 확인하고, 실제 미이행은 주소 중복으로 메뉴판·entitlement가 생성되지 않은 과거 6,600원 개인 체험 1건으로 분리. 고객 식별정보와 결제 ID는 출력하지 않음, `docs/runbooks/incomplete-payment-order-audit.md`
- `NEEDS_HUMAN` 과거 미이행 개인 체험 결제 1건 처리 — 실제 PG 취소 가능 상태를 확인한 뒤 6,600원 전액 환불할지, 현재 상품 이용권으로 대체 제공할지 결정 필요. 자동 환불·데이터 변경 금지
- `NEEDS_HUMAN` 회원가입·구매·메뉴판 생성 — 전용 신규 QA 계정의 실제 가입 메일·인증 링크·로그인 세션 E2E 완료. 구매·첫 메뉴 생성은 실제 빌링키와 PortOne 단계가 필요
- `DONE` 직원 초대·수락·접근 — 승인된 기존 Owner·직원 계정으로 실제 이메일 발송·수락과 viewer 화면·미리보기·편집 차단 E2E 확인
- `DONE` 메뉴 편집·디자인·위젯·다국어 — 활성 템플릿 저장·locale·capability·preview/public QA 재확인
- `DONE` 미리보기·공개·일반 QR — 공통 renderer·기기 프레임·공개 route·QR 분리 QA 재확인
- `DONE` 멀티페이지 스마트호출 로컬 통합 QA — 유효 세션·Business Basic·멀티페이지·runtime 공통 gate, 단일페이지·no-session·Display 제외, 호출 접수·처리 상태 흐름 재검증
- `BLOCKED` 테이블 QR·방문 세션·스마트호출 Production E2E — 판매 가능한 멀티페이지 템플릿과 pilot 메뉴판 확정 후 수행
- `BLOCKED` 주문관리·수동 결제완료 E2E — Order 제품 재개 전까지 기존 호환 코드만 보존
- `NEEDS_HUMAN` 보관·복구·해지 — Owner runtime 감사 완료, 실제 구독 상태 변경 E2E 필요

## 12. 오픈 준비

- `DONE` 사용자 표시 브랜드를 `아티메뉴` / `ArtiMenu`로 통일하고 내부 호환 식별자는 유지
- `DONE` PG 심사용 다이닝 5상품 분리 노출과 공개 상품 상세·제공·교환·환불 안내 — `docs/pg-site-review-readiness.md`
- `DONE` QR오더 소개의 미구현 PG·정산 표현 제거와 계약 전 준비 상태 명시
- `DONE` 직원 초대 이메일 실제 발송과 기존 직원 계정 수락
- `DONE` Production 의존성 보안 패치 — Next.js 16.3.1, eslint-config-next 16.3.1, React Router 7.18.2와 안전한 transitive 버전으로 갱신하고 Production audit 0건 및 전체 138개 테스트·TypeScript·lint·build 재검증
- `DONE` 아티메뉴 Supabase Auth 메일 문구·Production 템플릿 적용 — 회원가입 인증과 비밀번호 재설정 제목·HTML을 준비하고 2026-09-01 `tablescene-prod`에 두 템플릿만 적용·새로고침 재검증. callback/reset 경로, QA·롤백·보안 기준은 적용 런북에 기록
- `IN_PROGRESS` 회원가입·비밀번호 재설정 이메일 실제 QA — 재설정 메일의 Resend `delivered`·한국어 제목·HTML·발신자·recovery redirect와 네이버 데스크톱 렌더링을 확인했다. 신규 QA 계정의 가입 메일은 Gmail 실제 수신, DKIM·SPF·DMARC 통과, 한국어 제목·HTML, 인증 링크의 `/mypage` 이동과 로그인 세션 생성까지 완료. 실제 모바일 메일 클라이언트 렌더링과 재설정 링크·새 비밀번호 저장·재사용 차단은 남음
- `DONE` Production custom SMTP와 Auth URL 설정 확인 — Resend 인증 도메인 `dndcommerce.co.kr`, 전용 sending key, `아티메뉴 <no-reply@dndcommerce.co.kr>`, `smtp.resend.com:465` 활성화. Site URL과 Production/Preview callback·reset redirect 재확인
- `NEEDS_HUMAN` Production 환경변수 값·비밀키 유효성 — 이름과 scope, 의도한 default-off runtime gate는 읽기 전용 확인 완료. execute/mock flag 실제 값과 비밀키 유효성·회전 시점은 값을 노출하지 않는 별도 운영 확인 필요, `docs/runbooks/vercel-production-runtime-audit.md`
- `IN_PROGRESS` Vercel Cron 실제 실행 QA — Cron 기능과 3개 일정 등록, 저장소 일치, 무인증 `401` 차단 확인 완료. Hobby 로그 제한 때문에 다음 확인 창은 2026-09-02 03:00~03:59 KST와 04:00~04:59 KST, `docs/runbooks/vercel-production-runtime-audit.md`
- `NEEDS_HUMAN` PortOne 실제 결제 확인
- `NEEDS_HUMAN` 약관 시행일과 프로모션 기간 확정
- `NEEDS_HUMAN` 최종 디자인 육안 확인
- `NEEDS_HUMAN` 최종 배포와 Draft PR 병합 승인

## 13. 향후 AI 상담

- `DONE` AI 챗봇 초기 제품 범위 — 사이트 이용 안내만 제공하고 계정·결제·환불 실행 및 개인정보 입력을 금지하며 불확실한 답은 1:1 문의로 전환, `docs/ai-support-chat-policy.md`
- `DONE` 대화 DB 미보관, OpenAI Responses API `store=false`, 질문·응답 길이와 요청 횟수 제한, default-off runtime gate
- `DONE` `/support/chat` 상담 화면과 고객센터 진입 — runtime-off에서는 준비 중 안내와 1:1 문의만 표시
- `NEEDS_HUMAN` Production `AI_SUPPORT_CHAT_ENABLED` 설정·재배포와 실제 비용·응답 품질 QA

## 다음 작업

`오브 테이블 A`의 pilot 지정·신규 판매 노출과 스마트호출 Production runtime은 별도 승인 전까지 fail closed 상태를 유지한다. `메종 마레`는 독립 디자인과 스타터, 코드 기반 구매 프로비저닝 계약까지 검증한 `coming_soon` 템플릿이며, 실제 계정 결제·생성 및 편집·미리보기·공개 E2E가 끝나기 전 판매·교체 후보로 전환하지 않는다. 실제 Owner의 메뉴 가져오기 E2E는 기존 내용을 교체해도 되는 전용 draft가 지정된 뒤 수행한다. QR오더·PG·주문 기능은 장기 비활성 제품으로 보존하며 별도의 재개 결정 전에는 구현·활성화하지 않는다.
