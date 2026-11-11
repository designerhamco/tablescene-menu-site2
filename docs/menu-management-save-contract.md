# 아티메뉴 메뉴판 관리 초안·저장·공개 계약

기준일: 2026-11-11. 현재 편집기 컴포넌트와 서버 action을 대조한 동작 요약이다. 모든 템플릿/권한/실패 상황의 브라우저·Production 저장을 이번에 실행한 검수 기록은 아니다. 탭 노출과 편집 가능 항목은 서비스·템플릿 capability·권한·이용 상태에 따라 달라진다. 일정표의 placeholder는 실제 일정 CRUD/저장 구현으로 취급하지 않는다.

## 초안·저장·공개 구분

- **입력 중/임시 반영**: 편집 화면의 로컬 상태다. 메뉴 구성의 추가·수정 반영·정렬·삭제 예약·위젯 편집·AI 초안 적용만으로 공개 데이터가 저장되지 않는다.
- **하단 저장**: 해당 탭의 action에 초안을 보낸다. 메뉴 구성의 UI 표시는 ‘저장’이며 이 문서에서 ‘최종 저장’은 그 하단 버튼을 뜻한다. 다른 탭의 미저장 입력까지 함께 저장하는 전역 저장이 아니다.
- **저장된 미리보기**: 소유자 편집 미리보기/공개 페이지 열기는 저장된 데이터 기준이다. 카탈로그 템플릿의 보기옵션은 별도의 임시 시뮬레이션이며 고객 메뉴판을 저장하지 않는다. [보기옵션 계약](template-preview-display-options.md) 참조.
- **공개 상태**: `menu_sites.status`의 `draft`/`published`를 공개 설정에서 저장한다. 이미 공개 중인 메뉴판은 콘텐츠 저장 후 공개 화면에도 반영될 수 있다. ‘저장 뒤 항상 별도 게시 승인이 필요하다’는 버전 발행 모델로 설명하지 않는다.

## 탭별 저장 경계

진입점은 [편집 페이지](../app/mypage/menus/[menuId]/edit/page.tsx), 서버 원본은 [menus/actions.ts](../app/mypage/menus/actions.ts)다.

| 탭/영역 | 현재 action·컴포넌트 | 저장/적용 범위 |
| --- | --- | --- |
| 기본 정보 | `updateMenuSiteAction` | 메뉴판/실제 매장명, 지원되는 설명·안내사항·로고 선택/삭제·로고 대체 설정. 폼에 없는 선택 필드를 임의로 덮어쓰지 않도록 입력 존재 여부를 구분 |
| 페이지 표시 설정 | `updatePageSettingsAction` | 지원되는 인트로/커버/소개 섹션 사용 여부 등 해당 폼 값. 메뉴 콘텐츠 페이지 CRUD와 별도 |
| 광고 팝업 | `MenuPopupSettingsForm`, `updateMenuPopupSettingsAction` | 지원되는 텍스트/이미지 광고·기간·버튼 등 광고 폼 저장. Display 및 미지원 탭에 일반화하지 않음 |
| 시작/소개 영역 | `updateIntroAction` | 지원되는 소개 내용/이미지 초안. 업로드 완료와 이 폼의 저장을 구분 |
| 커버/대표영역 | `updateMenuCoverAction`, `CoverSampleResetButton` | 제목/설명·이미지·대표상품/슬라이드·지원되는 기기별 표시 설정. 표시 OFF가 파일 영구 삭제를 의미하지 않음 |
| 메뉴 구성 | `MenuManagementSection`, `saveMenuManagementBasicDraftAction` | 페이지/카테고리/아이템 초안·삭제 목록, 지원되는 가격 옵션/칩/기간할인/위젯 혼합 순서·배치 방식 등을 최종 저장. Basic의 페이지 관리 제한 등은 서버에서도 검사 |
| 소개/이벤트 | `updateAboutAction`, `updateEventsAction` | 해당 탭의 초안. 이벤트 이미지 등은 기존 업로드 정책이 남아 있으므로 모든 탭 이미지가 같은 저장/취소 방식이라고 일반화하지 않음 |
| 디자인 | `updateDesignSettingsAction` | 폰트·지원 역할 크기/색상·배경/표면·이미지 모양 등 해당 디자인 폼의 값 |
| 다국어 | `LocalizationSection`, `updateLocalizationSettingsAction` | 사용할 언어 변경은 `languages`, 번역 초안은 `translations`, 둘 다 바꾸면 `all`. 언어 선택만 저장할 때 번역을 덮어쓰지 않음 |
| 공개 설정 | `updatePublishSettingsAction` → `setMenuPublicationStatus` | `menu.publish` 권한과 구조/상태 확인 후 공개 여부 저장. 콘텐츠 편집 권한과 독립 |

