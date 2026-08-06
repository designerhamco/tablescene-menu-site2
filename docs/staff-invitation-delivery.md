# 직원 초대 UI와 이메일 전송

최종 검토: 2026-08-06

## 구현 범위

- `/mypage/staff`에서 사장이 소유한 활성 메뉴판을 하나 이상 선택한다.
- 한 배치의 메뉴판에는 동일한 직원 이메일과 역할을 적용한다.
- 서버는 현재 Auth 사용자가 선택한 모든 메뉴판의 Owner인지 다시 확인한다.
- 원본 토큰은 256-bit 난수로 만들고 이메일에만 넣으며, DB에는 SHA-256 hash만 저장한다.
- 초대는 7일 후 만료되며, 이메일 하나와 수락 링크 하나를 사용한다.
- 자가 초대, 유효한 중복 초대, 확인 가능한 기존 active member, 보관 메뉴판을 거부한다.
- 사장 한 명이 만드는 초대 row를 시간당 30개로 제한한다. 이는 직원 seat 제한이 아니라 발송 남용 방지 한도다.
- 생성·발송·발송 실패는 `menu_site_audit_logs`에 남기고, 발송 실패 시 pending 초대를 revoked로 무효화한다.
- raw token, token hash, provider 오류 본문은 UI·audit log·application log에 기록하지 않는다.

## 안전한 운영 게이트

다음 조건이 모두 충족될 때만 실제 초대 생성과 이메일 발송이 가능하다.

- `STAFF_INVITATIONS_ENABLED=true`
- `NEXT_PUBLIC_SITE_URL`이 유효한 HTTP(S) origin
- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY` 설정

현재 작업에서는 환경변수를 추가하거나 변경하지 않았다. 초대 수락 화면, 기존 사용자와 신규 사용자의 Auth 복귀 흐름, 실제 SMTP 발송 QA가 끝나기 전에 `STAFF_INVITATIONS_ENABLED`를 Production에서 활성화하지 않는다.

## 초대 수락

- 이메일의 `/staff/invitations/accept?token=...` 요청은 token 형식만 확인하고 30분 HttpOnly·SameSite=Lax 쿠키로 옮긴 뒤 query가 없는 `/staff/invitations/review`로 즉시 이동한다.
- 로그인과 회원가입의 `next`에는 raw token을 넣지 않고 안전한 review path만 전달한다.
- 수락 Server Action은 현재 Auth 사용자와 확인된 이메일을 사용하고 DB에는 token SHA-256 hash만 전달한다.
- 기존 `accept_menu_site_invitation` RPC가 batch 전체 상태·만료·이메일·Owner·lifecycle·중복 membership을 다시 확인하고 원자적으로 membership·invitation·audit를 변경한다.
- 성공 또는 재시도 불가능한 실패에는 intent cookie를 같은 path에서 제거한다.
- 수락 화면은 `noindex`, `nofollow`, `no-referrer`로 제공한다.

## 검증 범위

- 이메일 정규화와 역할 allowlist
- 잘못된 이메일과 Owner 역할 fail closed
- branded HTML에서 메뉴판 이름 escape
- raw token 형식 제한과 SHA-256 hash
- 기존 Owner/Manager/Editor/Order Staff/Viewer 권한 회귀 테스트

Production SQL·데이터·Auth·SMTP·환경변수·실제 이메일은 변경하거나 실행하지 않았다.
