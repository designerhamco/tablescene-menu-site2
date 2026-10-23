# 공식 사이트 5개 페이지 리뉴얼

사용자 제공 기획 이미지의 구성과 설명 의도를 기존 ArtiMenu 디자인 시스템으로 적용한다. 이미지의 메모/빨간 글씨를 실제 카피로 복제하지 않으며 타이틀과 본문은 서비스에 맞춰 작성했다.

## 승인된 범위

- `/`: 서비스 전체 소개 전용 Home. 정적 히어로, 자동 디자인 쇼케이스, 커스터마이징 카드 4개와 기기 활용 카드, 주문·호출·AI·다국어 카드, 베이직/다이닝/디스플레이 플랜 안내.
- `/services/basic`: Home과 분리한 베이직 소개. 대표 상품·사진/앨범·가격 옵션·할인·위젯·광고·호출·주문 8개 설명과 사용법 팝업. 이전 menu/signature 주소는 이 페이지로 연결한다.
- `/services/dining`: 검정 배경의 다이닝 소개. 멀티페이지·커버·사진/앨범·가격 옵션·할인·광고·호출·주문 8개 설명과 사용법 팝업. 할인 지원 여부는 기존 `getDiningTierFeatures('multi')`의 true를 확인했다.
- `/services/display`: 화면별 페이지·이미지/영상 전용 페이지·가격 옵션·할인 4개 설명, 스마트 TV/일반 모니터 연결 팝업. 신규 신청은 기존 준비 중 정책을 유지한다.
- `/faq`: 상단 통합 검색, 1:1 문의/기존 AI 상담 진입, 공지사항/FAQ 탭, 서비스 주제별 필터와 페이지 이동. 기존 FAQ 내용을 재사용하고 PG 업종 등 참고 이미지의 예시 분류는 복사하지 않는다.
- `/admin/announcements`: 기존 관리자 계정만 작성·수정·게시·비공개·상단 고정. 일반 텍스트 본문, 입력 검증과 동시 수정 충돌 방지. 공지 원문은 React 텍스트로 렌더링한다.

히어로 장면 애니메이션과 기능 카드의 움직이는 이미지는 후속 작업이다. 현재는 기존 기기 합성 이미지와 정적 제품 설명 화면을 사용한다. 디자인 쇼케이스의 자동 넘김은 이번 범위이며 수동 화살표/숫자는 제거하고 접근성용 재생/일시 정지만 유지했다. 모션 감소 환경의 기본 정지와 키보드 탐색·드래그는 보존한다.

## 구현 경계

마케팅 페이지는 Next.js 페이지에서 서버 렌더링한다. `components/marketing`의 공통 서비스 구성, 정적 기능 시각 자료와 사용법을 재사용하며 기존 버튼/타이포/컨테이너/라운드 토큰을 따른다. 사이트 전체에 새 전역 스타일을 추가하지 않았다. 고객 메뉴판 엔진은 변경하지 않았다. Production DB types에는 승인 후 실제 운영 스키마에서 생성한 공지사항 테이블 정의만 추가했다.

공지사항은 사용자 세션과 기존 `admin_users`를 재사용한다. 서버 액션과 RLS가 관리자 권한을 각각 확인한다. 공개 API와 상세 조회는 관리자 세션에서도 게시된 글 조건을 명시한다. 공지사항 이외의 데이터나 인증/결제 정책을 변경하지 않는다.

## 운영 적용

2026-10-23 사용자가 기존 공개 GitHub 저장소 푸시·공지사항 테이블/권한 정책의 운영 적용·배포를 승인했다. GitHub 작업 브랜치를 푸시하고 PR #316을 생성했다.

공지사항 SQL 한 건의 운영 적용과 사후 권한/정책 검증을 완료했다. 기존 5개 표의 행 수는 그대로이며, 운영 테스트 공지사항은 생성하지 않았다. 정식 운영 타입을 갱신하고 최종 출시 검수로 이어간다.

