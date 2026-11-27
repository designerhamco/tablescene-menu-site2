import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

expect.configure({ timeout: 15_000 });
const base = process.env.SITE_DESIGN_QA_BASE_URL || 'http://127.0.0.1:3000';
const output = process.env.SITE_DESIGN_QA_OUTPUT || '/tmp/artimenu-site-design-qa';
const widths = [320, 375, 390, 768, 820, 992, 1280, 1440, 2560];

async function open(page, path) {
    const response = await page.goto(base + path, { waitUntil: 'load' });
    assert.ok(response?.ok(), `${path} returned ${response?.status()}`);
    await page.evaluate(() => document.fonts.ready);
}

async function assertViewport(page, width) {
    const viewport = await page.evaluate(() => ({
        inner: innerWidth,
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
    }));
    assert.deepEqual(viewport, { inner: width, client: width, scroll: width }, page.url());
}

async function verifyHome(page, width) {
    await open(page, '/');
    const hero = page.getByRole('region', { name: '매장에서 만나는 아티메뉴' });
    const title = hero.getByRole('heading', { level: 1 });
    const header = page.getByRole('navigation', { name: '공식 사이트 메뉴' });
    const make = header.getByRole('link', { name: '만들기', exact: true });
    await expect(hero).toHaveAttribute('data-scroll-driven', 'true');
    await expect(hero).toHaveAttribute('data-chapter', '0');
    await expect(hero).toHaveAttribute('data-image-ready', 'true');
    await expect(title).toHaveClass(/type-section-title/);
    const titleBase = width < 768 ? 28 : width < 1024 ? 32 : 36;
    const scale = Math.min(.125, Math.max(0, (width - 1600) / 8000));
    const titleSize = titleBase * (1 + scale);
    await expect(title).toHaveCSS('font-size', `${Number(titleSize.toFixed(2))}px`);
    await expect(header).toHaveAttribute('data-home-hero', 'true');
    await expect(header).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(header).toHaveCSS('color', 'rgb(255, 255, 255)');

    const geometry = await hero.evaluate(element => {
        const stage = element.querySelector(':scope > [data-rendering]');
        const edges = node => {
            const box = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return [box.left + parseFloat(style.paddingLeft), box.right - parseFloat(style.paddingRight)];
        };
        const box = stage.getBoundingClientRect();
        return {
            stage: [box.x, box.y, box.width, box.height],
            viewportHeight: innerHeight,
            position: getComputedStyle(stage).position,
            copy: edges(element.querySelector('[data-hero-copy]')),
            header: edges(document.querySelector('[data-site-header] > .site-container')),
            footer: edges(document.querySelector('#site-footer > .site-container')),
        };
    });
    assert.equal(geometry.position, 'sticky');
    assert.deepEqual(geometry.stage, [0, 0, width, geometry.viewportHeight]);
    assert.deepEqual(geometry.copy, geometry.header);
    assert.deepEqual(geometry.copy, geometry.footer);
    await assertViewport(page, width);

    if (width >= 1280) {
        await expect(make).toHaveAttribute('href', '/apply');
        await expect(make).toHaveCSS('height', '44px');
        await expect(make).toHaveCSS('border-radius', '9999px');
        await expect(make).toHaveClass(/site-button-secondary/);
        const account = header.getByRole('link', { name: '로그인·회원가입' });
        await expect(account).toHaveAttribute('href', '/sign-in');
        assert.ok((await account.boundingBox()).x < (await make.boundingBox()).x);
        const templates = header.getByRole('link', { name: '디자인 템플릿', exact: true });
        const support = header.getByRole('button', { name: '고객센터 메뉴' });
        assert.ok((await templates.boundingBox()).x < (await support.boundingBox()).x);
    } else {
        await expect(make).toBeHidden();
    }
    await page.screenshot({ path: `${output}/home-${width}.png` });

    await page.evaluate(() => scrollTo({ top: 400, behavior: 'instant' }));
    await expect(header).toHaveAttribute('data-scrolled', 'true');
    await expect(header).toHaveAttribute('data-home-hero', 'true');
    await expect(header).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await page.locator('[data-service-stack]').evaluate(element =>
        scrollBy({ top: element.getBoundingClientRect().top - innerHeight / 2, behavior: 'instant' }),
    );
    await expect(header).toHaveAttribute('data-home-hero', 'false');
    await expect(header).toHaveAttribute('data-home-basic-approach', 'true');
    await expect(header).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(header).toHaveCSS('color', 'rgb(21, 24, 30)');
    await page.locator('[data-home-section="operations"]').evaluate(element =>
        scrollBy({ top: element.getBoundingClientRect().top + 8, behavior: 'instant' }),
    );
    await expect(header).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(header).toHaveCSS('color', 'rgb(21, 24, 30)');
    await expect(page.getByRole('button', { name: '맨 위로 이동', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '맨 아래로 이동', exact: true })).toHaveCount(0);
    await page.screenshot({ path: `${output}/scrolled-${width}.png` });

    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await expect(header).toHaveAttribute('data-home-hero', 'true');
    const logo = header.getByRole('link', { name: 'ArtiMenu', exact: true });
    await expect(logo).toBeVisible();
    if (width >= 1280) {
        await expect(header.getByRole('link', { name: '다이닝', exact: true })).toHaveAttribute('href', '/#service-dining');
    } else {
        const trigger = header.getByRole('button', { name: '메뉴 열기', exact: true });
        await trigger.press('Enter');
        const dialog = page.getByRole('dialog', { name: '아티메뉴 전체 메뉴' });
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        const drawerMake = dialog.getByRole('link', { name: '만들기', exact: true });
        await expect(drawerMake).toHaveAttribute('href', '/apply');
        await expect(drawerMake).toHaveCSS('height', '44px');
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
    }
    return { titleSize, ...geometry };
}

