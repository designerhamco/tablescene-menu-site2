# 사용가이드 페이지

## 구성

- 공개 주소: `/guides`. 탭은 ‘베이직•다이닝’(`basic`)과 ‘디스플레이’(`display`) 두 개다. `?plan=dining`도 통합 탭으로 열리며 기존 `dining-fullscreen`/`dining-zoom` ID를 미디어 영역에 남겨둔다.
- 공통 빠른 메뉴의 AI 상담 왼쪽과 고객센터 상담 영역에 ‘사용가이드’를 연결한다. 기존 빠른 메뉴 제외 경로(고객 메뉴판·미리보기·템플릿 상세)는 그대로 따른다.
- 기존 Tabs·site-button·타이포그래피·컨테이너·표면/라운드 토큰을 사용한다. 기획 이미지의 빨간 메모나 임시 문구는 화면 카피로 복제하지 않는다.
- 베이직•다이닝은 전체 화면과 메뉴판 크기 조정 2개, 디스플레이는 PC/모니터 연결을 더한 3개 설명 블록이다. 디스플레이 신규 신청은 준비 중으로 안내한다.
- 상단 가이드 종류는 FAQ 주제 선택과 같은 공통 밑줄 탭 스타일(`site-topic-tabs`/`site-topic-tab`)을 사용한다. 현재 가이드는 진한 글자·밑줄, 추가 가이드는 비활성으로 표시하며 기존 anchor 이동을 유지한다. 하단 세부 주제 이동 버튼은 제거했다. 추가 주제는 내용이 확정될 때까지 비활성 ‘추가 가이드 · 준비 중’이다.
- 기기·브라우저 선택 UI와 하단 세부 주제 이동 버튼은 사용자 최종 요청으로 제거했다. 공개 본문은 컴퓨터용 Chrome의 메뉴 조작과 Windows·Linux/Mac 단축키를 함께 안내한다. 기기별 기존 원고 데이터는 후속 편집을 위해 남겨둔다.

## 콘텐츠 폭·반응형 구조

- 공통 `.site-container` 안쪽 전체 폭을 사용한다. 본문 70rem·설명/권장 안내 46rem 같은 중첩 최대 폭을 두지 않는다. 헤더와 본문의 실제 좌우 경계를 맞춘다.
- 768px 이상은 각 가이드가 왼쪽 16:9 영상 60% / 오른쪽 설명 40%의 2열이다. 열 간격은 태블릿 32px, 1024px 이상 80px이다. 긴 설명은 처음에 영상 높이 안에서 일부를 보여주고 하단 페이드와 공통 outline ‘더보기’ 버튼을 제공한다.
- ‘더보기’를 누르면 설명 전체를 자연 높이로 펼치고 ‘접기’로 전환한다. 내부 스크롤과 기존 ‘아래에 내용이 더 있어요’ 문구는 사용하지 않는다. 짧은 설명에는 버튼을 표시하지 않는다.
- 설명은 이름 있는 region이며 버튼의 aria-expanded/aria-controls로 펼침 상태와 대상을 연결한다. 키보드로 본문 링크에 진입해도 자동으로 펼쳐 숨겨진 링크에 포커스가 남지 않는다. ResizeObserver·폰트 준비·화면 크기 변경으로 영상과 본문 높이를 재측정한다.
- 767px 이하는 영상 → 설명의 1열이며 설명에 높이 제한이나 내부 스크롤을 적용하지 않는다. 모바일의 페이지 읽기 흐름을 유지한다.
- 베이직•다이닝 공통 영상은 `basic:device:browser:section` 키로 제공한다. 기존 Dining 원고/영상 키는 이전 데이터와 후속 편집 호환을 위해 보존한다.

## 크롬 권장·설정 안내

- 페이지의 장식 도입문과 플랜별 소개 문장을 제거하고, 공통 노란 안내 표면에 ‘아티메뉴 메뉴판은 Chrome(크롬) 사용을 권장합니다.’를 강조한다. 브라우저 설정은 컴퓨터용 Chrome 기준임을 바로 명시한다.
- 제목은 ‘전체 화면으로 메뉴판 보기’·‘메뉴판 크기 조정하기’다. 기존 설명의 고유 anchor는 유지한다.
- 설정 순서는 옅은 회색·16px 라운드 박스 안에 번호 목록으로 표시한다. 더보기·전체 화면·확대·축소는 기존 Lucide 아이콘과 텍스트를 함께 보여주며 외부 이미지 요청을 추가하지 않는다.
- 같은 박스 안에서 메뉴로 조작하는 순서와 단축키를 구분한다. 전체 화면은 Windows·Linux F11 / Mac Command+Ctrl+F, 확대·축소와 기본 크기 복원은 각 OS의 Ctrl/Command와 +, −, 0을 안내한다. Google 공식 확대/축소 도움말과 [Chrome 단축키 안내](https://support.google.com/chrome/answer/157179?hl=ko)에 대조했다.
- 전체 화면을 켠 뒤 ‘주소창·툴바 숨기기’에서 Windows·Linux의 기본 숨김 확인과 Mac의 보기(View) → ‘전체화면에서 툴바 항상 표시’ 체크 해제를 구분한다. 메뉴명은 Chromium의 [영문 정의](https://raw.githubusercontent.com/chromium/chromium/main/chrome/app/generated_resources.grd)와 [한국어 번역](https://raw.githubusercontent.com/chromium/chromium/main/chrome/app/resources/generated_resources_ko.xtb)의 해당 항목으로 확인했다.
- `GuideStep`은 일반 문자열 또는 텍스트/제어 아이콘의 구조화된 배열을 지원한다. `shortcuts`는 기기별 동작 레이블과 키 배열이며 원시 HTML이나 문자열 치환으로 아이콘을 삽입하지 않는다.

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
