# 아티메뉴 프로젝트 문서 안내

기준일: 2026-11-11. 서비스·가격·템플릿·디자인·약관 자료의 진입점이다. 문서가 존재한다는 사실, 코드/공개 화면과의 정합성 확인, 실제 운영 활성화, 법적 검토 완료는 각각 구분한다.

## 기능별 누락·분산 점검

[기능별 문서 범위·보완 점검표](feature-documentation-coverage.md)에서 메뉴판 설정·구독·결제·매장 운영과 계정/권한·QR·AI·파일·알림·배포/복구까지 확인한다. 관련 MD가 있다는 것과 현재 운영 검증 완료를 구분한다. 데이터 저장/권한/보관/삭제/백업은 [Supabase 데이터 안내](supabase-data-lifecycle-guide.md)에서 읽는다.

## 어디서 무엇을 확인하는가

| 표시 제목 | 파일 | 담당 내용 |
| --- | --- | --- |
| 아티메뉴 개발 작업 규칙 | [AGENTS.md](../AGENTS.md) | 개발 도구가 자동으로 읽는 작업 원칙과 승인된 공통 규칙 |
| 아티메뉴 기능별 문서 범위·보완 점검표 | [feature-documentation-coverage.md](feature-documentation-coverage.md) | 실제 기능별 관련 문서·코드와 누락/분산/미확인 영역 |
| 아티메뉴 Supabase 데이터 저장·보관·삭제 안내 | [supabase-data-lifecycle-guide.md](supabase-data-lifecycle-guide.md) | DB·파일·Auth·권한·보관/복구·실삭제와 백업의 구분 |
| 아티메뉴 서비스·요금·이용권 기준 | [service-pricing-contract.md](service-pricing-contract.md) | 세 서비스, 기본/디자인 포함, 현행 요금 원본, 체험·갱신·기존 계약 경계 |
| 아티메뉴 서비스 명칭과 안내 기준 | [service-category-copy-contract.md](service-category-copy-contract.md) | 베이직·다이닝·디스플레이의 고객 표시 명칭 |
| 아티메뉴 템플릿 문서 안내 | [template-docs-index.md](template-docs-index.md) | 기본/디자이너·리스트/앨범 등록표와 구조별 문서 |
| 아티메뉴 메뉴판 공통 규칙 | [template-spacing-contract.md](template-spacing-contract.md) | 기기별 글자·여백·이미지·위젯·안내사항과 최신 승인 |
| 아티메뉴 미리보기 보기옵션 | [template-preview-display-options.md](template-preview-display-options.md) | 기능/디자인 탭, 스타터 기본값과 임시 선택 범위 |
| 아티메뉴 스타터 문구·번역 수정 기준 | [starter-translations-qa.md](starter-translations-qa.md) | 네 언어 동시 수정과 미리보기/신규 구매 데이터 일치 |
| 아티메뉴 메뉴판 렌더러 구조 | [menu-template-architecture.md](menu-template-architecture.md) | 공통 모듈과 구조/서비스별 렌더러의 역할 |
| 아티메뉴 공식 사이트 디자인 시스템 | [site-design-system.md](site-design-system.md) | 사이트·마이페이지·편집기·미리보기 도구의 UI. 고객 메뉴판 자체와 별도 |
| 아티메뉴 약관·개인정보·동의 검토 현황 | [legal-policy-review.md](legal-policy-review.md) | 공개 원문 위치, 관련 검토/운영 문서, 미완료 확인 사항 |
| 아티메뉴 주문·호출 서비스 규칙 | [order-call-product-contract.md](order-call-product-contract.md) | 접수·테이블·운영 권한 경계와 과거 계약의 구분 |
| 아티메뉴 AI 크레딧 지급 정책 | [ai-credit-policy.md](ai-credit-policy.md) | 첫 메뉴 생성 시 지급 및 기존 크레딧 보존 |
| 아티메뉴 서비스 종료·데이터 삭제 운영 절차 | [service-lifecycle-hard-delete-runbook.md](service-lifecycle-hard-delete-runbook.md) | 보관/복구/삭제의 구분과 실행 전 점검. 문서 존재는 삭제 실행 승인 아님 |
| 아티메뉴 알림 표시·보관 정책 | [notification-retention-policy.md](notification-retention-policy.md) | 최근 표시 범위와 보관/정리 경계 |

## 문서 제목과 파일명 원칙

사람에게 보이는 최상위 제목과 목차 링크는 `아티메뉴 + 담당 기능`을 사용한다. 과거 rollout/검수 기록은 제목에 과거 기록임을 표시한다. 원본·현행 규칙·검토안·검수 기록·운영 절차를 같은 종류의 완료 문서로 취급하지 않는다.

`AGENTS.md`는 개발 도구가 자동으로 읽는 고정 파일명이므로 바꾸지 않는다. 문서 제목/목차에서는 **아티메뉴 개발 작업 규칙**으로 표시한다. `CLAUDE.md`의 `@AGENTS.md`는 같은 규칙을 읽는 도구용 연결이다. Next.js가 관리하는 자동 생성 블록은 그대로 보존한다.

기존 영문 경로는 코드·테스트·다른 문서의 참조가 있으므로 제목 정리를 이유로 일괄 변경하지 않는다. 실제 파일명 변경이 필요하면 참조 경로를 함께 갱신하고 링크를 검사한다. 문서 진입점은 이 파일과 [README](../README.md)다.

## 검토 범위와 유지 기준

가격·서비스의 실제 값은 코드 원본에서 읽고, 약관/개인정보의 공개 전문은 별도 MD에 복제하지 않는다. 변경 시 담당 계약과 관련 화면·서버·검증을 함께 대조한다. 현재 자료에는 미완료/TODO와 과거 기록이 있으므로 모든 기능·법적 검토가 완료됐다고 표기하지 않는다. 전체 작업 이력은 [프로젝트 상태](project-state.md)와 [작업 큐](task-queue.md)에 있으나, 과거 완료/배포 문구를 현재 운영 상태의 증거로 재사용하지 않는다.
