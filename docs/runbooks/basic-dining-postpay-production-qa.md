# 베이직·다이닝 후불 주문 Production QA

실행: 2026-10-19 KST. 사용자가 신규 DB 함수 2개, 현재 QA 계정의 14일 메뉴판 2개, 해당 QA의 후불 테스트 접수를 명시 승인했다. 기존 REAL MATCHA와 고객 메뉴판은 변경하지 않았다.

## 적용

연결된 `tablescene-prod` (`kfbekbapwsyeanobyjsv`)에서 두 함수가 없는 것을 먼저 조회했다. 이후 다음 두 파일만 `supabase db query --linked --file`로 적용했다. 원격 migration ledger와 과거 수동 적용 이력이 달라 `db push`는 실행하지 않았다. **두 파일은 적용 완료이므로 다시 실행하지 않는다.**

- `20261018085245_add_menu_order_configuration.sql`
- `20261018090357_add_course_postpay_orders.sql`

Postcheck: 두 함수 모두 security invoker, 빈 search_path, service_role 실행 가능, anon/authenticated 실행 불가. 잘못된 소유자와 무효 방문 세션 거절을 rollback 쿼리로 확인했다. Supabase security advisor error 0. Production 스키마에서 generated types를 재생성하고 RPC 전체를 덮던 임시 never 단언을 제거했다. 요청사항 null은 SQL에서는 허용하지만 generated RPC 인자에서 nullability가 빠지므로 해당 값에만 호환 단언을 남긴다.

## 격리된 QA 대상

현재 로그인된 검증된 QA 계정에만 생성했다. 실구독·결제 레코드는 만들지 않고 QA entitlement만 14일 부여했다. 이전 `aube-smart-call-qa`는 소유자가 다르고 만료돼 사용하지 않았다.

| 구분 | menu_site_id | slug | 만료 KST |
| --- | --- | --- | --- |
| 베이직 복사본 | `91ba803b-906d-40fd-a21d-06dc25ba70d6` | `basic-paged-order-qa-20261018` | 2026-11-02 01:21 |
| 다이닝 오브 테이블 | `ddb3a082-0004-4445-b6b3-a21110f49bb2` | `dining-course-order-qa-20261018` | 2026-11-02 01:22 |

베이직은 1페이지·18개 메뉴, 다이닝은 3페이지·20개 메뉴 스타터다. 메뉴판 설정에서 호출·후불 주문·모바일 선결제 표시를 켰다. 베이직 시그니처 라떼에 필수 단일 선택 온도 ICE/HOT을 추가했고, 다이닝은 Aube signature 코스 전체만 주문 대상으로 선택했다.

첫 베이직 seed는 기존 번역 테이블의 service_role INSERT 제한에 걸렸다. 생성분은 seed의 실패 정리로 제거됐고 잔여 QA 0건을 확인했다. 권한은 변경하지 않았다. 재시도에서는 번역 INSERT만 기존 CLI SQL 연결을 사용해 QA 소유자·두 slug·QA source 일치를 검사한 뒤 저장했다. 나머지 스타터와 entitlement는 기존 seed를 사용했다. 동일 slug가 이미 있으므로 seed `--apply`를 반복하지 않는다.

## Runtime

Production에 다음을 설정했다.

- POSTPAY_ORDER_ENABLED / ORDER_DASHBOARD_ENABLED = true
- POSTPAY_ORDER_ALLOWED_SITE_IDS / ORDER_DASHBOARD_ALLOWED_SITE_IDS = 위 QA UUID 2개만
- 기존 CALL/TABLE_MANAGEMENT 전역 값 유지. 두 allowlist는 이전 QA `1b3d9a63-4bd8-480f-9527-a5c9737c2cf3`를 보존하고 새 두 UUID만 추가.

환경 반영 재배포 `5yM1uXDyJLDSv8ANgdt4kuWpZUVE`는 Production Ready다. 실제 주문은 site allowlist 외에도 사장 opt-in·공개 상태·사업자 이용권·서명된 활성 테이블 방문 세션을 모두 요구한다.

