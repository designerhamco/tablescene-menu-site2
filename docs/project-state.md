# ArtiMenu 프로젝트 상태

최종 갱신: 2026-08-31

기준 브랜치: `tablescene-next`

기준 커밋: `bd30bab`

현재 작업 브랜치: `codex/aube-menu-refinement`

## 현재 상태와 다음 선행 조건

- 공통 헤더의 다이닝 하위 메뉴를 제거하고 다이닝을 직접 링크로 제공
- 단일페이지 5,900원은 할인·위젯, 멀티페이지 9,900원은 할인·스마트호출을 포함하도록 제품 기능 경계를 고정
- Order/PG는 장기 비활성 제품으로 고정해 환경변수나 기존 allowlist만으로 공개 UI와 server write가 다시 열리지 않도록 차단
- 스마트호출은 멀티페이지의 유효한 테이블 세션과 runtime/site allowlist를 모두 통과해야만 공개 메뉴와 매장 운영에 노출
- 판매 가능한 멀티페이지 디자인 `오브 테이블`의 편집·starter·미리보기·공개 renderer와 additive schema 초안을 구현하고 로컬 QA 완료
- 기존 Brew Chapter는 `retired` 호환 renderer로만 유지해 신규 생성·구매·교체 후보에서 제외
- 신규 schema는 2026-08-30 사용자 승인 아래 Production에 1회 적용하고 generated types를 갱신했다. 최종 시각 확인·pilot 메뉴판 지정 전까지 `오브 테이블`은 hidden, 스마트호출 runtime과 신규 멀티 판매 노출은 fail closed


## 완료된 주요 기능

- 오브 테이블 멀티페이지 기반:
  - 선택 노출 커버에 제목·설명·배경 이미지·배경색을 제공하고, 커버를 제외한 최대 10개 메뉴 페이지는 세로 스크롤을 허용
  - 커버 이미지가 있으면 선택 배경색을 기본 75%로 겹치고 0~100%로 조절하며, 이미지가 없으면 같은 색을 단색 배경으로 표시
  - 메뉴 페이지별 노출·순서·설명·데스크톱/태블릿 1·2열·왼쪽/가운데 정렬을 저장하고 모바일은 항상 1열로 렌더링
  - `메뉴판 구성`에서 커버·메뉴 페이지·추가 탭을 고정 제공하고 drag handle과 키보드/모바일 위·아래 대체 조작으로 저장 전 순서를 편집
  - 카테고리를 `코스`로 표시하며 코스명·설명·가격·가격 안내를 지원하고, 코스 소속 메뉴와 페이지 직접 메뉴를 한 페이지에서 혼합
  - 노출 코스의 노출 메뉴 1개 이상, 노출 메뉴의 유효한 페이지/코스 소속, 최대 페이지 수를 공개 전 fail closed 검증
  - 커버와 노출 메뉴 페이지를 연결하는 고정 dot, click·swipe·keyboard 이동, 페이지 전환 시 scroll reset을 구현
  - 상세 제품·데이터·QA 계약은 `docs/aube-table-multi-page-template-contract.md`
  - 템플릿명·스타터 매장명을 `오브 테이블`로 통일하고 기본 커버 카피는 `THE MENU`·한글 설명으로 구성. 커버는 기본정보 로고가 있을 때만 원본 비율을 유지해 표시하고 텍스트 매장명은 반복하지 않는다. 기본 커버 오버레이는 고급스러운 네이비 `#0D172A`, 메뉴 페이지와 하단 fade는 순백색으로 통일. 시그니처·단품·드링크 3페이지의 완성형 스타터와 전용 파인다이닝 커버 이미지를 연결
  - 모든 메뉴 페이지의 제목·설명 헤더는 중앙 정렬한다. `Signature Course` 스타터는 코스·메뉴 정보까지 중앙 정렬하고, `A La Carte Menu`·`Drink Menu` 스타터의 본문은 왼쪽 정렬을 사용한다. 2열 코스 묶음, 유동 타이포·여백·가격 리더선으로 실제 파인다이닝 메뉴판 밀도를 반영
  - 한글은 Pretendard, 영문은 Tenor Sans를 기본으로 고정하고 스타터 영문은 자연스러운 문장형 대소문자를 사용
  - PC 기준 페이지 제목 최대 68px·코스명 26~32px·메뉴명 17~20px·가격 15~18px·설명 13~15px로 조정. 최대 1440px 본문 폭과 유동 상하좌우 여백을 사용하며 코스·항목 간격도 화면 폭에 따라 축소·확대한다. 커버 제목은 최대 112px로 낮추고 페이지 제목과 같은 베이지 골드를 사용하며, 가격 미노출 메뉴는 가격 연결 점선을 함께 숨긴다
  - 터치·마우스 스와이프와 Prev·Next·dot 이동은 동일한 방향성 전환 모션을 사용한다. 세로 스크롤은 유지하고 짧은 제스처는 원위치로 복귀하며, 운영체제의 모션 감소 설정에서는 전환과 드래그를 최소화한다
  - 하단 탐색은 배경 없는 회색/금색 dot과 메뉴 내용을 자연스럽게 가리는 흰색 fade로 정리. 마우스를 사용하는 1280px 이상 PC에만 제공하는 `Prev`·`Next`에는 전용 화살표와 방향성 hover 모션을 적용

