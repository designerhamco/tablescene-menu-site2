# 활성 템플릿 전체 기능 QA

최종 갱신: 2026-08-06

## 출시 대상과 판매 노출 정책

`hidden`은 구매 화면의 임시 판매 노출 상태일 뿐 출시 대상 제외를 뜻하지 않는다. QA에서 제외하지 않으며, 이 QA 작업에서 catalog status를 변경하지 않는다.

Basic 출시 대상:

- 오브 커피 (`cafe_design_a`)
- 모카 포레스트 (`cafe_mocha_forest_a`)
- 선데이 라인 (`cafe_sunday_line_a`)
- 라운드 포커스 (`cafe_round_focus_a`)
- 브루 챕터 (`cafe_brew_chapter_a`)
- 누아 메뉴 (`cafe_noir_a`)

Display 출시 대상:

- 썸머 블루 Display (`display_menu_a`)

## 1차 renderer QA 결과

2026-08-06 로컬 `/templates/[templateKey]/preview`에서 확인했다.

| 템플릿 | 390×844 | 1440×900 | 가로 넘침 | 깨진 이미지 | 콘솔 오류 |
| --- | --- | --- | --- | --- | --- |
| 오브 커피 | 통과 | 통과 | 없음 | 없음 | 없음 |
| 모카 포레스트 | 통과 | 통과 | 없음 | 없음 | 없음 |
| 선데이 라인 | 통과 | 통과 | 없음 | 없음 | 없음 |
| 라운드 포커스 | 통과 | 통과 | 없음 | 없음 | 없음 |
| 브루 챕터 | 통과 | 통과 | 없음 | 없음 | 없음 |
| 누아 메뉴 | 통과 | 통과 | 없음 | 없음 | 없음 |
| 썸머 블루 Display | 해당 없음 | 통과 | 없음 | 없음 | 없음 |

추가 확인:

- 오브 커피 대표 슬라이드, 가격 옵션, 배지, 품절, 타임세일, 이미지가 fixture에서 렌더링된다.
- 오브 커피 starter reset 기대값을 현재 5개 category 계약에 맞추고, widget 길이 fixture를 실제 입력 제한인 제목 30자·본문 120자 안에서 경계 테스트하도록 복구했다.
- 일본어 연속문자, 이미지+텍스트 widget 3개, 제목 30자·본문 120자 최대 입력을 1440×900에서 검사했으며 페이지·가로 overflow와 깨진 이미지는 없었다.
- 브루 챕터의 커버와 6개 페이지 이동 control이 렌더링된다. `MAISON ECLAT` starter는 `docs/multi-page-template-product-contract.md`에 확정된 계약이다.
- 썸머 블루 Display의 4개 페이지 전환이 동작하고 선택 페이지가 URL `page` query에 반영된다.
- 템플릿 미리보기 route는 `ko`, `en`, `zh`, `ja` locale 상태와 언어 전환 control을 모두 재현한다. 번역이 없는 fixture 값은 실제 공개 route와 동일하게 기본값으로 fallback한다.
- Display에 시각적으로 숨긴 site/page heading을 추가해 기존 `h3`/`h4` 메뉴 heading의 문서 계층을 복구했다. 화면 디자인에는 영향을 주지 않는다.

## 남은 QA

- 각 Basic 템플릿의 위젯·디자인·폰트·배지·가격 옵션·품절·타임세일·이미지·커버 stress fixture
- 네 locale에서 글자 넘침과 fallback 확인
- 생성·편집·최종 저장 round-trip은 Production 데이터를 사용하지 않는 격리 QA 환경 또는 기존 안전한 fixture가 필요하다.
- 실제 메뉴판 preview/public 데이터 round-trip은 Production write 없이 수행한다.
