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
  const html = render(h(AccountPageContent, { title: "내 메뉴판", sidebar: h("nav", null, "계정 메뉴"), children: h("h2", null, "직원 관리") }));
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /class="site-container"/);
  assert.ok(html.indexOf('aria-label="현재 위치"') < html.indexOf("<h1"));
  assert.match(html, /<h1[^>]*>내 메뉴판<\/h1>/);
  assert.ok(html.indexOf("<h1") < html.indexOf("계정 메뉴"));
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

test("compact menu records keep complete details and meaningful archive states without a repeated warning box", async () => {
  const { default: MenuSummaryCard } = await import("../components/mypage/MenuSummaryCard");
  const name = "아주 긴 메뉴판 이름 Very Long Store Menu";
  const html = render(h(MenuSummaryCard, {
    cardKey: "ended-menu", name, serviceLabel: "베이직", lifecycle: "deleted",
    thumbnail: h("span", null, "메뉴판 썸네일"), badges: h("span", null, "종료됨"),
    details: [{ label: "템플릿", value: "REAL MATCHA" }, { label: "이용 종료일", value: "2026. 11. 22." }],
    status: "보관 기간이 종료되어 복구할 수 없습니다.",
    billingHref: "/mypage?tab=payments&billingQuery=%2Fmenu%2Fended-menu", billingLabel: "결제내역",
  }));
  for (const text of [name, "REAL MATCHA", "2026. 11. 22.", "복구할 수 없습니다", "결제내역"]) assert.ok(html.includes(text), text);
  assert.match(html, /<article[^>]*aria-labelledby="menu-card-ended-menu"[^>]*data-menu-lifecycle="deleted"/);
  assert.doesNotMatch(html, /site-notice|site-menu-card-actions|편집하기|QR 관리/);
});

test("a card's billing link initializes the existing history search", () => {
  const html = render(h(BillingHistoryPanel, { entries: [entry], initialQuery: "/menu/shop-a" }));
  assert.match(html, /value="\/menu\/shop-a"/);
  assert.match(html, /가게 A/);
  assert.match(html, /결제 상세/);
});

test("menu card action rows preserve order, public navigation and disabled QR access", async () => {
  const { default: MenuSummaryCard } = await import("../components/mypage/MenuSummaryCard");
  const { default: MenuQrDownloadModal } = await import("../components/mypage/MenuQrDownloadModal");
  const html = render(h(MenuSummaryCard, {
    cardKey: "actions", name: "가게", serviceLabel: "다이닝", lifecycle: "active",
    thumbnail: h("span", null, "썸네일"), badges: null, details: [],
    actions: h("div", null, h("button", null, "편집하기"), h("button", null, "미리보기")),
    secondaryActions: h("div", null,
      h("a", { href: "/menu/shop", target: "_blank", rel: "noopener noreferrer" }, "공개 메뉴판 보기"),
      h(MenuQrDownloadModal, { menuSiteId: "menu", menuName: "가게", showIcon: false, disabled: true, disabledReason: "공개 후 이용할 수 있습니다." })),
  }));
  const labels = ["편집하기", "미리보기", "공개 메뉴판 보기", "QR 관리"];
  assert.deepEqual(labels.map(label => html.indexOf(label)), labels.map(label => html.indexOf(label)).sort((a, b) => a - b));
  assert.match(html, /<p class="type-caption site-copy-muted">다이닝<\/p>/);
  assert.doesNotMatch(html, /site-menu-card-meta|주소 복사/);
  assert.match(html, /href="\/menu\/shop" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /disabled="" title="공개 후 이용할 수 있습니다\."/);
  const qr = render(h(MenuQrDownloadModal, { menuSiteId: "menu", menuName: "가게", showIcon: false }));
  assert.match(qr, /QR 관리/);
  assert.match(qr, /aria-haspopup="dialog"/);
  assert.doesNotMatch(qr, /<svg/);
  const ended = render(h(MenuSummaryCard, {
    cardKey: "ended-actions", name: "종료", serviceLabel: "디스플레이", lifecycle: "deleted",
    thumbnail: null, badges: null, details: [], actions: h("button", null, "편집하기"), secondaryActions: h("button", null, "QR 관리"),
  }));
  assert.doesNotMatch(ended, /편집하기|QR 관리/);
});