- 매장 운영 정보 구조:
  - 공통 헤더에서 `나의 메뉴판`과 `매장 운영`을 독립된 최상위 업무로 분리
  - 현재 운영 허브는 공개·활성·멀티페이지·스마트호출 runtime·호출 권한을 모두 통과한 메뉴판만 상단 탭에 노출
  - 호출·테이블 화면은 같은 메뉴판 탭과 전용 왼쪽 내비게이션을 공유하고, 주문·매출 화면은 향후 호환 코드로만 보존
  - 운영 전용 왼쪽 영역에서도 계정 이메일·사용자 ID·로그아웃을 확인하되 AI 크레딧은 노출하지 않음
  - 모바일 알림은 햄버거 옆 아이콘과 읽지 않은 알림 수로 제공하고 메뉴 하단 지원 동선은 `1:1 문의`·`채팅상담`으로 정리
  - 주문·호출·테이블·매출 메뉴는 역할 권한이 없어도 숨기지 않고 비활성 상태와 제한 사유를 제공
  - 공통 헤더의 `매장 운영` 진입은 같은 서버 운영 대상 판정을 통과한 계정에만 PC·모바일에 노출
- 공개 서비스 소개 화면:
  - 아티메뉴 디스플레이를 다이닝 소개 화면과 동일한 마케팅 타이포·검정 스토리 영역·교차 이미지 배치 구조로 통일
  - 디스플레이 히어로는 천장형 메뉴보드 목업 3개를 상단에 두고 그 아래 영문 제목을 배치하며, 다이닝 히어로와 동일한 밝은 타이포 규격을 공유
  - 검정 스토리 영역 이후도 다이닝과 같은 AI 2열 카드·매장 사례 3열·하단 가이드 CTA 레이아웃을 공유하고 문구만 디스플레이 용도에 맞게 분리
  - 기존 디스플레이 기능·FAQ 정책 문구는 유지하고 공개 소개 본문만 짧게 정리
  - 모바일 햄버거 메뉴의 다이닝 항목을 다른 1차 메뉴와 동일한 24px·bold 타이포로 고정
- Display 타임세일:
  - 다이닝과 같은 관리자 편집·저장·번역 계약을 `display_menu_a`에 연결
  - 공개·미리보기에서 배지, 정상가 취소선, 할인가, 마감 문구·카운트다운을 Display 밀도 자동 보정과 함께 표시
  - 예약 시작 시 공개 화면을 자동 갱신하고 종료·품절·유효하지 않은 할인가는 fail closed
  - 기존 `menu_promotions`·`menu_promotion_items` 구조를 재사용하며 신규 migration은 없음
- ArtiMenu 브랜드와 PG 사이트 심사 준비:
  - 사용자 표시 브랜드를 `아티메뉴` / `ArtiMenu`로 통일하고 기존 cookie·localStorage·DB·호환 route 식별자는 유지
  - 현재 판매 가능한 다이닝 4상품을 `/pricing`에서 분리하고 공개 상품 상세·제공 시점·교환·청약철회·환불 안내를 연결
  - QR오더 소개의 미구현 결제·포인트·알림·POS 완성형 표현을 제거하고 계약 전 준비 상태와 검증 범위를 명시
  - 상세 심사 체크리스트는 `docs/pg-site-review-readiness.md`
- Production 의존성 보안 패치:
  - Next.js와 eslint-config-next를 16.3.1, React Router를 7.18.2로 갱신
  - `nanoid`, `postcss`, `sharp`, `ws`를 안전한 transitive 버전으로 갱신
  - `npm audit --omit=dev` 0건과 전체 계약 테스트·TypeScript·lint·production build 재검증
