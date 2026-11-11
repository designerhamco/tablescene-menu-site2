import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Read-only DOM regression checks; desktop/tablet and mobile stay independent.
const base = process.env.TOP_ROW_QA_BASE || 'http://localhost:3187';
const cases = [
  ...['cafe_mocha_forest_a', 'cafe_sunday_line_a', 'cafe_van_gogh_a'].map(key => ({key})),
  ...['basic-top-row', 'basic-top-row-left-logo', 'basic-top-row-album'].map(design => ({key: 'cafe_real_matcha_a', design})),
];
const selectedCases = cases.filter(entry => !process.env.TOP_ROW_QA_FILTER || process.env.TOP_ROW_QA_FILTER.split(',').includes(entry.design || entry.key));
const sizes = [['pc', 1440, 900], ['tablet', 1180, 820], ['tablet', 820, 1180]];
const browser = await chromium.launch();
const errors = [], writes = [], results = [];
try {
  for (const entry of selectedCases) for (const [device, width, height] of sizes) for (const cover of [false, true]) {
    const id = `${entry.design || entry.key}/${device}/${width}/${cover ? 'cover-on' : 'cover-off'}`;
    const page = await browser.newPage({viewport: {width, height}, reducedMotion: 'reduce'});
    page.on('pageerror', error => errors.push({id, error: error.message}));
    await page.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()), route.abort()));
    try {
      const query = new URLSearchParams({device, view: 'actual', embedded: '1', coverPreview: cover ? 'on' : 'off'});
      if (entry.design) query.set('design', entry.design);
      if (!entry.design?.endsWith('-album')) query.set('layoutMode', cover ? 'orderedFit' : 'orderedBalancedFit');
      const response = await page.goto(`${base}/templates/${entry.key}/preview?${query}`, {waitUntil: 'domcontentloaded'});
      assert.equal(response.status(), 200, id);
      await page.locator('[data-native-ready=true], [data-paged-ready=true]').waitFor();
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      await page.locator('[data-native-header] img, [data-basic-top-row] img, .cafe-a-cover-hero img').evaluateAll(images => Promise.all(images.map(image => image.decode().catch(() => {}))));
      await page.waitForFunction(() => [...document.querySelectorAll('[data-menu-logo-slot]')].filter(e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden').every(e => e.dataset.menuLogoReady === 'true' && e.dataset.menuLogoMeasured === 'true'));
      await page.waitForTimeout(200);
      const geometry = async () => page.evaluate(() => {
        const header = document.querySelector('[data-native-header], [data-basic-top-row]');
        const rect = element => {const r = element.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
        const trigger = header.querySelector('[data-language-menu-trigger]');
        const style = getComputedStyle(header);
        const menu = document.querySelector('[data-native-menu-panel], [data-paged-menu-panel]');
        const hero = document.querySelector('.cafe-a-cover-hero');
        const image = hero?.querySelector('[data-cafe-a-cover-image]');
        const copy = [...header.querySelectorAll('.cafe-a-topline-description, .cafe-a-topline-notice-text, [data-scroll-header-copy]')].flatMap(element => element.querySelectorAll('p').length ? [...element.querySelectorAll('p')].map(rect) : [rect(element)]);
        return {viewport:[innerWidth,innerHeight],header:rect(header),trigger:rect(trigger),menu:rect(menu),copy,
          insetTop:parseFloat(style.paddingTop),insetRight:parseFloat(style.paddingRight),
          hero:hero && rect(hero),image:image && rect(image),imageFit:image && getComputedStyle(image).objectFit};
      });
      const before = await geometry();
      assert.deepEqual(before.viewport, [width, height], id);
      assert.ok(Math.abs(before.trigger.y - before.header.y - before.insetTop) < 1, `${id}: language at header top`);
      assert.ok(Math.abs(before.trigger.right - before.header.right + before.insetRight) < 1, `${id}: language at header right`);
      const information = await page.locator('[data-menu-header-info-stack]').evaluate(stack => {
        const description = stack.querySelector('.cafe-a-topline-description, .cafe-a-store-description'), trigger = stack.querySelector('[data-language-menu-trigger]');
        const s = stack.getBoundingClientRect(), d = description.getBoundingClientRect(), t = trigger.getBoundingClientRect();
        return {width:s.width, descriptionWidth:d.width, right:s.right, descriptionRight:d.right, gap:d.top-t.bottom, expectedGap:parseFloat(getComputedStyle(document.documentElement).fontSize)*.75};
      });
      assert.ok(Math.abs(information.width-information.descriptionWidth)<1, `${id}: description uses its full information cell`);
      assert.ok(Math.abs(information.right-information.descriptionRight)<1, `${id}: shared right edge`);
      assert.ok(Math.abs(information.gap-information.expectedGap)<1, `${id}: shared related-block gap`);
      for (const copy of before.copy) {
        const overlapX = Math.min(copy.right,before.trigger.right)-Math.max(copy.x,before.trigger.x);
        const overlapY = Math.min(copy.bottom,before.trigger.bottom)-Math.max(copy.y,before.trigger.y);
        assert.ok(overlapX < 1 || overlapY < 1, `${id}: language does not overlap copy`);
      }
      if (cover) {
        assert.ok(before.hero, `${id}: representative area exists`);
        assert.ok(Math.abs(before.hero.y - before.menu.y) < 1, `${id}: representative begins with menu body`);
        assert.ok(Math.abs(before.hero.bottom - before.menu.bottom) < 1, `${id}: representative fills remaining height`);
        assert.equal(before.imageFit, 'cover', `${id}: image paints complete representative frame`);
        assert.ok(Math.abs(before.image.height - before.hero.height) < 1, `${id}: image fills hero`);
      } else assert.equal(before.hero, null, `${id}: no hidden representative slot`);
      const trigger = page.locator('[data-native-header] [data-language-menu-trigger], [data-basic-top-row] [data-language-menu-trigger]');
      for (const keyboard of [false, true]) {
        if (keyboard) {await trigger.focus(); await page.keyboard.press('Enter');} else await trigger.click();
        const popup = page.locator('[data-language-menu-surface]').filter({visible:true});
        await popup.waitFor();
        const box = await popup.boundingBox();
        assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, `${id}: popup inside viewport`);
        const reachable = await popup.locator('a').last().evaluate(element => {const r=element.getBoundingClientRect();return element.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
        assert.ok(reachable, `${id}: popup choice reachable`);
        await page.waitForTimeout(100);
        const after = await geometry();
        for (const target of ['header','menu']) for (const dimension of ['y','height']) assert.ok(Math.abs(before[target][dimension]-after[target][dimension]) < .75, `${id}: popup cannot resize ${target}`);
        await page.keyboard.press('Escape');
        await popup.waitFor({state:'hidden'});
      }
      if (device === 'pc' && !cover) {
        await trigger.click();
        await page.locator('[data-language-menu-item][href*="lang=en"]').click();
        await page.waitForURL(url => url.searchParams.get('lang') === 'en');
        await page.locator('[data-native-ready=true], [data-paged-ready=true]').waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('[data-language-menu-surface]').filter({visible:true}).count(), 0, `${id}: locale clears popup`);
        await page.locator('[data-language-menu-trigger]').filter({visible:true}).first().click();
        await page.locator('[data-language-menu-surface]').filter({visible:true}).waitFor();
        await page.keyboard.press('Escape');
      }
      results.push({id,header:before.header,trigger:before.trigger,hero:before.hero});
      console.log('PASS', id);
    } catch (error) {console.error('FAIL', id, JSON.stringify(errors)); throw error;} finally {await page.close();}
  }
  for (const entry of cases) {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const query = new URLSearchParams({device:'mobile',view:'actual',embedded:'1',coverPreview:'off'});
    if(entry.design) query.set('design',entry.design);
    await page.goto(`${base}/templates/${entry.key}/preview?${query}`,{waitUntil:'domcontentloaded'});
    await page.locator('.cafe-a-typography[data-cafe-a-mobile-style=true]').filter({visible:true}).first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    assert.equal(await page.locator('[data-native-header], [data-basic-top-row]').filter({visible:true}).count(),0,'mobile keeps independent header');
    assert.equal(await page.locator('[data-cafe-a-store-description], .cafe-a-store-description').filter({visible:true}).first().evaluate(element=>getComputedStyle(element).fontSize),'14px');
    assert.equal(await page.locator('.cafe-a-cover-hero').filter({visible:true}).count(),0,'mobile cover stays OFF');
    console.log('PASS',entry.design||entry.key,'mobile');await page.close();
  }
} finally {await browser.close();}
assert.deepEqual(errors,[]);
assert.deepEqual(writes,[]);
console.log(JSON.stringify({checked:results.length,mobile:cases.length,errors,writes}));
