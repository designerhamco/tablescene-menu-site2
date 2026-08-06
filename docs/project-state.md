# MenuLink 프로젝트 상태

최종 갱신: 2026-08-06

기준 브랜치: `tablescene-next`

기준 커밋: `6aa1dcb` (`PR #12` 병합)

## 완료된 주요 기능

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
  - PC 1440×900, 태블릿 820×1180, 모바일 390×844 실제 viewport 제공
  - 별도 scale 엔진 없이 동일 출처 iframe의 반응형 viewport와 실제 크기 새 창 제공
- 활성 템플릿 정책과 1차 renderer QA:
  - Basic 6개와 Display 1개를 출시 대상으로 확정
  - `hidden`은 임시 판매 노출 상태로 유지하면서 QA에는 포함
  - 390×844·1440×900 renderer, 이미지, overflow, 콘솔 오류와 Display 페이지 이동을 점검
  - 상세 기록은 `docs/active-template-qa.md`
- Order/Call 제품 계약과 잠금 상태 진입 셸

## 최근 주요 커밋과 PR

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
- 회원가입·비밀번호 재설정·직원 초대 이메일의 실제 SMTP 발송 확인
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
7. 실제 직원 계정 E2E 확인은 직원 초대·수락 기능이 완성된 뒤 진행한다. 화면 확인만을 위한 Production 직원 데이터는 만들지 않는다.
8. Owner-only runtime 검증은 `docs/owner-only-runtime-audit.md`에 완료 기록했다.
9. 직원 초대 UI와 이메일 전송 코드는 feature gate 뒤에 구현했다. 실제 발송과 Production SMTP/Auth 설정은 사람 승인 전에 실행하지 않는다.
10. 초대 수락 화면은 HttpOnly intent cookie와 원자적 RPC로 연결했다.
11. 초대 재전송·취소는 Owner 재검증과 batch 단위 token rotation/revoke로 연결했다.
12. 직원 역할 변경과 접근 회수는 active membership 조건부 update와 audit로 연결했다.
13. 직원용 마이페이지 상세 경험은 역할별 기능 안내와 Owner-only 동선 분리로 완료했다.
14. 모든 직원 write 진입점은 공통 audit gate로 연결했다.
15. PC·태블릿·모바일 미리보기는 동일 renderer와 실제 iframe viewport를 재사용한다.
16. 다음 작업은 활성 템플릿 전체 기능 QA이며, 실제 활성 목록 확정과 최종 디자인 육안 판정은 사람 확인이 필요하다.