적용 파일, 권한 범위와 기록: [공지사항 적용 절차](runbooks/support-announcements-migration.md).

## 검증

- 최신 `origin/tablescene-next` 통합 후 단위 테스트 796개 통과. `npx tsc --noEmit` 통과. 최적화 빌드/77개 정적 페이지 생성 통과.
- 전체 ESLint 오류 0. 기존 미사용 변수 경고 2개는 변경하지 않은 `lib/apply-launch-copy.test.ts`, `scripts/qa-customer-call-status.mjs`에 남아 있다.
- `scripts/qa-marketing-renewal.mjs`: 360×800, 390×844, 768×1024, 1024×768, 1440×900의 실제 DOM viewport에서 5개 페이지, 총 25개 조건 통과. 가로 넘침/깨진 이미지/페이지 예외/serious·critical 접근성 위반 0. 사용법 팝업 Escape/포커스 복원·FAQ 검색/빈 결과/페이지 이동·Display 본문 신청 링크 부재 확인.
- `scripts/qa-announcements-sql.mjs`: 격리 PostgreSQL에서 관리자 생성·수정·게시/비공개, 일반 회원/비회원 읽기와 쓰기 제한, 미래/비공개 글 비노출, 삭제 금지, 입력 제약, 수정 충돌 통과.
- 실제 프로덕션 빌드와 격리 PostgreSQL을 로컬 HTTP 어댑터로 연결해 관리자 작성→비공개→게시→공개 상세→수정→충돌→비공개/상세 404 흐름을 검수했다. HTML 문자열이 텍스트로 표시되는 것, 비로그인 로그인 이동·일반 회원 접근 차단, 관리자 390/1440px 가로 넘침/접근성 위반 0을 확인했다. 테스트 공지는 메모리 DB에만 존재한다.
- 프로덕션 빌드의 공개·신청·Dining·Display 회귀 13조건 통과. 베이직 6종과 다이닝 전용 회귀는 최신 보기 옵션 패널을 먼저 닫도록 임시 검수 흐름을 맞춘 뒤 19조건 통과, 브라우저 예외/실제 write 0.
- 기존 범용 공개 runner의 `desktop fit board` 가정과 REAL MATCHA 전용 runner의 고정 `article=18` 가정은 현재 엔진/스타터와 다르다. 변경하지 않은 최신 운영 코드를 `/tmp/artimenu-renewal-baseline`에 읽기 전용 사본으로 실행해 비교했으며, 운영/리뉴얼 모두 실제 article 22개·가로 넘침 0·같은 5개 카테고리의 모바일 heading-gap 경고를 반환했다. REAL MATCHA의 PC/태블릿 고정 영역·스크롤·메뉴 순서 등 17조건은 통과했지만 해당 모바일 검사를 전체 통과로 보고하지 않는다. 메뉴판 엔진/간격/전역 CSS는 이번 변경에서 수정하지 않았고, 기존 경고의 정책 정합화는 별도 후속 범위다.
- 화면과 검사 기록은 `/tmp/artimenu-renewal-qa/`, 실행 로그는 `/tmp/artimenu-renewal-*.log`에 보관했다.

## 사용법 근거

기기별 전체 화면 지원이 같다고 안내하지 않는다. 스마트 TV는 웹 브라우저 지원 모델에 한정하고, 일반 모니터는 HDMI로 PC를 연결하는 절차로 구분한다. 설치/전체 화면 안내는 아래 공식 자료를 확인했다.

- [Apple iPad 홈 화면 웹 앱](https://support.apple.com/en-mide/guide/ipad/ipad8f1f7a29/ipados)
- [Google Chrome 전체 화면](https://support.google.com/chrome/answer/96810)
- [Google Chrome Android 웹 앱](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid)
- [Microsoft Edge 단축키](https://support.microsoft.com/en-us/edge/keyboard-shortcuts-in-microsoft-edge)