async function verifyLibrary(page, width) {
    await open(page, '/design-system');
    if (width < 768) {
        const notice = page.getByRole('dialog').filter({ hasText: '위치 편집은 PC에서 해 주세요' });
        await notice.getByRole('button', { name: '확인', exact: true }).click();
    }
    await assertViewport(page, width);
    const selectionRows = await page.locator('.site-floor-workspace-selection').evaluateAll(elements =>
        elements.map(element => {
            const { clientWidth, scrollWidth } = element;
            const previousOffset = element.scrollLeft;
            element.scrollLeft = scrollWidth;
            const right = element.scrollLeft;
            element.scrollLeft = previousOffset;
            return {
                clientWidth,
                scrollWidth,
                right,
                described: Array.from(element.querySelectorAll('[aria-describedby]')).some(control =>
                    control.getAttribute('aria-describedby').split(/\s+/).some(id => document.getElementById(id))),
            };
        }),
    );
    assert.ok(selectionRows.length >= 2, 'the preselected management examples must be covered');
    for (const row of selectionRows) {
        assert.ok(row.described, 'placement and device descriptions remain linked');
        if (row.scrollWidth > row.clientWidth) {
            assert.ok(Math.abs(row.right - (row.scrollWidth - row.clientWidth)) <= 1);
        }
    }
    if (width < 768) assert.ok(selectionRows.every(row => row.right > 0));
    await assertViewport(page, width);
    const libraryTabs = page.getByRole('tablist', { name: '디자인 시스템 메뉴' });
    await libraryTabs.getByRole('tab', { name: '기준·토큰' }).click();
    await expect(libraryTabs.getByRole('tab', { selected: true })).toHaveText('기준·토큰');
    await assertViewport(page, width);
    return selectionRows;
}

