import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260914074800_add_staff_permission_overrides.sql",
    import.meta.url,
  ),
  "utf8",
);
const staffPage = readFileSync(new URL("../app/mypage/staff/page.tsx", import.meta.url), "utf8");
const accessService = readFileSync(
  new URL("./server/menu-site-access-service.ts", import.meta.url),
  "utf8",
);
const membershipService = readFileSync(
  new URL("./server/staff-membership-management-service.ts", import.meta.url),
  "utf8",
);

test("직원별 권한은 검증된 JSON만 저장하고 사장 전용 권한을 허용하지 않는다", () => {
  assert.match(migration, /add column if not exists permission_overrides jsonb not null/);
  assert.match(migration, /private\.is_valid_menu_site_permission_overrides/);
  assert.match(migration, /'menu\.edit'/);
  assert.match(migration, /'call\.manage'/);
  assert.doesNotMatch(migration, /'billing\.manage'/);
  assert.doesNotMatch(migration, /'staff\.manage'/);
  assert.doesNotMatch(migration, /'menu\.archive'/);
  assert.doesNotMatch(migration, /'menu\.read'/);
  assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/);
});

test("직원 역할·개별 권한 변경과 감사 기록은 하나의 service-role 트랜잭션으로 처리한다", () => {
  assert.match(migration, /function public\.update_menu_site_member_access/);
  assert.match(migration, /security definer[\s\S]*set search_path = ''/);
  assert.match(migration, /auth\.role\(\) <> 'service_role'/);
  assert.match(migration, /for update/);
  assert.match(migration, /insert into public\.menu_site_audit_logs/);
  assert.match(migration, /grant execute on function public\.update_menu_site_member_access[\s\S]*to service_role/);
  assert.ok((membershipService.match(/\.rpc\(\s*"update_menu_site_member_access"/g) ?? []).length === 2);
});

test("직원 관리 화면은 역할 프리셋과 개별 권한을 함께 제공한다", () => {
  assert.match(staffPage, /직원별 권한/);
  assert.match(staffPage, /개별 권한 저장/);
  assert.match(staffPage, /결제·구독, 직원 관리, 메뉴판 보관·삭제는 사장만/);
  assert.match(staffPage, /permission_overrides/);
});

test("접근 서비스는 저장된 개별 권한을 단일 메뉴와 목록 양쪽에서 해석한다", () => {
  assert.ok((accessService.match(/permission_overrides/g) ?? []).length >= 6);
  assert.match(accessService, /permissionOverrides: data\.permission_overrides/);
  assert.match(accessService, /permissions: entry\.permissions/);
});