- 스마트호출 로컬 통합 QA:
  - 공개 config의 세션·Business Basic·멀티페이지·Call runtime gate를 한 공통 판정으로 결합
  - 단일페이지·일반 QR·Display·runtime-off에서는 fail closed, 멀티페이지 테이블 세션에서는 Call-only로 동작하도록 계약 테스트로 고정
  - 기존 Order 회귀 fixture와 데이터 구조는 보존하지만 제품 정책 상 공개 UI와 server write는 항상 비활성

- 메뉴판 생성·편집·미리보기·공개 및 QR 흐름
- 활성 카페/디스플레이 템플릿과 공통 템플릿 렌더러
- 메뉴 항목, 가격 옵션, 품절, 타임세일, 배지, 이미지, 커버, 위젯, 다국어 저장 구조
- 개인 체험, 사업자 구독, 결제 프로비저닝, 보관·복구, AI 크레딧의 기존 Owner 흐름
- 결제 프로비저닝 중복 방지 인덱스와 애플리케이션 idempotency 처리
- 직원 권한 Phase A 데이터베이스 기반:
  - `menu_site_members`
  - `menu_site_invitations`
  - `menu_site_audit_logs`
  - 초대 수락 RPC와 Owner/Member private helper
- 직원 권한 Phase B-1 공통 계층:
  - 역할별 permission matrix
  - Owner 우선 판정
  - 활성 membership 및 lifecycle 검증
  - 공통 `menu-site` access helper
- 직원 권한 Phase B-2 메뉴판 접근:
  - Owner 소유 메뉴판과 활성 직원 membership 메뉴판의 통합 목록
  - Owner 우선 판정과 직원 역할 표시
  - `menu.read` 및 활성 lifecycle 기반 직원 읽기 전용 미리보기
  - 사장 전용 결제·구독·복구 동선의 직원 화면 제외
- 직원 권한 Phase B-3 메뉴 편집:
  - Owner/Manager/Editor의 활성 메뉴판 편집 action과 편집 화면 접근
  - 공개·비공개는 Owner/Manager만 가능하고 Editor에서 공개 탭 제외
  - 위젯·번역·AI·이미지·동영상을 정확한 menu-site 권한 경계 뒤에서 서버 실행
  - 직원 AI는 Owner 크레딧을 사용하고 충전·결제 UI는 Owner-only
  - 서비스 키는 서버 밖으로 노출하지 않고, 모든 자원 ID와 Storage 경로를 해당 menu-site로 제한
- Owner-only runtime 방어:
  - 구독·환불·복구 자원은 현재 actor와 저장된 `user_id`가 일치할 때만 처리
  - 결제·추가 구매·계정 삭제는 현재 사용자 범위로만 생성·조회·변경
  - 상세 검토 결과는 `docs/owner-only-runtime-audit.md`에 기록
- 직원 초대 UI와 이메일 전송:
  - Owner-only 다중 메뉴판 초대, 7일 만료 hash token, 중복·자가 초대·rate limit·audit 연결
  - 실제 발송은 초대 수락 화면과 SMTP QA 전까지 `STAFF_INVITATIONS_ENABLED` feature gate로 비활성
  - 상세 운영 경계는 `docs/staff-invitation-delivery.md`에 기록
- 직원 초대 수락:
  - URL token을 짧은 수명의 HttpOnly intent cookie로 격리하고 Auth 복귀 URL에서는 제거
  - 확인된 로그인 이메일과 기존 원자적 수락 RPC로 batch 전체 membership·invitation·audit 처리
- 직원 초대 재전송·취소:
  - Owner-only batch token 회전, 7일 만료 갱신, 발송 실패 조건부 rollback
  - pending batch 취소와 재전송·취소 audit 연결
- 직원 역할 변경·접근 회수:
  - Owner-only active membership과 role allowlist 기반 조건부 변경
  - role change·revoke audit와 audit 실패 조건부 rollback
- 직원용 마이페이지 상세 경험:
  - Owner/직원 관계 배지와 role permission 기반 사용 가능 기능 안내
  - 직원 전용 계정에서 사장 전용 결제·추가 구매·보관·삭제 동선 제외
- 직원 write audit:
  - 공통 write gate에서 staff actor·role·membership·permission·surface 기록
  - audit 실패 시 mutation client를 반환하지 않고 fail closed
  - 상세 범위는 `docs/staff-write-audit.md`에 기록
- 메뉴판 미리보기 기기 프레임:
  - 기존 인증·권한 route와 `MenuPageRenderer`를 그대로 재사용
  - PC 1440×900, 태블릿 기본 가로 1180×820·선택 세로 820×1180, 모바일 390×844 실제 viewport 제공
  - 모바일 프레임은 Order/PG 선택 UI 없이 실제 메뉴판을 표시하고, 멀티페이지에서는 스마트호출 미리보기만 실제 write 없는 fixture로 제공
  - 별도 scale 엔진 없이 동일 출처 iframe의 반응형 viewport와 실제 크기 새 창 제공
