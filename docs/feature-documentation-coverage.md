# 아티메뉴 기능별 문서 범위·보완 점검표

기준일: 2026-11-11. 메뉴판 관리·구독·결제·매장 운영·Supabase와 관련된 실제 경로/문서 목록을 대조한 탐색 점검이다. 각 기능의 모든 권한·실패·운영 환경·화면을 새로 실행한 검수가 아니다. 후속 보완으로 백업·편집 저장·구독/결제 문서 3개를 코드와 대조해 추가했으며, 아래의 실운영/구현 잔여 범위는 유지한다.

## 상태의 의미

- **연결 자료 있음**: 관련 MD와 구현 경로를 찾았다. 현행 정합성/실운영 완료를 뜻하지 않는다.
- **분산/과거 기록**: 자료가 여러 곳에 있거나 과거 단계 설명이 남아 있어 최신 계약과 다시 대조해야 한다.
- **전용 운영 문서 미발견/미확인**: 이번 저장소 탐색에서 통합 문서를 찾지 못했거나 실제 운영 설정·검증 증거를 확인하지 않았다. 기능 자체가 없다는 판정은 아니다.

## 기능별 지도

| 영역 | 자료와 구현의 진입점 | 문서 상태와 남은 범위 |
| --- | --- | --- |
| 메뉴판 기본/구성/디자인/다국어/공개 설정 | [편집 저장 계약](menu-management-save-contract.md), [보기옵션](template-preview-display-options.md), [편집기 디자인 기록](menu-editor-color-plan.md), [위젯 계약](cafe-a-widget-mvp-data-contract.md), [편집 action](../app/mypage/menus/actions.ts), [구성 UI](../components/mypage/menu-editor/MenuManagementSection.tsx) | 현행 요약 추가. 탭별 저장·초안/샘플 복원·공개 경계 정리. 전역 미저장 이동 보호 연결과 순차 저장의 부분 실패 한계는 보완 필요. 전 조합 실저장 검수 미실행 |
| 템플릿 본문 열 너비·회전·대표영역 | [공통 계약](template-spacing-contract.md), [베이직 읽기 배치](basic-menu-scroll-policy.md), [보기옵션](template-preview-display-options.md), [렌더러 구조](menu-template-architecture.md), [동일 너비 QA](../scripts/qa-basic-equal-tracks.mjs) | 2026-11-11 동일 너비 규칙과 수동 검수 명령 연결. #583 운영 확인 이력과 이후 수정본의 재검증을 구분하며 중앙열/좌상단·모바일/다이닝을 같은 구조로 간주하지 않음 |
| 템플릿 교체·메뉴 가져오기 | [이용권 기준](service-pricing-contract.md), [메뉴 가져오기](shared-menu-catalog.md), [교체 서비스](../lib/server/menu-plan-design-service.ts), [가져오기 action](../app/mypage/menus/[menuId]/import/actions.ts) | 연결 자료 있음. [예전 템플릿별 구독 기록](template-switching.md)의 새 구독 요구는 현재 이용권 내 교체 정책으로 그대로 복원하지 않음 |
| 구독·체험·갱신·해지·이용권 변경·보관 복구 | [구독·결제 상태 계약](subscription-payment-state-contract.md), [요금 기준](service-pricing-contract.md), [다음 결제일 전환](runbooks/menu-plan-change-reservations.md), [체험 기록](runbooks/business-subscription-free-trial-migration.md), [구독 서비스](../lib/server/business-subscription-management-service.ts), [복구 서비스](../lib/server/menu-site-restore-service.ts) | 현행 요약 추가. 새 월구독/과거 계약과 일반 갱신/예약 전환을 구분. 기존 갱신의 자동 재시도 TODO와 승인 후 저장 실패의 검토 필요. 환경별 실행값/실카드 종단 검증은 별도 |
| 결제·환불·중복 처리·결제 후 생성 | [구독·결제 상태 계약](subscription-payment-state-contract.md), [멱등성 도입 기록](runbooks/payment-provisioning-idempotency-migration.md), [불완전 결제 감사](runbooks/incomplete-payment-order-audit.md), [결제 완료 API](../app/api/payment/complete/route.ts), [구매 생성](../lib/server/purchased-menu-provisioning.ts), [환불 서비스](../lib/server/yearly-refund-service.ts) | 연결 자료 있음. 가격/결제사 승인/내부 원장/메뉴 생성/번역 저장을 분리하고 실제 결제·환불 검증과 모의 검증을 혼동하지 않음 |
| 매장 대시보드·테이블/키오스크·배치도·기기 | [배치도 최신 계약](menu-floor-plan-contract.md), [테이블 흐름 기록](table-first-operations-qa.md), [운영 action](../app/mypage/operations/actions.ts), [테이블 서비스](../lib/server/menu-table-management-service.ts), [기기 서비스](../lib/server/table-terminal-service.ts) | 연결 자료 있음. 날짜별 수정이 누적돼 있으므로 룸·등록/배치 초안·저장·보관/복원·채널별 허용의 최신 적용 범위를 우선 |
| 주문·호출·매출·내역/수동 결제 | [서비스 계약](order-call-product-contract.md), [방문 주문내역](runbooks/visit-order-history.md), [주문 서비스](../lib/server/order-management-service.ts), [호출 서비스](../lib/server/call-management-service.ts), [매출 서비스](../lib/server/sales-summary-service.ts) | 연결 자료 있음. 미리보기 시뮬레이션/실제 접수, 수동 결제 표시/PG 결제, 사용 허용/수신·기기 연결을 분리 |
| QR·공개 주소·테이블 방문 세션 | [통합 QR](unified-qr-management-qa.md), [세션 설정](runbooks/order-session-settings.md), [QR 서비스](../lib/server/menu-qr-management-service.ts), [방문 세션](../lib/server/table-visit-session-service.ts) | 연결 자료 있음. 대표/테이블 QR, 교체/만료/연결 해제, 읽기/접수 권한과 토큰 비노출을 별도 확인 |
| 계정·로그인·비밀번호·사업자 확인·탈퇴 | [인증 메일](runbooks/supabase-auth-email-templates.md), [가입/인증 QA 기록](runbooks/customer-journey-qa.md), [약관 검토 현황](legal-policy-review.md), [인증 callback](../app/auth/callback/route.ts), [사업자 API](../app/api/business/verify/route.ts), [탈퇴 API](../app/api/account/delete/route.ts) | 자료 분산. 로그인/복구/동의 증빙과 탈퇴 후 실파기 완료는 별개이며 미확인 사항 유지 |
| 사장·직원·역할별 권한·초대·감사 | [초기 권한 계약](menu-site-staff-access-contract.md), [초대](staff-invitation-delivery.md), [쓰기 감사](staff-write-audit.md), [덮어쓰기 권한 기록](runbooks/staff-permission-overrides-migration.md), [현재 권한](../lib/menu-site-permissions.ts), [접근 서비스](../lib/server/menu-site-access-service.ts) | 초기 Phase 상태와 후속 구현 기록이 함께 있음. 옛 역할표를 현재의 직원별 허용/차단과 소유자 전용 결제/삭제 권한 대신 사용하지 않음 |
| AI·설명/정리·번역·크레딧 | [지급 정책](ai-credit-policy.md), [상담 정책](ai-support-chat-policy.md), [스타터 번역](starter-translations-qa.md), [크레딧 원본](../lib/ai-credits.ts), [번역 서비스](../lib/server/menu-translation-service.ts) | 연결 자료 있음. 스타터의 준비된 번역/고객 AI 번역 실행, 초안/최종 저장, 차감/실패 복구, 무료/구매 잔액을 구분 |
| 이미지·동영상·위젯 파일 | [Supabase 데이터 안내](supabase-data-lifecycle-guide.md), [이미지 제한](../lib/image-upload-policy.ts), [동영상 제한](../lib/display-video-upload-policy.ts), [이미지 API](../app/api/menu-images/route.ts), [위젯 정리](../lib/server/menu-widget-image-cleanup-service.ts) | 규칙/구현 분산. 업로드 성공/DB 저장 실패/교체/참조 중 파일/미저장 파일 정리와 링크된 원본 파일 소유권 확인 필요 |
| DB·Storage·Auth·보관·삭제 | [데이터 안내](supabase-data-lifecycle-guide.md), [삭제 절차](service-lifecycle-hard-delete-runbook.md), [보관 원본](../lib/service-retention-policy.ts), [schema 기록](../supabase/migrations), [생성 타입](../lib/supabase/types.ts) | 연결 자료 있음. 스키마 파일 존재와 실제 Production 적용, 앱 권한/RLS/RPC grant, 접근 차단/실삭제/백업 삭제를 분리 |
| 고객지원·문의·공지·이메일·알림 | [공지 편집](announcement-editor.md), [지원/FAQ](support-faq-notices-qa.md), [이메일](email-notification-mvp.md), [알림 정책](notification-retention-policy.md), [알림 서비스](../lib/server/in-app-notification-service.ts) | 연결 자료 있음. 발송/실패 재시도, 표시 기간/보관 기간, 개인정보/마케팅 동의와 고객 문의 접근 권한 구분 |
| 배포·환경변수·Cron·관측·장애 복구 | [운영 감사 기록](runbooks/vercel-production-runtime-audit.md), [현재 Cron 등록](../vercel.json), [운영 기능 QA 기록](runbooks/production-feature-baseline-qa.md), [인증 화면 QA](runbooks/authenticated-surface-regression-qa.md) | 자료 분산/현재 운영 재확인 필요. 저장소 Cron은 현재 4개이며 예전 3개 감사 결과를 현행 실운영 증거로 사용하지 않음 |
| DB·파일 백업과 실제 복구 훈련 | [백업·장애 복구 절차](runbooks/backup-disaster-recovery.md), [데이터 안내](supabase-data-lifecycle-guide.md), 기존 서비스 보관/복구와 별개 | 절차 추가. DB+Storage·권한·외부 결제 대조와 재개 기준 정리. Production 백업 설정·파일 사본·RPO/RTO·담당자 확인 및 실제 복구 훈련은 미실행 |

