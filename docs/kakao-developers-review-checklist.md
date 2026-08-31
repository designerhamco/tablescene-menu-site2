# Kakao Developers review checklist

This checklist is for ArtiMenu Kakao Developers privacy consent item review.

## Service signup evidence

- Submit `/sign-up` as the signup flow URL.
- Capture the top of `/sign-up` where the `아티메뉴 회원가입` title and `카카오로 시작하기` button are visible.
- Click `보기` on `카카오 간편가입 필수 제공 항목 안내`, then capture the 개인정보 수집 항목 modal on `/sign-up`.
- Make sure the screenshots show all three requested required consent items:
  - 이름: 필수
  - 카카오계정(전화번호): 필수
  - CI(연계정보): 필수
- Include the notice that required item refusal can restrict signup and service use.
- Include the notice that CI is used only for 동일인 식별, 중복 가입 방지, and 부정 이용 방지.

## Kakao Developers console

Update these manually in Kakao Developers. Do not change them in code.

- Go to `내 애플리케이션 > 일반 > 기본 정보`.
- App name: use `아티메뉴` or `ArtiMenu`.
- App icon: use the ArtiMenu service logo.
- Prefer the service logo over a company logo when both exist.
- Icon asset: square image, preferably 512x512 or the current Kakao recommended size.
- Replace any old brand logo or unrelated company icon.
- App description: describe the ArtiMenu digital menu/service management product.

## Data-use caution

- Do not expose raw CI values in customer UI.
- Do not log raw CI values.
- Do not add a CI database column without a separate security and access-control review.
- If ArtiMenu does not actually store or use CI, review whether CI should remain a required Kakao consent item before resubmission.
- Keep company legal information as `디앤디커머스`.
