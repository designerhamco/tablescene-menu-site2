> 초기 공통화 작업의 검수 이력이다. 이후 사용자 피드백으로 검색 외형과 크기·간격을 다시 수정했다. 현행 규격과 후속 검증은 [컴포넌트 크기·간격 기준](site-component-density.md)을 따른다.

# 아티메뉴 컴포넌트 시스템 점검 · 2026-11-11

상태: 구현·로컬 검증 완료. 운영 배포 응답·스타일 확인은 릴리스 후 확인한다.

## 기준과 범위

사용자 제공11개 이미지는 컴포넌트 구조·간격·선택/입력/비활성 상태의 참고 자료로 사용했다. 이미지의 보라·파랑 팔레트·그라데이션·과한 그림자를 복제하지 않는다. 기존 아티메뉴 타이포·색·버튼 크기·탭 역할을 사용한다. .menu-typography, .aube-table-root, data-template-artwork와 고객 메뉴판 렌더러/스타터데이터는 수정 대상이 아니다.

공식 사이트 전체 공통 프리미티브와 주요 사용처를 소스로 대조했다. 브라우저 시각 검수나 모든 계정/기기의 실사용을 완료했다고 주장하지 않는다. 원본 유지가 요청된 페이지네이션,24px 썸네일 화살표, 무배경 미리보기 접기 화살표, 무테 회색 맨 위로 버튼은 그대로 보존한다. 기능·저장·검색 실행 방식·약관·인증 정책을 이동/변경하지 않는다.

## 공식 디자인 시스템 비교

