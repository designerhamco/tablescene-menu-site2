# 아티메뉴 기능별 문서 범위·보완 점검표

기준일: 2026-11-11. 메뉴판 관리·구독·결제·매장 운영·Supabase와 관련된 실제 경로/문서 목록을 대조한 탐색 점검이다. 각 기능의 모든 권한·실패·운영 환경·화면을 새로 실행한 검수가 아니다.

## 상태의 의미

- **연결 자료 있음**: 관련 MD와 구현 경로를 찾았다. 현행 정합성/실운영 완료를 뜻하지 않는다.
- **분산/과거 기록**: 자료가 여러 곳에 있거나 과거 단계 설명이 남아 있어 최신 계약과 다시 대조해야 한다.
- **전용 운영 문서 미발견/미확인**: 이번 저장소 탐색에서 통합 문서를 찾지 못했거나 실제 운영 설정·검증 증거를 확인하지 않았다. 기능 자체가 없다는 판정은 아니다.

## 기능별 지도

| 영역 | 자료와 구현의 진입점 | 문서 상태와 남은 범위 |
| --- | --- | --- |
| 메뉴판 기본/구성/디자인/다국어/공개 설정 | [보기옵션](template-preview-display-options.md), [편집기 디자인 기록](menu-editor-color-plan.md), [위젯 계약](cafe-a-widget-mvp-data-contract.md), [편집 action](../app/mypage/menus/actions.ts), [구성 UI](../components/mypage/menu-editor/MenuManagementSection.tsx) | 자료 분산. 탭별 즉시 저장/공유 초안/최종 저장·취소·기본값 복원·공개 권한을 한 현행 흐름으로 정리할 필요 |
| 템플릿 교체·메뉴 가져오기 | [이용권 기준](service-pricing-contract.md), [메뉴 가져오기](shared-menu-catalog.md), [교체 서비스](../lib/server/menu-plan-design-service.ts), [가져오기 action](../app/mypage/menus/[menuId]/import/actions.ts) | 연결 자료 있음. [예전 템플릿별 구독 기록](template-switching.md)의 새 구독 요구는 현재 이용권 내 교체 정책으로 그대로 복원하지 않음 |
| 구독·체험·갱신·해지·이용권 변경·보관 복구 | [요금 기준](service-pricing-contract.md), [다음 결제일 전환](runbooks/menu-plan-change-reservations.md), [체험 기록](runbooks/business-subscription-free-trial-migration.md), [구독 서비스](../lib/server/business-subscription-management-service.ts), [복구 서비스](../lib/server/menu-site-restore-service.ts) | 자료 분산. 새 월구독/과거 연간 계약, 실패/재시도/동시 변경/복구의 현재 종단 검증 상태를 구분해야 함 |
| 결제·환불·중복 처리·결제 후 생성 | [멱등성 도입 기록](runbooks/payment-provisioning-idempotency-migration.md), [불완전 결제 감사](runbooks/incomplete-payment-order-audit.md), [결제 완료 API](../app/api/payment/complete/route.ts), [구매 생성](../lib/server/purchased-menu-provisioning.ts), [환불 서비스](../lib/server/yearly-refund-service.ts) | 연결 자료 있음. 가격/결제사 승인/내부 원장/메뉴 생성/번역 저장을 분리하고 실제 결제·환불 검증과 모의 검증을 혼동하지 않음 |
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
| DB·파일 백업과 실제 복구 훈련 | [데이터 안내의 백업 구분](supabase-data-lifecycle-guide.md), 기존 서비스 보관/복구와 별개 | DB+Storage를 함께 다루는 통합 백업/장애복구 운영 절차는 저장소에서 미발견. Production 백업 설정·복구 시점·파일 사본·복구 훈련은 이번에 확인하지 않음 |

## 우선 보완할 문서

1. **백업·장애 복구 절차**: DB/Storage 각각의 백업 범위, 실행 책임, 목표 복구 시점/시간, 격리 복구 검증, 청구/세션/파일 참조 정합성, 복구 후 재개 기준.
2. **메뉴판 관리 저장 계약**: 탭별 초안/저장/공개/취소/초기화와 가져오기·디자인 교체의 데이터 영향 범위. 현행 action/컴포넌트를 대조해 하나의 요약 문서로 연결.
3. **구독·결제 상태와 실패 복구 요약**: 체험/승인/생성/갱신/해지/연체/환불/재구독의 현재 상태 전이와 중복·부분 실패·재시도 기준. 이미 있는 런북의 오래된 도입 상태와 구분.
4. **권한·운영 상태의 현행 요약**: 오래된 Phase/allowlist 기록 대신 현행 권한 코드, 환경별 게이트와 실제 적용 확인 날짜를 연결. 비밀값이나 고객 식별자를 MD에 넣지 않음.

이 목록은 새 기능/DB 변경을 승인하거나 모든 운영 기능이 실패한다고 판정한 것이 아니다. 이번에는 문서 지도와 누락/분산 표시만 보완했다. 문서에 적을 정책과 실제 구현·운영 상태를 다음 확인에서 함께 검증해야 한다.