async function verifyCatalog(page, width) {
    await open(page, '/templates');
    const service = page.getByRole('group', { name: '메뉴판 유형', exact: true });
    await expect(service.getByRole('radio', { name: '베이직', exact: true })).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.site-template-media').first()).toHaveCSS('border-top-left-radius', '16px');
    const columns = await page.locator('.site-template-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns, width < 640 ? 1 : width < 768 ? 2 : width < 1024 ? 3 : 4);
    await service.getByRole('radio', { name: '다이닝', exact: true }).click();
    await expect(page.locator('[data-catalog-service]:not([data-catalog-service="dining"])')).toHaveCount(0);
    await assertViewport(page, width);
    await page.screenshot({ path: `${output}/templates-${width}.png` });
    return columns;
}

async function verifyPublicPages(page, width) {
    const header = page.locator('[data-site-header]');
    for (const path of ['/apply', '/terms', '/pricing', '/faq']) {
        await open(page, path);
        await assertViewport(page, width);
        await expect(header).toHaveAttribute('data-home-hero', 'false');
        const scrolls = await page.evaluate(() => {
            const canScroll = document.documentElement.scrollHeight - innerHeight > 24;
            if (canScroll) scrollTo({ top: 400, behavior: 'instant' });
            return canScroll;
        });
        if (scrolls) {
            await expect(header).toHaveAttribute('data-scrolled', 'true');
            await expect(header).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        }
    }

    const search = page.getByRole('searchbox', { name: '고객센터 검색' });
    const searchFrame = page.getByRole('search', { name: '고객센터 검색' }).locator('.site-search-field');
    await expect(searchFrame).toHaveCSS('border-top-left-radius', '9999px');
    await search.fill('QR');
    await search.press('Enter');
    const faq = page.getByRole('region', { name: '자주 묻는 질문', exact: true });
    await expect(faq.getByRole('status')).toHaveText(/검색 결과 [1-9]\d*개/);
    await page.getByRole('button', { name: '고객센터 검색 지우기', exact: true }).click();
    await expect(search).toHaveValue('');
    await search.press('Enter');
    await expect(faq.getByRole('status')).toHaveText(/전체 \d+개/);
    const question = faq.getByRole('list', { name: '자주 묻는 질문 목록' }).locator('button[aria-expanded]').first();
    await expect(question).toHaveAttribute('aria-expanded', 'false');
    await question.press('Enter');
    await expect(question).toHaveAttribute('aria-expanded', 'true');
    const answerId = await question.getAttribute('aria-controls');
    await expect(page.locator(`[id="${answerId}"]`)).toBeVisible();

    await open(page, '/sign-in');
    await assertViewport(page, width);
    const field = page.getByRole('textbox', { name: '이메일', exact: true });
    await expect(field).toHaveCSS('border-top-left-radius', '12px');
    await expect(field).toHaveCSS('height', '44px');
    await field.focus();
    await expect(field).toHaveCSS('outline-color', 'rgb(11, 99, 206)');
    await expect(field).toHaveCSS('border-top-color', 'rgb(11, 99, 206)');
    await field.evaluate(el => el.setAttribute('aria-invalid', 'true'));
    await expect(field).toHaveCSS('border-top-color', 'rgb(196, 16, 16)');
    await expect(field).toHaveCSS('outline-color', 'rgb(196, 16, 16)');
    await field.evaluate(el => {
        el.removeAttribute('aria-invalid');
        el.readOnly = true;
    });
    await field.press('A');
    await expect(field).toHaveValue('');
    await expect(field).toHaveCSS('outline-color', 'rgb(11, 99, 206)');
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
    for (const width of widths) {
        const page = await browser.newPage({
            viewport: { width, height: 1000 },
            isMobile: width < 768,
            hasTouch: width < 1024,
            reducedMotion: 'reduce',
        });
        try {
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            const hero = await verifyHome(page, width);
            const library = await verifyLibrary(page, width);
            const columns = await verifyCatalog(page, width);
            await verifyPublicPages(page, width);
            assert.deepEqual(errors, []);
            results.push({ width, hero, library, columns });
            console.log(`PASS ${width}px: home hero, navigation, design system, catalog, FAQ and sign-in`);
        } finally {
            await page.close();
        }
    }
} finally {
    await browser.close();
}
await writeFile(`${output}/site-results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ passed: results.length }));
