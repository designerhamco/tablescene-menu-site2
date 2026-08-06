# MenuLink 전체 작업 큐

최종 갱신: 2026-08-06

상태 의미:

- `TODO`: 아직 시작하지 않음
- `IN_PROGRESS`: 현재 작업 브랜치에서 진행 중
- `NEEDS_HUMAN`: Production 접근, 실제 결제, 디자인 또는 제품 결정이 필요함
- `BLOCKED`: 선행 작업 또는 외부 조건 때문에 진행할 수 없음
- `DONE`: 완료됨. 다시 구현하지 않음

## 1. 사장·직원 권한 시스템

- `DONE` 직원 권한 DB 기반과 `menu_site_members`, `menu_site_invitations`, `menu_site_audit_logs`
- `DONE` 초대 수락 RPC와 Phase A RLS/constraint/index/trigger
- `DONE` 역할별 permission matrix와 공통 menu-site access helper
- `DONE` 사장 소유 메뉴판과 활성 직원 membership 메뉴판 통합 서버 조회
- `DONE` 직원 역할 표시 view model과 마이페이지 목록 연결
- `DONE` `menu.read` 권한 기반 직원 목록 접근, Owner 우선, revoked 제외, 비활성 lifecycle 제외
- `DONE` 직원의 Owner/Staff 미리보기 접근
- `BLOCKED` 실제 직원 계정으로 역할 배지·버튼 숨김·읽기 전용 미리보기 E2E 확인 — 직원 초대·수락 기능 완료 후 진행하며, 확인용 Production 직원 데이터는 만들지 않음
- `DONE` Owner/Manager/Editor 메뉴 편집 action 연결
- `DONE` 공개·비공개 변경을 Owner/Manager로 제한
- `DONE` 결제·구독·환불·복구·추가 구매·보관·삭제의 Owner-only runtime 검증 — `docs/owner-only-runtime-audit.md`
- `TODO` 직원 초대 UI와 이메일 전송
- `TODO` 초대 수락 화면
- `TODO` 초대 재전송·취소
- `TODO` 직원 역할 변경과 접근 회수
- `TODO` 직원용 마이페이지 상세 경험
- `DONE` 이미지·동영상 Storage 권한 — Production Storage policy 변경 없이 권한 확인 후 서버 경계에서만 실행
- `DONE` 위젯·번역·AI 권한 연결 — AI 사용은 Owner 크레딧, 충전·결제 UI는 Owner-only
- `TODO` 감사 로그를 모든 직원 작업에 연결

## 2. 메뉴판 미리보기 기기 프레임

- `TODO` PC 프레임
- `TODO` 태블릿 프레임
- `TODO` 모바일 프레임
- `TODO` 기존 preview 화면과 renderer 재사용
- `TODO` 새 창에서 실제 크기 보기
- `DONE` 별도 scale 엔진을 만들지 않는 제품 정책 확정

## 3. 활성 템플릿 전체 기능 QA

- `TODO` 실제 활성 템플릿 목록 확정
- `TODO` 오브 커피
- `TODO` 모카 포레스트
- `TODO` 선데이 라인
- `TODO` 라운드 포커스
- `TODO` Brew Chapter
- `TODO` 기타 활성 템플릿
- `TODO` 위젯·디자인·폰트·배지·가격 옵션·품절·타임세일·이미지·커버 QA
- `TODO` 한국어·영어·중국어·일본어 QA
- `TODO` 생성·편집·최종 저장·preview·public QA
- `DONE` Display 별도 정책 유지 결정

## 4. 모든 활성 템플릿의 모바일 Order 호환

- `TODO` 공통 모바일 상단 헤더
- `TODO` 왼쪽 언어 변경
- `TODO` 가운데 매장명과 테이블 번호
- `TODO` 오른쪽 호출과 장바구니 및 장바구니 수량
- `TODO` 기존 카테고리 탭 충돌 방지
- `DONE` 주문은 모바일만 지원하는 정책
- `DONE` Display는 Order 미지원 정책
- `TODO` 유효한 테이블 방문 세션이 없을 때 주문·호출 숨김

## 5. 테이블 QR와 방문 세션

- `TODO` 테이블 관리
- `TODO` 일반 메뉴 QR과 테이블 주문 QR 분리
- `TODO` 안전한 QR token
- `TODO` 방문 세션과 만료
- `TODO` 세션 재사용·탈취 방지
- `TODO` 테이블 QR 다운로드

## 6. 모바일 장바구니와 후불 주문

- `TODO` 메뉴·옵션 선택과 수량
- `TODO` 장바구니와 요청사항
- `TODO` 테이블 번호와 주문 전송
- `TODO` 주문 당시 메뉴·가격 snapshot
- `TODO` 품절 주문 차단
- `TODO` 중복 주문 방지

## 7. 주문관리와 수동 결제

- `TODO` 주문 접수·조리 전·조리 중·조리 완료·제공 완료
- `TODO` 미결제 주문 취소와 취소 사유
- `TODO` 기존 카드단말기 결제완료
- `TODO` 현금 결제완료
- `TODO` 처리 직원 기록
- `TODO` 브라우저 영수증

## 8. Call 기능

- `TODO` 손님 호출과 호출 종류
- `TODO` 호출 목록과 담당 직원
- `TODO` 처리 완료
- `TODO` 중복 호출 방지
- `TODO` 호출 이력

## 9. 선결제 PG

- `TODO` 사업자별 PG 온보딩
- `TODO` 모바일 선결제
- `TODO` 웹훅과 idempotency
- `TODO` 결제 실패
- `TODO` 취소·부분취소·환불
- `TODO` 주문 상태와 결제 상태 분리
- `NEEDS_HUMAN` 실제 결제·취소·환불 검증

## 10. 매출관리와 알림

- `TODO` 일별·월별 매출과 주문 수
- `TODO` 메뉴별 판매량
- `TODO` 결제수단별 집계
- `TODO` 취소·미결제 집계
- `TODO` 주문 알림과 호출 알림
- `TODO` 알림톡 또는 후속 알림 채널

## 11. 전체 고객 흐름 QA

- `TODO` 회원가입·구매·메뉴판 생성
- `TODO` 직원 초대·수락·접근
- `TODO` 메뉴 편집·디자인·위젯·다국어
- `TODO` 미리보기·공개·일반 QR
- `TODO` 테이블 QR·방문 세션·주문
- `TODO` 주문관리·수동 결제완료
- `TODO` 보관·복구·해지

## 12. 오픈 준비

- `NEEDS_HUMAN` 회원가입·비밀번호 재설정·직원 초대 이메일 실제 발송
- `NEEDS_HUMAN` SMTP와 Auth 설정
- `NEEDS_HUMAN` Production 환경변수·비밀키
- `NEEDS_HUMAN` Vercel Cron
- `NEEDS_HUMAN` PortOne 실제 결제 확인
- `NEEDS_HUMAN` 약관 시행일과 프로모션 기간 확정
- `NEEDS_HUMAN` 최종 디자인 육안 확인
- `NEEDS_HUMAN` 최종 배포와 Draft PR 병합 승인

## 다음 작업

현재 PR을 완료한 다음 별도 브랜치에서 `직원 초대 UI와 이메일 전송`을 진행한다. 실제 이메일 발송·SMTP/Auth 설정·Production 작업은 사람 승인 전에 실행하지 않는다.