[메뉴 capability](../lib/menu-editor-capabilities.ts)와 [권한 서비스](../lib/server/menu-site-access-service.ts)가 실제 허용 범위다. `requireOwnedMenuSite`라는 함수명만 보고 소유자만 모든 편집을 한다고 해석하지 않는다. 현재 wrapper는 기본 `menu.edit`, AI 경로는 `ai.use` 등 서버 권한 검사를 사용한다. 보관/만료/읽기 전용 상태에서는 화면뿐 아니라 쓰기 경로도 확인한다.

## 메뉴 구성의 두 단계

1. 아이템/카테고리/위젯 편집에서 ‘추가’ 또는 ‘수정 내용 반영’을 하면 구성 초안에 들어간다. 정렬·삭제·AI 정리 결과 적용도 초안이다. 아직 해당 편집창에서 반영하지 않은 입력과 전체 구성 초안을 구분한다.
2. 하단 ‘저장’은 페이지·카테고리·아이템 JSON, 삭제 ID 목록과 지원되는 위젯/기간할인/샘플 복원 payload를 보낸다. 서버는 권한·소속·개수·필드/가격·기능 지원 여부 등을 확인하고 새 임시 ID를 실제 ID에 연결한다.
3. 성공 후 관련 편집/공개 경로를 재검증하고 저장 결과를 표시한다. 실패 메시지가 나오면 무조건 전체 롤백됐다고 가정하지 않는다. 저장된 목록을 다시 읽어 상태를 확인한다.

**현재 한계:** 구성 최종 저장은 여러 테이블에 순차 쓰는 action이다. 모든 카테고리/아이템/가격/기간할인/위젯/대표영역/파일을 한 DB 트랜잭션으로 묶는 전역 원자성을 보장하지 않는다. 개별 payload 검증이나 서비스의 보호 장치를 전체 저장 보장으로 확대하지 않는다. 저장 중 오류가 났을 때 앞 단계의 일부 변경이 남을 수 있으므로, 실패 단계·실제 저장 상태·남은 초안을 대조한 뒤 재시도한다. 이번 문서 작업으로 이 한계를 수정한 것은 아니다.

위젯 이미지는 최종 저장 후 [정리 서비스](../lib/server/menu-widget-image-cleanup-service.ts)가 소속 경로·다른 참조를 확인한다. 파일 정리 실패는 경고로 기록될 수 있으며, 구성 저장 성공과 불필요 파일 정리 완료는 별도로 확인한다. [위젯 데이터 계약](cafe-a-widget-mvp-data-contract.md) 참조.

## 이동·취소·초안 수명

[공통 미저장 registry](../lib/unsaved-changes.ts)와 [연결 hook](../components/ui/useUnsavedChanges.ts)은 등록된 dirty/pending 상태를 보호한다. **현재 메뉴 편집기의 `DirtySubmitButton`, `MenuManagementSection`, `LocalizationSection`에서는 이 hook 연결을 확인하지 못했다.** 저장 버튼의 dirty/pending 제어를 모든 탭/브라우저 이동의 미저장 경고 보장으로 설명하지 않는다. 구성 내부 `confirmDiscardDraft`는 새 항목/위젯 등의 편집창 전환에 쓰이는 별도 확인이다. 전역 메뉴 초안 이동 보호는 보완 대상으로 남긴다.

구성 내부 ‘취소’, 탭/경로 이동 시 버리기, 새로고침/브라우저 종료, 서버 저장 취소는 같은 동작이 아니다. 이미 완료된 저장을 이동 취소로 되돌릴 수 없다. 모든 입력이 자동 저장되거나 브라우저 종료 후 복구된다고 안내하지 않는다.

구성 UI의 sessionStorage에는 선택 페이지/카테고리/편집 아이템 상태가 저장된다. 이것을 전체 메뉴 초안의 영구 저장으로 취급하지 않는다. 별도의 `CafeAStarterResetCoordinator` 샘플 복원 snapshot은 sessionStorage를 사용하지만 다른 탭 초안까지 영속화한다는 뜻이 아니다.

