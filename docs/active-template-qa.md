# 활성 템플릿 전체 기능 QA

최종 갱신: 2026-08-30

## 출시 대상과 판매 노출 정책

`hidden`은 구매 화면의 임시 판매 노출 상태일 뿐 출시 대상 제외를 뜻하지 않는다. `retired`는 신규 생성·구매·교체 후보에서 제외하되 기존 저장 메뉴판의 안전한 렌더링 호환성은 유지한다.

Basic 출시 대상:

- 오브 커피 (`cafe_design_a`)
- 모카 포레스트 (`cafe_mocha_forest_a`)
- 선데이 라인 (`cafe_sunday_line_a`)
- 라운드 포커스 (`cafe_round_focus_a`)
- 오브 테이블 (`dining_aube_table_a`, Production migration·시각 승인 전 `hidden`)

기존 호환 전용(신규 노출 제외):

- 누아 메뉴 (`cafe_noir_a`, `retired`)
- 브루 챕터 (`cafe_brew_chapter_a`, `retired`)

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
| 오브 테이블 | 통과 | 통과 | 없음 | 없음 | 없음 |
| 브루 챕터 | 통과 | 통과 | 없음 | 없음 | 없음 |
| 누아 메뉴 | 통과 | 통과 | 없음 | 없음 | 없음 |
| 썸머 블루 Display | 해당 없음 | 통과 | 없음 | 없음 | 없음 |

추가 확인:

- 2026-08-30 오브 테이블에서 선택 커버, 1열 가운데 정렬 페이지, 2열 왼쪽 정렬 페이지, 직접 메뉴·코스 혼합, dot click·keyboard 이동과 페이지 전환 scroll reset을 확인했다. 모바일 390×844에서는 1열로 축소되고 가로 overflow·깨진 이미지·콘솔 오류가 없다.
- 오브 테이블의 신규 저장 필드는 additive migration 적용 전 Production에서 사용하지 않으며, 템플릿은 hidden 상태를 유지한다.

- 오브 커피 대표 슬라이드, 가격 옵션, 배지, 품절, 타임세일, 이미지가 fixture에서 렌더링된다.
- 오브 커피 starter reset 기대값을 현재 5개 category 계약에 맞추고, widget 길이 fixture를 실제 입력 제한인 제목 30자·본문 120자 안에서 경계 테스트하도록 복구했다.
- 일본어 연속문자, 이미지+텍스트 widget 3개, 제목 30자·본문 120자 최대 입력을 1440×900에서 검사했으며 페이지·가로 overflow와 깨진 이미지는 없었다.
- 브루 챕터의 커버와 6개 페이지 이동 control이 렌더링된다. `MAISON ECLAT` starter는 `docs/multi-page-template-product-contract.md`에 확정된 계약이다.
- 썸머 블루 Display의 4개 페이지 전환이 동작하고 선택 페이지가 URL `page` query에 반영된다.
- 템플릿 미리보기 route는 `ko`, `en`, `zh`, `ja` locale 상태와 언어 전환 control을 모두 재현한다. 번역이 없는 fixture 값은 실제 공개 route와 동일하게 기본값으로 fallback한다.
- 개발 전용 `localeQa=1` fixture로 사이트명·설명·안내·첫 카테고리·첫 메뉴를 네 locale의 실제 문자로 치환하고, Basic 6개는 390×844와 1440×900, Display는 1440×900에서 총 52개 route를 검사했다. 가로 overflow, 깨진 이미지, 누락된 활성 언어 control은 없다.
- 브루 챕터 renderer에 공통 언어 전환 control이 누락된 문제를 수정했다. 모바일 중국어 장문 설명의 안전 줄바꿈과 라운드 포커스 모바일의 중국어·일본어 장문 브랜드 폭 제한도 함께 수정했다.
- Display에 시각적으로 숨긴 site/page heading을 추가해 기존 `h3`/`h4` 메뉴 heading의 문서 계층을 복구했다. 화면 디자인에는 영향을 주지 않는다.
- 숨김 Basic 5개가 service allowlist에서 빠져 있어 향후 `available` 전환 후에도 구매 흐름에서 제외될 계약 오류를 수정했다. catalog status는 그대로 `hidden`이다.
- 브루 챕터가 generic editor 탭으로 fallback해 다국어 탭이 빠지고 미지원 소개·이벤트 탭이 노출될 수 있던 구성을 전용 `cover` editor 계약으로 수정했다.
- 출시 대상별 service, catalog status, editor tab, 브루 챕터·누아 메뉴의 fail-closed capability를 자동 테스트로 고정했다.
- Basic 6개와 Display 1개의 starter를 격리된 snapshot으로 생성하고 최종 저장 payload 직렬화·파싱 round-trip을 검증한다. 페이지·카테고리·항목·혼합 순서 참조와 중복 ID, save contract gap을 함께 검사하며 DB write는 수행하지 않는다.

