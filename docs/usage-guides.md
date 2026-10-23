# 사용가이드 페이지

## 구성

- 공개 주소: `/guides`. `?plan=basic|dining|display`로 처음 선택할 플랜을 지정할 수 있다.
- 공통 빠른 메뉴의 AI 상담 왼쪽과 고객센터 상담 영역에 ‘사용가이드’를 연결한다. 기존 빠른 메뉴 제외 경로(고객 메뉴판·미리보기·템플릿 상세)는 그대로 따른다.
- 기존 Tabs·site-button·타이포그래피·컨테이너·표면/라운드 토큰을 사용한다. 기획 이미지의 빨간 메모나 임시 문구는 화면 카피로 복제하지 않는다.
- 베이직/다이닝은 전체 화면·주소창과 메뉴판 크기 조정 2개, 디스플레이는 PC/모니터 연결을 더한 3개 설명 블록이다. 디스플레이 신규 신청은 준비 중으로 안내한다.
- 상단 가이드 종류는 FAQ 주제 선택과 같은 공통 밑줄 탭 스타일(`site-topic-tabs`/`site-topic-tab`)을 사용한다. 현재 가이드는 진한 글자·밑줄, 추가 가이드는 비활성으로 표시하며 기존 anchor 이동을 유지한다. 하단 세부 주제 이동 버튼은 제거했다. 추가 주제는 내용이 확정될 때까지 비활성 ‘추가 가이드 · 준비 중’이다.
- 기기·브라우저 선택 UI와 하단 세부 주제 이동 버튼은 사용자 최종 요청으로 제거했다. 현재 본문은 기존 Windows PC·Chrome 기본 안내를 유지하고, 기기별 원고 데이터는 후속 편집을 위해 남겨둔다.

## 영상과 콘텐츠 추가

`lib/usage-guides.ts`의 GuideSection(고유 id·제목·본문·단계·보충 설명·공식 출처)과 `GuideArticle`의 ‘영상 → 제목/본문’ 구조를 반복한다.

영상은 아직 제공되지 않아 실제 재생 UI 대신 ‘영상 준비 중’과 바로 따라 할 수 있는 본문을 표시한다. 가짜 재생 버튼·빈 video src·불필요한 미디어 요청은 없다. 제공 후 `GUIDE_VIDEOS`의 `plan:device:browser:section` 키(예: `basic:mac:safari:fullscreen`)에 영상 src와 한국어 WebVTT captionsSrc, 필요시 poster를 등록한다. 브라우저/플랜이 다른 설명에 임의의 영상을 돌려 쓰지 않는다. 다른 호스팅의 embed 링크는 전달받은 서비스의 공식 임베드 방식에 맞춰 별도로 연결한다.

## 브라우저 설명 기준

2026-10-23 공식 안내를 확인했다. PC의 전체 화면·도구 막대 표시·페이지 확대를 구분하며, 모바일 QR·앱 내부 브라우저의 주소창 숨김을 보장하지 않는다. iPad는 도구 막대 숨김과 홈 화면의 웹 앱 실행을 PC F11과 구분한다. 삼성 인터넷의 글자 크기는 전체 페이지 배율과 구분하고, 공식 안내의 Android 9~12 기준 및 버전 차이를 명시했다.

- [Chrome PC 전체 화면·확대](https://support.google.com/chrome/answer/96810?hl=ko)
- [Edge 단축키](https://support.microsoft.com/ko-kr/edge/keyboard-shortcuts-in-microsoft-edge)
- [Mac Safari 도구 막대](https://support.apple.com/ko-kr/guide/safari/ibrw1012/mac)
- [Mac Safari 확대 단축키](https://support.apple.com/ko-kr/guide/safari/cpsh003/mac)
- [iPad Safari 페이지 설정](https://support.apple.com/ko-kr/guide/ipad/ipad54f3cde6/ipados)
- [iPad 홈 화면 웹 앱](https://support.apple.com/ko-kr/guide/ipad/ipad8f1f7a29/ipados)
- [Android Chrome 확대](https://support.google.com/chrome/answer/96810?co=GENIE.Platform%3DAndroid&hl=ko)
- [삼성 인터넷 글자 크기](https://www.samsungsvc.co.kr/solution/36557)

## 초기 구현 검수

- 단위 테스트 816건·TypeScript·전체 ESLint 오류 0·최적화 빌드 통과.
- 실제 DOM viewport 320×800/390×844/768×1024/1024×768/1440×900에서 3개 플랜 15조합: 가로 넘침 0, 영상 자리 16:9, 흰 입력창/테두리, 빠른 메뉴 두 버튼의 화면 내 배치·비겹침, 유효한 목차 대상 확인.
- 실제 UI의 8개 기기·브라우저 조합, 태블릿에서 Display로 전환할 때 올바른 PC 조합 복구, 방향키/Home 탭 전환과 포커스 표시, 목차 이동 후 대상 포커스/헤더 여유 112px 확인.
- 고객센터 진입, Home의 사용가이드/AI 버튼, 템플릿 상세의 빠른 메뉴 제외, AI 상담 열기/Escape/스크롤 잠금 해제, 브라우저 오류 0 확인.
- 공식 도움말 8개 HTTP 200 확인. 운영 반영은 병합 커밋의 Vercel Production 성공과 공개 화면으로 확인한다.
