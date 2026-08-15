# MenuLink 프로젝트 상태

최종 갱신: 2026-08-15

기준 브랜치: `tablescene-next`

기준 커밋: `a6444e5` (`PR #36` 병합)

## 완료된 주요 기능

- Production 의존성 보안 패치:
  - Next.js와 eslint-config-next를 16.3.1, React Router를 7.18.2로 갱신
  - `nanoid`, `postcss`, `sharp`, `ws`를 안전한 transitive 버전으로 갱신
  - `npm audit --omit=dev` 0건과 전체 계약 테스트·TypeScript·lint·production build 재검증
- Order/Call 로컬 통합 QA:
  - 공개 config의 세션·Business Basic·template·Order/Call runtime gate를 한 공통 판정으로 결합
  - Order-only·Call-only 독립 노출, no-session fail-closed, Display 제외를 390×844 QA fixture로 확인
  - 주문 payload부터 주문 단계·수동 결제 가능 상태와 호출 접수·완료 상태까지 142개 계약 테스트로 연결

- 메뉴판 생성·편집·미리보기·공개 및 QR 흐름
- 활성 카페/디스플레이 템플릿과 공통 템플릿 렌더러
- 메뉴 항목, 가격 옵션, 품절, 타임세일, 배지, 이미지, 커버, 위젯, 다국어 저장 구조
- 개인 체험, 사업자 구독, 결제 프로비저닝, 보관·복구, AI 크레딧의 기존 Owner 흐름
- 결제 프로비저닝 중복 방지 인덱스와 애플리케이션 idempotency 처리
- 직원 권한 Phase A 데이터베이스 기반:
  - `menu_site_members`
  - `menu_site_invitations`
  - `menu_site_audit_logs`
  - 초대 수락 RPC와 Owner/Member private helper
- 직원 권한 Phase B-1 공통 계층:
  - 역할별 permission matrix
  - Owner 우선 판정
  - 활성 membership 및 lifecycle 검증
  - 공통 `menu-site` access helper
- 직원 권한 Phase B-2 메뉴판 접근:
  - Owner 소유 메뉴판과 활성 직원 membership 메뉴판의 통합 목록
  - Owner 우선 판정과 직원 역할 표시
  - `menu.read` 및 활성 lifecycle 기반 직원 읽기 전용 미리보기
  - 사장 전용 결제·구독·복구 동선의 직원 화면 제외
- 직원 권한 Phase B-3 메뉴 편집:
  - Owner/Manager/Editor의 활성 메뉴판 편집 action과 편집 화면 접근
  - 공개·비공개는 Owner/Manager만 가능하고 Editor에서 공개 탭 제외
  - 위젯·번역·AI·이미지·동영상을 정확한 menu-site 권한 경계 뒤에서 서버 실행
  - 직원 AI는 Owner 크레딧을 사용하고 충전·결제 UI는 Owner-only
  - 서비스 키는 서버 밖으로 노출하지 않고, 모든 자원 ID와 Storage 경로를 해당 menu-site로 제한
- Owner-only runtime 방어:
  - 구독·환불·복구 자원은 현재 actor와 저장된 `user_id`가 일치할 때만 처리
  - 결제·추가 구매·계정 삭제는 현재 사용자 범위로만 생성·조회·변경
  - 상세 검토 결과는 `docs/owner-only-runtime-audit.md`에 기록
- 직원 초대 UI와 이메일 전송:
  - Owner-only 다중 메뉴판 초대, 7일 만료 hash token, 중복·자가 초대·rate limit·audit 연결
  - 실제 발송은 초대 수락 화면과 SMTP QA 전까지 `STAFF_INVITATIONS_ENABLED` feature gate로 비활성
  - 상세 운영 경계는 `docs/staff-invitation-delivery.md`에 기록
- 직원 초대 수락:
  - URL token을 짧은 수명의 HttpOnly intent cookie로 격리하고 Auth 복귀 URL에서는 제거
  - 확인된 로그인 이메일과 기존 원자적 수락 RPC로 batch 전체 membership·invitation·audit 처리