## 기능 stress QA 결과

개발 환경에서만 동작하는 `featureQa=1` fixture로 지원 capability에 맞춰 위젯 3종, 배지, 가격 옵션 3개, 품절, 활성 타임세일, 메뉴 이미지와 기존 커버를 함께 렌더링했다. catalog status와 저장 데이터는 바꾸지 않는다.

- Basic 6개를 390×844와 1440×900에서 검사했다. 지원 기능 표시, 가로 overflow, 깨진 이미지와 콘솔 오류가 없다.
- 위젯을 지원하는 오브 커피·모카 포레스트·선데이 라인·라운드 포커스에서 이미지·텍스트·이미지+텍스트 3종을 모두 확인했다. 브루 챕터·누아 메뉴·Display는 기존 fail-closed 위젯 미지원 계약을 유지한다.
- Basic의 기본 한글·영문 font preset과 Display의 S/L 글자 크기를 검사했다. Display S/L은 네 locale 모두 fit 상태가 `settled`, overflow 상태가 `false`였다.
- 배지·가격 옵션·품절·타임세일·이미지는 각 템플릿이 지원하는 범위에서 확인했다. 누아 메뉴의 이미지·가격 옵션·커버 미지원과 Display의 커버 미지원은 그대로 유지한다. Display 타임세일은 관리자 편집·저장·공개 화면 할인가·배지·마감 표시를 지원한다.
- Display와 누아 메뉴가 `is_sold_out`을 시각적으로 표시하지 않던 문제를 수정했다. Display는 네 locale에서 `품절`·`SOLD OUT`·`售罄`·`売り切れ`를 표시한다.
- capability, starter feature evidence와 typography default를 자동 테스트로 고정했다.

## 생성·저장·preview·public 격리 QA 결과

- 7개 starter를 생성해 final-save payload로 직렬화·검증·파싱하고 원본 snapshot과 다시 비교했다. 페이지·카테고리·메뉴·위젯·혼합 순서 참조가 보존되며 Production write는 없다.
- 개발 전용 `renderMode=public` 옵션으로 같은 저장 후 fixture를 실제 `MenuPageRenderer`의 `preview`와 `public` 모드에 각각 전달했다. Production에서는 이 옵션을 무시하고 기존 preview 동작을 유지한다.
- 일본어 desktop 14개 경로에서 7개 템플릿의 카테고리·메뉴·위젯·품절·언어 control 신호가 preview/public 사이에 일치했다. 중국어 Basic mobile 12개 경로도 동일했다.
- 모든 비교 경로에서 가로 overflow와 깨진 이미지는 없었다. Display는 두 모드 모두 fit `settled`이며, public 모드에서는 preview 전용 페이지 선택기만 제외된다.
- 실제 Owner/직원 메뉴판 route의 인증·권한·DB loader와 Production 저장은 실행하지 않았다. 해당 route들이 동일한 `MenuPageRenderer`를 사용하는 것은 코드 감사로 확인했다.

출시 템플릿의 코드 기반 격리 QA 범위는 완료했다. 실제 계정·Production 데이터가 필요한 최종 운영 확인은 별도 승인 단계에서 수행한다.
