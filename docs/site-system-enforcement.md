# 공통 디자인 시스템의 자동 적용과 회귀 방지

2026-10-29 사용자 요청. 새 일반 페이지는 `SitePage`를 직접 또는 합성 컴포넌트를 통해 렌더링한다.

```tsx
import SitePage from "@/components/layout/SitePage";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

export default function Page() {
  return <SitePage title="페이지 제목" description="페이지 설명">
    <Tabs purpose="section" defaultValue="first">
      <TabsList size="md"><TabsTrigger value="first">첫 영역</TabsTrigger></TabsList>
    </Tabs>
  </SitePage>;
}
```

- SitePage는 공통 헤더·푸터·페이지 상단 여백·컨테이너·SitePageHeader를 소유한다. 개별 className/style/spacing props를 제공하지 않는다. 일반 공개 페이지는 가운데, 관리 문맥은 align=start를 사용하며 수직 규칙은 같다.
- 제목과 설명은12px, 제목 그룹과 첫 콘텐츠는 모바일32px/태블릿·PC40px다. 첫 콘텐츠 자체의 기본 상단 margin은 공통 경계에서 제거한다. 폰트·색·와이드 보정과 탭 크기는 기존 토큰을 상속한다.
- 탭은 purpose=page/section/category/state, size=sm/md/lg로 역할을 고른다. Button/Input/Select도 공통 API를 사용한다. 페이지의 class/style/CSS Module에서 외형을 재정의하지 않는다.
- npm run check:site-system은 app/components/styles를 재귀 탐색한다. 새 라우트의 공통 틀 누락, 별도 h1, 제목 조상 요소의 숫자 여백·인라인 보정, 탭/버튼/입력 외형 덮어쓰기, 지역별 공통 토큰 재정의를 검사한다. JSX 별칭·합성 페이지와 CSS Module도 확인한다.
- 기본·turbo·debug Production 빌드는 모두 check:site-ui를 먼저 실행한다. 이 경로에 새 검사와 기존 타이포·컨트롤 상태·대비·레이아웃 계약을 함께 묶었다. 위반하면 빌드가 실패한다. 단위 테스트에서도 동일한 현재 저장소 검사를 실행한다.
- docs/site-system-legacy-inventory.json은 이 작업 직전 HEAD의 기존 화면만 고정한 기술부채 목록이다. 홈 히어로·인증·상세·내부 도구 등의 현재 구성을 일괄 개편하지 않기 위한 것이다. 파일/규칙/구문 지문/발생 횟수를 정확히 제한하며 새 파일·추가 발생·값 변경에 상속되지 않는다. 실패를 숨기기 위한 자동 갱신 명령은 제공하지 않는다. 새 예외를 추가하지 말고 공통 구현으로 이전한다.
- 고객 메뉴판·공개 주문/수령 렌더러는 별도 디자인 경계다. 시스템 변경 시 예시·문서·계약을 함께 변경하고 실제 viewport에서 확인한다. 정적 검사는 모든 동적 스타일이나 시각적 품질을 증명하지 않으므로 브라우저 검수를 생략하지 않는다.

## 공지사항 게시판

공지 페이지는 SitePage와 BoardList를 사용한다. 큰 FAQ 검색 영역을 공유하지 않는다. 목록 위 왼쪽 건수, 오른쪽 기존 공지 유형 선택·제목/내용 검색·검색 아이콘을 제공한다. 표는 번호·제목·등록일만 표시하며 작성자/조회수 등 없는 데이터를 추가하지 않는다. 모바일은 검색을 다음 행으로 배치하고 번호를 숨긴다. FAQ5개·공지10개, 공통 글자·구분선·입력/버튼·페이지네이션 규칙을 유지한다. API·DB 구조와 게시글은 변경하지 않는다.

## 검수 기록

- 새 임시 app 라우트에 공통 틀 없는 h1을 추가해 실제 check:site-system이 page-shell/shared-heading 오류와 종료코드1로 차단하는 것을 확인하고 즉시 제거했다. 검사기의 별칭·합성 페이지·반응형/임의 utility·인라인/CSS Module·정확한 기존 발생 횟수 회귀 테스트를 포함한다.
- 단위·계약928개, 빌드 전 계약91개, TypeScript와 변경 파일 ESLint 통과. 별도 출력 경로의 Production 빌드 통과.
- 공지 실제 데이터1건으로 320×780, 390×844, 820×1000, 1280×720을 확인했다. 모든 폭에서 가로 넘침0px. 제목/설명12px, 제목 그룹/첫 콘텐츠는 모바일32px·태블릿/PC40px. 320px은 유형 선택 한 행과 검색 한 행으로 구성하고 번호 열 너비0으로 로딩/빈 목록의 표 폭도 보존한다. 검색0건·기존 공지 복원도 확인했다.