- 활성 템플릿 정책과 1차 renderer QA:
  - Basic 5개와 Display 1개를 신규 출시 대상으로 유지하고 누아는 신규 노출에서 은퇴
  - `hidden`은 임시 판매 노출 상태로 유지하면서 QA에는 포함
  - 390×844·1440×900 renderer, 이미지, overflow, 콘솔 오류와 Display 페이지 이동을 점검
  - 상세 기록은 `docs/active-template-qa.md`
- 활성 템플릿 저장·locale QA:
  - 7개 starter의 최종 저장 payload round-trip과 참조 무결성 검증
  - 4개 locale, Basic desktop/mobile과 Display desktop 총 52개 route의 장문·이미지·언어 control 검증
  - 브루 챕터 언어 전환 control과 중국어·일본어 장문 overflow 수정
- 템플릿 교체 등급 경계:
  - 단일 페이지는 단일 페이지, 멀티페이지는 멀티페이지 후보만 썸네일 카드로 노출
  - 서버 action도 교차 등급 전환을 거부하며 메뉴·URL·번역 보존 계약은 유지
  - 브루 챕터 멀티페이지는 공통 Call Layer를 통해 Order 없이 호출만 활성화 가능
  - 신규 단일 월 5,900원·연 63,700원과 멀티 월 9,900원·연 106,900원을 별도 SKU로 연결하고 기존 9,900원·95,000원 SKU는 기존 고객 호환용으로 유지
- 활성 템플릿 기능 stress QA:
  - capability 기반 위젯·폰트·배지·가격 옵션·품절·타임세일·이미지·커버 desktop/mobile 검증
  - Display와 누아 메뉴의 품절 표시 연결
- 활성 템플릿 preview/public 격리 QA:
  - 동일 final-save round-trip fixture를 `MenuPageRenderer` preview/public 모드로 비교
  - 7개 desktop과 Basic 6개 mobile에서 렌더 신호·overflow·이미지 검증
- 모바일 Order/Call 공통 진입 셸:
  - template 밖 공통 safe-area sticky header와 언어·매장·table·Call·cart 배치
  - 실제 table session 전에는 locked, no-session에서는 Call·cart fail-closed
- 테이블 QR·방문 세션 기반 준비:
  - hash-only table/session token, 12시간 세션, 메뉴판당 비보관 테이블 100개 정책 확정
  - server-only 강제 RLS 테이블과 constraint·session revoke migration 적용 완료
  - Production postcheck와 generated Supabase types 갱신 완료
- 테이블 관리 runtime 기반:
  - Owner/Manager의 테이블 생성·이름/상태 변경·token 회전·보관을 공통 권한과 staff write audit 뒤에 연결
  - raw QR token은 생성·회전 응답에서만 한 번 전달하고 목록 DTO와 DB에는 노출하지 않음
  - hard delete 없이 보관 처리하며 비활성·보관·token 회전 시 DB trigger가 기존 방문 세션을 폐기
  - `TABLE_MANAGEMENT_ENABLED=true`가 아니면 UI와 server mutation을 모두 fail closed
  - 현재는 멀티페이지 다이닝 스마트호출 번들만 허용하며 실제 판매 템플릿과 pilot 확정 전에는 Production runtime을 활성화하지 않음
- table QR·방문 세션 runtime 기반:
  - 일반 메뉴 QR과 분리된 `/table/[token]` 진입에서 active table token hash와 공개 가능한 Basic 메뉴판을 server-only로 검증
  - 방문 세션 원문은 최대 12시간의 Secure·HttpOnly·SameSite=Lax cookie에만 전달하고 DB에는 SHA-256 hash만 저장
  - 메뉴판 ID·active table·만료·폐기·User-Agent hash가 모두 일치할 때만 세션을 재사용
  - 일반 slug 접근은 세션을 생성하지 않으며 유효한 기존 세션만 공통 모바일 header의 table context에 연결
  - 기능은 기존 default-off `TABLE_MANAGEMENT_ENABLED` gate 뒤에 있어 Production 활성화나 데이터 write가 발생하지 않음
  - 생성·회전 1회 응답에서는 브라우저 내부 QR renderer로 PNG를 내려받으며 raw token을 별도 API에 재전송하지 않음
