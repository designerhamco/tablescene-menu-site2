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
  for (const [width,height] of [[390,844],[820,1180],[1440,900],[2560,1440],[3440,1440]]) for(const device of ['tablet','pc','mobile']) {
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
      assert.ok(result.frame.width<=result.canvas.width*.9+1);
      assert.ok(result.frame.height<=result.canvas.height*.84+1);
      assert.ok(result.frame.width/(result.source.width+20)<=1.25+.001);
      assert.ok(result.toolbar.width<=576+1);
      assert.ok(result.toolbar.height<=56);
    }
    assert.ok(result.controlFont<=15.75+.05);
    const clippedControls=await page.locator('[data-preview-device-toolbar] a').evaluateAll(links=>links.filter(a=>{
      const r=a.getBoundingClientRect(),h=a.closest('header').getBoundingClientRect();
      const t=a.closest('header').querySelector('button').getBoundingClientRect();
      return r.left<h.left||r.right>h.right||r.top<h.top||r.bottom>h.bottom||(r.left<t.right&&r.right>t.left&&r.top<t.bottom&&r.bottom>t.top);
    }).map(a=>a.textContent));
    assert.deepEqual(clippedControls,[],'toolbar controls remain readable and do not overlap the close handle');
    assert.deepEqual(result.source,device==='pc'?{width:1440,height:900}:device==='tablet'?{width:1180,height:820}:{width:390,height:844});
    assert.equal(await page.locator('[data-preview-fullscreen-control], [data-preview-edit-link]').count(),0);
    assert.equal(await page.locator('[data-preview-device-toolbar] [data-preview-call-toggle]').count(),0);
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
      await page.getByRole('button',{name:'보기 옵션 열기',exact:true}).click();
    }
    if(width===3440&&device==='tablet') await page.screenshot({path:`${output}/template-preview-wide.png`});
    if(width===390&&device==='mobile') await page.screenshot({path:`${output}/preview-mobile.png`});
    report.previews.push({device,...result});
    console.log(`preview ${width} ${device} passed`);
  }

  // New-window view alone exposes fullscreen, through an explicit user action.
  const href=await page.locator('[data-preview-detached-link]').getAttribute('href');
  const detached=await browser.newPage({viewport:{width:1920,height:1080}});
  await detached.goto(new URL(href,base).href,{waitUntil:'domcontentloaded'});
  await detached.waitForTimeout(1500);
  await detached.getByRole('button',{name:'전체화면으로 보기',exact:true}).click();
  await detached.waitForFunction(()=>Boolean(document.fullscreenElement));
  await detached.getByRole('button',{name:'전체화면 종료',exact:true}).click();
  await detached.waitForFunction(()=>!document.fullscreenElement);
  await detached.close();
  console.log('detached fullscreen enter/exit passed');

  await page.goto(`${base}/design-system`,{waitUntil:'domcontentloaded'});
  const componentRules=page.locator('#wide-screen-components table');
  await componentRules.waitFor({state:'visible'});
  const componentText=await componentRules.innerText();
  await page.waitForTimeout(500);
  await page.getByRole('tab',{name:'기준·토큰',exact:true}).click();
  const foundationRules=page.locator('#wide-screen-foundations table');
  await foundationRules.waitFor({state:'visible'});
  assert.equal(await foundationRules.innerText(),componentText);
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
