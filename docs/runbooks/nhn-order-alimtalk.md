# NHN 조리완료 알림톡 연동

## 적용 범위

NHN Cloud KakaoTalk Bizmessage API v2.3용 구현이다. 미배포 SENS 초안의 주문 리스트·테이블 상세 발송 UI를 현재 주문 관리 화면에 연결했다. 기존 결제 단말 작업과는 별도 브랜치다.

현재는 서버에서 지정한 메뉴판 하나와 발신 프로필 하나의 검수용 연결이다. 아티메뉴 공용 채널을 미설정 매장의 발신자로 사용하지 않는다. 점주가 자신의 채널을 직접 인증하고 매장별 템플릿을 등록하는 셀프 연결, 충전·과금 기능은 이 변경에 포함하지 않는다.

## 서버 설정

| 환경변수 | 값 |
| --- | --- |
| `ORDER_ALIMTALK_ENABLED` | 기본 미설정. 승인·실수신 검수 시에만 `true` |
| `ORDER_ALIMTALK_MENU_SITE_ID` | 발송을 허용할 테스트 메뉴판 UUID |
| `ORDER_ALIMTALK_NHN_APP_KEY` | 아티메뉴 프로젝트의 KakaoTalk Bizmessage Appkey |
| `ORDER_ALIMTALK_NHN_SECRET_KEY` | 같은 서비스의 Secret Key |
| `ORDER_ALIMTALK_NHN_SENDER_KEY` | 연결한 채널의 발신 키(40자) |
| `ORDER_ALIMTALK_NHN_CHANNEL_ID` | 연결한 채널 검색용 ID |
| `ORDER_ALIMTALK_NHN_TEMPLATE_CODE` | 등록한 템플릿 코드 `cooking_ready_v1` |

모든 값은 서버 전용이다. `NEXT_PUBLIC_`을 붙이거나 Git·채팅에 키 값을 넣지 않는다. 실제 키 생성/권한 추가는 사용자가 NHN 콘솔에서 확인한다. 키를 저장한 것만으로 발송되지 않으며 활성화 값과 메뉴판 연결이 모두 필요하다.

## 발송 문구와 데이터

기본형·강조 없음·버튼 없음으로 승인된 템플릿만 사용한다. 매번 NHN 템플릿 조회에서 채널·발신 키·코드·승인 상태(`TSC03`)·차단·휴면 상태를 확인한다. 승인된 본문에 실제로 사용한 변수만 치환 발송 API에 전달한다.

```text
[#{매장명}] 조리완료 안내

주문하신 메뉴가 준비되었습니다.

룸: #{룸명}
테이블·키오스크: #{테이블명}
주문번호: #{주문번호}

매장 직원의 안내에 따라 음식을 받아주세요.
```

- 매장명: 고객 메뉴판과 동일한 `restaurant_name → business_name → name` 우선순위.
- 룸/테이블: 주문이 이동했다면 현재 `service_table_id`, 아니면 `menu_table_id`. 해당 메뉴판으로 범위를 제한하여 실제 이름과 저장된 배치도 소속을 읽는다. 과거 소속 없는 항목은 `룸 미지정`으로 표시한다. 조회 실패 시 발송하지 않는다.
- 주문번호: 서버에 저장된 `order_number`. 고객이 전달한 표시 값을 신뢰하지 않는다.
- 수신 번호: 주문 시 저장된 `notification_phone`만 사용한다. 클라이언트에는 마스킹한 번호만 보낸다.
- 첫 사용자 제한이 걸린 프로필은 변수 길이 제한 때문에 실패할 수 있다. 매장명을 임의로 잘라 보내지 말고 NHN 프로필 제한과 실수신을 확인한다.

## 상태·권한·중복 방지

