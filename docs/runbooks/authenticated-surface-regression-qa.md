# 인증 화면 회귀 QA

로그인 이후의 마이페이지, 결제·문의·알림·계정 탭, 매장 운영, 직원 관리와 실제 메뉴판 편집기를 PC·모바일에서 반복 검사한다. 이 스크립트는 읽기 전용이며 저장·공개·결제·QR 교체·호출 처리 같은 action을 실행하지 않는다.

## 준비

저장소에서 무시되는 `.env.qa.local`에 전용 QA 계정만 기록한다. 실제 고객 계정이나 service-role key를 사용하지 않는다.

```dotenv
AUTHENTICATED_SURFACE_QA_EMAIL=qa@example.com
AUTHENTICATED_SURFACE_QA_PASSWORD=replace-with-qa-password
AUTHENTICATED_SURFACE_QA_BASE_URL=https://tablescene-menu-site2.vercel.app
```

특정 메뉴판을 고정하려면 `AUTHENTICATED_SURFACE_QA_MENU_ID`를 추가한다. 생략하면 로그인 계정의 첫 번째 편집 가능한 메뉴판을 읽기 전용 대상으로 사용한다.

## 실행

```bash
npm run qa:authenticated-surfaces
```

특정 화면만 좁혀 재현할 수 있다.

```bash
AUTHENTICATED_SURFACE_QA_ROUTE='/mypage?tab=menus' npm run qa:authenticated-surfaces
```

## 검사 범위

- 로그인 성공과 검사 도중 세션 유지
- PC `1440×900`, 모바일 `390×844`
- 마이페이지의 메뉴판·결제·문의·알림·계정 탭
- 매장 운영·직원 관리·독립 문의 화면
- 실제 편집 가능한 메뉴판의 기본·메뉴 구성·디자인·다국어·공개 설정과 미리보기·QR 관리
- HTTP 오류, 빈 화면, 가로 overflow, 화면 밖으로 잘린 interactive element
- 깨진 이미지, console/page error, 같은 출처 요청 실패
- axe-core WCAG A/AA `critical`·`serious` 위반

비밀번호와 세션 값은 결과에 출력하지 않는다. 실패 결과에는 화면 경로, viewport와 UI 오류만 남긴다.

## 2026-09-16 모바일 편집기 육안 회귀

기존 QA 계정의 로그인 세션을 사용해 localhost 편집기를 `390×844`로 확인했다. Production 데이터 변경을 일으키는 저장·공개·QR 다운로드는 실행하지 않았다.

- 기본 정보 화면의 제목·상태·템플릿 정보와 입력 폼이 화면 폭 안에 유지됨
- 상단 `미리보기`·`공개 페이지 보기`·`QR 다운로드`가 모바일에서 같은 폭의 한 열로 배치되고 `640px` 이상에서는 기존 가로 툴바로 복귀함
- 메뉴판 구성의 긴 페이지·구조 목록과 수정·복사·삭제 액션이 가로로 넘치지 않음
- 하단 `샘플 메뉴로 되돌리기`와 `저장` 액션이 모바일 카드 폭 안에서 유지됨
- 상단 편집 탭은 기존 가로 스크롤 계약을 유지함
