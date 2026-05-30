# 메뉴링크 이메일 고지 MVP 메모

## 1차 범위

- 이메일 고지 이벤트 기록: `notification_events`
- 마이페이지 최근 알림 표시
- `/api/cron/process-notification-events` 기반 dry run / execute 처리
- Vercel Cron 등록 경로: `/api/cron/process-notification-events`
- Vercel Cron schedule: `0 19 * * *` (UTC 기준, 한국시간 새벽 4시)
- MVP 이메일 대상은 정기결제 실패, 개인 체험 종료 예정, 해지 예약 구독 이용 종료 예정, 데이터 보관 시작, 데이터 보관 종료 예정, 회원탈퇴 신청 안내로 제한
- 결제 완료, 문의 접수/답변, AI 크레딧 충전 완료는 인앱 알림으로만 처리
- 개인 체험 종료 예정 및 해지 예약 구독 이용 종료 예정은 7일 전, 1일 전, 당일 고지 후보 생성
- 개인 체험 또는 유료서비스 만료로 보관 상태에 들어가면 데이터 보관 시작 안내 이벤트 생성
- 데이터 보관 종료 3일 전, 1일 전, 당일 고지 후보 생성
- Resend 발송은 한 번 실행당 기본 10건으로 제한
- 실패 이벤트는 `metadata.retry_count` 기준 기본 3회까지 재시도 가능
- 발송 간격은 기본 700ms로 순차 처리

## 이번 범위에서 제외

- 카카오 알림톡 실제 연동
- SMS 실제 연동
- `pending_delete` 이후 메뉴판/이미지 hard delete 자동 실행
- 장기 미접속 1년 고지 자동 활성화

## 이메일 발송 설정

- `CRON_SECRET`: cron route 인증 토큰
- `EMAIL_PROVIDER`: `resend`
- `RESEND_API_KEY`: Resend API key
- `EMAIL_FROM`: 예) `메뉴링크 <admin@dndcommerce.co.kr>`
- `EMAIL_BATCH_LIMIT`: 기본 10, 최대 25
- `EMAIL_SEND_DELAY_MS`: 기본 700ms, 최대 2000ms
- `EMAIL_MAX_RETRY_COUNT`: 기본 3, 최대 10
- `ENABLE_NOTIFICATION_CRON_EXECUTE`: Vercel Cron GET 실행 제어값
- Resend rate limit 발생 시 `metadata.email_error_code = rate_limit_exceeded` 형태로 추적
- `sent` 상태 이벤트는 재발송하지 않음

## 운영 실행 정책

- `GET /api/cron/process-notification-events`는 Vercel Cron용입니다.
- 기본값은 dry-run입니다.
- `ENABLE_NOTIFICATION_CRON_EXECUTE=true`일 때만 GET 호출에서 `notification_events` 생성과 이메일 발송을 실행합니다.
- 환경변수가 없거나 `true`가 아니면 `execute=false`, `dryRun=true`로 동작합니다.
- 수동 테스트는 `POST /api/cron/process-notification-events`에 `CRON_SECRET`을 포함하고, 테스트 이벤트는 `metadata.test=true`로 구분해서 사용합니다.
- 운영 고객 대상 자동 발송은 Resend 발신 도메인, 수신 대상, 템플릿, batch limit을 확인한 뒤 `ENABLE_NOTIFICATION_CRON_EXECUTE=true`로 켭니다.

## 문의 기록 조회 권한 메모

- 회원탈퇴 route는 `inquiries`를 삭제하지 않습니다.
- 마이페이지/관리자 문의 화면은 사용자 또는 관리자 client 흐름으로 `inquiries`를 조회합니다.
- notification email cron은 `inquiries`를 조회하지 않습니다.
- QA 또는 운영 점검에서 service_role REST로 문의 기록 보관 여부를 확인해야 한다면 아래 SQL을 Supabase SQL Editor에 적용할 수 있습니다.

```sql
grant select on public.inquiries to service_role;
notify pgrst, 'reload schema';
```

## 1년 이상 미접속 고지 정책 메모

- 기준은 “가입 후 1년”이 아니라 “1년 이상 미접속”입니다.
- Supabase Auth의 `last_sign_in_at`를 1차 기준 후보로 사용할 수 있습니다.
- active 유료 구독, active 개인 체험, active 메뉴판/서비스 권한이 있는 계정은 삭제 고지가 아니라 계정 확인 안내 대상으로 분리합니다.
- 현재 `account_inactive_1year_notice`는 DB event_type 제약에 추가하지 않았고, 실제 발송도 비활성화 상태입니다.
- 장기적으로 로그인 외 활동을 더 정확히 보려면 `profiles.last_seen_at` 또는 별도 user activity 기록이 필요합니다.

## 추후 TODO

- `account_data_deletion_scheduled` 이벤트는 회원탈퇴 후 보관 기준일이 확정되면 연결
- 장기 미접속 1년 기준의 기준일, 대상, 보관 기간 확정 후 dry-run부터 cron 활성화
- 알림톡은 공식 딜러사, 발송 비용, 템플릿 승인, 실패 fallback 정책 확정 후 검토
- 실제 삭제 job은 Supabase Storage 이미지 삭제까지 별도 QA 후 구현