- 직원 초대 재전송·취소:
  - Owner-only batch token 회전, 7일 만료 갱신, 발송 실패 조건부 rollback
  - pending batch 취소와 재전송·취소 audit 연결
- 직원 역할 변경·접근 회수:
  - Owner-only active membership과 role allowlist 기반 조건부 변경
  - role change·revoke audit와 audit 실패 조건부 rollback
- 직원용 마이페이지 상세 경험:
  - Owner/직원 관계 배지와 role permission 기반 사용 가능 기능 안내
  - 직원 전용 계정에서 사장 전용 결제·추가 구매·보관·삭제 동선 제외
- 직원 write audit:
  - 공통 write gate에서 staff actor·role·membership·permission·surface 기록
  - audit 실패 시 mutation client를 반환하지 않고 fail closed
  - 상세 범위는 `docs/staff-write-audit.md`에 기록
- 메뉴판 미리보기 기기 프레임:
  - 기존 인증·권한 route와 `MenuPageRenderer`를 그대로 재사용
  - PC 1440×900, 태블릿 세로 820×1180·가로 1180×820, 모바일 390×844 실제 viewport 제공
  - 별도 scale 엔진 없이 동일 출처 iframe의 반응형 viewport와 실제 크기 새 창 제공
- 활성 템플릿 정책과 1차 renderer QA:
  - Basic 6개와 Display 1개를 출시 대상으로 확정
  - `hidden`은 임시 판매 노출 상태로 유지하면서 QA에는 포함
  - 390×844·1440×900 renderer, 이미지, overflow, 콘솔 오류와 Display 페이지 이동을 점검
  - 상세 기록은 `docs/active-template-qa.md`
- 활성 템플릿 저장·locale QA:
  - 7개 starter의 최종 저장 payload round-trip과 참조 무결성 검증
  - 4개 locale, Basic desktop/mobile과 Display desktop 총 52개 route의 장문·이미지·언어 control 검증
  - 브루 챕터 언어 전환 control과 중국어·일본어 장문 overflow 수정
- 활성 템플릿 기능 stress QA:
  - capability 기반 위젯·폰트·배지·가격 옵션·품절·타임세일·이미지·커버 desktop/mobile 검증
  - Display와 누아 메뉴의 품절 표시 연결
- 활성 템플릿 preview/public 격리 QA:
  - 동일 final-save round-trip fixture를 `MenuPageRenderer` preview/public 모드로 비교
  - 7개 desktop과 Basic 6개 mobile에서 렌더 신호·overflow·이미지 검증
- 모바일 Order/Call 공통 진입 셸:
  - template 밖 공통 safe-area sticky header와 언어·매장·table·Call·cart 배치
  - 실제 table session 전에는 locked, no-session에서는 Call·cart fail-closed
- 테이블 QR·방문 세션 기반 준비:
  - hash-only table/session token, 12시간 세션, 메뉴판당 비보관 테이블 100개 정책 확정
  - server-only 강제 RLS 테이블과 constraint·session revoke migration 적용 완료
  - Production postcheck와 generated Supabase types 갱신 완료
- 테이블 관리 runtime 기반:
  - Owner/Manager의 테이블 생성·이름/상태 변경·token 회전·보관을 공통 권한과 staff write audit 뒤에 연결
  - raw QR token은 생성·회전 응답에서만 한 번 전달하고 목록 DTO와 DB에는 노출하지 않음
  - hard delete 없이 보관 처리하며 비활성·보관·token 회전 시 DB trigger가 기존 방문 세션을 폐기
  - `TABLE_MANAGEMENT_ENABLED=true`가 아니면 UI와 server mutation을 모두 fail closed
  - 현재는 Business Basic의 Basic template만 허용하며 실제 제품 key·번들·Production 활성화는 미결정 상태로 유지
