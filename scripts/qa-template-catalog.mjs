import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = process.env.CATALOG_QA_BASE_URL || 'http://127.0.0.1:3007';
const output = process.env.CATALOG_QA_OUTPUT || '/tmp/artimenu-catalog-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 390, 430, 640, 768, 992, 1024, 1280, 1440, 2560]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(`${base}/apply`, { waitUntil: 'load' });
    assert.equal(response.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    const services = page.getByRole('tablist', { name: '서비스 및 페이지 유형 선택' });
    const categories = page.getByRole('group', { name: '업종 선택', exact: true });
    const circleCategories = page.getByRole('group', { name: '모바일 업종 선택', exact: true });
    const categorySelect = page.getByRole('combobox', { name: '업종 선택' });
    if (width >= 1024) {
      await expect(categories).toBeVisible();
      await expect(categorySelect).toBeHidden();
    } else if (width >= 768) {
      await expect(categories).toBeHidden();
      await expect(circleCategories).toBeHidden();
      await expect(categorySelect).toBeVisible();
      await expect(categorySelect.locator('option')).toHaveCount(6);
    } else {
      await expect(categories).toBeHidden();
      await expect(categorySelect).toBeHidden();
      await expect(circleCategories).toBeVisible();
      await expect(circleCategories.getByRole('button')).toHaveCount(6);
      await expect(circleCategories.locator('.site-category-circle').first()).toHaveCSS('border-top-left-radius', '50%');
      await expect(circleCategories.getByRole('button', { pressed: true }).locator('.site-category-circle')).toHaveCSS('background-color', 'rgb(21, 24, 30)');
    }
    const selectCategory = async (name, value) => width >= 1024
      ? categories.getByRole('button', { name, exact: true }).click()
      : width >= 768 ? categorySelect.selectOption(value)
      : circleCategories.getByRole('button', { name, exact: true }).click();
    const states = [];
    for (const service of ['다이닝 원페이지', '다이닝 멀티페이지', '디스플레이']) {
      await services.getByRole('tab', { name: service, exact: true }).click();
      await page.mouse.move(0, 0);
      await expect(services.getByRole('tab', { selected: true })).toHaveCSS('background-color', 'rgb(21, 24, 30)');
      await page.locator('.site-catalog-image').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      const geometry = await page.locator('.site-template-grid').evaluate(grid => ({
        viewport: { width: innerWidth, height: innerHeight },
        overflow: document.documentElement.scrollWidth - innerWidth,
        columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        gap: getComputedStyle(grid).columnGap,
        cards: [...grid.children].map(card => {
          const media = card.querySelector('.site-template-media');
          const actions = card.querySelector('.site-template-actions');
          const title = card.querySelector('h2');
          const start = actions.querySelector('.site-template-start-link');
          const image = card.querySelector('img');
          const style = getComputedStyle(title);
          const rect = media.getBoundingClientRect();
          const range = document.createRange();
          const text = start && [...start.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
          if (text) range.selectNodeContents(text);
          return {
            bottom: actions.getBoundingClientRect().bottom,
            ratio: rect.width / rect.height,
            radius: getComputedStyle(media).borderTopLeftRadius,
            titleSize: style.fontSize, titleWeight: style.fontWeight,
            align: style.textAlign,
            image: { loaded: image.complete && image.naturalWidth > 0, src: image.getAttribute('src') },
            action: start && { height: start.getBoundingClientRect().height, lines: range.getClientRects().length, href: start.getAttribute('href'), background: getComputedStyle(start).backgroundColor },
          };
        }),
      }));
      assert.equal(geometry.viewport.width, width);
      assert.equal(geometry.overflow, 0);
      assert.equal(geometry.columns, width < 640 ? 1 : width < 1280 ? 2 : 3);
      assert.equal(geometry.gap, '24px');
      for (const card of geometry.cards) {
        assert.equal(card.titleSize, '16px'); assert.equal(card.titleWeight, '600');
        assert.equal(card.radius, '16px'); assert.notEqual(card.align, 'center');
        assert.ok(Math.abs(card.ratio - 4 / 3) < .01);
        assert.ok(card.image.loaded); assert.ok(card.image.src.includes('template-previews'));
        if (card.action) {
          assert.equal(card.action.height, 32); assert.equal(card.action.lines, 1);
          assert.equal(card.action.background, 'rgba(0, 0, 0, 0)');
          const href = new URL(card.action.href, base);
          assert.ok(href.searchParams.get('template'));
          assert.equal(href.pathname, service === '디스플레이' ? '/apply/display' : '/apply/basic');
        }
      }
      for (let i = 0; i < geometry.cards.length; i += geometry.columns) {
        const row = geometry.cards.slice(i, i + geometry.columns);
        assert.ok(Math.max(...row.map(card => card.bottom)) - Math.min(...row.map(card => card.bottom)) < 1);
      }
      states.push({ service, ...geometry });
    }
    await services.getByRole('tab', { name: '다이닝 원페이지', exact: true }).click();
    const pages = page.getByRole('navigation', { name: '템플릿 페이지' });
    await expect(page.locator('.site-template-selection-card')).toHaveCount(6);
    await expect(pages.getByRole('button', { name: '첫 템플릿 페이지', exact: true })).toBeDisabled();
    await expect(pages.getByRole('button', { name: '이전 템플릿 페이지', exact: true })).toBeDisabled();
    await pages.getByRole('button', { name: '다음 템플릿 페이지', exact: true }).click();
    await expect(page.locator('.site-template-selection-card')).toHaveCount(1);
    await expect(page.locator('.site-template-title')).toHaveText('ROSY ORANGE');
    await expect(pages.getByRole('button', { name: '2페이지', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(pages.getByRole('button', { name: '다음 템플릿 페이지', exact: true })).toBeDisabled();
    await expect(pages.getByRole('button', { name: '마지막 템플릿 페이지', exact: true })).toBeDisabled();
    await pages.getByRole('button', { name: '첫 템플릿 페이지', exact: true }).click();
    await pages.getByRole('button', { name: '마지막 템플릿 페이지', exact: true }).click();
    await pages.getByRole('button', { name: '이전 템플릿 페이지', exact: true }).click();
    await expect(pages.getByRole('button', { name: '1페이지', exact: true })).toHaveCSS('background-color', 'rgb(21, 24, 30)');
    await expect(pages.getByRole('button', { name: '1페이지', exact: true })).toHaveCSS('border-top-left-radius', '8px');
    await selectCategory('카페·베이커리', 'cafe_bakery');
    await expect(page.locator('.site-template-selection-card')).toHaveCount(4);
    await selectCategory('일식', 'japanese');
    await expect(page.getByText('일식 템플릿 준비 중', { exact: true })).toBeVisible();
    await expect(pages).toHaveCount(0);
    await selectCategory('전체', 'all');
    await expect(page.locator('.site-template-recommended')).toHaveCount(1);
    const start = page.locator('.site-template-start-link').first();
    await page.keyboard.press("Tab");
    await start.focus();
    await expect(start).toHaveCSS('outline-style', 'solid');
    const consult = page.getByRole('link', { name: '커스텀 상담', exact: true });
    await expect(consult).toHaveCSS('background-color', 'rgb(240, 240, 240)');
    await expect(consult).toHaveAttribute('href', '/apply/custom');
    const center = await page.locator('.site-page-heading').evaluate(el => {
      const r = el.getBoundingClientRect();
      return { delta: Math.abs(r.left + r.width / 2 - innerWidth / 2), align: getComputedStyle(el).textAlign, accent: getComputedStyle(document.documentElement).getPropertyValue('--site-accent').trim() };
    });
    assert.ok(center.delta < 1); assert.equal(center.align, 'center'); assert.equal(center.accent, '#f8e731');
    await page.locator('h1').click(); await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: `${output}/catalog-${width}.png`, fullPage: true });
    // Stress layout only: many long categories must not make the page wider.
    await page.locator('.site-category-list').evaluate(list => {
      for (let i = 0; i < 20; i++) { const item = list.firstElementChild.cloneNode(true); item.textContent = `새 카테고리 ${i} · 긴 이름의 레스토랑과 베이커리`; list.append(item); }
    });
    if (width < 768) {
      await circleCategories.getByRole('button').last().focus();
      const rail = await circleCategories.evaluate(el => ({ width: el.clientWidth, contentWidth: el.scrollWidth, left: el.scrollLeft }));
      if (rail.contentWidth > rail.width) assert.ok(rail.left > 0, 'keyboard focus reveals offscreen mobile categories');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    assert.deepEqual(errors, []);
    results.push({ viewport: states[0].viewport, states, center, pass: true });
    await page.close(); console.log(`PASS catalog ${width}px`);
  }
} finally { await browser.close(); }
await writeFile(`${output}/catalog-results.json`, JSON.stringify(results, null, 2));
