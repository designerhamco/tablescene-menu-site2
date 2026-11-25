import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = process.env.PLAN_QA_BASE || 'http://127.0.0.1:3000';
const route = 'app/qa-menu-plan-change', output = '/private/tmp/menu-plan-change-ui';
await fs.mkdir(output, { recursive: true });
await fs.mkdir(route, { recursive: true });
await fs.writeFile(route + '/page.tsx', `import {notFound} from 'next/navigation';import Panel from '@/components/mypage/MenuPlanChangePanel';export default function QA(){if(process.env.NODE_ENV==='production')notFound();return <main><Panel subscriptionId="00000000-0000-4000-8000-000000000004"/></main>;}`);
const browser = await chromium.launch(), errors = [];
let passed = 0;
try {
  for (const width of [320, 390, 820, 1440]) for (const state of ['pending', 'processing', 'none']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message));
    let pending = state === 'none' ? null : { id: 'old-change', state, canCancel: state === 'pending', designId: 'cafe_mocha_forest_a', amount: 6800, effectiveAt: '2027-06-01T00:00:00.000Z' };
    let posts = 0, deletes = 0;
    await page.route('**/api/business-subscriptions/*/plan-change', async route => {
      const method = route.request().method();
      if (method === 'POST') { posts++; return route.abort(); }
      if (method === 'DELETE') { deletes++; assert.equal(route.request().postDataJSON().changeId, pending.id); pending = null; }
      return route.fulfill({ json: { ok: true, enabled: Boolean(pending), detail: { eligible: false, quotes: [], options: [{ id: 'cafe_mocha_forest_a', name: 'MELLOW' }], pending } } });
    });
    await page.goto(base + '/qa-menu-plan-change', { waitUntil: 'networkidle' });
    assert.equal(await page.getByRole('combobox').count(), 0);
    assert.equal(await page.getByRole('checkbox').count(), 0);
    if (pending) {
      await expect(page.getByText('2027년 6월 1일부터 월 6,800원')).toBeVisible();
      if (state === 'pending') {
        await page.getByRole('button', { name: '변경 예약 취소', exact: true }).click();
        await expect(page.getByRole('status')).toContainText('변경 예약을 취소했습니다.');
        assert.equal(deletes, 1);
      } else {
        await expect(page.getByText('기존 예약 결제 처리 중', { exact: true })).toBeVisible();
        assert.equal(await page.getByRole('region', { name: '기존 변경 예약' }).getByRole('button').count(), 0);
      }
    } else await expect(page.getByText('등록된 변경 예약이 없습니다.')).toBeVisible();
    assert.equal(posts, 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (width === 390) await page.screenshot({ path: `${output}/${state}.png`, fullPage: true });
    passed++; await page.close();
  }
  const context = await browser.newContext();
  const endpoint = base + '/api/business-subscriptions/00000000-0000-4000-8000-000000000004/plan-change';
  assert.equal((await context.request.get(endpoint)).status(), 401);
  assert.equal((await context.request.post(endpoint, { headers: { Origin: 'https://evil.example' }, data: {} })).status(), 403);
  assert.equal((await context.request.post(endpoint, { headers: { Origin: base }, data: {} })).status(), 401);
  assert.equal((await context.request.patch(base + '/api/menu-design', { headers: { Origin: base }, data: {} })).status(), 401);
  await context.close(); passed++;
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed, legacyReservationsOnly: true, realPayments: 0, productionWrites: 0 }));
} finally { await browser.close(); await fs.rm(route, { recursive: true, force: true }); }
