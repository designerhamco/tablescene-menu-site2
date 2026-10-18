import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
expect.configure({ timeout: 15000 });
const base = process.env.SITE_DESIGN_QA_BASE_URL || 'http://127.0.0.1:3000';
const output = process.env.SITE_DESIGN_QA_OUTPUT || '/tmp/artimenu-site-design-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
for (const width of [375, 768, 992, 1280, 1440, 2560]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-home-hero-frame]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const dimensions = await page.evaluate(() => {
        const frame = document.querySelector('[data-home-hero-frame]').getBoundingClientRect();
        const header = document.querySelector('[data-site-header] > div');
        const footer = document.querySelector('footer > div');
        const contentEdges = (element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
                left: rect.left + parseFloat(style.paddingLeft),
                right: rect.right - parseFloat(style.paddingRight),
            };
        };
        return {
            viewport: innerWidth,
            overflow: document.documentElement.scrollWidth - innerWidth,
            frame: { left: frame.left, right: frame.right },
            header: contentEdges(header),
            footer: contentEdges(footer),
            titleSize: getComputedStyle(document.querySelector('h1')).fontSize,
            frameRadius: parseFloat(getComputedStyle(document.querySelector('[data-home-hero-frame]')).borderTopLeftRadius),
            frameRatio: frame.width / frame.height,
        };
    });
    assert.equal(dimensions.overflow, 0);
    // Preserve hero geometry while applying shared typography and colors.
    const expectedTitle = width < 768 ? 32 : width < 992 ? 36 : 48;
    assert.ok(Math.abs(parseFloat(dimensions.titleSize) - expectedTitle) < .1);
    assert.ok(Math.abs(dimensions.frameRadius - Math.max(32, Math.min(width * .05, 48))) < .1);
    assert.ok(Math.abs(dimensions.frameRatio - (width < 640 ? .95 : width < 1280 ? 2 : 2.3)) < .01);

    for (const edge of ['left', 'right']) {
        assert.ok(Math.abs(dimensions.frame[edge] - dimensions.header[edge]) < 1);
        assert.ok(Math.abs(dimensions.frame[edge] - dimensions.footer[edge]) < 1);
    }
    const make = page.locator('[data-site-header]').getByRole('link', { name: '만들기', exact: true });
    if (width < 1280) await expect(make).toBeHidden();
    else {
        const style = await make.evaluate(el => {
            const s = getComputedStyle(el);
            return { background: s.backgroundColor, color: s.color, radius: s.borderRadius };
        });
        assert.deepEqual(style, { background: 'rgb(21, 24, 30)', color: 'rgb(255, 255, 255)', radius: '9999px' });
        assert.equal((await make.boundingBox()).height, 44);
        const header = page.locator('[data-site-header]');
        const account = header.getByRole('link', { name: '로그인·회원가입', exact: true });
        await expect(account).toBeVisible();
        await expect(account).toHaveAttribute('href', '/sign-in');
        const accountBox = await account.boundingBox();
        const makeBox = await make.boundingBox();
        assert.ok(accountBox.x + accountBox.width < makeBox.x, 'account text precedes create button');
        const order = await header.locator('a').evaluateAll(elements => elements.filter(el => el.getClientRects().length > 0).map(el => el.textContent.trim()));
        assert.ok(order.indexOf('템플릿 보러가기') < order.indexOf('고객센터'));
    }
    await page.screenshot({ path: `${output}/home-${width}.png` });
    await page.evaluate(() => scrollTo({ top: 400, behavior: 'instant' }));
    await page.waitForTimeout(300);
    const header = page.locator('[data-site-header]');
    await expect(header).toHaveAttribute('data-floating', String(width >= 768));
    if (width >= 768) {
        await expect(header.getByRole('link', { name: 'ArtiMenu', exact: true })).toBeHidden();
        await expect(header.getByRole('link', { name: '만들기', exact: true })).toBeHidden();
        await expect(header.getByRole('link', { name: '아티메뉴 다이닝', exact: true })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: '맨 위로 이동', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '맨 아래로 이동', exact: true })).toHaveCount(0);
    await page.screenshot({ path: `${output}/scrolled-${width}.png` });
    if (width < 1280) {
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '아티메뉴 전체 메뉴' });
        await expect(dialog).toBeVisible();
        const secondary = dialog.locator('.site-button-secondary');
        await expect(secondary).toHaveCSS('background-color', 'rgb(240, 240, 240)');
        await expect(secondary).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(page.getByRole('button', { name: '메뉴 열기', exact: true })).toBeFocused();
    }
    await page.goto(base + '/apply', { waitUntil: 'domcontentloaded' });
    const tabs = page.getByRole('tablist', { name: '서비스 및 페이지 유형 선택' });
    await expect(tabs).toHaveCSS('min-height', '52px');
    await expect(tabs.getByRole('tab', { selected: true })).toHaveText('다이닝 원페이지');
    await tabs.getByRole('tab', { selected: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.getByRole('tab', { selected: true })).toHaveText('다이닝 멀티페이지');
    const selectedStyle = await tabs.getByRole('tab', { selected: true }).evaluate(el => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, color: s.color, radius: s.borderRadius };
    });
    assert.deepEqual(selectedStyle, { background: 'rgb(21, 24, 30)', color: 'rgb(255, 255, 255)', radius: '9999px' });
    await expect(page.locator('.site-template-media').first()).toHaveCSS('border-top-left-radius', '16px');
    const columns = await page.locator('.site-template-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns, width < 640 ? 1 : width < 1280 ? 2 : 3);
    await page.screenshot({ path: `${output}/apply-${width}.png` });
    for (const path of ['/apply', '/sign-in', '/terms', '/pricing', '/faq']) {
        await page.goto(base + path, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => scrollTo({ top: 400, behavior: 'instant' }));
        await page.waitForTimeout(100);
        await expect(page.locator('[data-site-header]')).toHaveAttribute('data-floating', 'false');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert.equal(overflow, 0, `${path} ${width}`);
    }
    const search = page.locator('#faq-search');
    await expect(search).toHaveCSS('border-top-left-radius', '9999px');
    await search.fill('QR');
    await expect(page.locator('.site-faq-list')).toContainText('검색 결과');
    await search.fill('');
    const question = page.locator('.site-faq-list button').first();
    await expect(question).toHaveAttribute('aria-expanded', 'false');
    await question.click();
    await expect(question).toHaveAttribute('aria-expanded', 'true');
    const answerId = await question.getAttribute('aria-controls');
    await expect(page.locator(`[id="${answerId}"]`)).toBeVisible();
    await page.goto(base + '/sign-in', { waitUntil: 'domcontentloaded' });
    const field = page.locator('input[type="email"]');
    await expect(field).toHaveCSS('border-top-left-radius', '16px');
    await field.hover();
    await field.focus();
    await expect(field).toHaveCSS('outline-color', 'rgb(11, 99, 206)');
    await expect(field).toHaveCSS('border-top-color', 'rgb(11, 99, 206)');
    await field.evaluate(el => el.setAttribute('aria-invalid', 'true'));
    await expect(field).toHaveCSS('border-top-color', 'rgb(196, 16, 16)');
    await expect(field).toHaveCSS('outline-color', 'rgb(196, 16, 16)');
    await field.evaluate(el => { el.removeAttribute('aria-invalid'); el.readOnly = true; });
    await expect(field).toHaveCSS('outline-style', 'none');
    assert.deepEqual(errors, []);
    results.push({ width, ...dimensions, columns });
    console.log(`PASS ${width}px: gutters, header modes, scroll button, drawer and gallery`);
    await page.close();
}
} finally {
    await browser.close();
}
await writeFile(`${output}/site-results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ passed: results.length, results }));
