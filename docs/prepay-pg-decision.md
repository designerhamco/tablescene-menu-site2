# 선결제 PG 구조 권장안

최종 검토: 2026-08-07

## 결론

MenuLink 선결제는 `PortOne V2`를 기술 연동 계층으로 사용하는 방향을 권장한다. 저장소에는 이미 MenuLink 자체 상품 결제의 PortOne V2 조회·금액 검증·취소 코드가 있고, 서비스 소개와 약관도 PortOne 기반 결제를 전제로 한다.

다만 음식점 주문 결제에서는 각 음식점 사업자가 PG 계약과 정산의 주체, 즉 merchant of record여야 한다. 독립된 사업자등록번호를 가진 여러 음식점을 PortOne 한 고객사 계정의 하위 상점으로 운영할 수 있는지, 아니면 음식점마다 별도 PortOne 계정과 API Secret이 필요한지는 PortOne의 서면 확인 전까지 확정하지 않는다.

이 확인 없이 MenuLink 법인 MID로 음식점 고객의 주문 결제를 받거나, 음식점별 API Secret 저장 구조를 임의로 만들지 않는다.

## 현재 저장소 감사

- 기존 MenuLink 상품 결제는 `lib/portone.ts`, `lib/portone-billing.ts`, `/api/payment/complete`에서 PortOne V2 API Secret을 서버 전용으로 사용한다.
- 기존 완료 경로는 브라우저 성공 응답을 그대로 신뢰하지 않고 PortOne 결제 조회, 상태, 금액, 결제 ID를 다시 검증한다.
- 음식점 주문 스키마는 `payment_status=paid`, `payment_method=pg`를 이미 표현할 수 있지만 주문별 PG 거래 ID, 취소 금액, 웹훅 처리 이력, 음식점별 merchant 설정은 아직 없다.
- 현재 후불 주문은 별도 default-off gate와 site allowlist 뒤에서만 동작하며 선결제를 시작하지 않는다.
- 기존 PortOne Secret은 MenuLink 자체 상품 결제용이므로 음식점 주문 결제에 재사용하지 않는다.

## 공식 문서에서 확인된 공통 조건

- PortOne V2 브라우저 결제 요청에는 `storeId`, `channelKey`, 고유한 `paymentId`가 필요하다.
- 브라우저 결제 결과만으로 완료 처리하지 않고 서버에서 결제 상태와 금액을 조회·검증해야 한다.
- 웹훅은 원문 body와 서버 SDK를 사용해 위조 여부를 검증해야 한다.
- PG MID는 계약·결제수단·과세·수수료 설정의 기준이며, PortOne 하위 상점은 각각 별도의 Store ID를 가진다.
- V2 API Secret은 Owner 또는 Admin이 발급하며 서버 밖으로 노출하면 안 된다.

공식 참고:

- [PortOne V2 인증 결제](https://developers.portone.io/opi/ko/integration/start/v2/checkout)
- [PortOne 퀵 가이드](https://developers.portone.io/opi/ko/quick-guide/payment)
- [PortOne 연동 정보와 Store ID·API Secret](https://developers.portone.io/opi/ko/console/guide/channel-manage)
- [PortOne 상점 계정 관리](https://developers.portone.io/opi/ko/console/guide/account?v=v2)
- [PortOne PG·MID 용어](https://developers.portone.io/opi/ko/support/pg-terms?v=v2)

## PortOne에 확인할 한 가지 핵심 질문

다음 내용을 PortOne 영업 또는 기술지원에 서면으로 문의한다.

```text
MenuLink는 여러 독립 음식점 사업자에게 테이블 주문 SaaS를 제공합니다.
결제 대금의 merchant of record와 정산 주체는 각 음식점 사업자이며,
MenuLink는 결제 화면·주문·웹훅의 기술 연동만 제공합니다.

사업자등록번호와 정산 계좌가 서로 다른 음식점들을
하나의 PortOne 고객사 계정 아래 하위 상점으로 구성하고,
각 음식점 명의의 PG MID·정산을 연결할 수 있나요?

가능하다면 필요한 계약 유형, 하위 상점 생성 방식,
API Secret 범위와 웹훅 구분 방법을 알려주세요.

불가능하다면 음식점마다 별도 PortOne 계정과 API Secret이 필요한지,
SaaS 기술사가 이를 안전하게 대리 연동하는 권장 방식을 알려주세요.
```

API Secret, MID 비밀번호, 계약 서류 원본은 채팅이나 저장소에 붙이지 않는다. 답변에는 계약 구조와 필요한 식별자 종류만 남긴다.

## 답변과 무관하게 고정할 안전 계약

1. 브라우저에는 결제 요청에 필요한 공개 식별자만 전달한다.
2. API Secret과 웹훅 Secret은 서버 전용 secret store에서 참조하고 일반 테이블에 평문 저장하지 않는다.
3. 서버가 주문 예정 금액과 통화를 먼저 고정하고 예측 불가능한 `paymentId`를 발급한다.
4. 결제 완료는 PortOne 조회 또는 검증된 웹훅으로 상태·금액·통화·주문 식별자가 모두 일치할 때만 인정한다.
5. 결제 완료와 주문 생성은 같은 idempotency key로 재시도 가능해야 한다.
6. 결제 성공 후 주문 생성 실패는 자동 재처리 대상이며 새 결제를 요구하지 않는다.
7. 웹훅은 중복·역순·지연 도착을 정상 상황으로 처리한다.
8. 취소·부분취소·환불은 원 결제와 누적 취소 가능액을 서버에서 다시 확인한다.
9. Production은 명시적 feature gate와 승인된 pilot site allowlist 전까지 fail closed 상태를 유지한다.
10. 실결제·취소·환불은 별도 사용자 승인과 소액 pilot 절차 없이는 실행하지 않는다.

## 권장 구현 순서

PortOne 답변과 첫 pilot 음식점이 확정되면 다음을 작은 PR로 나눈다.

1. 음식점 merchant 설정 계약과 secret reference 구조
2. 결제 시도·웹훅 event·취소 이력 DB migration 초안과 RLS 감사
3. default-off 결제 준비 API와 모바일 PortOne V2 checkout
4. 서버 결제 조회·금액 검증과 원자적 주문 확정
5. 서명 검증 웹훅과 중복·역순 재처리
6. 전액 취소 후 정책이 확정된 범위에서 부분취소·환불
7. 로컬 mock·sandbox QA
8. 사용자 승인 아래 pilot 음식점 Production 설정과 소액 실결제

PortOne 답변 전까지는 1번의 최종 데이터 구조도 확정하지 않고, 기존 후불 주문을 그대로 유지한다.
