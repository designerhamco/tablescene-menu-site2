# 스위치 가시성·배경별 상태 검수 (2026-11-03)

## 원인과 적용

운영 대시보드의 기존 Switch는 정의되지 않은 `bg-switch-background`를 참조했다. 실제 운영 DOM에서 OFF 배경이 transparent, disabled opacity가 0.5로 계산됐다. 32×18.4px의 작은 표시와 흰 손잡이가 회색 카드 위에 남았다.

공통 Switch를 `--ui-switch-*` 토큰과 불투명 상태 팔레트로 변경했다. 흰색·밝은 회색은 light, 어두운 배경은 dark를 사용하며 `.dark` 상속과 명시적 light 재설정을 지원한다. 운영 대시보드, 편집기 SwitchField, 계정 수신 설정을 같은 컴포넌트에 연결했다. 실제 저장 API·권한·업무 상태 변경 로직은 그대로다.

## 근거와 자동 검증

- [KRDS 스위치](https://www.krds.go.kr/html/site/component/component_06_07.html): 인접 영역 대비 3:1, 고정 레이블·인접 상태 문구.
- [KRDS 색상](https://www.krds.go.kr/html/site/style/style_02.html): disabled 상태에 투명도 색상 미사용.
- [WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): 비활성 컨트롤은 대비 의무에서 제외. 비활성에도 3:1을 적용한 것은 아티메뉴 자체 정책이다.
- `lib/site-switch-contrast.test.ts`: 실제 CSS 토큰의 밝은 배경 3종·어두운 배경 5종에 대한 경로·손잡이·hover·포커스·비활성 대비, ARIA/disabled/form/name/체크값, 공통 구현 연결을 검사한다. `check:site-ui`와 모든 빌드 모드에 포함했다.
- 전체 테스트 996개, 사이트 UI 계약 101개, 타입 검사·변경 파일 ESLint·Production 빌드 통과.

## 로컬 Production 빌드 브라우저 검수

Chrome의 실제 DOM 뷰포트 320×1000, 390×1000, 820×1000, 1440×1000에서 fonts=loaded, 페이지 가로 넘침 0px. 배경 3종 × 사용 가능/비활성 × ON/OFF, 총 12개 스위치 모두 조작 영역 48×44px, 경로 48×28px, 손잡이의 OFF/ON 시작점 4px/24px를 확인했다. 모든 컨트롤이 해당 표면 안에 있고 opacity=1이며 흰색·회색·어두운 배경에서 식별된다.

Space·Enter로 토글하고 현재 상태의 접근성 이름은 유지됐다. 키보드 포커스는 밝은 배경에서 파랑, 어두운 배경에서 밝은 파랑 2px 선으로 표시된다. Tab은 비활성 2개를 건너뛰었다. 편집기 예시의 라벨 클릭과 Space가 실제 연결된 checkbox의 checked를 변경했고 name과 form 연결도 유지됐다. 켜기 제한 예시는 클릭해도 false를 유지하고 이유를 표시했다. 실제 계정 수신 설정이나 운영 주문·호출 설정은 변경하지 않았다.

강제 색상·동작 감소는 공통 CSS와 계약 검사 범위로 확인했다. 브라우저에서 실제 OS 모드를 바꾸거나 업무 폼을 제출하지 않았다. 브라우저 오류 로그 0개. 검수 원본은 로컬 `tmp/qa/switch-contrast/`에 보관한다.