| 참고한 공식 시스템 | 채택한 원칙 | 그대로 복제하지 않은 항목 |
| --- | --- | --- |
| [Shopify Polaris 검색](https://shopify.dev/docs/api/app-home/latest/web-components/forms/search-field), [선택 목록](https://shopify.dev/docs/api/app-home/latest/web-components/forms/choice-list) | 일반 텍스트 입력과 검색의 역할 분리, 접근 가능한 레이블, 단일/다중 선택과 상태 | Shopify 고유 팔레트·컴포넌트 기술 스택 |
| [Atlassian 입력](https://atlassian.design/components/textfield/usage), [탭](https://atlassian.design/components/tabs/usage) | 짧은 상단 레이블, 필요한 때만 도움말, 선택/키보드 상태와 콘텐츠 위계 | 브랜드색, 기존 아티메뉴에 없는 탭 외형 일괄 도입 |
| [Adobe Spectrum 검색](https://spectrum.adobe.com/page/search-field/), [입력](https://spectrum.adobe.com/page/text-field/) | 검색 아이콘·지우기·레이블, 불필요한 설명 배제, 검색 결과 없음과 유효성 오류 구분 | 이미지에 있는 특수문자 검색 오류 예시·보라색 포커스 |

시장 점유율이나 매출 순위를 검증한 보고서가 아니다. 널리 사용되는 제품군의 공식 시스템에서 반복되는 패턴을 아티메뉴의 기존 계약에 맞춰 적용했다.

## 항목별 점검과 적용

| 항목 | 확인한 구현 | 판단·조치 |
| --- | --- | --- |
| 버튼·아이콘 | Button, ui-system, ScrollToTop, image-carousel | 기존32/40/44/48px·아이콘 예외 유지. 회색 secondary와 비활성의 장식 테두리 정리. 흰 outline/위험 outline 상태 보존 |
| 기본 입력·textarea | Input, Textarea, FieldMessage | 기존40/44/48/56px 유지. 안쪽16px, 비활성의 중복 투명도 제거, 읽기 전용 선택·복사·포커스 보완 |
| 복합 입력 | 페이지별 아이콘/단위 배치 | InputGroup/InputGroupInput/Addon/Action 추가. 경계와 포커스는 그룹 한 곳, 보조 버튼은 입력의 형제 |
| 검색 | 템플릿·공지·호출 목록 | SearchField 공통화. 지우기/레이블/포커스 복귀 제공. 기존 라이브 필터·제출 검색·IME 보호와 검색 버튼 위치 유지 |
| 비밀번호 | 로그인·가입·재설정 | PasswordField 적용. 초기 마스킹, 표시/숨기기, native 검증·자동완성·폼 name/value 보존 |
| select·다중선택 | Select, MultiSelect, native select | 기존 높이·20px chevron·선택/스크롤/표시 유지. inline inset만 공통16px로 일치 |
| 체크박스·라디오 | Radix와 native |18px 공통 표시와 기존 토큰으로 맞춤. 전체·부분·비활성·오류·포커스 보완. 부분 선택은 실제 primitive 상태 사용 |
| 날짜·달력 | native date, Calendar | 날짜32px과 nav32px 전용 규격. 선택 색상과 버튼 hover 우선순위 보완. 실제 달력/폼 예시 추가 |
| 탭·세그먼트 | Tabs/NavigationTabs/CategoryFilter | page/section/category/state 및 룸8px 사각형·캡슐 필터 승인 기준 유지. 새 모양 추가 없음 |
| 스위치·슬라이더 | Switch, Slider | 기존 기능·토큰·키보드/비활성 의미 유지. 토글에 ON/OFF 문구 추가 없음 |
| 메뉴·툴팁·팝업 | SelectContent, DropdownMenu, HelpTooltip, Dialog | 기존 공유 표면·포커스/닫기·가용 높이·짧은 안내 유지. 새 장식/설명 추가 없음 |
| 로딩·피드백 | LoadingState/Spinner/Progress/EmptyState/Toast | 기존 실제 상태값과 motion 감소 처리 유지. 검색 무결과는 오류가 아닌 빈 결과 |
| 카드·표·페이지네이션 | ContentPanel/Table/SitePagination | 흰 표면/회색 무테·조건부 표 넘침·원본 페이지네이션 보존 |
| 타이포·색상·반응형 | typography/site-spacing | 기존 글자·행간·자간·와이드 상한과 CSS 레이아웃 유지. 색상 참조 복제·페이지별 폰트 크기 추가 없음 |

## 검증과 제한

새 공통 입력은 사이트 제어 외형 자동 검사에 등록했다. 폼 name/값/required/autocomplete, 검색 지우기의 non-submit 의미, 비밀번호 초기 상태, 체크박스 부분 선택, 라디오 단일 선택, 달력의 선택/비활성 의미를 서버 렌더링 테스트로 검증한다. check:site-ui에 포함해 이후 빌드에서도 실행한다. 기존 레거시 예외는 늘리지 않으며 제거한 라이브러리 검색 CSS의 예외만 삭제했다.

자동 승인 검토가 흰 outline/outline-danger의 공통 hover/pressed 테두리 변경을 거부했다. 해당 변형은 원래 상태로 보존하는 대안으로 진행했으며, 새 색상·모양·기능을 도입하지 않았다.

### 확인 결과

- 전체 테스트1,251개, 공통 UI 계약148개 통과.
- TypeScript, 변경 TS/TSX의 ESLint(--no-ignore), git diff --check 통과.
- 별도 디렉터리의 운영 빌드 통과. Next가 생성한 tsconfig/next-env 변경은 복원했다.
-375·768·1440·2560px에서 스크린샷 없이 검색 지우기·포커스 복귀·무결과, 비밀번호 표시/숨기기·값 보존, 부분 체크·라디오 방향키, 읽기 전용 키보드 포커스, 달력 날짜/월 이동을 자동 검증했다. 런타임 오류0개, 새 입력 영역/각 카드의 가로 넘침0px, 입력44px·달력 날짜/이동32px를 확인했다.
- `/design-system`, `/templates`, `/sign-in`, `/sign-up`가 로컬 운영 빌드에서200과 새 입력 마크업을 제공했다. 실제 로그인·계정 생성·기존 매장 데이터 변경은 수행하지 않았다.

375px 라이브러리 전체 문서의 scrollWidth는508px로 남아 있다. 새 입력 영역을 제외해도 동일하며 기존 테이블·키오스크 배치도 예시에서 발생한다. PC 중심 공간 편집과 좁은 화면의 관리 행 유지라는 기존 범위와 분리해 기록한다. 새 입력 검증 결과를 사이트 모든 화면의 무넘침/시각 검수 결과로 확대하지 않는다.

운영 반영은 이 문서를 포함한 PR의 배포 리비전, Vercel 성공과 실제 HTTP/CSS 응답을 확인한 뒤 사용자에게 보고한다.
