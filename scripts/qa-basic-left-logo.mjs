import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.ORDER_QA_BASE || 'http://localhost:3021';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/basic-left-logo-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [], errors = [], writes = [], failures = [];
const sizes = [['pc',1440,900],['pc',1920,1080],['tablet',1180,820],['tablet',820,1180],['mobile',320,740],['mobile',430,932]];
const cases = sizes.flatMap(size => [false,true].flatMap(logo => (size[0] === 'mobile' ? ['orderedBalancedFit'] : ['orderedBalancedFit','orderedFit']).map(mode => ({size,logo,mode}))));
function url(design, device, logo, mode, extra = {}) {
  return `${base}/templates/cafe_real_matcha_a/preview?${new URLSearchParams({design,device,view:'actual',embedded:'1',logoPreview:logo?'on':'off',layoutMode:mode,callPreview:'on',orderPreview:'on',...extra})}`;
}
async function ready(page, device, packed = true) {
  await page.evaluate(() => document.fonts.ready);
  if (device !== 'mobile' && packed) await page.locator('[data-paged-ready=true]').waitFor();
  if (device === 'mobile' && await page.locator('[data-mobile-brand-fit]').filter({visible:true}).count()) {
    await page.locator('[data-mobile-brand-fit=ready]').filter({visible:true}).first().waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  await page.locator('img').evaluateAll(images => Promise.all(images.filter(image => image.complete && image.naturalWidth > 0).map(image => image.decode().catch(() => {}))));
  await page.waitForTimeout(200);
}
try {
  for (const {size:[device,width,height],logo,mode} of cases) {
    const id = `${device}-${width}-${logo?'logo':'text'}-${mode}`;
    const page = await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    page.on('pageerror', e => errors.push({id,message:e.message}));
    await page.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()),route.abort()));
    try {
      const response = await page.goto(url('basic-top-row-left-logo',device,logo,mode,{designPreview:JSON.stringify({representativeAlignment:'center'})}),{waitUntil:'domcontentloaded'});
      assert.equal(response.status(),200);
      await ready(page,device);
      assert.deepEqual(await page.evaluate(() => [innerWidth,innerHeight]),[width,height]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),false);
      if (device !== 'mobile') {
        const geometry = await page.evaluate(() => {
          const header = document.querySelector('[data-basic-top-row]');
          const identity = header.querySelector('.cafe-a-store-title:not([hidden]),.cafe-a-store-logo');
          const description = header.querySelector('.cafe-a-store-description');
          const icon = header.querySelector('[data-template-language-control] button[aria-haspopup=menu]');
          const footer = document.querySelector('[data-paged-column] [data-paged-notices]');
          const column = footer.closest('[data-paged-column]');
          const last = [...column.querySelectorAll('[data-paged-block]')].at(-1);
          const box = el => el?.getBoundingClientRect().toJSON();
          return {header:box(header),identity:box(identity),description:box(description),icon:box(icon),footer:box(footer),last:box(last),lastColumn:column===document.querySelector('[data-paged-column]:last-child'),notices:footer.children.length,headerNotices:header.querySelectorAll('[data-paged-notices]').length,titleAlign:getComputedStyle(identity).textAlign,descriptionAlign:getComputedStyle(description).textAlign,columns:document.querySelectorAll('[data-paged-column]').length};
        });
        assert.ok(Math.abs(geometry.identity.left-geometry.header.left)<2,'identity starts at the left header edge');
        assert.equal(geometry.descriptionAlign,'right');
        if (!logo) assert.equal(geometry.titleAlign,'left');
        assert.ok(geometry.description.left>geometry.header.left+geometry.header.width*.6,'description occupies the right header cell');
        assert.ok(Math.abs(geometry.icon.right-geometry.header.right)<2,'language icon occupies the far right');
        assert.ok(geometry.identity.top>=geometry.header.top-1 && geometry.identity.bottom<=geometry.header.bottom+1,'identity stays inside fixed header');
        assert.equal(geometry.headerNotices,0);
        assert.equal(geometry.notices,3);
        assert.equal(geometry.lastColumn,true);
        assert.ok(geometry.footer.top>=geometry.last.bottom-1,'notices follow the final item');
        assert.ok(geometry.columns>=1&&geometry.columns<=3);
        await page.locator('[data-scroll-menu]').evaluate(el => el.scrollTop=el.scrollHeight);
        const reachable = await page.locator('[data-paged-column] [data-paged-notices]').evaluate(el => ({bottom:el.getBoundingClientRect().bottom,viewport:el.closest('[data-scroll-menu]').getBoundingClientRect().bottom}));
        assert.ok(reachable.bottom<=reachable.viewport+1,'all notices are reachable');
        results.push({id,viewport:[width,height],...geometry});
      } else {
        const roles = () => page.evaluate(() => [...document.querySelectorAll('.cafe-a-store-title,.cafe-a-store-logo,.cafe-a-store-description,.cafe-a-mobile-notice-list')].filter(el=>el.getClientRects().length).map(el=>({role:el.className,font:getComputedStyle(el).fontSize,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));
        const actual=await roles();
        await page.goto(url('basic-top-row',device,logo,mode),{waitUntil:'domcontentloaded'});await ready(page,device);
        const original=await roles();
        assert.deepEqual(actual,original,'independent mobile composition remains identical to the source template');
        await page.goto(url('basic-top-row-left-logo',device,logo,mode),{waitUntil:'domcontentloaded'});await ready(page,device);
        results.push({id,viewport:[width,height],mobileParity:true});
      }
      await page.screenshot({path:`${output}/${id}.png`});
      console.log('PASS',id);
    } catch(error) { failures.push({id,error:error.message});await page.screenshot({path:`${output}/${id}-failure.png`});console.log('FAIL',id,error.message); }
    finally { await page.close(); }
  }
  // Keep the existing centered list and album headers intact.
  for (const design of ['basic-top-row','basic-top-row-album']) {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    await page.goto(url(design,'pc',false,'orderedBalancedFit'),{waitUntil:'domcontentloaded'});await ready(page,'pc',!design.endsWith('-album'));
    assert.equal(await page.locator('[data-basic-top-row] .cafe-a-store-title').evaluate(el=>getComputedStyle(el).textAlign),'center');
    assert.equal(await page.locator('[data-basic-top-row] [data-paged-notices] p').count(),3);
    results.push({id:design,existingHeader:true});await page.close();
  }
  // Localized right-side copy and menu popup remain contained.
  for (const lang of ['en','ja','zh']) {
    const page=await browser.newPage({viewport:{width:1180,height:820}});
    await page.goto(url('basic-top-row-left-logo','tablet',false,'orderedBalancedFit',{lang}),{waitUntil:'domcontentloaded'});await ready(page,'tablet');
    await page.locator('[data-basic-top-row] button[aria-haspopup=menu]').click();
    const bounds=await page.locator('[data-language-menu-item]').filter({visible:true}).first().boundingBox();
    assert.ok(bounds.x>=0&&bounds.x+bounds.width<=1180,'language popup remains onscreen');
    results.push({id:`locale-${lang}`});await page.close();
  }
  if (process.env.LEFT_LOGO_CAPTURE) {
    const page=await browser.newPage({viewport:{width:1180,height:820},reducedMotion:'reduce'});
    await page.goto(url('basic-top-row-left-logo','tablet',false,'orderedBalancedFit'),{waitUntil:'domcontentloaded'});await ready(page,'tablet');
    await page.addStyleTag({content:'nextjs-portal { display: none !important; }'});
    await page.screenshot({path:process.env.LEFT_LOGO_CAPTURE,type:'jpeg',quality:86});await page.close();
  }
} finally { await browser.close();await writeFile(`${output}/report.json`,JSON.stringify({results,errors,writes,failures},null,2)); }
assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
console.log(JSON.stringify({checked:results.length,errors,writes,failures}));