- 후불 주문 DB 기반:
  - `menu_items.orderable` default-false 분리와 주문 전용 option group/value
  - table visit session에 연결된 주문 header와 immutable 메뉴·가격·option snapshot
  - session 단위 idempotency와 20 lines·50 units 한도를 DB에서 강제
  - server-only 강제 RLS와 최소 `service_role` 권한으로 Production 1회 적용 및 generated types 갱신 완료
- 후불 주문 default-off runtime:
  - template 밖 공통 모바일 cart drawer에서 메뉴·주문 option·수량 관리; 선택적 요청사항 DB 필드는 호환용으로 유지하되 현재 고객 UI에는 노출하지 않음
  - 같은 table visit session scope의 device-local cart와 retry request UUID 유지
  - same-origin POST와 server-validated HttpOnly session, 사이트 allowlist, public lifecycle 재검증
  - 원자적 snapshot·품절·option·idempotency RPC는 Production 1회 적용 및 generated types 갱신 완료
- 후불 주문관리 default-off runtime:
  - `order.read/manage/cancel_unpaid`, `payment.manual` 권한 재검증과 직원 audit gate
  - 접수→조리 전→조리 중→조리 완료→제공 완료 전방향 conditional update
  - 미결제·미제공 취소, 외부 카드 단말기·현금 결제 완료, actor/timestamp 기록
  - 15초 갱신 대시보드와 immutable snapshot 인쇄 영수증
  - `ORDER_DASHBOARD_ENABLED` + explicit site allowlist 없이 Production에서 노출·write 안 됨
- Call default-off 기반:
  - 직원 호출·물·앞치마·식기·테이블 정리·주문 도움 6개를 설정 전 기본 항목으로 제공
  - 매장별 호출 항목의 이름·순서·사용 여부를 원자적으로 저장하고, 제거 항목은 hard delete 대신 보관
  - 손님은 활성 항목만 전송하며 호출 이력에는 접수 당시 항목 key·label snapshot을 보존
  - 설정 전 기존 매장에는 DB backfill 없이 virtual default를 반환하고 첫 명시적 저장부터 매장별 설정으로 전환
  - 미처리 호출 dedupe, 완료·취소 후 2분 cooldown, table session당 시간당 10회 제한
  - Owner/Manager/Order staff의 `call.manage` 재인증과 확인·완료 actor/timestamp 기록
  - 최근 100건을 15초 갱신하는 별도 호출관리 화면; 공개 Realtime publication은 추가하지 않음
  - server-only 강제 RLS migration은 2026-08-07 Production 1회 적용 및 generated types 갱신 완료
  - 매장별 호출 항목 additive migration은 2026-08-28 사용자 승인 아래 Production 1회 적용, 보안 postcheck와 generated types 갱신 완료
  - `CALL_ENABLED` + site allowlist 없이 UI와 write 모두 fail closed
- 매출 요약 default-off 기반:
  - 기존 주문관리 gate와 `sales.read`를 모두 통과한 Owner/Manager만 접근
  - 한국 시간 기준 당일·당월 주문 접수 수와 결제 완료 건수·금액을 분리 집계
  - 결제 완료액은 현재 `manual_paid`/`paid` 상태만 포함하고 취소·환불·정산·수수료는 제외
  - immutable item snapshot 기반 메뉴별 판매량 Top 10과 결제수단별 완료액 제공
  - 당월 생성 주문의 현재 취소·미결제 건수와 주문금액을 별도 표시
  - 새 migration이나 Production 설정 없이 기존 server-only 주문 데이터를 최소 DTO로 조회
- 주문·호출 앱 내 도착 알림:
  - 기존 15초 dashboard refresh 결과의 ID만 브라우저 session 범위에서 비교
  - 최초 진입의 기존 이력은 알리지 않고 이후 새 주문·pending 호출만 배너와 문서 제목으로 표시
  - 브라우저 알림은 사용자가 관리 화면에서 직접 켜고, 그때만 화면이 비활성이어도 기존 15초 refresh를 유지해 일반화된 건수 문구를 표시
  - 자동 권한 요청·소리·외부 채널·백그라운드 push·서버 저장 없이 fail-safe로 동작
- 전체 고객 흐름 정적·route QA:
  - 회원가입·비밀번호 재설정·요금제·Order 소개·오브 커피 preview 공개 route 로드 확인
  - 비로그인 마이페이지의 sign-in 보호 확인
  - `npm test`로 Order·Call·table session·권한 audit·구독 갱신·매출·앱 내 알림 계약 테스트 138개 통과
  - 해지 예약 구독은 billing key 존재 여부와 무관하게 재결제보다 기간 종료 만료를 우선하도록 순수 정책과 회귀 테스트로 고정
  - 실제 계정·이메일·결제·구독·주문 write가 필요한 최종 E2E는 `docs/customer-flow-qa.md`에 분리
