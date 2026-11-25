import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const base = process.env.UNIFIED_QA_BASE || 'http://127.0.0.1:3200';
const publicOnly = process.env.UNIFIED_QA_PUBLIC_ONLY === '1';
const route = 'app/qa-unified-template-pricing', output = process.env.UNIFIED_QA_OUTPUT || '/private/tmp/artimenu-unified-pricing-qa';
await fs.mkdir(output, { recursive: true });
if (!publicOnly) {
  await fs.mkdir(route, { recursive: true });
  await fs.writeFile(route + '/page.tsx', `import {notFound} from 'next/navigation';import Form from '@/components/apply/ApplyOrderForm';import Switcher from '@/components/mypage/menu-editor/MenuDesignSwitcher';import {getAvailableTemplatesForService} from '@/lib/templates';export default async function QA({searchParams}:{searchParams:Promise<Record<string,string>>}){if(process.env.NODE_ENV==='production')notFound();const p=await searchParams;return <main className="site-checkout-page site-page-spacing-compact"><div className="site-container">{p.mode==='editor'?<Switcher menuId="00000000-0000-4000-8000-000000000004" current="cafe_design_a" service="basic" access="standard" industryCategory="japanese" basic/>:<Form templates={getAvailableTemplatesForService('basic')} userEmail="qa@example.invalid" userId="00000000-0000-4000-8000-000000000001" storeId="store-00000000-0000-4000-8000-000000000001" channelKey="channel-key-00000000-0000-4000-8000-000000000001" billingChannelKey="channel-key-00000000-0000-4000-8000-000000000002" mockEnabled={false} serviceType="menu" initialBasicProductKey={p.service==='dining'?'business_basic_multi_monthly':'business_basic_single_monthly'} initialTemplateKey={p.template} initialMenuDesignId={p.design}/>}</div></main>;}`);
}
const browser = await chromium.launch(), errors = [], writes = [], results = [];
async function createPage(width) {
  const p = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
  p.setDefaultNavigationTimeout(90000); p.setDefaultTimeout(20000);
  p.on('pageerror', error => errors.push(error.message));
  await p.route('**/api/**', route => {
    if (['GET', 'HEAD'].includes(route.request().method())) return route.continue();
    writes.push(route.request().url()); return route.abort();
  });
  return p;
}
try {
  for (const width of [390, 820, 1440]) {
    const p = await createPage(width);
    for (const path of ['/pricing', '/products/dining-single-monthly', '/products/dining-multi-monthly', '/templates/basic-first-column', '/templates/cafe_mocha_forest_a', '/templates/dining-full-page', '/templates/dining_aube_table_a', '/terms']) {
      const response = await p.goto(base + path, { waitUntil: 'networkidle' }); assert.equal(response.status(), 200, path);
      await p.evaluate(() => document.fonts.ready);
      const text = await p.locator('main').innerText();
      assert.doesNotMatch(text, /디자인 포함 이용권|디자인 이용권|기본 이용권|기본 디자인끼리|\+1,900|월 6,800원|월 7,800원|월 8,800원|월 10,800원/, path);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${path} ${width}: overflow`);
      if (path === '/pricing') { assert.deepEqual(await p.locator('.site-offer-price').allTextContents(), ['월 4,900원', '월 6,900원']); await p.screenshot({ path: `${output}/pricing-${width}.png`, fullPage: true }); }
      results.push({ path, width });
    }
    if (!publicOnly) {
      for (const [service, template, design, amount] of [['basic', 'cafe_design_a', 'basic-top-row', 4900], ['basic', 'cafe_mocha_forest_a', 'cafe_mocha_forest_a', 4900], ['dining', 'dining_aube_table_a', 'dining-full-page', 6900], ['dining', 'dining_aube_table_a', 'dining_aube_table_a', 6900]]) {
        await p.goto(`${base}/qa-unified-template-pricing?${new URLSearchParams({ service, template, design })}`, { waitUntil: 'networkidle' });
        const summary = p.locator('.site-checkout-sidebar');
        await expect(summary).toContainText('같은 서비스의 모든 템플릿');
        await expect(summary.locator('.site-checkout-summary-row[data-strong=true]')).toContainText(new Intl.NumberFormat('ko-KR').format(amount));
        assert.doesNotMatch(await p.locator('main').innerText(), /\+1,900|디자인 이용권|기본 디자인끼리/);
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        results.push({ checkout: design, width });
      }
      await p.goto(base + '/qa-unified-template-pricing?mode=editor', { waitUntil: 'networkidle' });
      const names = new Set();
      const next = p.getByRole('button', { name: '다음 페이지', exact: true }).filter({ visible: true });
      do {
        for (const name of await p.locator('.site-editor-template-card .type-item-title').allTextContents()) names.add(name);
        if (await next.isDisabled()) break;
        await next.click();
      } while (true);
      assert.ok(names.size >= 12, 'old standard access and an unrelated industry still show all Basic templates');
      assert.ok([...names].some(name => name.includes('MELLOW')));
      assert.ok([...names].some(name => name.includes('기본') || name.includes('고정형')));
      assert.ok(![...names].some(name => name.includes('MAREE')));
      results.push({ switcherTemplates: names.size, width });
    }
    await p.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
  console.log(JSON.stringify({ passed: results.length, results, errors, writes, realPayments: 0 }));
} finally {
  await browser.close();
  if (!publicOnly) await fs.rm(route, { recursive: true, force: true });
}
