# Vercel Production runtime 읽기 전용 감사

최종 확인: 2026-09-01

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

현재 Hobby 플랜의 Dashboard 로그 조회 범위는 최근 1시간으로 제한된다. 따라서 이 감사 시각에는 당일 03:00~04:00 실행의 성공·실패 기록을 확인할 수 없었다. 다음 실행은 2026-09-02에 확인한다. 03:00 작업은 03:00~03:59 KST, 04:00 작업 두 개는 04:00~04:59 KST에 각각 Vercel Logs를 확인해야 실제 실행 결과를 확정할 수 있다.

## 환경변수 메타데이터

값을 열지 않고 다음 핵심 변수의 존재와 scope를 확인했다.

- Production 전용: `BUSINESS_SINGLE_MONTHLY_FREE_TRIAL_ENABLED`, `STAFF_INVITATIONS_ENABLED`
- Production + Preview: Supabase 공개/서버 키, PortOne 키, OpenAI 키·모델, Resend 이메일 설정, `CRON_SECRET`, `ENABLE_SUBSCRIPTION_CRON_EXECUTE`, 공개 사이트 URL

다음 runtime gate는 Vercel 목록에 없으며 코드의 기본값에 따라 닫힌 상태로 유지된다.

- `TABLE_MANAGEMENT_ENABLED`
- `CALL_ENABLED`, `CALL_ALLOWED_SITE_IDS`
- `POSTPAY_ORDER_ENABLED`, `POSTPAY_ORDER_ALLOWED_SITE_IDS`
- `ORDER_DASHBOARD_ENABLED`, `ORDER_DASHBOARD_ALLOWED_SITE_IDS`
- `ENABLE_NOTIFICATION_CRON_EXECUTE`
- `AI_SUPPORT_CHAT_ENABLED`

이는 스마트호출 pilot과 Order/PG를 현재 Production에서 활성화하지 않는 제품 계약과 일치한다. `process-notification-events` Cron은 등록되어 있어도 execute gate가 없으므로 GET에서 dry-run으로 동작한다.

## 남은 사람 확인

환경변수 값이나 비밀키의 유효성·회전 시점은 이번 감사에서 확인하지 않았다. 특히 실제 실행에 영향을 주는 아래 값은 공개하거나 임의 변경하지 않고 운영자가 별도로 확인해야 한다.

- `ENABLE_SUBSCRIPTION_CRON_EXECUTE`
- `PORTONE_MOCK_ENABLED`
- `BUSINESS_SINGLE_MONTHLY_FREE_TRIAL_ENABLED`
- `STAFF_INVITATIONS_ENABLED`
- `CRON_SECRET`, PortOne·Supabase·OpenAI·Resend 비밀키의 현재 유효성

값을 변경하면 Production 재배포와 실제 결제·구독·이메일 동작에 영향을 줄 수 있으므로 별도 승인 작업으로 처리한다.