- 직원 초대 Production E2E:
  - 사용자 승인 아래 기존 Owner·별도 직원 계정과 기존 활성 메뉴판으로 viewer 초대 이메일 발송·수락 완료
  - 직원 마이페이지 역할 배지, Owner-only 동선 숨김, 비공개 메뉴판 읽기 전용 미리보기 확인
  - 편집 route 직접 접근은 `menu-edit-forbidden`으로 차단되고 직원 관리 route는 데이터·mutation 없이 비활성 유지
- 선결제 PG 결정 감사:
  - 기존 PortOne V2 상품 결제와 음식점 주문 스키마의 재사용 가능·불가 경계를 분리
  - 음식점이 merchant of record라는 기존 계약을 유지하고, 독립 사업자별 하위 상점·MID·정산·Secret 구조는 PortOne 서면 확인 전까지 미확정
  - 플랫폼 고객사가 음식점 계좌·수수료·정산주기를 관리하는 파트너 정산 자동화와 오픈마켓 하위상점 전표 API를 대안으로 확인했지만, 음식점 직접 merchant 구조와 동일하게 취급하지 않음
  - 서버 검증·웹훅 서명·idempotency·default-off pilot 안전 계약과 구현 순서를 `docs/prepay-pg-decision.md`에 기록
- Order/Call 제품 계약과 잠금 상태 진입 셸

## 최근 주요 커밋과 PR

- `1c3fb77` — PR #70 병합: 다이닝 기능 등급·스마트호출 경계와 Order/PG 장기 비활성 정책
- `209ad6a` — PR #28 병합: default-off Call MVP와 Production migration 기록
- `f5038e7` — PR #27 병합: fail-closed 후불 주문관리
- `b8c9631` — PR #26 병합: atomic 후불 주문 runtime과 RPC
- `80a3897` — PR #25 병합: 후불 주문 schema Production 적용과 generated types 갱신
- `b2b0607` — PR #24 병합: one-time table QR PNG 다운로드
- `16f9673` — PR #23 병합: fail-closed table QR 방문 세션 runtime
- `e5ae414` — PR #22 병합: fail-closed 테이블 관리 runtime
- `63a05e6` — PR #21 병합: 테이블 QR·방문 세션 generated types 갱신
- `1f20762` — PR #20 병합: 테이블 QR·방문 세션 DB 기반
- `e3e021d` — PR #19 병합: 모바일 Order/Call 공통 진입 셸
- `e1af601` — PR #18 병합: 출시 템플릿 preview/public 격리 QA
- `41d8964` — PR #17 병합: 출시 템플릿 기능 stress QA
- `3ff49ea` — PR #16 병합: 출시 템플릿 4개 locale QA
- `bde6eb3` — PR #15 병합: 출시 템플릿 저장 round-trip
- `f81f331` — PR #14 병합: 출시 템플릿 서비스·편집 계약
- `bb55ed8` — PR #13 병합: 출시 템플릿 QA 기반
- `6aa1dcb` — PR #12 병합: 메뉴판 미리보기 기기 프레임
- `c8aba00` — PR #11 병합: 직원 write audit
- `17f0509` — PR #10 병합: 직원용 마이페이지 상세 경험
- `07f43ba` — PR #8 병합: 직원 초대 재전송·취소
- `868e8b0` — PR #6 병합: 직원 초대 UI와 이메일 전송
- `fd90673` — PR #5 병합: Owner-only runtime 방어
- `342b56a` — PR #3 병합: `agent/staff-menu-preview-access` → `tablescene-next`
- `98fb144` — PR #2 병합: `agent/staff-menu-list-access` → `tablescene-next`
- `8e9df47` — 직원 메뉴판 목록 접근과 역할 표시
- `ee77660` — PR #1 병합: `agent/staff-permissions-b1` → `tablescene-next`
- `72b41b5` — 직원 권한 공통 permission layer
- `ab6da4c` — 직원 권한 Phase A foundation
- `594b277` — 메뉴판 추가 구매 정책 문구 정렬
- `618afde` — 결제 프로비저닝 idempotency 보강
- `29c20de` — 추가 메뉴판 구매 요구사항 적용

## Production Supabase 적용 기록

다음 항목은 저장소 runbook에 Production 수동 적용 완료 기록이 있다.

