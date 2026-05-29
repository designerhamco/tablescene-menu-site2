# 메뉴링크 이메일 고지 MVP 메모

## 1차 범위

- 이메일 고지 이벤트 기록: `notification_events`
- 마이페이지 최근 알림 표시
- `/api/cron/process-notification-events` 기반 dry run / execute 처리
- 데이터 보관 종료 30일 전, 7일 전, 1일 전, 당일 고지 후보 생성

## 이번 범위에서 제외

- 카카오 알림톡 실제 연동
- SMS 실제 연동
- `pending_delete` 이후 메뉴판/이미지 hard delete 자동 실행
- 회원탈퇴 기능 신규 구현
- 장기 미접속 1년 고지 자동 활성화

## 추후 TODO

- 회원탈퇴 기능이 확정되면 `account_deletion_requested`, `account_data_deletion_scheduled` 이벤트 연결
- 장기 미접속 1년 기준의 기준일, 대상, 보관 기간 확정 후 cron 활성화
- 알림톡은 공식 딜러사, 발송 비용, 템플릿 승인, 실패 fallback 정책 확정 후 검토
- 실제 삭제 job은 Supabase Storage 이미지 삭제까지 별도 QA 후 구현
