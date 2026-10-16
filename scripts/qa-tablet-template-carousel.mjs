import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.TABLET_CAROUSEL_QA_BASE_URL || 'http://127.0.0.1:3000';
const output = process.env.TABLET_CAROUSEL_QA_OUTPUT || '/tmp/artimenu-tablet-carousel-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const errors = [];
const rootSelector = '[data-tablet-carousel]';

async function openShowcase(page, path = '/') {
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base + path, { waitUntil: 'domcontentloaded' });
  const carousel = page.locator(rootSelector);
  await carousel.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  await expect.poll(() => carousel.locator('[aria-hidden="false"] img').evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  return carousel;
}

try {
  for (const width of [320, 390, 768, 992, 1440, 2560]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const carousel = await openShowcase(page);
    await expect(carousel).toHaveAttribute('data-auto-playing', 'false');
    await expect(carousel.getByRole('button', { name: '메뉴 디자인 자동 넘김 재생', exact: true })).toBeVisible();
    const dimensions = await carousel.evaluate((element) => {
      const viewport = element.firstElementChild.getBoundingClientRect();
      const selected = Number(element.dataset.selectedSlide);
      const panels = [...element.querySelectorAll('[data-showcase-screen]')];
      const rects = panels.map((panel) => panel.getBoundingClientRect().toJSON());
      const panelStyles = panels.map((panel) => {
        const style = getComputedStyle(panel);
        return { border: style.borderTopWidth, padding: style.paddingTop, radius: parseFloat(style.borderTopLeftRadius), blur: parseFloat(style.filter.slice(5)), opacity: Number(style.opacity) };
      });
      const center = rects[selected];
      return {
        viewportWidth: innerWidth,
        overflow: document.documentElement.scrollWidth - innerWidth,
        center,
        stage: viewport.toJSON(),
        neighbors: [rects[(selected + 1) % rects.length], rects[(selected + rects.length - 1) % rects.length]],
        centerStyle: panelStyles[selected],
        neighborStyles: [panelStyles[(selected + 1) % panels.length], panelStyles[(selected + panels.length - 1) % panels.length]],
      };
    });
    assert.equal(dimensions.viewportWidth, width);
    assert.equal(dimensions.overflow, 0);
    assert.ok(dimensions.center.top >= dimensions.stage.top, 'center screen must not be cropped at the top');
    assert.ok(dimensions.center.bottom <= dimensions.stage.bottom, 'center screen must not be cropped at the bottom');
    assert.equal(dimensions.centerStyle.border, '0px');
    assert.equal(dimensions.centerStyle.padding, '0px');
    assert.ok(Math.abs(dimensions.centerStyle.radius - Math.max(12, Math.min(width * 0.015, 20))) < 0.1);
    assert.ok(dimensions.centerStyle.blur < 0.01 && dimensions.centerStyle.opacity > 0.99, 'center screen stays sharp');
    for (const style of dimensions.neighborStyles) assert.ok(style.blur > 1.5 && style.opacity < 0.75, 'side screens are softly blurred and faded');
    assert.ok(Math.abs((dimensions.center.left + dimensions.center.right) / 2 - width / 2) < 2);
    for (const neighbor of dimensions.neighbors) {
      assert.ok(dimensions.center.width > neighbor.width * 1.18, 'center screen must be larger');
      assert.ok(neighbor.right > dimensions.stage.left + 10 && neighbor.left < dimensions.stage.right - 10, 'neighbor must peek into view');
    }
    const cta = page.locator('#templates').getByRole('link', { name: '더 많은 디자인 보기' });
    assert.deepEqual(await cta.evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, color: style.color };
    }), { background: 'rgb(21, 24, 30)', color: 'rgb(255, 255, 255)' });
    await page.locator('#templates').screenshot({ path: `${output}/templates-${width}.png`, style: '[data-site-header], [data-nextjs-dev-tools-button] { visibility: hidden !important; }' });
    // Exercise the actual loop in both directions with reduced-motion jumps.
    for (const expected of [1, 2, 3, 4, 0, 1]) {
      await carousel.getByRole('button', { name: '다음 메뉴 디자인', exact: true }).click();
      await expect(carousel).toHaveAttribute('data-selected-slide', String(expected));
    }
    await carousel.getByRole('button', { name: '이전 메뉴 디자인', exact: true }).click();
    await expect(carousel).toHaveAttribute('data-selected-slide', '0');
    await page.keyboard.press('ArrowLeft');
    await expect(carousel).toHaveAttribute('data-selected-slide', '4');
    if (width === 390) {
      // Reduced-motion users can explicitly start automatic, instant changes.
      await carousel.getByRole('button', { name: '메뉴 디자인 자동 넘김 재생', exact: true }).click();
      await expect(carousel).toHaveAttribute('data-auto-playing', 'true');
      await expect(carousel).toHaveAttribute('data-selected-slide', '0', { timeout: 5000 });
      await carousel.getByRole('button', { name: '메뉴 디자인 자동 넘김 일시 정지', exact: true }).click();
      await expect(carousel).toHaveAttribute('data-auto-playing', 'false');
    }
    results.push({ width, dimensions, reducedMotion: 'no autoplay; manual loop and keyboard passed' });
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  const carousel = await openShowcase(page, '/services/basic');
  await carousel.hover();
  await expect(carousel).toHaveAttribute('data-auto-playing', 'true');
  for (const expected of [1, 2, 3, 4, 0]) {
    await expect(carousel).toHaveAttribute('data-selected-slide', String(expected), { timeout: 6500 });
  }
  // Mouse hover and clicking a navigation arrow must not leave it paused.
  await carousel.getByRole('button', { name: '다음 메뉴 디자인', exact: true }).click();
  await expect(carousel).toHaveAttribute('data-selected-slide', '1');
  await expect(carousel).toHaveAttribute('data-auto-playing', 'true');
  await expect(carousel).toHaveAttribute('data-selected-slide', '2', { timeout: 5000 });
  await page.locator('#templates a').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(carousel).toHaveAttribute('data-auto-playing', 'false');
  await page.keyboard.press('Tab');
  await expect(carousel).toHaveAttribute('data-auto-playing', 'true');
  await carousel.getByRole('button', { name: '메뉴 디자인 자동 넘김 일시 정지', exact: true }).click();
  await page.locator('#templates a').focus();
  await page.mouse.move(0, 0);
  const pausedSelection = await carousel.getAttribute('data-selected-slide');
  await page.waitForTimeout(3600);
  await expect(carousel).toHaveAttribute('data-selected-slide', pausedSelection);
  await expect(carousel).toHaveAttribute('data-auto-playing', 'false');
  await carousel.getByRole('button', { name: '메뉴 디자인 자동 넘김 재생', exact: true }).click();
  await expect(carousel).toHaveAttribute('data-auto-playing', 'true');
  await page.locator('#templates a').focus();
  await page.mouse.move(0, 0);
  await expect(carousel).toHaveAttribute('data-auto-playing', 'true');
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await expect(carousel).toHaveAttribute('data-auto-playing', 'false');
  results.push({ width: 1440, path: '/services/basic', autoplay: 'full cycle while hovered, mouse navigation keeps playing, keyboard focus pause, explicit pause/resume, offscreen pause passed' });
  await page.close();

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phoneCarousel = await openShowcase(phone);
  const stage = await phoneCarousel.locator('> div').first().boundingBox();
  const session = await phone.context().newCDPSession(phone);
  const y = stage.y + stage.height * 0.5;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 280, y }] });
  for (const x of [250, 210, 170, 130, 90]) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    await phone.waitForTimeout(35);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(phoneCarousel).not.toHaveAttribute('data-selected-slide', '0');
  await expect(phoneCarousel).toHaveAttribute('data-auto-playing', 'true');
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  results.push({ width: 390, touch: 'swipe passed' });
  await phone.close();

  assert.deepEqual(errors, []);
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ passed: results.length, errors, results }, null, 2));
} finally {
  await browser.close();
}
