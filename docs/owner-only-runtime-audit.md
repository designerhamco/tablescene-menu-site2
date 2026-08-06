# Owner-only runtime audit

최종 검토: 2026-08-06

## 목적

직원 membership이 있는 사용자가 메뉴판 소유자의 결제·구독·환불·복구·추가 구매·보관·삭제 자원을 직접 요청으로 조작하지 못하도록 runtime 경계를 확인한다.

## 결론

- 모든 민감한 요청은 `auth.getUser()`의 현재 사용자 ID를 사용한다.
- 구독·환불·복구 서비스는 자원 ID와 `user_id` 소유권을 함께 조건으로 조회한다.
- 공통 `isOwnerRuntimeActor` 검사로 조회 후에도 actor ID와 resource owner ID가 정확히 같은지 다시 확인한다.
- 직원 목록·편집 권한은 이 Owner-only 경계를 통과시키지 않으며, 소유자의 민감한 자원 ID를 넣은 요청은 자원 없음으로 실패한다.

## 경로별 확인

| 범위 | runtime 경계 | 결과 |
| --- | --- | --- |
| 구독 상세·해지·해지 취소 | `business_subscriptions.id` + `user_id` 조회, 수정에도 `user_id` 조건 | Owner-only |
| 연결제 환불 견적·확정 | 구독과 결제 모두 현재 `user_id`로 조회, QA flag 유지 | Owner-only |
| 보관 메뉴판 복구 preflight·결제 | `menu_sites.id` + `user_id`, 사업자 프로필 `user_id`, 최종 update에도 `user_id` 조건 | Owner-only |
| 신규·추가 구매 | 결제·구독·메뉴판 생성 레코드를 현재 사용자 `user_id`로 생성, 기존 자원 연결 시 `user_id` 조건 | 다른 Owner 자원 조작 불가 |
| 보관·삭제 | 사용자 편집 action은 `archived` 전환 불가, lifecycle cron은 cron secret 경계, 계정 삭제는 현재 사용자 `user_id` 범위 | Owner/operation-only |

## 자동 검증

- `lib/owner-runtime-access.test.ts`: 정확한 Owner ID만 통과하고 직원·빈 ID·누락 자원은 fail closed.
- `lib/menu-site-permissions.test.ts`: Owner/Manager/Editor 편집 권한과 Owner/Manager 공개 권한을 Owner-only commerce 권한과 분리.

Production SQL, 실데이터, Auth, RLS, Storage policy, 실제 결제·환불·구독 상태는 변경하지 않았다.
