# 메뉴링크 이메일 고지 MVP 메모

## 1차 범위

- 이메일 고지 이벤트 기록: `notification_events`
- 마이페이지 최근 알림 표시
- `/api/cron/process-notification-events` 기반 dry run / execute 처리
- 데이터 보관 종료 30일 전, 7일 전, 1일 전, 당일 고지 후보 생성
- Resend 발송은 한 번 실행당 기본 10건으로 제한
- 실패 이벤트는 `metadata.retry_count` 기준 기본 3회까지 재시도 가능
- 발송 간격은 기본 700ms로 순차 처리

## 이번 범위에서 제외

- 카카오 알림톡 실제 연동
- SMS 실제 연동
- `pending_delete` 이후 메뉴판/이미지 hard delete 자동 실행
- 장기 미접속 1년 고지 자동 활성화

## 이메일 발송 설정

- `EMAIL_BATCH_LIMIT`: 기본 10, 최대 25
- `EMAIL_SEND_DELAY_MS`: 기본 700ms, 최대 2000ms
- `EMAIL_MAX_RETRY_COUNT`: 기본 3, 최대 10
- Resend rate limit 발생 시 `metadata.email_error_code = rate_limit_exceeded` 형태로 추적
- `sent` 상태 이벤트는 재발송하지 않음

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