## 실제 브라우저 E2E

각 QA에 `QA 1번 테이블` 1개를 생성했다.

- 베이직 QR: `/table/8e21399b-4b84-4228-b900-a02e9cc3de33`
- 다이닝 QR: `/table/305ceaa5-cae8-427c-a759-4c4cce559592`
- 손님 QR은 customer/mobile 표현. 매장 단말은 같은 URL의 `?mode=terminal`로 실제 기기 표현을 사용한다.

베이직: 라떼 ICE 2개 담기 → 옵션 변경 HOT·1개 → 5,800원 후불 주문. 관리자 주문 #1의 테이블·상품·HOT 옵션·수량·금액·접수 시각이 일치했다.

다이닝: Signature Course 페이지 → Aube signature 코스 전체 1개 → 185,000원 후불 주문. 관리자 주문 #2는 코스명·수량·금액이 일치하고 메뉴 개별 item 참조 없이 snapshot으로 보존됐다. 구성 요리는 별도로 담지 않는다.

두 건 모두 관리자 UI에서 접수 → 조리 전 → 조리 중 → 조리 완료 → 제공 완료를 통과했다. DB의 accepted/cooking/ready/served 시각이 기록됐다. 각 QA 주문 수는 정확히 1건, payment_status는 unpaid, payment_completed_at은 null이다. 동일 request UUID 재전송은 is_duplicate=true로 기존 주문을 반환하고 추가 주문을 만들지 않았다. 결제 완료·취소·환불·PG 호출은 하지 않았다. 모바일 선결제는 표시되지만 비활성 `선결제 · 준비 중`이다.

실제 접수 검증에서 발견한 운영 사이드바의 주문관리 누락도 보완했다. 주문 메뉴·대시보드 요약은 기존 operationAccess.orders·order.read·runtime gate를 그대로 따른다.

## 디자인 후속 범위

사용자가 핵심 연결을 우선하도록 요청했다. 숨김 페이지형 베이직의 호출·장바구니를 대표열 상단에 고정하고 원형 배경·테두리·그림자 없이 아이콘과 라벨로 배치한다. 언어 UI는 기존 cafe 스타일이다. 담기 아이콘의 원형·그림자도 제거한다. 다이닝은 기존 금색 호출 버튼·언어 selector·호출 모달을 재사용한다. 홈 Hero, 원본 REAL MATCHA의 배치, 기존 모바일 읽기 간격·PC fit 공식은 바꾸지 않는다.

## 중단·정리

후불/주문관리 allowlist에서 새 QA UUID 둘만 제거하고 재배포하면 실제 주문 연결을 닫을 수 있다. Call/Table도 새 UUID만 제거하며 기존 항목을 보존한다. QA entitlement는 위 시각에 만료된다. 테스트 주문은 미결제 검증 이력으로 유지하고 삭제·실결제 처리하지 않는다. 실제 매장 확대는 별도 범위다.

## 최종 코드 검증

- 단위 테스트 633/633, 별도 TypeScript, 변경 파일 ESLint, Production build 통과.
- 배포용 로컬 서버의 신규 흐름 44/44: PC 1440×900/1920×1080, 가로·세로 태블릿 1180×820/820×1180, 좁은/넓은 모바일과 820px customer 표현. 페이지 전체 순서·안내 앞 위젯·고정 대표영역/상단 액션·원형 배경/그림자 없음·옵션 수정·미리보기 후불·선결제 비활성 확인, 실제 API 쓰기 0.
- 기존 7종 템플릿 112/112: PC·양방향 태블릿·320/390/430px 모바일, 4개 언어, 기능 ON/OFF. fit·읽기 간격·넘침·page error 실패 0.
- 홈 Hero, 공통 사이트 디자인 시스템, 원본 템플릿 배치/fit 파일은 이번 diff에 없다.