## 후속 보완 상태와 남은 순서

1. **백업·장애 복구**: [운영 절차](runbooks/backup-disaster-recovery.md) 작성. 실제 백업/PITR·Storage 사본·담당자·목표 복구 시점/시간을 확인하고 격리 복구 훈련 결과를 남겨야 한다. 아직 복구 가능 보장을 하지 않는다.
2. **메뉴판 관리**: [저장 계약](menu-management-save-contract.md) 작성. 메뉴 구성의 순차 저장 부분 실패와 전역 미저장 이동 보호 연결을 보완하고, 탭/권한/서비스별 브라우저 저장을 검증해야 한다. 문서 작성과 기능 개선 완료는 별개다.
3. **구독·결제**: [상태/복구 계약](subscription-payment-state-contract.md) 작성. 기존 갱신의 자동 재시도/연체 정책 TODO, 승인 후 저장 실패·동시 처리와 실환경 게이트를 추가 검증해야 한다. 검증을 위해 실제 고객에게 청구하지 않는다.
4. **권한·운영 상태의 현행 요약**: 오래된 Phase/allowlist 기록 대신 현행 권한 코드, 환경별 게이트와 실제 적용 확인 날짜를 연결하는 전용 요약은 아직 남았다. 비밀값이나 고객 식별자를 MD에 넣지 않는다.

이 목록은 새 기능/DB 변경을 승인하거나 모든 운영 기능이 실패한다고 판정한 것이 아니다. 문서가 생겼다는 이유로 구현/운영의 미확인 항목을 닫지 않는다. 각 후속 작업은 실제 대상·변경 범위·검증 결과를 따로 기록한다.

## 이번 보완의 검증 기록 (2026-11-11)

- 코드 대조 기준: `7d62265c14220399389a662babdc607f58e0116a`의 편집 action/컴포넌트, 결제/구독 서비스·Cron. 이후 구현이 달라지면 담당 계약도 재대조한다.
- 기존 단위·모의 테스트 12개 파일, **74건 통과**. 초안 helper/공개 권한·상태·샘플 복원·위젯 순서·결제 멱등성·갱신/전환 정책·21개 디자인의 미리보기/구매 번역 일치를 포함한다. 공통 미저장 helper 통과가 메뉴 편집기 연결 완료를 뜻하지는 않는다.
- 이번 수정 문서 8개의 상대 문서/소스 링크 **190개 통과**, `git diff --check` 통과, Next.js 관리 블록 보존 확인.
- 실제 고객 저장·결제·환불·운영 SQL/Storage 변경·백업 반출·복구·Cron 실행: **미실행**.
