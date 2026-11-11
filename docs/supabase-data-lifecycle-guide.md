# 아티메뉴 Supabase 데이터 저장·보관·삭제 안내

기준일: 2026-11-11. 앱 코드·SQL 기록·기존 문서를 연결하는 안내다. Production DB/Auth/Storage나 백업 설정의 직접 감사·변경·복구 실행은 하지 않았다.

## 저장소와 권한의 구분

| 계층 | 역할과 확인할 원본 |
| --- | --- |
| Database | 메뉴판·페이지·카테고리·상품·번역·위젯·결제/구독·직원·운영 내역. 구조 기록은 [migrations](../supabase/migrations), 앱 타입은 [supabase/types.ts](../lib/supabase/types.ts) |
| Storage | 이미지의 `menu-images`, Display 영상의 `menu-videos`. 실제 bytes와 DB의 URL/path 참조를 함께 확인 |
| Auth | 로그인 계정·세션·소유자 식별. [서버 클라이언트](../lib/supabase/server.ts), [callback](../app/auth/callback/route.ts), [계정 탈퇴](../app/api/account/delete/route.ts) |
| 앱 접근 검사 | [현재 권한 정의](../lib/menu-site-permissions.ts), [접근 서비스](../lib/server/menu-site-access-service.ts). 메뉴 편집/공개/주문/결제/삭제 권한은 독립 |
| DB/RPC/Storage 정책 | 실제 RLS·테이블 grant·함수 실행 권한·소유 경로를 확인. 과거 SQL 파일이나 앱의 화면 숨김만으로 현재 적용/보안을 판정하지 않음 |
| 서버 관리자 클라이언트 | [admin.ts](../lib/supabase/admin.ts)는 server-only. 브라우저/MD/로그에 관리자 키를 넣지 않고, privileged 호출 전에 해당 actor/자원/권한 검사를 확인 |

