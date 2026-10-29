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

  let dismissedGuide = false;
  for (const [width,height] of [[320,740],[390,844],[430,932],[667,375],[820,1180],[1440,900],[2560,1440],[3440,1440]]) for(const device of ['tablet','pc','mobile']) {
    await page.setViewportSize({width,height});
    await page.goto(`${base}/templates/cafe_design_a/preview?device=${device}&previewOptions=design`,{waitUntil:'domcontentloaded'});
    const guide=page.getByRole('dialog',{name:'메뉴판 미리보기 사용 안내'});
    if(!dismissedGuide) {
      await guide.waitFor({state:'visible'});
      await guide.getByRole('checkbox',{name:'오늘 하루 보지 않기',exact:true}).check();
      await guide.getByRole('button',{name:'닫기',exact:true}).click();
      await guide.waitFor({state:'hidden'});
      dismissedGuide = true;
    }
    await page.locator('[data-preview-frame-shell]').waitFor({state:'visible'});
    await page.frameLocator('iframe').getByRole('heading',{name:'REAL MATCHA',exact:true}).waitFor({state:'visible'});
    await page.waitForTimeout(400);
    const result=await page.evaluate(()=>{
      const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
      const iframe=document.querySelector('iframe');
      return {width:innerWidth,height:innerHeight,controlFont:parseFloat(getComputedStyle(document.querySelector('[data-preview-device-toolbar] a')).fontSize),frame:box('[data-preview-frame-shell]'),canvas:box('[data-preview-canvas]'),toolbar:box('[data-preview-device-toolbar]'),source:{width:iframe.clientWidth,height:iframe.clientHeight},overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(result.overflow,false);
    assert.ok(Math.abs(result.frame.x+result.frame.width/2-result.canvas.x-result.canvas.width/2)<2);
    assert.ok(Math.abs(result.frame.y+result.frame.height/2-result.canvas.y-result.canvas.height/2)<2);
    assert.ok(result.frame.x>=0&&result.frame.y>=result.toolbar.bottom-1&&result.frame.right<=width+1&&result.frame.bottom<=height+1);
    if(width>=768) {
      assert.ok(result.toolbar.width<=848+1);
      assert.ok(result.toolbar.height<=104);
      if(device==='pc') {
        assert.ok(Math.abs(result.frame.width-result.canvas.width)<1 || Math.abs(result.frame.height-result.canvas.height)<1,'PC fills one canvas edge without cropping');
      } else if(device==='tablet') {
        assert.ok(result.frame.width<=result.canvas.width*.9+1);
        assert.ok(result.frame.height<=result.canvas.height*.9+1);
        assert.ok(Math.abs(result.frame.width-result.canvas.width*.9)<1 || Math.abs(result.frame.height-result.canvas.height*.9)<1,'tablet uses its available space without a native-size cap');
      } else {
        assert.ok(result.frame.width<=result.canvas.width*.9+1);
        assert.ok(result.frame.height<=result.canvas.height*.84+1);
        assert.ok(result.frame.width/(result.source.width+20)<=1.25+.001);
      }
    } else if(device==='tablet') {
      assert.ok(result.frame.width<=result.canvas.width*.9+1);
      assert.ok(result.frame.height<=result.canvas.height*.9+1);
    }
    assert.ok(result.controlFont<=15.75+.05);
    const clippedControls=await page.locator('[data-preview-device-toolbar] a, [data-preview-device-toolbar] .site-preview-choice').evaluateAll(links=>links.filter(a=>{
      const r=a.getBoundingClientRect(),h=a.closest('header').getBoundingClientRect();
      const t=a.closest('header').querySelector('button').getBoundingClientRect();
      return r.left<h.left||r.right>h.right||r.top<h.top||r.bottom>h.bottom||(r.left<t.right&&r.right>t.left&&r.top<t.bottom&&r.bottom>t.top);
    }).map(a=>a.textContent));
    assert.deepEqual(clippedControls,[],'toolbar controls remain readable and do not overlap the close handle');
    assert.deepEqual(result.source,device==='pc'?{width:1440,height:900}:device==='tablet'?{width:1180,height:820}:{width:390,height:844});
    assert.equal(await page.locator('[data-preview-fullscreen-control], [data-preview-edit-link]').count(),0);
    const toolbar=page.locator('[data-preview-device-toolbar]');
    await toolbar.getByRole('checkbox',{name:'호출 기능 미리보기',exact:true}).waitFor({state:'visible'});
    await toolbar.getByRole('checkbox',{name:'주문 기능 미리보기',exact:true}).waitFor({state:'visible'});
    assert.equal(await toolbar.locator('[data-preview-layout-mode]').count(),device==='mobile'?0:2);
    assert.equal(await page.locator('[data-preview-options-panel] [data-preview-call-toggle], [data-preview-options-panel] [data-preview-order-toggle], [data-preview-options-panel] [data-preview-layout-mode]').count(),0);
    if(width>=960){
      const labelProblems=await page.locator('[data-preview-options-panel] label').evaluateAll(labels=>labels.flatMap(label=>{
        const text=[...label.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());
        if(!text) return [];
        const range=document.createRange();range.selectNodeContents(text);
        return range.getClientRects().length>1?[label.textContent.trim()]:[];
      }));
      assert.deepEqual(labelProblems,[],'short design labels must stay on one line');
      const iframe=page.frameLocator('iframe');
      await iframe.locator('body').evaluate(e=>{window.__qaPreviewDocument='preserve';e.scrollTop=20;});
      await page.getByRole('button',{name:'보기 옵션 닫기',exact:true}).click();
      assert.equal(await iframe.locator('body').evaluate(()=>window.__qaPreviewDocument),'preserve');
      assert.equal(await toolbar.getByRole('checkbox',{name:'호출 기능 미리보기',exact:true}).isVisible(),true);
      assert.equal(await toolbar.getByRole('checkbox',{name:'주문 기능 미리보기',exact:true}).isVisible(),true);
      await page.getByRole('button',{name:'보기 옵션 열기',exact:true}).click();
    }
    if(width===1440&&device!=='mobile') await page.screenshot({path:`${output}/laptop-${device}.png`});
    if(width===3440&&device==='tablet') await page.screenshot({path:`${output}/template-preview-wide.png`});
    if(width===3440&&device==='pc') await page.screenshot({path:`${output}/template-preview-pc-wide.png`});
    if(width===390&&device==='mobile') await page.screenshot({path:`${output}/preview-mobile.png`});
    if(width===390&&device!=='mobile') await page.screenshot({path:`${output}/phone-view-${device}.png`});
    report.previews.push({device,...result});
    console.log(`preview ${width} ${device} passed`);
  }

  for (const width of [320,390,430,667,820,1440,2560,3440]) {
    const pc=report.previews.find(p=>p.width===width&&p.device==='pc');
    const tablet=report.previews.find(p=>p.width===width&&p.device==='tablet');
    assert.ok(pc.frame.width>tablet.frame.width*1.05,'tablet must remain visibly smaller than PC in the same workspace');
  }

  await page.goto(`${base}/templates/cafe_design_a/preview?device=tablet&previewOptions=design`,{waitUntil:'domcontentloaded'});
  const serviceToolbar=page.locator('[data-preview-device-toolbar]');
  await serviceToolbar.getByRole('checkbox',{name:'호출 기능 미리보기',exact:true}).check();
  await page.waitForURL(/callPreview=on/);
  await serviceToolbar.getByRole('checkbox',{name:'주문 기능 미리보기',exact:true}).check();
  await page.waitForURL(/orderPreview=on/);
  await serviceToolbar.getByRole('link',{name:'채움형',exact:true}).click();
  await page.waitForURL(/layoutMode=orderedFit/);
  assert.equal(await serviceToolbar.getByRole('checkbox',{name:'호출 기능 미리보기',exact:true}).isChecked(),true);
  assert.equal(await serviceToolbar.getByRole('checkbox',{name:'주문 기능 미리보기',exact:true}).isChecked(),true);
  assert.equal(await serviceToolbar.getByRole('link',{name:'채움형',exact:true}).getAttribute('aria-current'),'true');
  assert.equal(new URL(page.url()).searchParams.get('previewOptions'),'design');
  await serviceToolbar.getByRole('link',{name:'PC',exact:true}).click();
  await page.waitForURL(/device=pc/);
  for (const [key,value] of [['callPreview','on'],['orderPreview','on'],['layoutMode','orderedFit']]) assert.equal(new URL(page.url()).searchParams.get(key),value);
  await page.frameLocator('iframe').getByRole('button',{name:'직원 호출하기',exact:true}).waitFor({state:'visible'});
  await page.frameLocator('iframe').getByRole('button',{name:/^주문하기/}).waitFor({state:'visible'});
  console.log('top toolbar Call, Order and layout interactions preserve selections across devices');

  // The original click requests fullscreen; actual views infer the current viewport.
  report.actualViews = [];
  for (const [width,height] of [[390,844],[820,1180],[1440,900]]) {
    await page.setViewportSize({width,height});
    await page.goto(`${base}/templates/cafe_design_a/preview?device=pc&callPreview=on&orderPreview=on&layoutMode=orderedFit`,{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('[data-preview-tablet-orientation-toggle]').count(),0);
    const href=await page.getByRole('link',{name:'실제 화면 보기',exact:true}).getAttribute('href');
    const params=new URL(href,base).searchParams;
    assert.equal(params.get('view'),'actual');
    assert.equal(params.has('device'),false);
    assert.equal(params.has('orientation'),false);
    for(const key of ['callPreview','orderPreview']) assert.equal(params.get(key),'on');
    await page.frameLocator('[data-preview-frame-shell] iframe').getByRole('heading',{name:'REAL MATCHA',exact:true}).waitFor();
    await page.locator('[data-preview-frame-shell] iframe').evaluate(e=>e.contentWindow.__actualReturnMarker='preserved');
    await page.getByRole('link',{name:'실제 화면 보기',exact:true}).click();
    await page.waitForFunction(()=>!!document.fullscreenElement);
    const actual=page.getByRole('dialog',{name:'메뉴판 실제 화면',exact:true});
    await actual.frameLocator('iframe').getByRole('heading',{name:'REAL MATCHA',exact:true}).waitFor();
    assert.equal(await actual.frameLocator('iframe').locator('[data-preview-frame-shell]').count(),0);
    const metrics=await actual.locator('iframe').evaluate(el=>({width:el.clientWidth,height:el.clientHeight,screenWidth:el.parentElement.clientWidth,screenHeight:el.parentElement.clientHeight}));
    assert.equal(metrics.width,metrics.screenWidth); assert.equal(metrics.height,metrics.screenHeight);
    assert.equal(await actual.getByRole('link',{name:'이용 가이드',exact:true}).getAttribute('href'),'/guides');
    await actual.getByRole('button',{name:'확인',exact:true}).click();
    if(width===390) await page.screenshot({path:`${output}/actual-screen-mobile.png`});
    if(width===1440) await page.screenshot({path:`${output}/actual-screen-pc.png`});
    await actual.getByRole('button',{name:'실제 화면 닫기',exact:true}).click();
    await actual.waitFor({state:'hidden'});
    await page.waitForFunction(()=>!document.fullscreenElement);
    assert.equal(new URL(page.url()).searchParams.get('device'),'pc');
    assert.equal(await page.locator('[data-preview-frame-shell] iframe').evaluate(e=>e.contentWindow.__actualReturnMarker),'preserved');
    await page.waitForFunction(()=>document.activeElement?.matches('[data-preview-detached-link]'));
    report.actualViews.push({width,height,...metrics});
  }
  // Unsupported mobile browsers still receive the real menu and a guide, never another mockup.
  const fallback=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await fallback.addInitScript(()=>{Object.defineProperty(document,'fullscreenEnabled',{get:()=>false});});
  await fallback.goto(`${base}/templates/cafe_design_a/preview?device=tablet`,{waitUntil:'domcontentloaded'});
  const fallbackGuide=fallback.getByRole('dialog',{name:'메뉴판 미리보기 사용 안내'});
  await fallbackGuide.waitFor({state:'visible'});
  await fallbackGuide.getByRole('button',{name:'닫기',exact:true}).click();
  await fallback.getByRole('link',{name:'실제 화면 보기',exact:true}).click();
  const actualFallback=fallback.getByRole('dialog',{name:'메뉴판 실제 화면',exact:true});
  await actualFallback.frameLocator('iframe').getByRole('heading',{name:'REAL MATCHA',exact:true}).waitFor();
  assert.equal(await fallback.evaluate(()=>!!document.fullscreenElement),false);
  assert.equal(await actualFallback.frameLocator('iframe').locator('[data-preview-frame-shell]').count(),0);
  assert.equal(await actualFallback.locator('iframe').evaluate(e=>e.clientWidth),390);
  await actualFallback.getByRole('link',{name:'이용 가이드',exact:true}).waitFor({state:'visible'});
  await actualFallback.getByRole('button',{name:'실제 화면 닫기',exact:true}).click();
  await fallback.close();
  // Dining alone offers rotation, in both directions, without moving service controls.
  for(const [width,height] of [[390,844],[820,1180],[1440,900]]) {
    await page.setViewportSize({width,height});
    await page.goto(`${base}/templates/dining_aube_table_a/preview?device=tablet`,{waitUntil:'domcontentloaded'});
    await page.getByRole('link',{name:'태블릿을 세로로 회전',exact:true}).click();
    await page.waitForURL(/orientation=portrait/);
    assert.equal(await page.locator('[data-preview-frame-shell] iframe').evaluate(e=>e.clientWidth),820);
    await page.getByRole('link',{name:'태블릿을 가로로 회전',exact:true}).click();
    await page.waitForURL(/orientation=landscape/);
    assert.equal(await page.locator('[data-preview-frame-shell] iframe').evaluate(e=>e.clientWidth),1180);
  }
  console.log('one-click actual fullscreen, unsupported mobile fallback and Dining-only rotation passed');

  await page.goto(`${base}/design-system`,{waitUntil:'domcontentloaded'});
  const componentRules=page.locator('#wide-screen-components').getByRole('table',{name:'와이드 화면 글자 크기 기준',exact:true});
  await componentRules.waitFor({state:'visible'});
  const componentText=await componentRules.innerText();
  const mockupText=await page.locator('#wide-screen-components').getByRole('table',{name:'미리보기 목업 크기 기준',exact:true}).innerText();
  assert.match(mockupText,/가로 90%/);
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
