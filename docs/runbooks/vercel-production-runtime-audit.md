# Vercel Production runtime 읽기 전용 감사

최종 확인: 2026-09-14

## 범위

- 대상 프로젝트: `designerhamco/tablescene-menu-site2`
- 변경 없이 Vercel Dashboard의 환경변수 이름·적용 범위와 Cron 등록 상태만 확인
- 환경변수 값과 비밀키는 열거나 복사하지 않음
- Cron의 `Run` 버튼과 인증된 실행 요청은 호출하지 않음

## Cron 등록 상태

Vercel의 Cron Jobs 기능은 `Enabled` 상태이며 다음 세 작업이 `vercel.json`과 동일하게 등록되어 있다.

| 경로 | UTC 일정 | KST 기준 |
| --- | --- | --- |
| `/api/cron/expire-personal-trials` | `0 18 * * *` | 매일 03:00 |
| `/api/cron/process-subscriptions` | `0 19 * * *` | 매일 04:00 |
| `/api/cron/process-notification-events` | `0 19 * * *` | 매일 04:00 |

세 Production endpoint를 인증 정보 없이 GET 요청했을 때 모두 `401`을 반환해 외부의 무인증 실행은 차단된다.

2026-09-08 재감사에서도 Cron Jobs 기능은 `Enabled`였고 세 경로와 일정이 저장소와 일치했다. Production 배포는 `72c9002` 기준 `Ready`였으며, 메인·Display 서비스·요금·AI 상담·오브 테이블 A·메종 마레 preview를 브라우저에서 열어 공개 경로가 유지되는 것을 확인했다. Display 파일럿 `/pickup/260630test`와 공개 API도 같은 시각 HTTP `200`으로 응답했다.

현재 Hobby 플랜의 Dashboard 로그 조회 범위는 최근 1시간으로 제한된다. 2026-09-08 15시대 KST 재감사에서는 당일 03:00~04:00 실행 기록을 다시 볼 수 없어 실제 성공·실패를 확정하지 못했다. 03:00 작업은 매일 03:00~03:59 KST, 04:00 작업 두 개는 매일 04:00~04:59 KST에 각각 Vercel Logs를 확인해야 한다. Dashboard의 `Run` 버튼은 실제 Production 작업을 실행하므로 단순 확인을 위해 누르지 않는다.

실제 예약 실행 세 경로를 Vercel Production Logs에서 읽기 전용으로 모두 확인했다. `/api/cron/expire-personal-trials`는 2026-09-10 03:53:22 KST에 `GET 200`, `/api/cron/process-notification-events`는 같은 날 04:07:12 KST에 `GET 200`으로 기록됐다. `/api/cron/process-subscriptions`는 2026-09-13 04:58:37 KST에 `GET 200`과 `completed` 로그가 기록됐고 `dryRun=true`, `execute=false`, `failed=0`, `lifecycleErrors=0`이었다. 이 dry-run은 결제 0건·취소 0건으로 Production 상태를 변경하지 않았으며, 자동 변경 대상이 아닌 legacy/stale 상태 16건을 `lifecycleAnomalies`로 보고했다. 세 요청 모두 `tablescene-next` Production 배포에서 실행됐으며 캐시는 `BYPASS`였다. 확인 과정에서 Run 버튼·환경변수·비밀키·Production 데이터·결제·구독 상태를 변경하지 않았다.

## 환경변수 메타데이터

값을 열지 않고 다음 핵심 변수의 존재와 scope를 확인했다.

- Production 전용: `BUSINESS_SINGLE_MONTHLY_FREE_TRIAL_ENABLED`, `STAFF_INVITATIONS_ENABLED`, `AI_SUPPORT_CHAT_ENABLED`, `OPENAI_SUPPORT_API_KEY`
- Production + Preview: Supabase 공개/서버 키, PortOne 키, OpenAI 키·모델, Resend 이메일 설정, `CRON_SECRET`, `ENABLE_SUBSCRIPTION_CRON_EXECUTE`, 공개 사이트 URL

다음 runtime gate는 Vercel 목록에 없으며 코드의 기본값에 따라 닫힌 상태로 유지된다.

- `TABLE_MANAGEMENT_ENABLED`
- `CALL_ENABLED`, `CALL_ALLOWED_SITE_IDS`
- `POSTPAY_ORDER_ENABLED`, `POSTPAY_ORDER_ALLOWED_SITE_IDS`
- `ORDER_DASHBOARD_ENABLED`, `ORDER_DASHBOARD_ALLOWED_SITE_IDS`
- `ENABLE_NOTIFICATION_CRON_EXECUTE`

이는 스마트호출 pilot과 Order/PG를 현재 Production에서 활성화하지 않는 제품 계약과 일치한다. `process-notification-events` Cron은 등록되어 있어도 execute gate가 없으므로 GET에서 dry-run으로 동작한다.

## 비밀키·실행 게이트 읽기 전용 확인

2026-09-14 Vercel Dashboard에서 값을 열지 않고 변수명, 유형, scope, 갱신 메타데이터와 `Needs Attention` 상태만 재확인했다.

- Secret 유형: `CRON_SECRET`, `PORTONE_API_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_SUPPORT_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `DATA_GO_KR_SERVICE_KEY`, `ENABLE_SUBSCRIPTION_CRON_EXECUTE`, `PORTONE_MOCK_ENABLED`, `STAFF_INVITATIONS_ENABLED`
- Config 유형: `BUSINESS_SINGLE_MONTHLY_FREE_TRIAL_ENABLED`, `AI_SUPPORT_CHAT_ENABLED`
- `OPENAI_SUPPORT_API_KEY`, 무료체험·직원초대·AI 상담 gate는 Production 전용이고, 그 외 핵심 서버 키와 결제·Cron gate는 Production + Preview scope다.
- 대체 사업자 검증 키 `NTS_BUSINESS_API_KEY`는 없지만 실제 구현이 우선 사용하는 `DATA_GO_KR_SERVICE_KEY`가 Secret으로 등록되어 있다.
- 확인한 12개 핵심 변수에는 Vercel의 `Needs Attention` 표시가 없었다.

현재 유효성은 값을 직접 조회하는 대신 실제 runtime 근거로 확인했다. `CRON_SECRET`은 세 예약 경로의 인증된 `GET 200`, OpenAI 상담 키는 Production 실제 답변, Supabase 서버 키는 Auth·메뉴 편집·호출·QR Production E2E, Resend 키는 실제 `delivered` 메일, PortOne 키는 2026-09-01 결제 상태 읽기 재조회로 동작 근거가 있다. `PORTONE_MOCK_ENABLED`는 Production 코드에서 항상 무시되며 구독 Cron 로그는 `execute=false`를 확인했다.

키를 무작정 동시에 교체하면 결제·구독·메일·로그인에 장애가 생길 수 있다. Vercel 경고나 runtime 오류가 없으므로 즉시 일괄 교체하지 않고, 제공자별 새 키 발급 → Vercel Secret 교체 → 재배포 → 읽기/발송 smoke → 이전 키 폐기 순서로 한 공급자씩 회전한다. 실제 카드 등록 무료체험 E2E 전에 PortOne 키를 먼저 바꾸지 않는다. 사업자 검증 키의 외부 API 실제 응답과 제공자별 키 교체는 운영자 인증이 필요한 후속 작업으로 유지한다.
