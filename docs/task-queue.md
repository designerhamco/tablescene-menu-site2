# MenuLink 전체 작업 큐

최종 갱신: 2026-08-06

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
- `BLOCKED` 실제 직원 계정으로 역할 배지·버튼 숨김·읽기 전용 미리보기 E2E 확인 — 직원 초대·수락 기능 완료 후 진행하며, 확인용 Production 직원 데이터는 만들지 않음
- `DONE` Owner/Manager/Editor 메뉴 편집 action 연결
- `DONE` 공개·비공개 변경을 Owner/Manager로 제한
- `DONE` 결제·구독·환불·복구·추가 구매·보관·삭제의 Owner-only runtime 검증 — `docs/owner-only-runtime-audit.md`
- `DONE` 직원 초대 UI와 이메일 전송 — 실제 발송은 수락 화면·SMTP QA 전까지 feature gate로 비활성, `docs/staff-invitation-delivery.md`
- `DONE` 초대 수락 화면 — HttpOnly intent cookie, verified Auth email, 원자적 수락 RPC 연결
- `DONE` 초대 재전송·취소 — Owner 재검증, batch token 회전, 발송 실패 rollback, revoke·audit 연결
- `DONE` 직원 역할 변경과 접근 회수 — Owner-only active membership, role allowlist, revoke·audit·rollback 연결
- `DONE` 직원용 마이페이지 상세 경험 — 관계 배지, permission 기반 기능 안내, 사장 전용 보관·삭제 탭 제외
- `DONE` 이미지·동영상 Storage 권한 — Production Storage policy 변경 없이 권한 확인 후 서버 경계에서만 실행
- `DONE` 위젯·번역·AI 권한 연결 — AI 사용은 Owner 크레딧, 충전·결제 UI는 Owner-only
- `DONE` 감사 로그를 모든 직원 작업에 연결 — 공통 write gate에서 actor·role·permission·surface 기록, audit 실패 fail closed, `docs/staff-write-audit.md`

## 2. 메뉴판 미리보기 기기 프레임

- `DONE` PC 프레임 — 1440×900 동일 출처 iframe viewport
- `DONE` 태블릿 프레임 — 820×1180 동일 출처 iframe viewport
- `DONE` 모바일 프레임 — 390×844 동일 출처 iframe viewport
- `DONE` 기존 preview 화면과 renderer 재사용 — 실제 렌더링 route와 `MenuPageRenderer`를 그대로 사용
- `DONE` 새 창에서 실제 크기 보기
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

## 4. 모든 활성 템플릿의 모바일 Order 호환

- `DONE` 공통 모바일 상단 헤더 — template 외부 `PublicMenuExperienceShell`, safe-area sticky shell
- `DONE` 왼쪽 언어 변경 — 공통 locale control, 기존 template mobile control 중복 숨김
- `DONE` 가운데 매장명과 테이블 번호 — 유효 세션 context에서만 table label 표시
- `DONE` 오른쪽 호출과 장바구니 및 장바구니 수량 — 독립 visibility와 99+ 수량 shell, 실제 action은 방문 세션 이후 연결
- `DONE` 기존 카테고리 탭 충돌 방지 — normal-flow sticky header와 6개 Basic mobile route QA
- `DONE` 주문은 모바일만 지원하는 정책
- `DONE` Display는 Order 미지원 정책
- `DONE` 유효한 테이블 방문 세션이 없을 때 주문·호출 숨김 — UI fail-closed selector, 실제 server session 검증은 섹션 5에서 연결

## 5. 테이블 QR와 방문 세션

- `DONE` 제품 정책 확정 — hash-only token, 최초·회전 시 1회 QR 전달, 12시간 세션, 메뉴판당 비보관 테이블 100개
- `DONE` DB 기반 migration 초안 — server-only RLS, 테이블 수·세션 만료 constraint, token 회전·비활성 시 세션 revoke
- `DONE` migration 수동 적용과 generated Supabase types 갱신 — 2026-08-06 `tablescene-prod` 1회 적용, `docs/runbooks/table-qr-session-foundation-migration.md`
- `DONE` 테이블 관리 — Owner/Manager create·update·disable·token rotate·archive, default-off runtime gate
- `DONE` 일반 메뉴 QR과 테이블 주문 QR 분리 — 일반 slug는 세션을 만들지 않고 `/table/[token]`만 방문 세션 발급
- `DONE` 안전한 QR token — 생성·회전 시 raw token 1회 전달, DB와 목록 DTO에는 SHA-256 hash만 유지
- `DONE` 방문 세션과 만료 — server 발급, 12시간 이내 expiry, Secure·HttpOnly·SameSite=Lax cookie
- `DONE` 세션 재사용·탈취 방지 — menu-site/table/status/revoke/expiry/User-Agent hash 검증, last-seen write throttle
- `DONE` 테이블 QR 다운로드 — 생성·회전 1회 응답에서 browser-local PNG 생성, raw token API 재전송 없음
- `NEEDS_HUMAN` 실제 Order/Call 제품 key·번들 정책과 Production `TABLE_MANAGEMENT_ENABLED` 활성화

