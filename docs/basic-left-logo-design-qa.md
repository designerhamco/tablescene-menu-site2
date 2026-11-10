# 상단행 고정형(왼쪽 로고) · 리스트형

추가 디자인 ID는 `basic-top-row-left-logo`이며 기존 `basic-top-row` 리스트형을 재사용한다. 원래 중앙 로고형과 앨범형의 등록 ID 및 배치는 유지한다.

- PC·태블릿: 첫 헤더 셀의 로고/가게명 왼쪽 정렬, 마지막 셀의 가게 설명 오른쪽 정렬 및 맨 오른쪽 언어 아이콘.
- 안내사항 1/2/3: 마지막 메뉴 열의 마지막 콘텐츠 아래에 기존 footer 측정·간격으로 배치. 스크롤 끝에서 모두 접근 가능.
- 모바일: 기존 상단행 템플릿의 읽기 구성·글자 크기·로고 크기 유지.
- 카탈로그·상세·구매·생성·변경: 같은 등록 ID와 실제 렌더러를 사용하며 별도 기본 디자인으로 노출.

## 검증

- 관련 Node 테스트 91개 통과. 실제 생성 함수의 메모리 클라이언트로 카탈로그/생성 데이터 일치를 검증한다.
- `npm run check:site-ui`: 공통 시스템 검사 및 133개 테스트 통과.
- `npx tsc --noEmit`, 변경 파일 ESLint, `git diff --check` 통과.
- `scripts/qa-basic-left-logo.mjs`: PC 1440×900/1920×1080, 태블릿 1180×820/820×1180에서 로고/가게명과 묶음형/채움형을 확인한다. 모바일 320×740/430×932의 가게명·로고 구성을 원본과 비교하고, 기존 중앙형 리스트/앨범 헤더와 EN/JA/ZH 언어 메뉴도 확인한다. 총 25개 시나리오이며 실제 DOM viewport, 헤더 경계, 마지막 열의 안내사항 위치, 스크롤 접근 및 API 쓰기 부재를 검사한다.
- 카탈로그 390/1440px에서 신규 이름·실제 썸네일·상세 연결을 확인했다. 기본 디자인 7개와 구매/미리보기 URL 일치는 Node 테스트에서 검사한다.
- 카탈로그 이미지는 1180×820 태블릿 미리보기의 실제 렌더링을 캡처했다.

## 운영 반영 순서

`20261110042640_add_basic_top_row_left_logo_design.sql`은 기존 함수 3개의 기본 디자인 허용 목록에 새 ID 하나만 추가한다. 함수 시그니처·권한·서비스 검증·가격·결제 확인·레코드 갱신 로직은 그대로이며, 회귀 테스트에서 기존 함수와의 차이가 허용 목록 추가뿐인지 비교한다.

Applied on 2026-11-10 to linked `tablescene-prod` (`kfbekbapwsyeanobyjsv`) after explicit user approval in this chat. Before execution, all three live function bodies exactly matched the repository baseline and did not contain the new ID. Executed this one SQL file once with `supabase db query --linked --file`; no bulk `db push` was used.

Postcheck: each function contains the new ID exactly once. Removing only that added string restores the complete prior function body byte for byte. Function signatures, execution ACLs, security-definer flags and empty search_path settings are unchanged. No customer menu, subscription or payment records were changed, and no real payment was executed. SQL is already applied and does not need to be rerun. Vercel Preview passed, and PR #519 merged as `12317169`. Production deployment verification is tracked in the PR.