- table QR·방문 세션 runtime 기반:
  - 일반 메뉴 QR과 분리된 `/table/[token]` 진입에서 active table token hash와 공개 가능한 Basic 메뉴판을 server-only로 검증
  - 방문 세션 원문은 최대 12시간의 Secure·HttpOnly·SameSite=Lax cookie에만 전달하고 DB에는 SHA-256 hash만 저장
  - 메뉴판 ID·active table·만료·폐기·User-Agent hash가 모두 일치할 때만 세션을 재사용
  - 일반 slug 접근은 세션을 생성하지 않으며 유효한 기존 세션만 공통 모바일 header의 table context에 연결
  - 기능은 기존 default-off `TABLE_MANAGEMENT_ENABLED` gate 뒤에 있어 Production 활성화나 데이터 write가 발생하지 않음
  - 생성·회전 1회 응답에서는 브라우저 내부 QR renderer로 PNG를 내려받으며 raw token을 별도 API에 재전송하지 않음
- 후불 주문 DB 기반:
  - `menu_items.orderable` default-false 분리와 주문 전용 option group/value
  - table visit session에 연결된 주문 header와 immutable 메뉴·가격·option snapshot
  - session 단위 idempotency와 20 lines·50 units 한도를 DB에서 강제
  - server-only 강제 RLS와 최소 `service_role` 권한으로 Production 1회 적용 및 generated types 갱신 완료
- 후불 주문 default-off runtime:
  - template 밖 공통 모바일 cart drawer에서 메뉴·주문 option·수량·요청사항 관리
  - 같은 table visit session scope의 device-local cart와 retry request UUID 유지
  - same-origin POST와 server-validated HttpOnly session, 사이트 allowlist, public lifecycle 재검증
  - 원자적 snapshot·품절·option·idempotency RPC는 Production 1회 적용 및 generated types 갱신 완료
- 후불 주문관리 default-off runtime:
  - `order.read/manage/cancel_unpaid`, `payment.manual` 권한 재검증과 직원 audit gate
  - 접수→조리 전→조리 중→조리 완료→제공 완료 전방향 conditional update
  - 미결제·미제공 취소, 외부 카드 단말기·현금 결제 완료, actor/timestamp 기록
  - 15초 갱신 대시보드와 immutable snapshot 인쇄 영수증
  - `ORDER_DASHBOARD_ENABLED` + explicit site allowlist 없이 Production에서 노출·write 안 됨
- Call MVP default-off 기반:
  - 직원 호출 단일 preset과 손님의 pending 상태 취소만 제공
  - 미처리 호출 dedupe, 완료·취소 후 2분 cooldown, table session당 시간당 10회 제한
  - Owner/Manager/Order staff의 `call.manage` 재인증과 확인·완료 actor/timestamp 기록
  - 최근 100건을 15초 갱신하는 별도 호출관리 화면; 공개 Realtime publication은 추가하지 않음
  - server-only 강제 RLS migration은 2026-08-07 Production 1회 적용 및 generated types 갱신 완료
  - `CALL_ENABLED` + site allowlist 없이 UI와 write 모두 fail closed
- 매출 요약 default-off 기반:
  - 기존 주문관리 gate와 `sales.read`를 모두 통과한 Owner/Manager만 접근
  - 한국 시간 기준 당일·당월 주문 접수 수와 결제 완료 건수·금액을 분리 집계
  - 결제 완료액은 현재 `manual_paid`/`paid` 상태만 포함하고 취소·환불·정산·수수료는 제외
  - immutable item snapshot 기반 메뉴별 판매량 Top 10과 결제수단별 완료액 제공
  - 당월 생성 주문의 현재 취소·미결제 건수와 주문금액을 별도 표시
  - 새 migration이나 Production 설정 없이 기존 server-only 주문 데이터를 최소 DTO로 조회
- 주문·호출 앱 내 도착 알림:
  - 기존 15초 dashboard refresh 결과의 ID만 브라우저 session 범위에서 비교
  - 최초 진입의 기존 이력은 알리지 않고 이후 새 주문·pending 호출만 배너와 문서 제목으로 표시
  - 브라우저 알림은 사용자가 관리 화면에서 직접 켜고, 그때만 화면이 비활성이어도 기존 15초 refresh를 유지해 일반화된 건수 문구를 표시
  - 자동 권한 요청·소리·외부 채널·백그라운드 push·서버 저장 없이 fail-safe로 동작
