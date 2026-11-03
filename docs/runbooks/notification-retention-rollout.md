# 알림 최소 기록 분리와1년 보관 정리

정책: `docs/notification-retention-policy.md`. 스키마: `supabase/migrations/20261103060206_add_notification_delivery_ledger_and_retention.sql`.

## 출시 순서

1. 읽기 전용으로 원본 수·최초 생성일·1년 초과 상태별 건수를 확인한다. 운영 본문을 로그/검수 화면으로 가져오지 않는다.
2. 실제 Postgres 격리 검사와 전체 테스트·타입·빌드 후 additive 마이그레이션을 적용한다. 이전 함수의 원본 체크섬·행 수·복사 누락 검사를 유지한다.
3. 원본 수=최소 기록 수, 누락0, `public.prune_notification_content(false,100)`의 삭제0을 확인한다. 일반 사용자/anon의 새 객체 접근 차단 및 보안 advisors를 검사한다.
4. 공통 최소 기록 조회와 보관 cron을 배포한다. 기존 생성/발송 cron을 검증 목적으로 execute 호출하지 않는다. 검수 알림/이메일을 운영 고객에게 새로 만들지 않는다.
5. Production에만 `ENABLE_NOTIFICATION_RETENTION_EXECUTE=true`를 설정한다. Preview/Development에는 활성화하지 않는다. 미설정은 모의 실행이다. Vercel의 환경값 변경은 다음 배포부터 적용된다.
6. 배포 Ready 후 인증된 `GET /api/cron/prune-notifications?dryRun=true`로 기준일·후보0/보호 건수를 확인한다. 그 다음 실제 실행에서 `dryRun=false`와 삭제0을 확인한다. 현재처럼 후보가 없을 때도 원본 수가 유지됐는지 확인한다.

## 정리 조건과 예외

- 생성 후 UTC1년을 초과한 `sent/read/skipped`만 후보이다. pending/failed는 무조건 보호한다.
- 최소 기록이 누락되거나 identity/status가 다르면 보호한다. 보호 수 증가 때 원인부터 조사하고 일괄 상태 변경으로 우회하지 않는다.
- 기본100건/최대500건. 기준일은 DB 시각이다. 동시 작업은 advisory/row lock으로 격리한다.
- 키의 원자적 고유 제약은 기존 범위(사용자·매장·구독·종류·채널·period_key)와 같다. 모든 원본 생성 경로를 트리거가 덮는다.
- 최소 키는 실제 계정 hard deletion에 cascade한다. 탈퇴 신청/서비스 만료/메뉴판 삭제를 계정 hard deletion으로 간주하지 않는다.

## 중단 및 복구

- 즉시 중단은 Vercel Production의 활성화값을 false로 변경하고 재배포한다. DB 권한이나 RLS를 넓히지 않는다.
- 원본 정리가 한 번이라도 실행됐다면 최소 기록은 지우면 안 된다. 최소 기록을 삭제하면 과거 고지가 다시 만들어질 수 있다. 코드 롤백도 최소 기록 조회를 유지해야 한다.
- 이미 삭제된 본문은 제품 화면에서 복구되지 않는다. 백업을 복원할 때도 현재 최소 키를 유지하고 기존 생성/발송 cron을 임의로 execute하지 않는다.

## 2026-11-03 검수 증거

- 운영 사전 집계: 알림30건, 최초2026-05-29,1년 초과0건. 본문을 읽거나 출력하지 않고 집계만 확인했다.
- 원본 보존 검증 포함 additive 이전 완료. 운영 모의실행: 원본30·최소 키30·누락0·후보0·삭제0. anon/authenticated의 최소 키 조회와 정리 함수 실행 권한은 false. 보안 advisors error0.
- PGlite 실제 Postgres27건: 원본 보존·이전·내용 없는 키·RLS/권한·상태 동기화·원자적 중복 차단·소스 삭제 뒤 식별 유지·누락/불일치 보호·기간/상태/배치 한도·반복 실행·정리 후 재발송 차단·계정 삭제 cascade 검증. 운영 가상 데이터 쓰기/이메일 발송은 없음.
- 관련 단위11건·전체1023건·사이트 UI108건, TypeScript·변경 파일ESLint·Production 빌드 통과. 운영 배포/활성화 결과는 PR과 최종 검증 기록을 따른다.
