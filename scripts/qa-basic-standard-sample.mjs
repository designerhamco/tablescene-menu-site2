import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.BASIC_SAMPLE_QA_BASE || 'http://localhost:3027';
const output = '/private/tmp/basic-standard-sample-qa';
const capture = process.env.BASIC_SAMPLE_THUMBNAILS === '1';
const categoryNames = {
  ko: ['MAIN', 'SIDES', 'DESSERTS', 'DRINKS'],
  en: ['MAIN', 'SIDES', 'DESSERTS', 'DRINKS'],
  ja: ['メイン', 'サイド', 'デザート', 'ドリンク'],
  zh: ['主食', '配菜', '甜点', '饮品'],
};
const designs = ['basic-first-column','basic-top-row','basic-top-row-left-logo','basic-center-column','basic-upper-left','basic-first-column-album','basic-top-row-album'];
const devices = [['pc',1440,900],['tablet',1180,820],['tablet',820,1180],['mobile',320,800],['mobile',430,932]];
const selected = process.env.BASIC_SAMPLE_QA_DESIGNS?.split(',') ?? designs;
const cases = selected.flatMap(design => [...devices.map(device => ({design,device,lang:'ko'})), ...['en','ja','zh'].map(lang => ({design,device:['mobile',390,844],lang}))]);
await fs.mkdir(output,{recursive:true});
const browser = await chromium.launch();
const results = [], errors = [];
try {
  for (const {design,device:[device,width,height],lang} of cases) {
    const p = await browser.newPage({viewport:{width,height}, reducedMotion:'reduce'});
    p.on('pageerror',e=>errors.push({design,device,lang,message:e.message}));
    try {
      const query = new URLSearchParams({design, view:'actual', device});
      if (lang !== 'ko') query.set('lang', lang);
      const url = `${base}/templates/cafe_design_a/preview?${query}`;
      for (let attempt = 0; ; attempt++) {
        const response = await p.goto(url, {waitUntil:'domcontentloaded'});
        assert.equal(response.status(), 200);
        await p.evaluate(() => document.fonts.ready);
        try {
          await p.locator(`[data-default-design="${design}"] .cafe-a-category-title`).filter({visible:true}).first().waitFor({timeout:5000});
          if (device === 'mobile') await p.locator('[data-mobile-brand-fit="ready"]').waitFor({state:'attached', timeout:5000});
          break;
        } catch (error) {
          if (attempt === 1) throw error;
          console.warn('Retrying preview initialization', design, device, width, lang);
        }
      }
      const text=await p.locator('body').innerText();
      assert.match(text.replace(/\s/g,''),/ARTIMENU/);
      assert.doesNotMatch(text,/CAFE ARTIMENU|MATCHA|말차|단품\/세트/);
      const headings = await p.locator('.cafe-a-category-title').filter({visible:true}).allTextContents();
      assert.deepEqual([...new Set(headings.map(heading => heading.trim()))].sort(), [...categoryNames[lang]].sort());
      if(lang==='ko') {
        for(const word of ['그릴 치킨 플레이트','토마토 파스타','레몬 에이드','계절 과일']) assert.ok(text.includes(word),word);
        assert.equal((text.match(/ICE ONLY/g)||[]).length,4);
        if(!design.endsWith('album')) {assert.match(text,/단품/);assert.match(text,/세트 선택 시 오늘의 수프/);}
        else assert.doesNotMatch(text,/세트 선택 시/);
      } else {
        assert.doesNotMatch(text,/[가-힣]/);
        assert.match(text,lang==='en'?/Grilled chicken plate/:lang==='ja'?/グリルチキンプレート/:/香烤鸡肉拼盘/);
      }
      const geometry=await p.evaluate(()=>({viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth+1}));
      assert.deepEqual(geometry.viewport,[width,height]); assert.equal(geometry.overflow,false);
      if(lang==='ko'&&(device==='pc'||width===320)) await p.screenshot({path:`${output}/${design}-${device}.png`});
      if(capture&&lang==='ko'&&device==='pc') {
        await p.setViewportSize({width:1200,height:900});
        await p.waitForTimeout(300);
        await p.addStyleTag({content:'nextjs-portal { display: none !important; }'});
        await p.screenshot({path:`public/template-previews/default-${design}-20261119-current.jpg`,type:'jpeg',quality:86,animations:'disabled'});
      }
      results.push({design,device,width,height,lang,...geometry});
      console.log('PASS',design,device,width,lang);
    } finally {await p.close();}
  }
  for(const design of ['dining-full-page','dining-sidebar']) {
    const key=design==='dining-sidebar'?'dining_aube_table_b':'dining_aube_table_a';
    const p=await browser.newPage();await p.goto(`${base}/templates/${key}/preview?design=${design}&view=actual&device=pc`,{waitUntil:'networkidle'});
    const text=await p.locator('body').innerText();assert.match(text,/DINING ARTIMENU/);assert.doesNotMatch(text,/그릴 치킨 플레이트/);results.push({design});await p.close();
  }
  assert.deepEqual(errors,[]);
} finally {await browser.close();await fs.writeFile(`${output}/report${base.includes('localhost')?'':'-production'}.json`,JSON.stringify({base,results,errors},null,2));}
console.log(JSON.stringify({checked:results.length,errors}));