## 6. 모바일 장바구니와 후불 주문

- `DONE` V1 정책 확정 — Postpay 우선, Order·Call 별도 add-on, tableSessions 포함, 기기별 cart, 20 lines·50 units·line 20·요청 300자
- `DONE` DB 기반 migration 초안 — orderable 분리, 주문 option, session-bound order, immutable snapshot, idempotency, server-only RLS
- `DONE` migration Production 1회 적용과 generated Supabase types 갱신 — 2026-08-06 `tablescene-prod`, `docs/runbooks/postpay-order-foundation-migration.md`
- `DONE` 메뉴·옵션 선택과 수량 — 공통 모바일 drawer, required/min/max option, line/total limit
- `DONE` 장바구니와 요청사항 — visit-session scope local cart, 300자 요청, retry request UUID 유지
- `DONE` 테이블 번호와 주문 전송 — HttpOnly session 재검증 API와 atomic RPC Production 적용 완료
- `DONE` 주문 당시 메뉴·가격 snapshot — 제출 transaction에서 immutable snapshot 생성
- `DONE` 품절 주문 차단 — 제출 transaction에서 `visible/orderable/is_sold_out` 재검증
- `DONE` 중복 주문 방지 — session + client request UUID advisory lock/idempotency
- `DONE` atomic 주문 RPC migration Production 1회 적용과 generated types 갱신 — 2026-08-06 `tablescene-prod`, `docs/runbooks/postpay-order-submission-rpc-migration.md`
- `NEEDS_HUMAN` 실제 Order 상품 entitlement와 Production `POSTPAY_ORDER_ENABLED`, `POSTPAY_ORDER_ALLOWED_SITE_IDS` 활성화

## 7. 주문관리와 수동 결제

- `DONE` 주문 접수·조리 전·조리 중·조리 완료·제공 완료 — 전방향 단계별 conditional update
- `DONE` 미결제 주문 취소와 취소 사유 — 제공 전·미결제만 1–500자 사유로 취소
- `DONE` 기존 카드단말기 결제완료 — MenuLink 카드 승인 없이 `manual_card` 기록
- `DONE` 현금 결제완료 — `manual_cash` 기록
- `DONE` 처리 직원 기록 — 재인증 permission gate와 `status_updated_by`/`payment_completed_by`
- `DONE` 브라우저 영수증 — immutable snapshot 기반 인쇄 전용 영수증
- `NEEDS_HUMAN` 실제 Order Dashboard 상품 entitlement와 Production `ORDER_DASHBOARD_ENABLED`, `ORDER_DASHBOARD_ALLOWED_SITE_IDS` 활성화

## 8. Call 기능

- `TODO` 손님 호출과 호출 종류
- `TODO` 호출 목록과 담당 직원
- `TODO` 처리 완료
- `TODO` 중복 호출 방지
- `TODO` 호출 이력

## 9. 선결제 PG

- `TODO` 사업자별 PG 온보딩
- `TODO` 모바일 선결제
- `TODO` 웹훅과 idempotency
- `TODO` 결제 실패
- `TODO` 취소·부분취소·환불
- `TODO` 주문 상태와 결제 상태 분리
- `NEEDS_HUMAN` 실제 결제·취소·환불 검증

## 10. 매출관리와 알림

- `TODO` 일별·월별 매출과 주문 수
- `TODO` 메뉴별 판매량
- `TODO` 결제수단별 집계
- `TODO` 취소·미결제 집계
- `TODO` 주문 알림과 호출 알림
- `TODO` 알림톡 또는 후속 알림 채널

## 11. 전체 고객 흐름 QA

- `TODO` 회원가입·구매·메뉴판 생성
- `TODO` 직원 초대·수락·접근
- `TODO` 메뉴 편집·디자인·위젯·다국어
- `TODO` 미리보기·공개·일반 QR
- `TODO` 테이블 QR·방문 세션·주문
- `TODO` 주문관리·수동 결제완료
- `TODO` 보관·복구·해지

## 12. 오픈 준비

- `NEEDS_HUMAN` 회원가입·비밀번호 재설정·직원 초대 이메일 실제 발송
- `NEEDS_HUMAN` SMTP와 Auth 설정
- `NEEDS_HUMAN` Production 환경변수·비밀키
- `NEEDS_HUMAN` Vercel Cron
- `NEEDS_HUMAN` PortOne 실제 결제 확인
- `NEEDS_HUMAN` 약관 시행일과 프로모션 기간 확정
- `NEEDS_HUMAN` 최종 디자인 육안 확인
- `NEEDS_HUMAN` 최종 배포와 Draft PR 병합 승인

## 다음 작업

default-off 모바일 cart·atomic 주문 제출·주문관리·수동 결제 runtime은 완료됐다. 다음 미완료 범위는 Call 기능이며, MVP preset 범위·중복 차단·rate limit 수치를 제품 정책으로 확정한 뒤 진행한다. 실제 상품 SKU·가격·entitlement 및 Production feature gate 활성화는 계속 별도 승인 전까지 보류한다.