- `20260830072554_add_aube_table_multi_page_fields.sql` — 2026-08-30 사용자 승인 아래 linked `tablescene-prod`에 SQL 파일 한 건만 직접 적용, 신규 객체 부재와 오브 테이블/Brew 고객 row 0건 precheck, 기존 메뉴판·페이지·코스·메뉴 row 수 불변, column·constraint·trigger·function 권한 postcheck와 generated types 갱신 완료. `docs/runbooks/aube-table-multi-page-migration.md`. 다시 실행 금지.
- `20260828105459_add_dining_single_multi_subscription_products.sql` — 2026-08-28 사용자 승인 아래 linked `tablescene-prod`에 SQL 파일 한 건만 직접 적용, 기존 구독 건수 불변과 기존·신규 상품 key 8개 제약 postcheck 완료. `docs/runbooks/dining-tier-pricing-migration.md`. 다시 실행 금지.
- `20260828143000_add_store_call_items.sql` — 2026-08-28 사용자 승인 아래 linked `tablescene-prod`에 SQL 파일 한 건만 직접 적용, 신규 객체 부재 precheck, RLS·grant·RPC·호출 집계 postcheck와 generated types 갱신 완료. `docs/runbooks/store-call-items-migration.md`. 다시 실행 금지.
- `20260828083457_grant_first_menu_welcome_credits.sql` — 2026-08-28 사용자 승인 아래 linked `tablescene-prod`에 SQL 파일 한 건만 직접 적용, 기존 AI 잔액·거래 집계 불변, 함수 보안·grant·부분 unique index postcheck와 generated types 갱신 완료. `docs/runbooks/ai-first-menu-welcome-credit-migration.md`. 다시 실행 금지.
- `20260828040033_add_shared_menu_catalog.sql` — 2026-08-28 사용자 승인 아래 linked `tablescene-prod`에 1회 적용, 기존 링크·catalog 행 0건, RLS·grant·RPC·trigger postcheck와 generated types 갱신 완료. `docs/runbooks/shared-menu-catalog-migration.md`. 다시 실행 금지.
- `20260806142627_add_call_mvp_foundation.sql` — 2026-08-07 linked Supabase Management API로 1회 적용, RLS·grant·RPC postcheck, security/performance advisor 및 generated types 갱신 완료. 다시 실행 금지.
- `20260806131244_add_submit_postpay_order_rpc.sql` — 2026-08-06 linked Supabase Management API로 1회 적용, function 보안·grant postcheck·advisor 및 generated types 갱신 완료. 다시 실행 금지.
- `20260806124512_add_postpay_order_foundation.sql` — 2026-08-06 linked Supabase Management API로 1회 적용, RLS·grant postcheck 및 generated types 갱신 완료. 다시 실행 금지.
- `20260806105623_add_table_qr_session_foundation.sql` — 2026-08-06 `tablescene-prod` SQL Editor에서 1회 적용 및 최소권한 사후 보정 완료. 다시 실행 금지.
- `20260805144618_add_menu_site_staff_access_foundation.sql` — 2026-08-06 SQL Editor에서 1회 적용 완료. 다시 실행 금지.
- `20260805103153_add_payment_provisioning_idempotency.sql` — 2026-08-05 SQL Editor 적용 완료.
- `20260729000508_add_menu_promotion_translations.sql` — 2026-07-29 SQL Editor 적용 완료.
- `20260728232933_add_menu_translation_job_recovery.sql` — 2026-07-28 SQL Editor 적용 완료.
- `20260728142935_add_menu_widget_translations.sql` — 2026-07-28 SQL Editor 적용 완료.
- `20260722093000_grant_menu_content_order_rpc_privileges.sql` — 2026-07-22 SQL Editor 적용 완료.
- `20260721170705_add_menu_page_content_order_rpc.sql` — 2026-07-21 SQL Editor 적용 완료.

Production의 실제 최신 상태는 변경될 수 있으므로, 새로운 Production 작업 전에는 해당 runbook의 read-only precheck를 다시 수행하고 사람의 승인을 받아야 한다.

## 현재 보류 중인 운영 작업

- 기존 불완전 주문 3건은 변경하지 않고 별도 read-only 운영 감사가 필요하다.
- PortOne에 음식점 직접 merchant와 ArtiMenu 플랫폼 하위 정산 모델의 PG 계약·전표 판매자·정산 책임을 서면 확인하고, 제품·법률·운영 모델과 첫 pilot 음식점을 정해야 한다.
- 회원가입·비밀번호 재설정 이메일의 실제 수신 확인
- Production 환경변수와 비밀키 확인
- Vercel Cron 설정 확인
- PortOne 실제 결제·취소·부분취소·환불 검증
- 약관 시행일과 프로모션 기간 확정
- Storage 권한 및 파일 삭제 정책의 Production 검토
- 최종 디자인 육안 확인과 최종 배포 승인

