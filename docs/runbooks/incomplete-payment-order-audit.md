# 불완전 결제 주문 읽기 전용 감사

감사일: 2026-09-01  
대상: linked Production `tablescene-prod`  
범위: `public.orders.menu_site_id is null`인 결제 완료 주문의 집계 상태 확인

## 안전 원칙

- 고객 이름, 이메일, 전화번호, 결제 ID, 주문 ID, 메뉴판 주소는 출력하지 않았다.
- Production 데이터, 결제, 환불, 구독, entitlement를 변경하지 않았다.
- 이미 적용된 migration을 다시 실행하지 않았다.
- 결과는 식별자가 없는 집계값만 문서화했다.

## 감사 결과

`menu_site_id`가 없는 `paid` 주문은 총 3건이다.

| 구분 | 건수 | 결제 기록 | 실제 이행 상태 | 판정 |
| --- | ---: | --- | --- | --- |
| AI 크레딧 10개 충전 | 2 | 두 건 모두 `paid` | 두 건 모두 10크레딧 purchase transaction과 계정 잔액 반영 확인 | 정상 |
| 과거 개인 체험 1개월 | 1 | `paid`, 과거 판매가 6,600원 | 메뉴판·체험 entitlement 없음 | 실제 미완료 |

AI 크레딧 주문은 계정 단위 상품이므로 메뉴판 context 없이 구매했을 때 `orders.menu_site_id`가 `null`인 것이 정상이다. 따라서 두 건은 복구·환불 대상이 아니다.

남은 개인 체험 주문 1건은 다음 상태다.

- 2026-05-19 생성된 과거 `personal_trial_basic_1month` 상품이다.
- 결제·payment row는 `paid` 상태다.
- `manual_review_required`가 기록되어 있다.
- 요청한 공개 주소가 이미 존재하고 다른 소유자에게 속해 있어 생성이 중단된 주소 중복 사례다.
- 해당 결제와 연결된 메뉴판과 개인 체험 entitlement가 없다.
- 연결된 환불 요청 또는 완료 기록이 없다.
- 주문 소유 계정에는 별도의 다른 메뉴판이 하나 존재하지만 이 결제의 이행으로 볼 근거는 없다.

## 결론

세 건을 모두 “불완전 메뉴판 주문”으로 분류했던 기존 집계는 과대 집계였다. 실제 운영 판단이 필요한 건은 과거 6,600원 개인 체험 결제 1건뿐이다.

이 주문은 결제가 완료됐지만 구매한 서비스가 생성되지 않았고, 해당 상품은 신규 판매에서 이미 종료됐다. 최초 감사에서는 자동 복구나 자동 환불이 고객 데이터·실제 결제·제품 정책을 변경하므로 수행하지 않았다.

## 승인 후 처리 결과

2026-09-01 사용자가 과거 미이행 개인 체험 주문 1건의 PortOne 상태 확인과 취소 가능 시 6,600원 전액 환불을 명시적으로 승인했다.

실행 전 재확인에서 PortOne 결제는 이미 `CANCELLED`이며 취소 금액은 6,600원, 취소 가능 잔액은 0원이었다. 따라서 중복 취소 API 요청은 보내지 않았다. 내부 DB만 과거 상태로 남아 있어 다음과 같이 정합성을 복구했다.

- `orders.status`: `paid` → `refunded`
- `payments.status`: `paid` → `cancelled`
- 주문·결제의 기존 원본 payload는 보존하고, 환불 금액·통화·처리 시각·처리 근거를 식별정보 없는 감사 metadata로 추가
- 메뉴판과 entitlement는 생성·변경하지 않음

처리 후 PortOne과 DB를 다시 조회해 PortOne `CANCELLED`·취소 금액 6,600원, 주문 `refunded`, 결제 `cancelled`가 모두 일치함을 확인했다. 고객 식별정보·결제 ID·주문 ID는 문서나 출력에 남기지 않았다.

## 재확인용 집계 기준

운영 재감사에서는 상품 유형을 구분해야 한다.

- 메뉴판 생성 상품: `menu_site_id is null`이면 미완료 후보
- AI 크레딧 상품: `ai_credit_transactions`의 purchase transaction과 지급 수량으로 완료 여부 판정
- 구독 상품: `business_subscriptions`와 `service_entitlements`로 완료 여부 판정

`orders.menu_site_id is null` 조건만으로 서로 다른 상품 유형을 한꺼번에 장애로 분류하지 않는다.
