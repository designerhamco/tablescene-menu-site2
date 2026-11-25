import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Use the real service/presentation mutation with an isolated in-memory adapter.
// Neither this script nor its bundle contains a production DB/payment client.
const bundle = '/private/tmp/artimenu-unified-template-service-qa.mjs';
await build({ entryPoints: ['lib/server/menu-plan-design-service.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'esm', tsconfig: 'tsconfig.json', logLevel: 'silent', plugins: [{ name: 'isolated-admin', setup(b) {
  b.onResolve({ filter: /^server-only$/ }, () => ({ path: 'server-only', namespace: 'isolated' }));
  b.onResolve({ filter: /supabase\/admin$/ }, () => ({ path: 'admin', namespace: 'isolated' }));
  b.onLoad({ filter: /.*/, namespace: 'isolated' }, args => ({ contents: args.path === 'admin' ? 'export function createAdminClient(){throw new Error("Production adapter forbidden in QA")}' : 'export {};' }));
} }] });
const { switchContractMenuDesign, getMenuPlanEntitlement } = await import(pathToFileURL(bundle).href);
let passed = 0;
const fixture = (overrides = {}) => ({
  site: { id: 'menu', user_id: 'owner', slug: 'customer-qr', template_key: 'cafe_design_a', brand_color: '#456789', updated_at: '2026-11-01T00:00:00Z', settings: { menu_design_id: 'basic-top-row', enabled_locales: ['ko', 'en'], order: { enabled: true }, typography: { english_font_key: 'carme' } }, page_settings: { menu_cover_enabled: true, design: { decorations: { categoryUnderline: { visible: true, width: 2, style: 'dashed' } } } }, ...overrides.site },
  subscription: { id: 'sub', user_id: 'owner', menu_site_id: 'menu', product_key: 'business_basic_single_monthly', status: 'active', current_period_end: '2099-01-01T00:00:00Z', trial_ends_at: null, menu_design_access: 'standard', menu_plan_version: null, amount: 4900, ...overrides.subscription },
});
function adapter(data, options = {}) {
  const writes = [];
  const admin = { from(table) {
    assert.ok(['business_subscriptions', 'menu_sites'].includes(table));
    let fields = [], patch;
    const chain = { select() { return chain; }, eq(key, value) { fields.push(row => row[key] === value); return chain; }, in(key, values) { fields.push(row => values.includes(row[key])); return chain; }, order() { return chain; }, limit() { return chain; }, update(value) { assert.equal(table, 'menu_sites'); patch = value; return chain; }, async maybeSingle() {
      if (options.readError && !patch) return { data: null, error: { code: 'SIMULATED_READ_ERROR' } };
      const row = table === 'menu_sites' ? data.site : data.subscription;
      if (!fields.every(filter => filter(row)) || patch && options.conflict) return { data: null, error: null };
      if (patch) { writes.push(structuredClone(patch)); Object.assign(row, structuredClone(patch)); }
      return { data: structuredClone(row), error: null };
    }, single() { return chain.maybeSingle(); } };
    return chain;
  } };
  return { admin, writes };
}
try {
  const data = fixture(), original = structuredClone(data), { admin, writes } = adapter(data);
  assert.equal((await getMenuPlanEntitlement(admin, 'menu', 'owner')).access, 'all');
  await switchContractMenuDesign(admin, 'owner', 'menu', 'cafe_mocha_forest_a');
  assert.equal(data.site.template_key, 'cafe_mocha_forest_a');
  assert.equal(data.site.slug, original.site.slug);
  assert.deepEqual(data.site.settings.order, original.site.settings.order);
  assert.deepEqual(data.site.settings.enabled_locales, original.site.settings.enabled_locales);
  assert.equal(data.site.page_settings.menu_cover_enabled, true);
  assert.deepEqual(data.subscription, original.subscription, 'no tier, amount, product or billing-cycle writes');
  assert.deepEqual(Object.keys(writes[0]).sort(), ['brand_color', 'page_settings', 'settings', 'template_category', 'template_key', 'updated_at']);
  await switchContractMenuDesign(admin, 'owner', 'menu', 'basic-top-row');
  assert.deepEqual(data.site.page_settings.design, original.site.page_settings.design);
  assert.deepEqual(data.site.settings.typography, original.site.settings.typography);
  assert.equal(data.site.brand_color, original.site.brand_color);
  passed++;
  for (const [override, user, target, flags] of [
    [{}, 'foreign', 'cafe_mocha_forest_a'],
    [{ subscription: { current_period_end: '2020-01-01T00:00:00Z' } }, 'owner', 'cafe_mocha_forest_a'],
    [{ subscription: { status: 'past_due' } }, 'owner', 'cafe_mocha_forest_a'],
    [{}, 'owner', 'dining-full-page'], [{}, 'owner', 'display_menu_a'], [{}, 'owner', 'basic-center-column'],
    [{}, 'owner', 'cafe_mocha_forest_a', { readError: true }], [{}, 'owner', 'cafe_mocha_forest_a', { conflict: true }],
  ]) {
    const current = fixture(override), before = structuredClone(current), isolated = adapter(current, flags);
    await assert.rejects(() => switchContractMenuDesign(isolated.admin, user, 'menu', target));
    assert.deepEqual(current, before); assert.equal(isolated.writes.length, 0); passed++;
  }
  const dining = fixture({ site: { template_key: 'dining_aube_table_a', settings: { menu_design_id: 'dining-full-page', order: { enabled: true } } }, subscription: { product_key: 'business_basic_multi_monthly' } });
  const diningAdmin = adapter(dining);
  await switchContractMenuDesign(diningAdmin.admin, 'owner', 'menu', 'dining_aube_table_b');
  assert.equal(dining.site.template_key, 'dining_aube_table_b'); assert.equal(dining.subscription.amount, 4900); passed++;
  const display = fixture({ site: { template_key: 'display_menu_a', settings: { menu_design_id: 'display_menu_a' } }, subscription: { product_key: 'business_display_monthly' } });
  assert.equal((await getMenuPlanEntitlement(adapter(display).admin, 'menu', 'owner')).service, 'display'); passed++;
  console.log(JSON.stringify({ passed, simulatedDatabase: true, productionWrites: 0, realPayments: 0 }));
} finally { await fs.rm(bundle, { force: true }); }
