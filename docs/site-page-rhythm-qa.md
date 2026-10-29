# 페이지 간격·탭·고객센터 검수 — 2026-10-29

기준: docs/site-page-layout-contract.md. 고객 메뉴판 renderer는 수정하지 않았다.

## 실제 브라우저 치수

폰트 loaded 후 IAB DOM으로 측정. 숫자는 px이며 실제 viewport를 기록했다.

| viewport | 대상 | H1 상단 | 제목→설명 | 제목 그룹→첫 콘텐츠 | 페이지 가로 넘침 |
| --- | --- | --- | --- | --- | --- |
| 1280×720 | templates, FAQ, notices, guides, apply, pricing, design-system | 136 | 12 | 40 | 0 |
| 1280×720 | services/basic·dining·display, terms, privacy | 136 | 12 | 40 | 0 |
| 820×1000 | templates, FAQ, notices, guides | 113 | 12 | 40 | 0 |
| 320×780 | templates, FAQ, notices, guides | 104 | 12 | 32 | 0 |
| 390×844 | templates, FAQ, services/basic | 104 | 12 | 32 | 0 |

선택 탭18px/600/검정과 밑줄은 유지하고 비선택18px/500/rgb(150,150,150)을 확인했다. 목록의 영역 탭은 선택 높이52px, 상하12px·좌우24px, 최소160px이며 비선택 높이는 기준선1px을 제외한51px이다. 320px에서는 내부 스크롤로 유지하고 페이지를 넓히지 않는다. 다이닝 소개는 흰 제목과 기존 밝은 설명색을 보존한다.

## 동작

- 헤더 고객센터의 실제 클릭, 포인터 hover, ArrowDown 열기 및 Escape 닫기/트리거 포커스 복귀 확인. hover가 먼저 열려 즉시 클릭을 닫아버리던 경합을120ms hover intent로 해결했다.
- 열린 메뉴는 자주 묻는 질문 /faq, 공지사항 /faq/notices, 이용가이드 /guides의 세 링크다. 390px 모바일 메뉴에서도 세 링크가 있고 FAQ 클릭 후 drawer가 닫힌다.
- FAQ 초기5문항과 QR 검색 결과2문항을 확인했다. FAQ와 공지 목록의 기존 검색/페이지 상태와 공지10개 API 제한은 변경하지 않았다.
- DB/Auth/Storage, 결제·구독 실행, 주문·호출·권한 데이터와 고객 메뉴판 코드는 변경하지 않았다.

## 자동 검증

- 단위·계약917개 통과, TypeScript 통과, 변경 컴포넌트 eslint 오류0.
- 별도 출력 경로의 Production 빌드 통과. 마지막 서비스 소개 헤더 적용은 배포 제공자의 최종 빌드에서도 확인한다.