Supabase의 [Storage 접근 제어 안내](https://supabase.com/docs/guides/storage/security/access-control)는 service key 사용 시 RLS 우회가 가능함을 설명한다. 따라서 서버 관리자 클라이언트의 존재 자체가 사용자별 권한 검사 완료를 뜻하지 않는다. 이 문서는 실제 프로젝트의 모든 RLS/privileged 경로가 검증됐다고 주장하지 않는다.

## 생성·수정·파일 저장

- 메뉴판/디자인/다국어/공개 변경은 [메뉴 action](../app/mypage/menus/actions.ts)과 담당 서비스가 소유한다. UI 임시 선택, 브라우저 초안, DB에 저장된 값, 공개 여부를 구분한다.
- 구매 후 생성은 [purchased-menu-provisioning](../lib/server/purchased-menu-provisioning.ts), 스타터 번역은 [번역 계약](starter-translations-qa.md)을 따른다. 결제 성공과 모든 메뉴/번역 행 생성 완료는 각각 확인하며 중복·부분 실패를 새 구매로 처리하지 않는다.
- [메뉴 이미지](../app/api/menu-images/route.ts), [위젯 이미지](../app/api/menu-widget-images/route.ts), [동영상](../app/api/menu-videos/route.ts)은 별도 저장/참조 경로다. MIME/용량·소유 경로·DB 참조 갱신/실패 정리를 확인한다. 일반 이미지 API에는 같은 path를 upsert한 경우 이전 파일 복원의 TODO가 있으므로 파일 교체의 모든 실패 보상이 완료됐다고 표현하지 않는다.
- [위젯 이미지 정리](../lib/server/menu-widget-image-cleanup-service.ts)는 유효한 해당 메뉴판/위젯 경로만 대상으로 하고, 아직 참조 중이거나 중복인 경로를 제외한다. 이 보장을 다른 업로드 기능에 자동으로 일반화하지 않는다.
- [메뉴 가져오기/연결 계약](shared-menu-catalog.md)은 URL 공유와 원본 파일 소유권을 분리한다. 다른 메뉴판이 참조하는 파일을 단순히 대상 메뉴판의 파일로 가정해 삭제하지 않는다.

## 숨김·보관·복구·삭제는 서로 다른 상태

| 작업 | 의미/원본 |
| --- | --- |
| 비공개/숨김 | 노출 또는 접수를 제어하는 상태. 곧바로 DB 행/Storage 파일 삭제를 뜻하지 않음 |
| 구독 종료/보관 | 접근·복구 가능 기간 판단. [service-retention-policy](../lib/service-retention-policy.ts)의 사유별 기간과 계약을 확인 |
| 보관 메뉴판 복구 | [menu-site-restore-service](../lib/server/menu-site-restore-service.ts)의 소유자/보관/이용권/결제 경계. DB 백업을 과거 시점으로 되돌리는 작업이 아님 |
| 계정 탈퇴 요청 | 현재 API의 `deletion_requested`/`hardDeleted: false`. [약관·개인정보 검토 현황](legal-policy-review.md)의 실제 파기 관련 미확인 사항 유지 |
| 메뉴판 콘텐츠 영구 삭제 | [삭제 런북](service-lifecycle-hard-delete-runbook.md)과 [hard-delete script](../scripts/hard-delete-expired-menu-sites.mjs)의 대상·참조·권한·미리보기/실행 경계 확인. 해당 문서는 실행 승인이 아님 |
| 테이블/키오스크 이력 삭제 | [운영 대상 삭제 런북](runbooks/order-point-deletion-migration.md)의 별도 대상/기록/동시 변경 검사. 메뉴판·계정 전체 삭제와 혼동하지 않음 |
| 알림 정리 | [알림 보관 정책](notification-retention-policy.md). 조회 표시 기간·완료 알림 정리·최소 중복방지 기록을 결제/구독 원본의 삭제로 확장하지 않음 |

기존 보관 정책은 체험 종료 30일, 유료 종료 90일, 결제 문제 30일의 복구 가능 기간을 구분한다. 기간이 끝났다는 사실만으로 어떤 정리 작업이 실제 수행됐다고 추정하지 않는다. 내용 행·파일·계정·결제/법정 보존 기록·백업은 별도 범위다.

## 백업과 장애 복구 — 운영 확인이 남은 영역

Supabase [Database Backups 공식 안내](https://supabase.com/docs/guides/platform/backups)에 따르면 DB 백업은 Storage 객체의 메타데이터를 포함하지만 업로드 파일의 실제 bytes는 포함하지 않는다. 따라서 DB 백업만으로 삭제한 메뉴 사진/동영상까지 복구된다고 볼 수 없다.

저장소에서 **DB와 Storage 파일을 함께 다루는 통합 백업·장애복구 절차**는 이번 점검에서 찾지 못했다. 이는 실제 클라우드 백업이 없다는 뜻이 아니다. 다음은 별도로 확인·정리해야 한다.

- 실제 프로젝트 요금제/DB 백업·PITR 활성화/보존 기간·최근 성공과 접근 권한
- 이미지/동영상 bytes의 별도 사본·주기·보존·삭제 반영과 복구 권한
- DB 복구 시 파일 참조·Auth/세션·권한·결제/구독 원장의 정합성, 중복 청구/재접수 방지
- 격리 환경의 복구 훈련, 목표 복구 시점/시간, 담당자·중단/재개·확인 증거

운영 DB를 실제로 되돌리거나 파일을 내려받고 재업로드하는 작업은 이 문서 정리 범위에 포함하지 않는다.

## 스키마 변경·Cron·환경별 검증

SQL/migration 파일의 존재, 로컬/격리 검증, Production 적용 이력·실제 객체 정의, 애플리케이션 배포, 기능 게이트 활성화를 각각 기록한다. 기존 수동 적용 이력이 있는 프로젝트에서 파일 목록만 보고 모든 migration을 다시 적용하지 않는다. 생성 타입은 원격 실상태의 대체 증거가 아니다.

현재 저장소의 예약 작업은 [vercel.json](../vercel.json)의 체험 만료·구독 처리·알림 생성·알림 정리 4개다. 실행 인증·execute/dry-run·환경별 스위치와 실제 실행 로그는 별도 확인이 필요하다. [과거 운영 감사](runbooks/vercel-production-runtime-audit.md)의 당시 값/개수는 현재 Production 활성화 증거가 아니다.

공식 문서는 2026-11-11에 확인했으며 서비스 설정을 변경할 때 다시 확인한다. 비밀키·세션·토큰·고객 식별자/원문 데이터를 문서나 검수 결과에 넣지 않는다.
