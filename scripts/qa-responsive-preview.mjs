import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3041';
const output = process.env.QA_OUTPUT_DIR ?? '/private/tmp/artimenu-responsive-qa';
await mkdir(output, {recursive: true});
const browser = await chromium.launch({headless: true});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const report = {base, login: [], previews: [], pagination: [], errors};
try {
  for (const [width, height] of [[390,844],[820,1180],[1440,900],[1600,1000],[1920,1080],[2560,1440],[3440,1440]]) {
    await page.setViewportSize({width,height});
    await page.goto(`${base}/sign-in`, {waitUntil:'domcontentloaded'});
    await page.locator('h1').waitFor();
    await page.evaluate(()=>document.fonts.ready);
    const metric = await page.evaluate(()=>{
      const box = selector => {const e=document.querySelector(selector), r=e.getBoundingClientRect(); return {top:r.top,width:r.width,height:r.height,font:parseFloat(getComputedStyle(e).fontSize)};};
      return {width:innerWidth,height:innerHeight,title:box('h1'),description:box('.type-page-description'),content:box('.site-auth-content'),main:box('main'),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    const ratio = width <= 1600 ? 1 : Math.min(1.125,.8+width/8000);
    assert.ok(Math.abs(metric.title.font - (width<768?28:width<1024?32:36)*ratio)<.05);
    assert.ok(Math.abs(metric.description.font-16*ratio)<.05);
    assert.equal(metric.overflow,false);
    const fresh = await page.evaluate(()=>{
      const probe=document.createElement('section');
      probe.className='site-gutter site-page-spacing';
      probe.style.position='absolute'; probe.style.top='-10000px';
      probe.innerHTML='<h2 class="type-page-title">새 페이지 제목</h2><p class="type-page-description">새 페이지 설명</p><button class="site-button">공통 버튼</button>';
      document.body.append(probe);
      const font=selector=>parseFloat(getComputedStyle(probe.querySelector(selector)).fontSize);
      const result={title:font('h2'),description:font('p'),control:font('button'),spacing:parseFloat(getComputedStyle(probe).paddingTop)};
      probe.remove();return result;
    });
    assert.ok(Math.abs(fresh.title-metric.title.font)<.05,'a new semantic title inherits the same global size');
    assert.ok(Math.abs(fresh.description-metric.description.font)<.05);
    assert.ok(Math.abs(fresh.control-15*ratio)<.05);
    assert.ok(fresh.spacing>0);
    assert.ok(metric.main.height<1100,'auth page must not absorb unlimited viewport height');
    if(width===3440) await page.screenshot({path:`${output}/login-wide.png`});
    report.login.push(metric);
    console.log(`login ${width} passed`);
  }

  // Panels are overlays; all preview surfaces center against the full page.
  for (const [width,height] of [[320,740],[390,844],[430,932],[667,375],[820,1180],[1440,900],[2560,1440],[3440,1440]]) for(const device of ['tablet','pc','mobile']) {
    await page.setViewportSize({width,height});
    await page.goto(`${base}/templates/cafe_design_a/preview?device=${device}&previewOptions=design`,{waitUntil:'domcontentloaded'});
    await page.locator('[data-preview-frame-shell]').waitFor({state:'visible'});
    await page.frameLocator('iframe').getByRole('heading',{name:'REAL MATCHA',exact:true}).waitFor({state:'visible'});
    await page.waitForTimeout(250);
    const result=await page.evaluate(()=>{
      const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
      const iframe=document.querySelector('iframe'),shell=document.querySelector('[data-preview-frame-shell]'),style=getComputedStyle(shell);
      return{width:innerWidth,height:innerHeight,frame:box('[data-preview-frame-shell]'),canvas:box('[data-preview-canvas]'),source:{width:iframe.clientWidth,height:iframe.clientHeight},border:parseFloat(style.borderTopWidth),radius:parseFloat(style.borderRadius),shadow:style.boxShadow,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(result.overflow,false);
    assert.ok(Math.abs(result.frame.x+result.frame.width/2-width/2)<1);
    assert.ok(Math.abs(result.frame.y+result.frame.height/2-height/2)<1);
    assert.equal(await page.locator('[data-preview-actual-guide], [data-preview-guide-variant]').count(),0,'no startup guide in the preview workspace');
    if(device==='pc') {
      assert.equal(result.border,0);assert.equal(result.radius,0);assert.equal(result.shadow,'none');
      if(width>=768) {
        assert.deepEqual(result.source,{width,height});
        assert.equal(result.frame.x,0);assert.equal(result.frame.y,0);
        assert.equal(result.frame.width,width);assert.equal(result.frame.height,height);
      } else {
        assert.deepEqual(result.source,{width:1440,height:900});
        assert.ok(Math.abs(result.frame.width/result.frame.height-1.6)<.001);
      }
    } else {
      assert.deepEqual(result.source,device==='tablet'?{width:1180,height:820}:{width:390,height:844});
      const scale=result.frame.width/(result.source.width+20);
      assert.ok(scale<=1.251);
      assert.ok(Math.abs(result.frame.width-result.canvas.width)<1 || Math.abs(result.frame.height-result.canvas.height)<1 || Math.abs(scale-1.25)<.001,'fill available space until the wide-screen cap');
    }
    const shell=page.locator('[data-preview-frame-shell]');
    const before=await shell.boundingBox();
    await page.frameLocator('iframe').locator('body').evaluate(()=>{window.__qaPreviewDocument='preserved';});
    if(width>=960) {
      await page.getByRole('button',{name:'보기 옵션 닫기',exact:true}).click();
      assert.deepEqual(await shell.boundingBox(),before,'closing the sidebar must not move the surface');
      await page.getByRole('button',{name:'보기 옵션 열기',exact:true}).click();
      assert.deepEqual(await shell.boundingBox(),before);
    }
    await page.getByRole('button',{name:'기기 선택 도구 닫기',exact:true}).click();
    assert.deepEqual(await shell.boundingBox(),before,'collapsing toolbar must not move the surface');
    await page.getByRole('button',{name:'기기 선택 도구 열기',exact:true}).click();
    assert.equal(await page.frameLocator('iframe').locator('body').evaluate(()=>window.__qaPreviewDocument),'preserved');
    if(width===1440) await page.screenshot({path:`${output}/preview-${device}.png`});
    if(width===3440) await page.screenshot({path:`${output}/wide-${device}.png`});
    if(width===390) await page.screenshot({path:`${output}/phone-${device}.png`});
    report.previews.push({device,...result});console.log(`page-centered preview ${width} ${device} passed`);
  }

  report.actualViews=[];
  for(const [width,height] of [[320,740],[390,844],[820,1180],[1440,900]]) {
    await page.setViewportSize({width,height});
    await page.goto(`${base}/templates/cafe_design_a/preview?device=tablet`,{waitUntil:'domcontentloaded'});
    const [actual]=await Promise.all([page.waitForEvent('popup'),page.getByRole('link',{name:'실제 화면 보기',exact:true}).click()]);
    actual.on('pageerror',error=>errors.push(error.message));
    await actual.setViewportSize({width,height});
    const guide=actual.getByRole('dialog',{name:'실제 화면 보기 안내',exact:true});
    await guide.waitFor({state:'visible'});
    assert.equal(await actual.evaluate(()=>!!document.fullscreenElement),false);
    const box=await guide.boundingBox();
    assert.ok(Math.abs(box.x+box.width/2-width/2)<1 && Math.abs(box.y+box.height/2-height/2)<1);
    await guide.getByText(/브라우저 오른쪽 상단의 더보기/).waitFor();
    await guide.locator('[data-preview-guide-profile]').waitFor();
    if(width===1440) await actual.screenshot({path:`${output}/actual-guide.png`});
    if(width===390) await actual.screenshot({path:`${output}/actual-guide-phone.png`});
    await guide.getByRole('button',{name:'전체화면 보기',exact:true}).click();
    await actual.waitForFunction(()=>!!document.fullscreenElement);
    assert.equal(await actual.locator('[data-preview-fullscreen-control], [data-preview-actual-guide]').count(),0,'fullscreen has no guide or controls');
    await actual.keyboard.press('Escape');
    await actual.waitForFunction(()=>!document.fullscreenElement);
    assert.equal(await actual.locator('[data-preview-actual-guide][open]').count(),0,'do not reopen the guide on fullscreen exit');
    await actual.getByRole('button',{name:'화면 보기 안내',exact:true}).click();
    await guide.waitFor({state:'visible'});
    await guide.getByRole('button',{name:'닫기',exact:true}).click();
    await guide.waitFor({state:'hidden'});
    await actual.getByRole('heading',{name:'REAL MATCHA',exact:true}).waitFor();
    assert.equal(await actual.locator('[data-preview-frame-shell],iframe').count(),0);
    await actual.close();report.actualViews.push({width,height});console.log(`centered actual guide, fullscreen hiding and close ${width} passed`);
  }
  const fallback=await browser.newPage({viewport:{width:390,height:844}});
  await fallback.addInitScript(()=>Object.defineProperty(document,'fullscreenEnabled',{get:()=>false}));
  await fallback.goto(`${base}/templates/cafe_design_a/preview?view=actual&embedded=1&detached=1`,{waitUntil:'domcontentloaded'});
  const fallbackGuide=fallback.getByRole('dialog',{name:'실제 화면 보기 안내',exact:true});
  await fallbackGuide.getByRole('button',{name:'전체화면 보기',exact:true}).click();
  await fallbackGuide.getByRole('status').waitFor();
  assert.equal(await fallback.evaluate(()=>!!document.fullscreenElement),false);
  await fallbackGuide.getByRole('link',{name:'이용 가이드',exact:true}).waitFor();await fallback.close();

  await page.goto(`${base}/design-system`,{waitUntil:'domcontentloaded'});
  const componentRules=page.locator('#wide-screen-components').getByRole('table',{name:'와이드 화면 글자 크기 기준',exact:true});
  await componentRules.waitFor({state:'visible'});
  const componentText=await componentRules.innerText();
  const mockupText=await page.locator('#wide-screen-components').getByRole('table',{name:'미리보기 목업 크기 기준',exact:true}).innerText();
  assert.match(mockupText,/최대 1.25배/);
  await page.locator('#wide-screen-components .site-collection').screenshot({path:`${output}/mockup-size-rules.png`});
  await page.waitForTimeout(500);
  await page.getByRole('tab',{name:'기준·토큰',exact:true}).click();
  const foundationRules=page.locator('#wide-screen-foundations').getByRole('table',{name:'와이드 화면 글자 크기 기준',exact:true});
  await foundationRules.waitFor({state:'visible'});
  assert.equal(await foundationRules.innerText(),componentText);
  assert.equal(await page.locator('#wide-screen-foundations').getByRole('table',{name:'미리보기 목업 크기 기준',exact:true}).innerText(),mockupText);
  console.log('shared wide rules in foundations and component library passed');

  for(const width of [390,820,1440,3440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(`${base}/templates`,{waitUntil:'domcontentloaded'});
    const pagination=page.getByRole('navigation',{name:'템플릿 페이지'});
    await pagination.waitFor({state:'visible'});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(500);
    const active=pagination.locator('[aria-current="page"]:visible');
    const style=await active.evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,color:s.color,radius:s.borderRadius};});
    assert.equal(style.background,'rgb(21, 24, 30)');
    assert.equal(style.color,'rgb(255, 255, 255)');assert.equal(style.radius,'8px');
    await pagination.getByRole('button',{name:'마지막 페이지',exact:true}).click();
    assert.equal(await pagination.getByRole('button',{name:'다음 페이지',exact:true}).isDisabled(),true);
    await pagination.getByRole('button',{name:'첫 페이지',exact:true}).click();
    assert.equal(await pagination.getByRole('button',{name:'이전 페이지',exact:true}).isDisabled(),true);
    if(width===1440) await pagination.screenshot({path:`${output}/pagination.png`});
    report.pagination.push({width,style});
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:true,loginWidths:report.login.map(m=>m.width),previewCases:report.previews.length,paginationWidths:report.pagination.map(m=>m.width),output}));
} finally { await browser.close(); }