- 주문 조회/처리 권한과 활성 운영 화면 조건을 서버에서 확인한다. 발송은 연락처가 있는 `ready` 주문에만 허용하며, 템플릿 확인 후 다시 주문 상태를 읽는다.
- 발송 이력 테이블은 RLS와 권한 회수로 일반 로그인·비로그인 클라이언트의 직접 접근을 차단한다. 서비스 역할은 select/insert/update만 사용한다.
- 주문별 시도 번호 유일성과 한 개의 pending 시도만 허용하는 부분 유일 인덱스로 동시 클릭을 막는다. 재발송은 서버에서 최신 시도 ID를 비교하고 새 시도를 기록한다.
- DB에 제출 시작을 먼저 기록하고 시도 UUID를 NHN `X-NC-API-IDEMPOTENCY-KEY`로 전달한다. 접수 성공은 완료가 아닌 pending이다. NHN requestId와 recipientSeq를 함께 저장하여 정확한 수신 결과를 조회한다.
- `COMPLETED` + 결과 코드 `0000`만 발송 완료로 표시한다. `FAILED`/`CANCEL`은 실패, 그 외는 확인 중이다. 결과 조회의 주문·발신 키·템플릿이 일치해야 상태를 갱신한다.
- 타임아웃·접수 응답 유실·DB 저장 실패는 자동 재발송하지 않는다. 요청 시작 전 실패한 시도만 60초 뒤 안전하게 실패로 돌릴 수 있다. 시작 후 접수 번호를 잃은 경우 NHN 발송 결과 조회에서 확인한다.
- SMS 대체 발송을 명시적으로 끈다. 알림톡 성공·실패·재발송은 주문 상태나 결제 상태를 변경하지 않는다. 픽업·서빙 완료는 직원이 별도 처리한다.
- 진행 중인 시도가 있는 동안 발신 키·프로젝트·템플릿 연결을 바꾸지 않는다.

## 검수 및 출시 순서

1. `node --import tsx --test lib/order-ready-alimtalk-provider.test.ts`로 승인 대기/잘못된 채널/차단/변수 오류/중복키/접수·성공 구분을 검수한다.
2. 개발 전용 `http://127.0.0.1:3136/qa-alimtalk-local`에서 모의 발송한다. #201 성공, #202 실패 후 재발송, #203 연락처 없음, #204 조리중 조건을 확인한다. 실제 고객 발송·운영 DB 쓰기는 없다.
3. SQL `20261125041134_add_nhn_order_alimtalk_attempts.sql`은 로컬 Postgres(PGlite)의 최소 주문 스키마에서 RLS·일반 사용자 접근 차단·중복 pending·재시도·연락처/서빙 조건을 확인했다. 운영 적용은 별도다.
4. 템플릿 승인과 사용자의 키 준비 후 운영 DB 적용 및 배포 승인을 받아 적용한다. 지정 테스트 메뉴판과 수신 동의 번호로 실제 발송·결과 확인·실패·재발송·픽업 분리를 확인한 뒤 운영 발송을 연다.

2026-11-25 인증 확인: 사용자 승인으로 테스트 메뉴판 `261113test`의 ID를 읽고 로컬 전용 설정에 연결했다. 저장된 Appkey·Secret Key·발신 키로 NHN 템플릿 GET 조회가 HTTP 200, `isSuccessful=true`, `resultCode=0`을 반환했다. 채널·발신 키·템플릿 코드가 모두 일치했고 기본형/강조 없음, 차단·휴면 없음, 변수 4개가 확인됐다. 템플릿은 `TSC02`(검수 중)였다. 실제 v2.3 응답의 단건 객체는 문서 예시의 `templates`와 달리 `template`으로 반환되어 두 형식을 모두 처리하도록 수정하고 테스트를 추가했다.

실제 인증 키와 메뉴판 연결 값은 Git에서 제외된 `.env.development.local`에만 저장한다. `ORDER_ALIMTALK_ENABLED=false`를 유지했고 SELECT와 템플릿 GET 외 요청은 하지 않았다. 운영 DB 적용·실제 발송·운영 배포는 아직 하지 않았다.

[NHN 알림톡 API](https://docs.nhncloud.com/ko/Notification/KakaoTalk%20Bizmessage/ko/alimtalk-api-guide/) · [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
