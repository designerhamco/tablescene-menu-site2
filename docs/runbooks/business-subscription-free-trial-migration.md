# 단일페이지 월결제 30일 무료체험 migration runbook

최종 갱신: 2026-08-29

현재 상태:

- 2026-08-29 `tablescene-prod`에 승인된 SQL 파일 한 건을 직접 적용 완료
- 기존 구독 24건 유지, 기존 trial 값 0건 유지
- trial 컬럼 2개, 기간 CHECK, 사용자별 partial unique index, 기존 RLS 유지 확인
- 공식 `npm run supabase:types`로 generated types 갱신 완료
- Vercel Production에 `BUSINESS_SINGLE_MONTHLY_FREE_TRIAL_ENABLED=true` Config 설정 완료
- 애플리케이션 병합·Production 배포와 실제 빌링키 QA는 후속 진행

주의:

- Production migration history에 과거 적용 기록이 없어 `supabase db push --linked --dry-run`이 과거 파일을 포함한 44개 migration을 재적용 대상으로 표시했다.
- 전체 `db push`와 linked `migration up`은 실행하지 않았다.
- 승인된 파일만 `supabase db query --linked --file supabase/migrations/20260828114923_add_business_subscription_free_trial.sql`로 직접 적용했다.
- 이 migration 파일을 다시 실행하거나 전체 migration push를 실행하지 않는다.

## 범위

- 대상 migration: `20260828114923_add_business_subscription_free_trial.sql`
- `business_subscriptions`에 `trial_started_at`, `trial_ends_at`을 추가한다.
- 두 시각은 함께 존재하고 종료가 시작보다 늦어야 한다.
- `trial_started_at`이 있는 구독은 사용자별 1건만 허용해 계정당 최초 1회 정책을 DB에서도 강제한다.
- RLS, policy, grant, Storage, 기존 고객 데이터, 실제 결제 상태는 변경하지 않는다.

## 활성화 순서

1. Production read-only precheck로 대상 컬럼·index가 아직 없는지 확인한다. — 완료
2. 사람의 특정 승인을 받은 뒤 migration 파일 한 건만 Production에 적용한다. — 완료
3. constraint와 partial unique index, 기존 구독 건수 불변을 확인한다. — 완료
4. 공식 generated types를 재생성한다. — 완료
5. Vercel Production에 `BUSINESS_SINGLE_MONTHLY_FREE_TRIAL_ENABLED=true`를 설정한다. — 완료
6. 승인된 애플리케이션을 병합하고 Production에 재배포한다.
7. 신규 전용 QA 계정에서 사업자 인증과 결제수단 등록까지만 진행해 첫 결제가 발생하지 않는지 확인한다.
8. 구독의 `next_billing_at`, `current_period_end`, `trial_ends_at`이 시작 시각으로부터 정확히 30일 뒤인지 확인한다.
9. 별도 QA 구독에서 해지 예약 후에도 종료일까지 접근 가능하며 갱신 cron이 결제보다 만료를 우선하는지 확인한다.

## 성공 기준

- 단일페이지 월결제의 최초 대상 계정만 `오늘 결제 0원`과 정확한 첫 결제일을 본다.
- PortOne 빌링키는 발급되지만 체험 시작 시 `payments`·`orders`에 결제 완료 행이 생기지 않는다.
- 30일 경계에서 활성·미해지 구독만 5,900원 첫 결제 대상으로 처리된다.
- 해지 예약 구독은 첫 결제 없이 종료 처리된다.
- 이미 사용한 계정과 과거 6,600원 개인 체험 이용 계정은 무료체험을 다시 받을 수 없다.

## 롤백 원칙

- 이상 시 환경변수를 `false`로 바꾸거나 제거해 신규 무료체험 진입을 즉시 fail-closed 한다.
- 이미 시작된 체험의 시각·구독·entitlement는 임의 삭제하거나 단축하지 않는다.
- Production 컬럼·index 삭제나 고객 구독 변경은 별도 승인 없이 실행하지 않는다.