- 전체 고객 흐름 정적·route QA:
  - 회원가입·비밀번호 재설정·요금제·Order 소개·오브 커피 preview 공개 route 로드 확인
  - 비로그인 마이페이지의 sign-in 보호 확인
  - `npm test`로 Order·Call·table session·권한 audit·구독 갱신·매출·앱 내 알림 계약 테스트 138개 통과
  - 해지 예약 구독은 billing key 존재 여부와 무관하게 재결제보다 기간 종료 만료를 우선하도록 순수 정책과 회귀 테스트로 고정
  - 실제 계정·이메일·결제·구독·주문 write가 필요한 최종 E2E는 `docs/customer-flow-qa.md`에 분리
- 직원 초대 Production E2E:
  - 사용자 승인 아래 기존 Owner·별도 직원 계정과 기존 활성 메뉴판으로 viewer 초대 이메일 발송·수락 완료
  - 직원 마이페이지 역할 배지, Owner-only 동선 숨김, 비공개 메뉴판 읽기 전용 미리보기 확인
  - 편집 route 직접 접근은 `menu-edit-forbidden`으로 차단되고 직원 관리 route는 데이터·mutation 없이 비활성 유지
- 선결제 PG 결정 감사:
  - 기존 PortOne V2 상품 결제와 음식점 주문 스키마의 재사용 가능·불가 경계를 분리
  - 음식점이 merchant of record라는 기존 계약을 유지하고, 독립 사업자별 하위 상점·MID·정산·Secret 구조는 PortOne 서면 확인 전까지 미확정
  - 플랫폼 고객사가 음식점 계좌·수수료·정산주기를 관리하는 파트너 정산 자동화와 오픈마켓 하위상점 전표 API를 대안으로 확인했지만, 음식점 직접 merchant 구조와 동일하게 취급하지 않음
  - 서버 검증·웹훅 서명·idempotency·default-off pilot 안전 계약과 구현 순서를 `docs/prepay-pg-decision.md`에 기록
- Order/Call 제품 계약과 잠금 상태 진입 셸

## 최근 주요 커밋과 PR

- `209ad6a` — PR #28 병합: default-off Call MVP와 Production migration 기록
- `f5038e7` — PR #27 병합: fail-closed 후불 주문관리
- `b8c9631` — PR #26 병합: atomic 후불 주문 runtime과 RPC
- `80a3897` — PR #25 병합: 후불 주문 schema Production 적용과 generated types 갱신
- `b2b0607` — PR #24 병합: one-time table QR PNG 다운로드
- `16f9673` — PR #23 병합: fail-closed table QR 방문 세션 runtime
- `e5ae414` — PR #22 병합: fail-closed 테이블 관리 runtime
- `63a05e6` — PR #21 병합: 테이블 QR·방문 세션 generated types 갱신
- `1f20762` — PR #20 병합: 테이블 QR·방문 세션 DB 기반
- `e3e021d` — PR #19 병합: 모바일 Order/Call 공통 진입 셸
- `e1af601` — PR #18 병합: 출시 템플릿 preview/public 격리 QA
- `41d8964` — PR #17 병합: 출시 템플릿 기능 stress QA
- `3ff49ea` — PR #16 병합: 출시 템플릿 4개 locale QA
- `bde6eb3` — PR #15 병합: 출시 템플릿 저장 round-trip
- `f81f331` — PR #14 병합: 출시 템플릿 서비스·편집 계약
- `bb55ed8` — PR #13 병합: 출시 템플릿 QA 기반
- `6aa1dcb` — PR #12 병합: 메뉴판 미리보기 기기 프레임
- `c8aba00` — PR #11 병합: 직원 write audit
- `17f0509` — PR #10 병합: 직원용 마이페이지 상세 경험
- `07f43ba` — PR #8 병합: 직원 초대 재전송·취소
- `868e8b0` — PR #6 병합: 직원 초대 UI와 이메일 전송
- `fd90673` — PR #5 병합: Owner-only runtime 방어
- `342b56a` — PR #3 병합: `agent/staff-menu-preview-access` → `tablescene-next`
- `98fb144` — PR #2 병합: `agent/staff-menu-list-access` → `tablescene-next`
- `8e9df47` — 직원 메뉴판 목록 접근과 역할 표시
- `ee77660` — PR #1 병합: `agent/staff-permissions-b1` → `tablescene-next`
- `72b41b5` — 직원 권한 공통 permission layer
- `ab6da4c` — 직원 권한 Phase A foundation
- `594b277` — 메뉴판 추가 구매 정책 문구 정렬
- `618afde` — 결제 프로비저닝 idempotency 보강
- `29c20de` — 추가 메뉴판 구매 요구사항 적용

