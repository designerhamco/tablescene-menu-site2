# 메뉴판 디자인 이용권 — 2026-10-21

## 적용 범위

- `/apply`의 베이직·다이닝은 기본 디자인(리스트/앨범)과 디자인 템플릿(업종)을 구분한다. 목록·상세·신청서가 같은 카탈로그와 가격표를 읽는다. 디스플레이는 준비 중을 유지한다.
- 기본 디자인은 베이직 6종, 다이닝 4종이다. 디자인 템플릿은 기존 베이직 7종·다이닝 2종이며 기존 렌더러/모바일 정책은 유지한다.
- 신규 월구독: 베이직 기본 4,900/5,900원, 디자인 포함 6,800/7,800원. 다이닝 기본 6,900/8,900원, 디자인 포함 8,800/10,800원(얼리버드/정상가).
- 한 메뉴판당 한 구독이다. `standard`는 같은 서비스의 기본 디자인, `all`은 기본·디자인 템플릿을 교체할 수 있다. 다른 서비스로의 교체는 차단한다.
- 서버가 선택 디자인과 이용권·프로모션·청구 금액을 재검증한다. 새 이용권은 첫 청구 전에 구독 준비 행에 저장한다. 갱신 cron은 기존과 같이 저장된 계약 금액을 사용한다.
- 디자인 교체는 소유자와 유효한 DB 구독을 확인한다. 메뉴·분류·페이지·사진·공개 주소를 재생성하지 않는다. 색상/서체/모양은 디자인별로 보관하고 복귀 시 복원한다.
- 기존 NULL 이용권 계약과 개인 체험 전환 흐름은 종전 계약을 유지한다. 기존 고객의 요금·갱신·데이터를 자동 이관하지 않는다. 기존 계약 이관, 구독 중 이용권 업/다운그레이드·차액 결제는 별도 후속 정책이다.
- 좋아요는 확인된 로그인 계정의 사용자 메타데이터에 공개 카탈로그 ID만 저장한다. 이용권 판단에는 사용하지 않는다. 로그인 전 클릭은 현재 목록 위치를 보존해 로그인으로 안내한다.

## 운영 DB 적용 상태

Approved migration `20261021122057_add_menu_design_subscription_contract.sql` was applied once to Production `tablescene-prod` in the authenticated SQL Editor on 2026-10-21. No historical migrations were replayed.

- Before/after: 24 subscriptions, total stored amount KRW 509,400, identical ordered ID/amount fingerprint `ef7b898c90315b8eedcb1c864c9884c7`. All 24 legacy contracts retain NULL in the three new fields.
- Verified: three nullable text columns, one validated CHECK, one enabled guard, empty function search path, no anon/authenticated EXECUTE privilege, and RLS enabled. Security Advisor rerun reports 0 errors; its 23 existing warnings remain unchanged. The application service-role Data API also reads the columns successfully. No real payment or refund was executed.
- Browser login does not authenticate the CLI. Instead of regenerating the complete schema through an unavailable CLI session, the three verified nullable fields were synchronized into Row/Insert/Update of the existing DB types.

SQL은 임시 PGlite DB에서 기존 금액/NULL 계약 보존, 유효한 교체, 위조 설정/교차 서비스 차단, 함수 권한을 확인했다. 실결제·환불은 실행하지 않았다.

1. 운영 프로젝트 `kfbekbapwsyeanobyjsv` 로그인 확인 후 컬럼/함수/트리거가 없는지, 구독 건수와 금액 합계를 읽기 전용으로 기록한다.
2. 승인된 **파일 한 건만** 적용한다. `db push`, linked `migration up` 또는 과거 migration 재실행은 금지한다.

   ```sh
   supabase db query --linked --project-ref kfbekbapwsyeanobyjsv --file supabase/migrations/20261021122057_add_menu_design_subscription_contract.sql
   ```

3. 컬럼 3개, 제약, 트리거, 함수 실행 권한을 확인하고 기존 구독 건수·금액 및 기존 계약 NULL 보존을 비교한다.
4. Verify the applied schema, synchronize DB types and rerun type checking, tests and build. Full generation with `npm run supabase:types` remains available with separate CLI authentication.
5. 승인한 앱 변경을 Production에 배포한 뒤 공개 목록·상세·로그인 보호·신규 계약 저장 경로를 확인한다. 실제 카드 검증은 별도 승인/전용 QA로 진행한다.

## 검수

- 로컬 단위 검증 727개, TypeScript, 변경 파일 ESLint, 최적화 빌드 통과. 첫 빌드의 기존 Webpack 캐시 오류는 이전 캐시를 `/private/tmp`로 보관하고 재빌드해 해결했다. 실제 요청 너비 320/390/430/820/1024/1440px의 브라우저 검사 6건이 통과했다.
- 실제 신청서의 베이직 기본/디자인 포함·다이닝 기본/디자인 포함 요약은 별도 렌더링 검사에서 각각 4,900/6,800/6,900/8,800원과 선택한 디자인명을 표시했다. 카드 발급·과금은 실행하지 않았다.

- `lib/catalog-design-contract.test.ts`: 서비스/렌더러/가격 조합, 낮은 금액의 프로모션 재사용 차단, 접근 범위, 좋아요 정규화, 디자인 복원 및 공개 Host 기반 요청 검증.
- `scripts/qa-catalog-design-access.mjs`: 실제 320/390/430/820/1024/1440px 목록 분류·가격·이미지·가로 넘침·키보드·상세/신청 연결. 좋아요 UI 왕복은 모의 API를 사용하고 서버의 비로그인 차단은 실제 경로를 확인한다. 운영 계정 저장·결제는 이 검사에서 실행하지 않는다.
- 기본 디자인 썸네일은 실제 렌더러에서 1200×900으로 촬영했다. 다이닝 앨범형은 코스가 아닌 단품 페이지의 실제 배열을 보여준다.

- 최종 공개 안내 정합성: 신청서 동의·상품 상세·요금제·FAQ·약관·AI 상담 안내를 메뉴판별 이용권 정책으로 맞췄다. 일반 신청 진입은 기본 디자인 금액을 선택하며, 명시한 디자인 템플릿 진입은 디자인 포함 금액을 유지한다. 결제 동의 기록에는 서버에서 확인한 이용권 계약을 함께 보관한다.
- 요금·상품 2종·FAQ·약관의 실제 390/1440px 10개 화면은 정상 응답, 가로 넘침 없음, 기본 신청 링크와 새 정책 안내 일치를 확인했다.
