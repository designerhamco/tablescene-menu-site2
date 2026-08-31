# Dining tier pricing migration runbook

최종 갱신: 2026-08-28

대상 migration: `supabase/migrations/20260828105459_add_dining_single_multi_subscription_products.sql`

상태: **2026-08-28 `tablescene-prod`에 1회 적용 완료 — 재실행 금지**

적용 결과:

- 적용 전 기존 제약 1개와 임시 `_v2` 제약 부재 확인
- 기존 상품별 구독 건수 `17 / 1 / 5 / 1` 확인
- 기존 상품 4개와 신규 단일·멀티 상품 4개를 허용하는 최종 제약 1개 확인
- 적용 후 상품별 구독 건수 `17 / 1 / 5 / 1`로 불변
- 고객 row, 결제, 구독 상태, entitlement, RLS, Storage, generated types 변경 없음

## 목적

- 기존 다이닝 구독 상품 key를 그대로 유지한다.
- 신규 단일페이지 월·연 상품과 멀티페이지 월·연 상품 key를 허용한다.
- 고객 구독 row, 결제, entitlement, 메뉴판 데이터는 변경하지 않는다.
- RLS, Storage policy, 환경변수, generated Supabase types는 변경하지 않는다.

## 가격 계약

| 등급 | 월 정가 | 오픈할인 월 가격 | 연 결제 가격 |
| --- | ---: | ---: | ---: |
| 단일페이지 | 8,900원 | 5,900원 | 63,700원 |
| 멀티페이지 | 12,900원 | 9,900원 | 106,900원 |

연 결제 가격은 오픈할인 월 가격의 12개월 합계에서 10%를 추가 할인한다.

## 금지

- `supabase db push`
- linked Production 대상 `supabase migration up`
- 과거 migration 재실행
- 기존 구독 상품 key 일괄 변경
- 실제 결제·갱신·취소·환불 실행

Production migration history와 저장소의 과거 migration 목록이 일치하지 않으므로 이 SQL 파일 한 건만 linked query 방식으로 적용한다.

## 적용 전 read-only 확인

```sql
select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.business_subscriptions'::regclass
  and conname in (
    'business_subscriptions_product_key_check',
    'business_subscriptions_product_key_check_v2'
  )
order by conname;

select product_key, count(*) as subscription_count
from public.business_subscriptions
group by product_key
order by product_key;
```

성공 기준:

- 기존 `business_subscriptions_product_key_check`가 정확히 1개 존재한다.
- 임시 `business_subscriptions_product_key_check_v2`는 존재하지 않는다.
- 현재 상품별 구독 건수를 적용 후 비교용으로 기록한다.

## 1회 적용

linked 프로젝트가 `tablescene-prod` / `kfbekbapwsyeanobyjsv`인지 재확인한 뒤 다음 파일 한 건만 실행한다.

```bash
./node_modules/.bin/supabase db query --linked \
  --file supabase/migrations/20260828105459_add_dining_single_multi_subscription_products.sql
```

이 migration은 기존 제약을 유지한 채 새 제약을 `NOT VALID`로 추가하고 검증한다. 검증이 성공한 뒤에만 기존 제약을 새 제약으로 교체하며 전체 작업은 한 transaction에서 실행한다.

2026-08-28 사용자 승인 아래 linked `tablescene-prod`에 위 파일 한 건만 적용했다. 다시 실행하지 않는다.

## 적용 후 확인

적용 전의 두 read-only query를 다시 실행한다.

성공 기준:

- 최종 제약 이름은 `business_subscriptions_product_key_check` 하나뿐이다.
- 제약 정의에 기존 상품 2개, 신규 단일 상품 2개, 신규 멀티 상품 2개, 디스플레이 상품 2개가 모두 포함된다.
- 상품별 구독 건수가 적용 전과 완전히 같다.
- 임시 `_v2` 제약이 남지 않는다.

## 애플리케이션 rollout

1. TypeScript, lint, 전체 테스트, production build를 통과한다.
2. 신규 구매 UI에는 신규 단일·멀티 상품만 노출한다.
3. 기존 상품은 신규 구매를 막고 갱신·복구 호환성만 유지한다.
4. 같은 등급 템플릿만 구매·교체·복구할 수 있는지 확인한다.
5. migration 적용 후 애플리케이션을 배포한다.
6. Production 가격 페이지와 상품 상세 route를 read-only로 확인한다.