## Production Supabase 적용 기록

다음 항목은 저장소 runbook에 Production 수동 적용 완료 기록이 있다.

- `20260806142627_add_call_mvp_foundation.sql` — 2026-08-07 linked Supabase Management API로 1회 적용, RLS·grant·RPC postcheck, security/performance advisor 및 generated types 갱신 완료. 다시 실행 금지.
- `20260806131244_add_submit_postpay_order_rpc.sql` — 2026-08-06 linked Supabase Management API로 1회 적용, function 보안·grant postcheck·advisor 및 generated types 갱신 완료. 다시 실행 금지.
- `20260806124512_add_postpay_order_foundation.sql` — 2026-08-06 linked Supabase Management API로 1회 적용, RLS·grant postcheck 및 generated types 갱신 완료. 다시 실행 금지.
- `20260806105623_add_table_qr_session_foundation.sql` — 2026-08-06 `tablescene-prod` SQL Editor에서 1회 적용 및 최소권한 사후 보정 완료. 다시 실행 금지.
- `20260805144618_add_menu_site_staff_access_foundation.sql` — 2026-08-06 SQL Editor에서 1회 적용 완료. 다시 실행 금지.
- `20260805103153_add_payment_provisioning_idempotency.sql` — 2026-08-05 SQL Editor 적용 완료.
- `20260729000508_add_menu_promotion_translations.sql` — 2026-07-29 SQL Editor 적용 완료.
- `20260728232933_add_menu_translation_job_recovery.sql` — 2026-07-28 SQL Editor 적용 완료.
- `20260728142935_add_menu_widget_translations.sql` — 2026-07-28 SQL Editor 적용 완료.
- `20260722093000_grant_menu_content_order_rpc_privileges.sql` — 2026-07-22 SQL Editor 적용 완료.
- `20260721170705_add_menu_page_content_order_rpc.sql` — 2026-07-21 SQL Editor 적용 완료.

Production의 실제 최신 상태는 변경될 수 있으므로, 새로운 Production 작업 전에는 해당 runbook의 read-only precheck를 다시 수행하고 사람의 승인을 받아야 한다.

## 현재 보류 중인 운영 작업

- 기존 불완전 주문 3건은 변경하지 않고 별도 read-only 운영 감사가 필요하다.
- PortOne에 음식점 직접 merchant와 MenuLink 플랫폼 하위 정산 모델의 PG 계약·전표 판매자·정산 책임을 서면 확인하고, 제품·법률·운영 모델과 첫 pilot 음식점을 정해야 한다.
- 회원가입·비밀번호 재설정 이메일의 실제 수신 확인
- Production 환경변수와 비밀키 확인
- Vercel Cron 설정 확인
- PortOne 실제 결제·취소·부분취소·환불 검증
- 약관 시행일과 프로모션 기간 확정
- Storage 권한 및 파일 삭제 정책의 Production 검토
- 최종 디자인 육안 확인과 최종 배포 승인

## 절대 자동 실행하지 않는 작업

- Production SQL 또는 이미 적용된 migration 재실행
- `supabase db push`, linked Production 대상 `supabase migration up`
- Production 고객 데이터 변경·삭제
- Storage hard delete
- 실제 결제·취소·부분취소·환불
- 실제 구독 상태 변경
- generated Supabase types 수동 편집
- 비밀키·Production 환경변수·SMTP/Auth 설정 변경
- `tablescene-next` 직접 push
- force push, 기존 커밋 amend
- Production/RLS/Storage policy·결제·실데이터 작업이 포함된 PR의 자동 병합

