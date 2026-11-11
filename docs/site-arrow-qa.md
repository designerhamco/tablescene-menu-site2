# 공식 사이트 화살표 검수 · 2026-11-11

## 범위

`app/components/ui/site-arrow.tsx`와 `lib/site-arrow.ts`의24px SVG를 공식 사이트의 기존 방향 화살표·꺾쇠·새 창·새로고침·초기화·실행 취소에 적용했다. 메뉴 편집 도구의 문자형 조작 화살표도 같은 SVG를 사용한다. 일반 직선8방향, 꺾임8방향, U턴4방향, 양방향2종, 회전/새로고침4종 및 단일/이중 꺾쇠를 제공한다. 복합 화살표의 머리는 직선형과 같은 곡선 함수로 만든다.

`components/menu-templates`와 `components/public-menu`는 변경하지 않았다. 메뉴판 안의 언어 선택·페이지 이동·주문/호출·장식과 툴팁 꼬리·재생/기기 회전 안내는 유지한다. 주변 미리보기·편집 도구는 공식 사이트 범위다.

## 확인

- `npm run check:site-ui`: 자동 소스 검사와156개 계약 검사 통과.
- `npm test`:1,259개 통과.
- TypeScript 검사 통과. ESLint 오류 없음(기존 `qa-customer-call-status.mjs`의 미사용 import 경고1개).
- 실제 DOM viewport375·768·1440·2560px에서 디자인 시스템 SVG38개가 화면 경계 안에 표시되고, 홈/템플릿 목록의 가로 넘침과 이전 Lucide 방향 아이콘이 없음을 확인했다.
- 커스텀 select Enter/Escape 및 포커스 복귀, 페이지네이션 다음 페이지, 모바일 푸터 키보드 펼침/접힘을 확인했다. 네이티브 select의 동일 SVG asset 사용도 확인했다.
- Basic(Van Gogh)·Dining(AUBE TABLE) 실제 PC 렌더러 안에 `data-site-arrow`가0개임을 확인했다. 사이트 아이콘 유입을 막는 계약 검사를 추가했다.
- 스크립트: `ARROW_QA_BASE=http://localhost:3002 node scripts/qa-site-arrows.mjs`. 결과·화면은 기본 `/tmp/site-arrow-qa`에 저장한다. Production은 `ARROW_QA_BASE`로 해당 배포 URL을 지정한다.