## 기본값·샘플 복원·가져오기

| 동작 | 영향 범위와 확인할 원본 |
| --- | --- |
| 현재 커버의 ‘샘플로 되돌리기’ | `CoverSampleResetButton`은 이미지/슬라이드/설정을 **임시 변경**하고 커버 저장을 기다림. 독립 action `resetMenuCoverToPresetAction`과 저장 시점이 다름 |
| 구성의 ‘샘플 메뉴로 되돌리기’ | 지원되는 샘플 snapshot을 초안에 적용하고 하단 저장으로 확정. 실제 허용 여부·대상은 UI/capability와 snapshot 검증을 따름. 오래된 `resetMenuManagementToPresetAction`은 비활성화된 경로이므로 현재 UI와 혼동하지 않음 |
| 비어 있는 메뉴의 스타터 복구 | `restoreEmptyMenuManagementFromStarterPresetAction`은 페이지/카테고리/아이템이 전부 비어 있을 때만 허용. 기존 고객 내용 덮어쓰기 기능이 아님 |
| ‘기본 디자인으로 되돌리기’ | `ResetTabActionButton`이 확인 뒤 `resetDesignSettingsToTemplateDefaultAction`을 직접 실행해 저장. 메뉴 내용/기본 정보는 유지. 일반 입력 초안 변경과 구분 |
| 다른 메뉴 가져오기/연결 | [공유 메뉴 계약](shared-menu-catalog.md)과 [가져오기 action](../app/mypage/menus/[menuId]/import/actions.ts)의 대상·독립 복사/연결·파일 소유권을 따름. 현재 탭의 취소로 되돌리는 작업이 아님 |
| 디자인 교체 | [이용권 기준](service-pricing-contract.md), [교체 서비스](../lib/server/menu-plan-design-service.ts)의 디자인 권한/스냅샷 계약을 따름. 샘플 메뉴로 초기화와 구분 |

## 파일·번역·공개 주의점

- 업로드 성공은 Storage 파일 생성일 수 있고, 현재 메뉴의 URL/path 참조 저장 완료와 다르다. [이미지 API](../app/api/menu-images/route.ts)에는 같은 path upsert 뒤 DB 저장 실패 시 이전 bytes 복원의 TODO가 남아 있다. 모든 파일 업로드가 취소/실패 시 완벽히 복원된다고 설명하지 않는다.
- 고객 AI 설명/번역 생성과 공개 저장은 별도다. AI 실행은 초안이어도 크레딧/작업 기록을 사용할 수 있다. 언어/번역 최종 저장 모드와 복구 job 적용 상태를 함께 확인한다.
- 개발자가 **스타터 문구를 수정**할 때 네 언어와 신규 구매 데이터를 함께 유지하는 규칙은 [스타터 번역 계약](starter-translations-qa.md)이다. 고객이 한국어 메뉴를 편집할 때마다 무료 자동 번역이 실행된다는 뜻이 아니다.
- [공개 서비스](../lib/server/menu-publication-service.ts)는 비공개 전환 시 주문·호출 허용을 OFF로 저장하고 이력을 유지한다. 비공개에서 다시 공개해도 접수는 자동 재개하지 않는다. 이미 공개된 메뉴를 같은 공개 상태로 저장할 때는 기존 접수 설정을 유지한다. 공개 전 서버 필수 구조 검사와 동시 변경 검사도 수행한다.

## 검증 기준과 남은 확인

관련 자동 검사: `lib/unsaved-changes.test.ts`, `lib/menu-localization-save-mode.test.ts`, `lib/menu-localization-draft.test.ts`, `lib/menu-editor-capabilities.test.ts`, `lib/menu-publication-service.test.ts`, `lib/cafe-a-starter-reset.test.ts`, `lib/menu-widget-placement.test.ts`. 모의/단위 검사를 실제 고객 저장·Storage 복구 완료로 간주하지 않는다.

브라우저 종단 검증에서는 소유자/허용 직원/차단 사용자, Basic/Dining/Display의 지원 탭, 저장 전 미리보기, 임시 반영→최종 저장, 이동 취소/버리기, 저장 실패 후 재조회, 파일 업로드/교체/삭제, 번역 두 저장 모드, 공개/비공개와 접수 상태를 구분한다. **이번 작업은 코드 대조·문서 보완이며, 전 조합 실저장 검수, 전역 미저장 이동 보호, 저장 원자성 개선은 남은 범위다.**
