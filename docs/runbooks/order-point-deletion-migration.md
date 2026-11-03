# 테이블·키오스크 삭제 기능 적용안

2026-11-03. **사용자 별도 승인 후 운영 DB 적용 완료, 앱 배포 전**. 앞서 승인·적용한 마이그레이션2건과 별개다.

## 검토 대상

- `supabase/migrations/20261103074525_add_order_point_deletion_workflow.sql`
- 적용 자체는 새 함수4개와 private 감사 표1개를 추가한다. 기존 테이블/열/FK/RLS/기록/권한을 변경하거나 기존 주문을 삭제하지 않는다.
- 앱의 일반 삭제와 관련 데이터 영구 삭제가 이 함수들을 호출한다. 적용 전에는 삭제 범위를 읽지 못하므로 삭제하지 않고 ‘업데이트 준비 중’ 안내를 표시한다.

## 기능 범위

- 일반 삭제는 사장만, 사용 이력 없는 테이블·키오스크만 허용한다. 운영 중 카드에서도 바로 시작할 수 있다. 이력이 있으면 보관을 안내한다.
- 관련 데이터 영구 삭제는 보관한 항목에서만 제공한다. 완료/취소되지 않은 주문·호출 또는 취소되지 않은 미결제 주문이 있으면 정리를 먼저 요구한다.
- 미리보기에서 등록 이름·종류·상태, 주문/호출/방문·기기 연결/상품·옵션 건수와 결제 완료액(전체·이번 달·오늘)을 읽는다. 날짜는 한국시간이며 취소·환불·미결제는 완료액에서 제외한다.
- 영구 삭제는 정확한 이름 입력과 복원 불가 확인 후 실행한다. 서버에서 소유자·유효 이용권·기존 table.manage·runtime/템플릿 접근을 재검사한다. SQL도 소유자를 다시 검사하며 메뉴판/대상 ID를 모두 제한한다.
- 같은 대상의 주문·호출, 주문 상품/옵션 스냅샷, 방문·기기 연결과 테이블 등록/QR 주소를 삭제한다. 공개 링크/세션은 더 이상 사용할 수 없다. 다른 대상, 원본 메뉴 상품/옵션, 요금제/구독/결제사 거래는 변경하지 않는다. 결제 취소·환불 API를 호출하지 않는다.
- 실행자/시각/대상/집계 건수·금액만 `private.order_point_deletion_audits`에 남긴다. 고객 이름/전화번호/주문 본문/기기 토큰은 저장하지 않는다. 앱의 복원 기능은 없다.

## 원자성·권한

- 일반 삭제와 영구 삭제 모두 단일 DB 함수/트랜잭션이다. 메뉴판/대상과 기존 자식 행 잠금 후 미리보기 fingerprint(등록 버전, 대상별 ID/상태/금액/수정 시각)를 다시 계산한다. 변경됐으면 삭제를 시작하지 않고 다시 확인하도록 한다. 감사 기록 실패를 포함한 오류는 자식 삭제까지 전부 롤백한다.
- `public`의 진입점은 invoker/빈 search_path이며 service_role만 호출할 수 있다. 실제 삭제는 private schema의 definer/빈 search_path 함수가 수행한다. anon/authenticated/public 실행을 차단하고 기존 주문 표에 service_role DELETE 권한을 추가하지 않는다.
- 감사 표는 private schema, RLS/force-RLS, 모든 일반 역할 직접 접근 차단이다. 지연/교착/잠금 시간 초과는 실패로 종료하며 부분 삭제하지 않는다.
- 함수 설계 참고: [PostgreSQL 잠금](https://www.postgresql.org/docs/current/explicit-locking.html), [Supabase DB 함수와 권한](https://supabase.com/docs/guides/database/functions).

## 적용 전후 확인

1. 운영 DB 적용은 이 파일 별도 승인 후 실행한다. 운영 고객 데이터로 삭제 실험하지 않는다.
2. 적용 전 이름 충돌, 현행 주문/호출/방문/FK/ACL/RLS와 핵심 표 건수를 읽기 전용으로 기록한다. 실제 함수 본문도 저장소 전제와 비교한다.
3. 이 마이그레이션1건만 적용하고 적용 이력/새 함수 권한·search_path/감사 표 보안/REST schema 반영을 확인한다. 기존 데이터 집계와 보안 설정은 동일해야 한다. 보안 advisors 결과도 기록한다.
4. 읽기 전용 미리보기로 동작을 확인할 수 있다. 운영 데이터의 실제 영구 삭제는 별도 대상과 범위를 승인받거나 사용자가 앱 확인창에서 직접 실행한다.
5. 장애 시 새 삭제 진입 함수의 service_role EXECUTE를 회수하고 앱 진입을 잠근다. 기존 감사 기록을 DROP하지 않는다. 이미 완료된 삭제를 스키마 롤백으로 복원할 수는 없다.

## 격리 검수

`PGLITE_TEST_MODULE=/private/tmp/artimenu-paid-access-db/node_modules/@electric-sql/pglite/dist/index.js node --import tsx scripts/qa-visit-order-history-db.mjs`

실제 SQL·서버 서비스·공개 API 검수273건 통과. 실제 service_role 권한으로 삭제, 직원/타 메뉴판/다른 이름/변경된 미리보기 거절, 운영 중·미결제 차단, 같은 대상 자식 삭제/다른 대상 보존, 감사 생성, 감사 실패 시 전체 롤백을 포함한다. 운영 쓰기·실제 주문·결제0건. CLI가 생성한 파일이며 아래 별도 승인으로 운영에 적용했다.


## 승인 후 운영 확인 (2026-11-03)

- 사용자에게 함수4개·private 감사 표1개, 기존 데이터 삭제/결제 취소/업로드/배포 제외 범위를 제시했고 ‘운영 DB 적용 승인’을 받았다. 앱 환경의 프로젝트와 CLI linked 프로젝트 일치를 확인한 뒤 이 파일1건만 적용했다. 같은 트랜잭션에서 `20261103074525 / add_order_point_deletion_workflow` 적용 이력1건을 기록했다.
- 적용 파일 SHA256: `319fae0a7b38e5987148b8ca568b82010a069749921081764afe04b9b11d2025`.
- 적용 전후 테이블7개·세션28개·주문12건·호출5건·주문 상품12건·옵션5건 및6개 표 전체 행 해시가 모두 같았다. 기존 RLS/force-RLS/ACL/FK 정의도 동일했다.
- 새 함수4개의 실제 본문 해시는 로컬과 일치했다. public 진입점과 private 요약 함수는 invoker, private 삭제 구현만 definer이며 모두 빈 search_path다. anon/authenticated 실행은 차단, service_role 실행만 허용된다. private 감사 표는 RLS/force-RLS·직접 조회 차단·0행이다.
- 앱과 같은 환경·REST 클라이언트에서 미리보기만 읽어 실제 집계 DTO와 schema cache 반영을 확인했다. 운영 삭제 함수·테이블 생성·주문/호출·결제 취소는 실행하지 않았다.
- security advisors는 기존 전체 WARN22건이며 이번 새 함수/감사 표 관련 항목은0건이다. 기존 다른 함수의 search_path/definer 및 Auth 설정 WARN은 이번 승인 범위에서 변경하지 않았다. 프로젝트 전체 보안 문제가0건이라는 의미는 아니다.
- 비공개 검수 증빙: `/private/tmp/ops-deletion-verification.json`, `ops-deletion-rest.log`, 적용 전후/권한/advisors JSON. 해당 파일에는 비밀키를 기록하지 않았다. 앱의 GitHub 업로드·배포는 수행하지 않았다.
