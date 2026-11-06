import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ContentPanel } from "../app/components/ui/content-panel";
import { DetailGrid, DetailField } from "../app/components/ui/detail-grid";
import { CheckboxField, CheckboxFieldGroup } from "../app/components/ui/checkbox-field";
import AccountPageContent from "../components/mypage/AccountPageContent";
import BillingHistoryPanel, { type BillingHistoryEntry } from "../components/mypage/BillingHistoryPanel";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const render = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(h(AppRouterContext.Provider, { value: { push() {}, refresh() {} } as never }, element));

test("account shell owns exactly one shared title boundary before the sidebar and content", () => {
  const html = render(h(AccountPageContent, { sidebar: h("nav", null, "계정 메뉴"), children: h("h2", null, "직원 관리") }));
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /class="site-container"/);
  assert.ok(html.indexOf("마이페이지") < html.indexOf("계정 메뉴"));
  assert.ok(html.indexOf("계정 메뉴") < html.indexOf("직원 관리"));
  for (const path of ["app/mypage/page.tsx", "app/mypage/staff/page.tsx"]) {
    assert.match(read(path), /<AccountPageContent sidebar=/);
    assert.doesNotMatch(read(path), /site-gutter site-page-spacing-compact/);
  }
});

test("detail fields retain semantic labels and unshortened values on one shared surface", () => {
  const html = render(h(ContentPanel, null, h(DetailGrid, { columns: 3, children: [
    h(DetailField, { key: "email", label: "로그인 이메일", children: "a-very-long-account-address@example.com" }),
    h(DetailField, { key: "id", label: "사용자 ID", full: true, children: "account-1234567890" })] })));
  assert.match(html, /<dl class="site-detail-grid" data-columns="3">/);
  assert.match(html, /<dt[^>]*>로그인 이메일<\/dt><dd[^>]*>a-very-long-account-address@example.com<\/dd>/);
  assert.match(html, /data-full="true"/);
  assert.equal((html.match(/class="site-content-panel"/g) ?? []).length, 1);
});

test("staff checkbox fields preserve native submission names, values, defaults and disabled fieldsets", () => {
  const html = render(h("form", null, h("fieldset", { disabled: true }, h(CheckboxFieldGroup, { label: "초대할 메뉴판", children: [
    h(CheckboxField, { key: "a", name: "menuSiteIds", value: "menu-a", defaultChecked: true, label: "가게 A", description: "/menu/shop-a" }),
    h(CheckboxField, { key: "b", name: "menuSiteIds", value: "menu-b", label: "가게 B" }),
  ] }))));
  assert.match(html, /<fieldset disabled="">/);
  assert.match(html, /role="group" aria-label="초대할 메뉴판"/);
  assert.match(html, /<input[^>]*type="checkbox"[^>]*name="menuSiteIds"[^>]*checked=""[^>]*value="menu-a"/);
  assert.match(html, /<input[^>]*name="menuSiteIds"[^>]*value="menu-b"/);
  assert.match(html, /가게 A/);
  assert.match(html, /\/menu\/shop-a/);
  const staff = read("app/mypage/staff/page.tsx");
  assert.match(staff, /defaultChecked=\{effectivePermissions.has\(permission\)\}/);
  for (const action of ["updateStaffMembershipRoleAction", "updateStaffMembershipPermissionsAction", "revokeStaffMembershipAction", "resendStaffInvitationAction", "cancelStaffInvitationAction"]) {
    assert.match(staff, new RegExp(`action=\\{${action}\\}`));
  }
});

const entry: BillingHistoryEntry = {
  id: "payment-1", productName: "아티메뉴 베이직", productKey: "basic-monthly", serviceType: "basic", serviceTypeLabel: "베이직·다이닝", billingMethod: "monthly", billingMethodLabel: "월결제", paymentMethod: "card", paymentMethodLabel: "카드 결제", statusBucket: "paid", statusLabel: "결제 완료", statusTone: "success", serviceStatusBucket: "active", serviceStatusLabel: "이용 중", serviceStatusTone: "success", paymentStatusBucket: "paid", paymentStatusLabel: "결제 완료", paymentStatusTone: "success", paidAt: "2026-11-01T00:00:00Z", paidAtLabel: "2026. 11. 01.", amountLabel: "₩9,900", originalAmountLabel: "₩9,900", refundAmountLabel: "₩1,000", pgLabel: "PG", paymentIdLabel: "payment-1", menuName: "가게 A", menuSlug: "shop-a", menuPath: "/menu/shop-a", renewalLabel: "다음 결제일", renewalDateLabel: "2026. 12. 01.", supportMessage: "구독 상태 안내",
};

test("billing records render every existing field and action at management body size instead of catalog card size", () => {
  const html = render(h(BillingHistoryPanel, { entries: [entry] }));
  for (const text of ["아티메뉴 베이직", "2026. 11. 01.", "가게 A", "/menu/shop-a", "월결제", "₩9,900", "결제 완료", "2026. 12. 01.", "정기결제", "환불금액", "₩1,000", "카드 결제", "구독 상태 안내", "결제 상세"]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /site-record-card-main|site-record-card\b|site-offer-body/);
  assert.match(html, /site-detail-grid/);
  assert.match(html, /site-field-grid/);
  assert.match(html, /결제 시작일/);
  assert.match(html, /필터 초기화/);
});

test("shared layouts define bounded columns and wrapping; favorites add no empty status row", () => {
  const css = read("styles/site-spacing.css");
  assert.match(css, /\.site-detail-field > :is\(dt, dd\)[^}]*overflow-wrap: anywhere/);
  assert.match(css, /@media \(min-width: 640px\)[^]*?\.site-detail-grid/);
  assert.match(css, /\.site-content-panel\[data-surface="danger"\] \{ border: 0; background: var\(--ui-error-surface\)/);
  assert.match(read("components/mypage/FavoriteTemplates.tsx"), /message \? <p role="status"/);
  assert.match(read("components/mypage/FavoriteTemplates.tsx"), /site-catalog-results site-stack-group/);
});
