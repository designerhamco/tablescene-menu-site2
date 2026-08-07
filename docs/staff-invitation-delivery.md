# 직원 초대 UI와 이메일 전송

최종 검토: 2026-08-07

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

2026-08-07 사용자 승인 아래 Production의 `STAFF_INVITATIONS_ENABLED=true` 설정과 재배포를 완료했다. 실제 발송은 계속 Owner 재인증, 선택한 메뉴판 소유권, 이메일·역할 allowlist, rate limit, audit 조건을 모두 통과해야 한다.

## 초대 수락

- 이메일의 `/staff/invitations/accept?token=...` 요청은 token 형식만 확인하고 30분 HttpOnly·SameSite=Lax 쿠키로 옮긴 뒤 query가 없는 `/staff/invitations/review`로 즉시 이동한다.
- 로그인과 회원가입의 `next`에는 raw token을 넣지 않고 안전한 review path만 전달한다.
- 수락 Server Action은 현재 Auth 사용자와 확인된 이메일을 사용하고 DB에는 token SHA-256 hash만 전달한다.
- 기존 `accept_menu_site_invitation` RPC가 batch 전체 상태·만료·이메일·Owner·lifecycle·중복 membership을 다시 확인하고 원자적으로 membership·invitation·audit를 변경한다.
- 성공 또는 재시도 불가능한 실패에는 intent cookie를 같은 path에서 제거한다.
- 수락 화면은 `noindex`, `nofollow`, `no-referrer`로 제공한다.

## 재전송과 취소

- 재전송은 현재 Auth Owner가 초대 batch의 모든 메뉴판을 여전히 소유하는지 다시 확인한다.
- 같은 batch의 pending row가 동일한 이메일·역할·token hash 상태일 때만 256-bit token과 7일 만료를 함께 회전한다.
- 새 이메일 발송이 실패하면 새 hash를 조건부로 이전 hash와 만료일로 되돌리고 실패 audit를 남긴다.
- 재전송도 시간당 초대 row 한도를 공유하며 실제 이메일 운영 gate가 꺼져 있으면 실행하지 않는다.
- 취소는 현재 Owner가 소유한 batch의 pending row만 `revoked`로 변경하며 기존 token을 즉시 사용할 수 없게 한다.
- 재전송과 취소는 각각 `staff.invitation_resent`, `staff.invitation_cancelled` audit를 남긴다.

## 직원 역할과 접근 회수

- Owner가 소유한 메뉴판의 active membership만 역할 변경·접근 회수 대상으로 조회한다.
- 역할은 `manager`, `editor`, `order_staff`, `viewer` allowlist만 허용한다.
- 역할 변경은 조회한 기존 role을 조건으로 update해 동시 변경을 감지하고 `staff.role_changed` audit를 남긴다.
- 접근 회수는 active row만 `revoked`로 바꾸고 `revoked_at`을 기록한 뒤 `staff.access_revoked` audit를 남긴다.
- audit 생성이 실패하면 방금 변경한 role/status 조건이 그대로일 때만 이전 상태로 되돌린다.
- 이메일을 확인할 수 없는 legacy membership은 user ID 일부만 표시하며 Auth 사용자 목록을 브라우저에 노출하지 않는다.

## 검증 범위

- 이메일 정규화와 역할 allowlist
- 잘못된 이메일과 Owner 역할 fail closed
- branded HTML에서 메뉴판 이름 escape
- raw token 형식 제한과 SHA-256 hash
- 재전송 token rotation·조건부 rollback과 Owner-only 취소 경계
- active membership Owner 경계, 역할 allowlist, 조건부 update·rollback
- 기존 Owner/Manager/Editor/Order Staff/Viewer 권한 회귀 테스트

## Production E2E 기록

2026-08-07 사용자 승인 아래 기존 Owner·직원 계정과 기존 활성 메뉴판으로 viewer 초대 1건을 발송하고 수락했다.

- 이메일 수신, 7일 만료, 메뉴판 이름과 viewer 역할을 확인했다.
- 잘못 로그인된 Owner 계정에서는 review 화면의 이메일 불일치를 확인하고 수락하지 않았다.
- 정확한 직원 계정 로그인 후 원자적 수락이 성공했고 직원 마이페이지에 `직원 참여`·`조회자` 배지와 읽기 전용 미리보기만 노출됐다.
- 편집 route 직접 접근은 `menu-edit-forbidden`으로 차단됐고 Owner-only 결제·구독·보관·삭제 동선은 표시되지 않았다.
- 이번 E2E는 승인된 초대·membership write만 수행했으며 Production SQL, migration, RLS·Storage policy, 결제·구독·고객 데이터 삭제는 실행하지 않았다.
