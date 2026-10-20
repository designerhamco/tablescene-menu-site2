import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';
const base = process.env.ORDER_QA_BASE || 'http://localhost:3000';
const out = process.env.ORDER_QA_OUTPUT || '/private/tmp/basic-column-balance-before';
await fs.mkdir(out, { recursive: true });
const bundled = await build({ stdin: { contents: `export {layoutScrollableMenu,selectScrollableMenuCandidate} from './lib/basic-menu-scroll'; export {measureScrollableNames} from './components/menu-templates/experimental/scroll-name-readability'; export {applyOnePageChipLayouts} from './components/menu-templates/one-page-chip-layout';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'browser', format: 'iife', globalName: 'ColumnAudit' });
const browser = await chromium.launch(), results = [];
const keys = ['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a'];
try {
 for (const key of keys) for (const [device,width,height] of [['pc',1440,900],['tablet',1180,820],['tablet',820,1180]]) for (const mode of ['orderedBalancedFit','orderedFit']) {
  const page = await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  try {
   await page.goto(`${base}/templates/${key}/preview?`+new URLSearchParams({device,view:'actual',embedded:'1',callPreview:'on',orderPreview:'on',layoutMode:mode}),{waitUntil:'networkidle'});
   await page.evaluate(()=>document.fonts.ready);
   await page.locator('[data-native-ready=true],[data-paged-ready=true]').first().waitFor();
   await page.addScriptTag({content:bundled.outputFiles[0].text});
   const result = await page.evaluate(({key,mode})=>{
    const native=!!document.querySelector('[data-native-scroll]');
    const board=document.querySelector(native?'[data-native-scroll]':'[data-scroll-template]');
    const menu=document.querySelector(native?'[data-native-menu]':'[data-scroll-menu]');
    const rows=[...menu.querySelectorAll('[data-measure-id]')];
    const measure=rows[0].parentElement, previous=measure.getAttribute('style');
    const gap=parseFloat(getComputedStyle(menu).columnGap)||parseFloat(getComputedStyle(board).getPropertyValue('--native-gap'))||parseFloat(getComputedStyle(board).getPropertyValue('--scroll-column-gap'))||24;
    const width=menu.clientWidth;
    const center=key==='cafe_round_focus_a';
    if(center)return {current:2,fixedCenter:true};
    const footer=measure.lastElementChild?.matches('[data-measure-id]')?0:measure.lastElementChild?.getBoundingClientRect().height||0;
    const grouped=mode==='orderedBalancedFit';
    const candidates=[2,3].filter(count=>(width-(count-1)*gap)/count>=192).map(count=>{
     const columnWidth=(width-(count-1)*gap)/count;
     measure.style.width=`${columnWidth}px`;
     ColumnAudit.applyOnePageChipLayouts(measure);
     let group='';
     const blocks=rows.map((el,index)=>{
      if(el.dataset.kind!=='item')group=el.dataset.measureId;
      const rhythm=Number(el.querySelector('[data-cafe-a-item-rhythm]')?.dataset.cafeAItemRhythm||1);
      el.style.setProperty(native?'--native-rhythm':'--scroll-item-rhythm',String(rhythm));
      let gapAfter=parseFloat(getComputedStyle(el).paddingBottom)||0;
      let height=el.getBoundingClientRect().height;
      if(native&&index===rows.length-1&&footer){height-=gapAfter;gapAfter=0;}
      return {id:el.dataset.measureId,group,kind:el.dataset.kind,height,gapAfter};
     });
     const layout=ColumnAudit.layoutScrollableMenu(blocks,count,menu.clientHeight,grouped,{footerHeight:footer});
     const names=ColumnAudit.measureScrollableNames(measure);
     const heights=layout.naturalHeights;
     return {columnCount:count,columnWidth,names,layout,metrics:{heights,spread:Math.max(...heights)-Math.min(...heights),imbalance:(Math.max(...heights)-Math.min(...heights))/Math.max(...heights),emptyRatio:1-heights.reduce((a,b)=>a+b,0)/(count*Math.max(menu.clientHeight,...heights)),scroll:Math.max(0,Math.max(...heights)-menu.clientHeight)}};
    });
    if(previous===null)measure.removeAttribute('style');else measure.setAttribute('style',previous);
    ColumnAudit.applyOnePageChipLayouts(measure);
    return {viewport:[innerWidth,innerHeight],current:document.querySelectorAll(native?'[data-native-column]':'[data-paged-column]').length,menuHeight:menu.clientHeight,candidates:candidates.map(c=>({count:c.columnCount,width:c.columnWidth,metrics:c.metrics,groups:c.layout.columns.map(col=>[...new Set(col.map(b=>b.group))]),names:c.names.map(n=>({id:n.id,lines:n.lines,availableWidth:n.availableWidth,overflow:n.overflow}))}))};
   },{key,mode});
   results.push({key,device,width,height,mode,...result});
   if(key==='cafe_mocha_forest_a'&&mode==='orderedBalancedFit')await page.screenshot({path:`${out}/${key}-${width}.png`});
  } finally {await page.close();}
 }
} finally {await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify(results,null,2));}
for(const r of results.filter(r=>r.key==='cafe_mocha_forest_a')) console.log(JSON.stringify({key:r.key,width:r.width,mode:r.mode,current:r.current,candidates:r.candidates.map(c=>({count:c.count,...c.metrics}))}));
console.log('checked',results.length);
