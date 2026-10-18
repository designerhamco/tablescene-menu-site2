import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = process.env.GALLERY_BRAND_QA_BASE_URL || 'http://127.0.0.1:3007';
const output = process.env.GALLERY_BRAND_QA_OUTPUT || '/tmp/artimenu-gallery-brand-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 390, 430, 640, 768, 992, 1440, 2560]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(`${base}/apply`, { waitUntil: 'load' });
    assert.equal(response.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    const services = page.getByRole('tablist', { name: '서비스 및 페이지 유형 선택' });
    const categories = page.getByRole('group', { name: '업종 선택' });
    const states = [];

    for (const service of ['다이닝 원페이지', '다이닝 멀티페이지', '디스플레이']) {
      await services.getByRole('tab', { name: service, exact: true }).click();
      await page.mouse.move(0, 0);
      await expect(services.getByRole('tab', { selected: true })).toHaveCSS('background-color', 'rgb(21, 24, 30)');
      await expect(categories.getByRole('button', { pressed: true })).toHaveCSS('background-color', 'rgb(245, 197, 66)');

      const geometry = await page.locator('.site-template-grid').evaluate(grid => ({
        viewport: { width: innerWidth, height: innerHeight },
        overflow: document.documentElement.scrollWidth - innerWidth,
        columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        gap: getComputedStyle(grid).columnGap,
        cards: [...grid.children].map(card => {
          const media = card.querySelector('.site-template-media');
          const actions = card.querySelector('.site-template-actions');
          const title = card.querySelector('h2');
          const start = actions.querySelector('.site-button-accent');
          const titleStyle = getComputedStyle(title);
          const mediaRect = media.getBoundingClientRect();
          const startText = start && [...start.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
          const range = document.createRange();
          if (startText) range.selectNodeContents(startText);
          return {
            top: card.getBoundingClientRect().top,
            bottom: actions.getBoundingClientRect().bottom,
            ratio: mediaRect.width / mediaRect.height,
            titleSize: titleStyle.fontSize,
            titleWeight: titleStyle.fontWeight,
            action: start && { height: start.getBoundingClientRect().height, lines: range.getClientRects().length, href: start.getAttribute('href') },
          };
        }),
      }));
      assert.equal(geometry.viewport.width, width);
      assert.equal(geometry.overflow, 0);
      assert.equal(geometry.columns, width < 640 ? 1 : width < 992 ? 2 : 3);
      assert.equal(geometry.gap, '24px');
      for (const card of geometry.cards) {
        assert.equal(card.titleSize, '16px');
        assert.equal(card.titleWeight, '600');
        assert.ok(Math.abs(card.ratio - 4 / 3) < .01);
        if (card.action) {
          assert.equal(card.action.height, 32);
          assert.equal(card.action.lines, 1);
          const href = new URL(card.action.href, base);
          assert.ok(href.searchParams.get('template'));
          assert.equal(href.pathname, service === '디스플레이' ? '/apply/display' : '/apply/basic');
        }
      }
      for (let index = 0; index < geometry.cards.length; index += geometry.columns) {
        const row = geometry.cards.slice(index, index + geometry.columns);
        assert.ok(Math.max(...row.map(card => card.bottom)) - Math.min(...row.map(card => card.bottom)) < 1, 'actions share a row baseline');
      }
      if (service === '디스플레이' && !geometry.cards.some(card => card.action)) {
        await expect(page.getByText('신청 준비 중', { exact: true })).toHaveCount(geometry.cards.length);
      }
      for (const media of await page.locator('.site-template-media-light').all()) {
        await expect(media).toHaveCSS('outline-width', '1px');
        await expect(media).toHaveCSS('box-shadow', 'none');
      }
      states.push({ service, ...geometry });
    }

    await services.getByRole('tab', { name: '다이닝 원페이지', exact: true }).click();
    const cafe = categories.getByRole('button', { name: '카페·베이커리', exact: true });
    await cafe.click();
    await page.mouse.move(0, 0);
    await expect(cafe).toHaveAttribute('aria-pressed', 'true');
    await expect(cafe).toHaveCSS('background-color', 'rgb(245, 197, 66)');
    await cafe.hover();
    await expect(cafe).toHaveCSS('background-color', 'rgb(234, 181, 43)');
    await categories.getByRole('button', { name: '일식', exact: true }).click();
    await expect(page.getByText('일식 템플릿 준비 중', { exact: true })).toBeVisible();
    await categories.getByRole('button', { name: '전체', exact: true }).click();
    await expect(page.locator('.site-badge-accent')).toHaveCount(1);
    const rail = await categories.evaluate(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    if (rail.scrollWidth > rail.clientWidth) {
      await categories.getByRole('button').last().focus();
      assert.ok(await categories.evaluate(el => el.scrollLeft) > 0, 'keyboard focus scrolls the category rail');
    }
    const start = page.locator('.site-template-actions .site-button-accent').first();
    await page.keyboard.press('Tab');
    await start.focus();
    await expect(start).toHaveCSS('outline-style', 'solid');
    await expect(start).toHaveCSS('outline-color', 'rgb(11, 99, 206)');
    const consult = page.getByRole('link', { name: '커스텀 상담', exact: true });
    await page.mouse.move(0, 0);
    await expect(consult).toHaveCSS('background-color', 'rgb(245, 197, 66)');
    await expect(consult).toHaveAttribute('href', '/apply/custom');
    await expect(page.locator('.site-dark-cta')).toHaveCSS('background-color', 'rgb(21, 24, 30)');
    await page.locator('h1').click();
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: `${output}/gallery-${width}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    results.push({ viewport: states[0].viewport, states, pass: true });
    await page.close();
    console.log(`PASS gallery ${width}px`);
  }
} finally {
  await browser.close();
}
await writeFile(`${output}/gallery-results.json`, JSON.stringify(results, null, 2));