## 다음 개발 시작 위치

1. `docs/task-queue.md`에서 첫 번째 `TODO` 또는 `IN_PROGRESS` 작업을 확인한다.
2. 직원 권한 작업은 `docs/menu-site-staff-access-contract.md`를 제품 계약으로 사용한다.
3. 공통 권한 코드는 `lib/menu-site-permissions.ts`, `lib/menu-site-access-resolver.ts`, `lib/server/menu-site-access-service.ts`를 재사용한다.
4. Owner 소유 메뉴판과 활성 직원 membership 메뉴판의 통합 목록 및 역할 표시는 PR #2에서 구현·검증했다.
5. 직원 읽기 전용 미리보기 접근은 `agent/staff-menu-preview-access`에서 구현·검증했다.
6. Owner/Manager/Editor 메뉴 편집과 공개·위젯·번역·AI·미디어 권한 연결은 서버 권한 경계로 구현했다.
7. 실제 직원 계정 viewer E2E는 2026-08-07 사용자 승인 아래 기존 계정·메뉴판으로 완료했다. 화면 확인만을 위한 별도 Production 가짜 계정·메뉴판은 만들지 않았다.
8. Owner-only runtime 검증은 `docs/owner-only-runtime-audit.md`에 완료 기록했다.
9. 직원 초대 UI와 이메일 전송 코드는 feature gate 뒤에 구현했다. 실제 발송과 Production SMTP/Auth 설정은 사람 승인 전에 실행하지 않는다.
10. 초대 수락 화면은 HttpOnly intent cookie와 원자적 RPC로 연결했다.
11. 초대 재전송·취소는 Owner 재검증과 batch 단위 token rotation/revoke로 연결했다.
12. 직원 역할 변경과 접근 회수는 active membership 조건부 update와 audit로 연결했다.
13. 직원용 마이페이지 상세 경험은 역할별 기능 안내와 Owner-only 동선 분리로 완료했다.
14. 모든 직원 write 진입점은 공통 audit gate로 연결했다.
15. PC·태블릿·모바일 미리보기는 동일 renderer와 실제 iframe viewport를 재사용한다.
16. 활성 템플릿 QA와 모바일 Order/Call 공통 헤더 셸은 완료했다.
17. 테이블 QR·방문 세션 migration은 Production에 1회 적용했고 generated types를 갱신했다.
18. 테이블 관리와 안전한 QR token 발급은 default-off runtime으로 구현했다.
19. 공개 table QR 진입, server-validated 방문 세션, 생성·회전 직후 browser-local QR 다운로드를 같은 gate 뒤에 구현했다.
20. 후불 주문 V1 schema migration은 Production에 1회 적용했고 generated types를 갱신했다.
21. default-off 모바일 cart와 atomic 주문 제출 runtime을 구현했고 RPC migration Production 1회 적용과 generated types 갱신까지 완료했다. 실제 상품 SKU·가격·entitlement·Production gate 활성화는 별도 승인 전까지 보류한다.
22. 주문관리·미결제 취소·외부 수동 결제·영수증은 default-off runtime으로 구현했다. 실제 Order Dashboard 상품과 Production gate 활성화는 별도 승인 전까지 보류한다.
23. Call MVP와 기본 매출 요약은 기존 server-only 주문·호출 데이터와 명시적 permission/gate 뒤에 구현했다. Production gate와 실제 상품 활성화는 별도 승인 전까지 보류한다.
24. 주문·호출 앱 내 도착 알림은 dashboard에 이미 전달된 최소 ID만 sessionStorage에서 비교하며 별도 데이터 조회나 Production write를 만들지 않는다.
25. 전체 고객 흐름의 공개 route와 default-off 계약은 로컬에서 재검증했다. Order/Call 공통 gate와 독립 활성화도 로컬 fixture 및 계약 테스트로 연결했다. 남은 실제 E2E는 `docs/customer-flow-qa.md`의 사람 검증 목록을 따른다.
