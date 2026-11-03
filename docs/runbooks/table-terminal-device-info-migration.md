# 테이블 연결 기기 정보 저장

## 준비된 변경

- `supabase/migrations/20261103053430_add_table_terminal_device_info.sql`: 기존 `table_visit_sessions`에 표시용 `device_info` JSON 객체 열 하나를 추가한다. `{ kind, os, model, browser }`만 서버에서 정리해 저장하며 전체 User-Agent, 토큰 원문, 위치 또는 손님 휴대폰 정보는 저장하지 않는다.
- 새 `register_table_terminal_visit_with_device`는 기존 등록 함수를 같은 트랜잭션에서 호출한 뒤 새 terminal 행에만 표시 정보를 기록한다. `security invoker`이고 실행 권한은 service_role에만 있다. 기존 테이블의 RLS·테이블 권한과 5개 인자 등록 함수는 그대로 유지한다.
- 연결 목록/원격 해제는 기존 `table.manage` 권한·유효한 유료 이용권·지원 템플릿·runtime을 서버에서 확인한다. 해제는 선택한 매장·테이블·세션 ID·terminal 채널·미해제·미만료 한 건에만 한정한다. 실제 현재 쿠키와 식별값이 일치할 때만 호출자 쿠키를 지운다. 고객 QR 세션·다른 기기 연결·접수 주문은 바꾸지 않는다.

## 로컬 검증과 출시 순서

2026-11-03 사용자 승인 후 테이블·키오스크 마이그레이션과 함께 운영 DB에 적용했다. 메타데이터 열·함수 ACL·기존 등록 함수·RLS와 기존 데이터 보존을 읽기 전용으로 확인했으며 앱 배포는 아직 진행하지 않았다. 적용 기록은 `order-point-channel-permissions-migration.md`를 따른다. 연결/해제 기능 검수에 실매장 세션을 임의로 만들거나 종료하지 않는다.

SQL 미적용 시에도 기존 연결 목록·원격 해제는 기존 열로 작동한다. 표시 정보 열이 실제로 없는 오류만 제한적으로 다시 읽고, 새 등록 RPC가 실제로 없는 오류만 기존 등록으로 호환한다. 일반 조회·저장/권한 실패를 성공이나 미연결로 숨기지 않는다. 기기 상세 정보 저장은 SQL 적용 후 새로 연결하는 기기부터 가능하다.

과거 연결의 User-Agent는 hash만 있으므로 기종을 역으로 복구하지 않는다. 해당 연결은 ‘기기 정보가 없는 이전 연결입니다’라고 표시하며 상태와 개별 해제는 유지한다. 브라우저가 보고하는 OS·모델·브라우저만 표시하고, 실제로 제공하지 않는 iPhone/iPad 세부 모델은 추측하지 않는다. 운영체제와 상세 모델명은 현재 기기 영역에서 직접 보완한 뒤 연결할 수 있다. 표시 정보는 인증/권한 판단에 사용하지 않는다.

앱 롤백은 추가 열/함수를 남겨도 기존 코드와 호환된다. 롤백을 이유로 기존 연결을 해제하거나 표시 정보를 삭제하지 않는다.

## 격리 PostgreSQL 재검증

`scripts/qa-table-terminal-device-db.mjs`는 메모리 안의 PGlite PostgreSQL에 최소 기반 스키마와 기존 등록 함수의 실제 SQL, 이번 마이그레이션을 적용한다. 운영 DB URL이나 키는 사용하지 않는다. 별도로 설치한 PGlite는 `QA_PGLITE_MODULE`에 모듈 경로를 전달할 수 있다.

```sh
QA_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node scripts/qa-table-terminal-device-db.mjs
```

기기 정보 저장·잘못된 JSON/길이 거부·이전 기기 교체·다른 기기 보존·비활성 테이블 차단·anon/authenticated 실행 거부·service_role 실행 허용·기존 연결의 빈 메타데이터를 검증한다. 이 검증은 운영 SQL 적용이나 실제 매장 연결/해제를 실행했다는 의미가 아니다.