## 절대 자동 실행하지 않는 작업

- Production SQL 또는 이미 적용된 migration 재실행
- `supabase db push`, linked Production 대상 `supabase migration up`
- Production 고객 데이터 변경·삭제
- Storage hard delete
- 실제 결제·취소·부분취소·환불
- 실제 구독 상태 변경
- generated Supabase types 수동 편집
- 비밀키·Production 환경변수·SMTP/Auth 설정 변경
- `tablescene-next` 직접 push
- force push, 기존 커밋 amend
- Production/RLS/Storage policy·결제·실데이터 작업이 포함된 PR의 자동 병합

## 다음 개발 시작 위치

1. `docs/task-queue.md`에서 첫 번째 `TODO` 또는 `IN_PROGRESS` 작업을 확인한다.
2. 직원 권한 작업은 `docs/menu-site-staff-access-contract.md`를 제품 계약으로 사용한다.
3. 공통 권한 코드는 `lib/menu-site-permissions.ts`, `lib/menu-site-access-resolver.ts`, `lib/server/menu-site-access-service.ts`를 재사용한다.
4. Owner 소유 메뉴판과 활성 직원 membership 메뉴판의 통합 목록 및 역할 표시는 PR #2에서 구현·검증했다.
5. 직원 읽기 전용 미리보기 접근은 `agent/staff-menu-preview-access`에서 구현·검증했다.
6. Owner/Manager/Editor 메뉴 편집과 공개·위젯·번역·AI·미디어 권한 연결은 서버 권한 경계로 구현했다.
7. 실제 직원 계정 viewer E2E는 2026-08-07 사용자 승인 아래 기존 계정·메뉴판으로 완료했다. 화면 확인만을 위한 별도 Production 가짜 계정·메뉴판은 만들지 않았다.
8. Owner-only runtime 검증은 `docs/owner-only-runtime-audit.md`에 완료 기록했다.
9. 직원 초대 UI와 이메일 전송 코드는 feature gate 뒤에 구현했다. 실제 발송과 Production SMTP/Auth 설정은 사람 승인 전에 실행하지 않는다.
10. 초대 수락 화면은 HttpOnly intent cookie와 원자적 RPC로 연결했다.
11. 초대 재전송·취소는 Owner 재검증과 batch 단위 token rotation/revoke로 연결했다.
12. 직원 역할 변경과 접근 회수는 active membership 조건부 update와 audit로 연결했다.
13. 직원용 마이페이지 상세 경험은 역할별 기능 안내와 Owner-only 동선 분리로 완료했다.
14. 모든 직원 write 진입점은 공통 audit gate로 연결했다.
15. PC·태블릿·모바일 미리보기는 동일 renderer와 실제 iframe viewport를 재사용한다.
16. 활성 템플릿 QA와 모바일 Order/Call 공통 헤더 셸은 완료했다.
17. 테이블 QR·방문 세션 migration은 Production에 1회 적용했고 generated types를 갱신했다.
18. 테이블 관리와 안전한 QR token 발급은 default-off runtime으로 구현했다.
19. 공개 table QR 진입, server-validated 방문 세션, 생성·회전 직후 browser-local QR 다운로드를 같은 gate 뒤에 구현했다.
20. 후불 주문 V1 schema migration은 Production에 1회 적용했고 generated types를 갱신했다.
21. default-off 모바일 cart와 atomic 주문 제출 runtime을 구현했고 RPC migration Production 1회 적용과 generated types 갱신까지 완료했다. 실제 상품 SKU·가격·entitlement·Production gate 활성화는 별도 승인 전까지 보류한다.
22. 주문관리·미결제 취소·외부 수동 결제·영수증은 default-off runtime으로 구현했다. 실제 Order Dashboard 상품과 Production gate 활성화는 별도 승인 전까지 보류한다.
23. Call MVP와 기본 매출 요약은 기존 server-only 주문·호출 데이터와 명시적 permission/gate 뒤에 구현했다. Production gate와 실제 상품 활성화는 별도 승인 전까지 보류한다.
24. 주문·호출 앱 내 도착 알림은 dashboard에 이미 전달된 최소 ID만 sessionStorage에서 비교하며 별도 데이터 조회나 Production write를 만들지 않는다.
25. 전체 고객 흐름의 공개 route와 default-off 계약은 로컬에서 재검증했다. Order/Call 공통 gate와 독립 활성화도 로컬 fixture 및 계약 테스트로 연결했다. 남은 실제 E2E는 `docs/customer-flow-qa.md`의 사람 검증 목록을 따른다.
