# Supabase Auth 이메일 템플릿 적용 런북

최종 갱신: 2026-08-31

## 목적

Supabase 기본 영문 메일 제목인 `Confirm your sign up` 등을 아티메뉴 한국어 브랜드 메일로 교체한다.

이 런북은 현재 제품에서 사용하는 다음 두 인증 메일만 대상으로 한다.

- 회원가입 이메일 인증
- 비밀번호 재설정

직원 초대 메일은 Supabase Invite가 아니라 아티메뉴의 별도 직원 초대 발송 경로를 사용하므로 이 런북에 포함하지 않는다. Magic Link, 이메일 변경, 재인증 메일은 현재 제품 흐름에서 사용하지 않으므로 임의로 활성화하거나 변경하지 않는다.

## 저장소 준비물

| Supabase 화면 | 제목 | HTML 본문 |
| --- | --- | --- |
| Confirm sign up | `[아티메뉴] 이메일 인증을 완료해 주세요` | [`docs/auth-email-templates/confirm-signup.html`](../auth-email-templates/confirm-signup.html) |
| Reset password | `[아티메뉴] 비밀번호 재설정 안내` | [`docs/auth-email-templates/reset-password.html`](../auth-email-templates/reset-password.html) |

두 HTML은 Supabase가 공식 지원하는 `{{ .ConfirmationURL }}`만 사용한다. 현재 앱의 회원가입은 `emailRedirectTo=/auth/callback`, 비밀번호 재설정은 `redirectTo=/reset-password`를 전달하므로 기존 인증·복구 경로를 그대로 유지한다.

## 적용 전 확인

1. Supabase Dashboard에서 대상 프로젝트가 Production `tablescene-prod`인지 확인한다.
2. Authentication → URL Configuration에서 Site URL이 실제 아티메뉴 공개 도메인인지 확인한다.
3. Redirect URLs에 다음 실제 공개 주소가 허용되어 있는지 확인한다.
   - `https://<공개-domain>/auth/callback`
   - `https://<공개-domain>/reset-password`
4. Authentication → SMTP Settings의 발신자 주소·발신자 이름·도메인 인증 상태를 확인한다.
5. 메일 제공자의 링크 추적 기능은 인증 URL을 다시 쓰지 않도록 비활성화한다.

URL·SMTP·도메인 설정은 Production Auth 변경이므로 이 확인 과정에서 임의로 수정하지 않는다.

## Dashboard 적용 순서

1. Supabase Dashboard → Authentication → Email Templates를 연다.
2. `Confirm sign up`을 선택한다.
3. Subject에 `[아티메뉴] 이메일 인증을 완료해 주세요`를 입력한다.
4. Body에 `docs/auth-email-templates/confirm-signup.html` 전체를 붙여 넣고 저장한다.
5. `Reset password`를 선택한다.
6. Subject에 `[아티메뉴] 비밀번호 재설정 안내`를 입력한다.
7. Body에 `docs/auth-email-templates/reset-password.html` 전체를 붙여 넣고 저장한다.
8. 다른 Auth 템플릿과 보안 알림 설정은 변경하지 않는다.

## 실제 수신 QA

Production 고객 데이터와 분리된 전용 QA 이메일 계정을 사용한다.

### 회원가입

1. 아티메뉴 `/sign-up`에서 신규 QA 계정으로 가입한다.
2. 제목이 `[아티메뉴] 이메일 인증을 완료해 주세요`인지 확인한다.
3. 데스크톱·모바일 메일에서 본문과 버튼이 잘리지 않는지 확인한다.
4. `이메일 인증하기`를 한 번 누른다.
5. `/auth/callback`을 거쳐 의도한 `next` 경로로 이동하고 로그인 세션이 생성되는지 확인한다.

### 비밀번호 재설정

1. 아티메뉴 `/forgot-password`에서 전용 QA 계정으로 재설정 메일을 요청한다.
2. 제목이 `[아티메뉴] 비밀번호 재설정 안내`인지 확인한다.
3. `비밀번호 재설정하기`를 눌러 `/reset-password`가 정상적으로 열리는지 확인한다.
4. 새 비밀번호 저장 후 로그아웃되고 새 비밀번호로 로그인되는지 확인한다.
5. 같은 재설정 링크를 다시 사용했을 때 안전하게 만료 안내가 표시되는지 확인한다.

## 성공 기준

- 두 메일 제목과 본문에 Supabase 기본 영문 브랜드 문구가 남지 않는다.
- 발신자 이름·주소가 계약한 아티메뉴 발신 정보와 일치한다.
- 인증 링크와 재설정 링크가 공개 도메인으로 이동한다.
- 회원가입 인증 후 의도한 경로로 이동한다.
- 비밀번호 재설정 후 새 비밀번호로 로그인할 수 있다.
- 스팸함 포함 실제 수신이 확인되고 링크가 메일 제공자에 의해 변형되지 않는다.
- 기존 직원 초대 메일 흐름은 영향을 받지 않는다.

## 롤백

적용 직전에 기존 Subject와 Body를 별도 텍스트로 보관한다. 링크 오류나 렌더링 문제가 확인되면 해당 템플릿만 이전 Subject와 Body로 되돌리고 저장한다. SMTP나 다른 Auth 설정은 함께 변경하지 않는다.

## 보안 메모

- 템플릿에는 secret, API key, access token을 넣지 않는다.
- `{{ .ConfirmationURL }}`은 인증용 일회성 링크이므로 로그·분석 도구에 기록하지 않는다.
- 메일 본문에 사용자 metadata를 표시하지 않는다.
- 링크 추적과 보안 스캐너의 URL 선열람은 일회성 인증 링크를 먼저 소비할 수 있으므로 실제 발송 업체 설정에서 확인한다.
- Supabase Management API로 Production 템플릿을 자동 PATCH하지 않는다. 사람의 최종 확인 후 Dashboard에서 두 템플릿만 적용한다.

## 공식 기준

- [Supabase Auth Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates) — 지원 템플릿, `{{ .ConfirmationURL }}` 변수, Dashboard 편집 위치, 링크 추적·선열람 주의사항
