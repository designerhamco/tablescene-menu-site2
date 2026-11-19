import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base=process.env.DEVICE_PLATFORM_QA_BASE_URL||"http://127.0.0.1:3043";
const output=process.env.DEVICE_PLATFORM_QA_OUTPUT||"/tmp/artimenu-device-platform-qa";
const scenes=["matcha","mellow","crema","rosy"];
const viewports=[{width:320,height:740},{width:390,height:844},{width:820,height:1180},{width:1024,height:768},{width:1440,height:900},{width:2560,height:1440}];
const results=[];
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext();

async function geometry(page){
  return page.locator("[data-device-platform]").evaluate(root=>{
    const stage=root.children[0].getBoundingClientRect();
    return {width:innerWidth,height:innerHeight,index:Number(root.dataset.templateIndex),position:Number(root.dataset.templatePosition),
      mode:root.dataset.imageMode,iframes:root.querySelectorAll("iframe").length,
      bodies:[...root.querySelectorAll("[data-device-body]")].map(node=>{const box=node.getBoundingClientRect();return {x:box.x-stage.x,y:box.y-stage.y,width:box.width,height:box.height,bottom:box.bottom-stage.y};}),
      contacts:[...root.querySelectorAll("[data-device-contact-shadow]")].map(node=>{const box=node.getBoundingClientRect();return box.y+box.height/2-stage.y;}),
      templates:[...root.querySelectorAll("[data-device-item]")].map(node=>node.dataset.deviceTemplate),
      screens:[...root.querySelectorAll("[data-device-screen]")].map(node=>[...node.querySelectorAll("img")].map(image=>({scene:image.dataset.deviceScreenScene,opacity:Number(image.style.opacity),loaded:image.complete&&image.naturalWidth>0,filter:getComputedStyle(image).filter}))),
      paper:[...root.querySelectorAll("[data-device-paper]")].map(node=>{const box=node.getBoundingClientRect();return {width:box.width,height:box.height,depth:Number(node.dataset.paperDepth),angle:Number(node.dataset.paperAngle),visible:getComputedStyle(node).visibility==="visible"};}),
      transform:root.querySelector("[data-device-frame]").style.transform,
      horizontalOverflow:document.documentElement.scrollWidth-innerWidth};
  });
}

try{
  for(const viewport of viewports){
    const page=await context.newPage();await page.setViewportSize(viewport);
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    const response=await page.goto(`${base}/#device-platform`,{waitUntil:"domcontentloaded",timeout:90000});
    assert.ok(response?.ok(),`homepage HTTP ${response?.status()}`);
    const story=page.locator("[data-device-platform]");await story.waitFor();
    await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
    await page.waitForFunction(()=>[...document.querySelectorAll("[data-device-screen] img")].every(image=>image.complete&&image.naturalWidth>0),{},{timeout:30000});
    const scroll=await story.evaluate(root=>({
      start:scrollY+root.getBoundingClientRect().top-parseFloat(getComputedStyle(root.parentElement).scrollMarginTop),
      range:root.offsetHeight-root.children[0].offsetHeight,
    }));
    const seek=async progress=>{
      await page.evaluate(({start,range,progress})=>scrollTo({top:start+range*progress,behavior:"instant"}),{...scroll,progress});
      await page.waitForTimeout(180);
    };
    await seek(0);const initial=await geometry(page);
    assert.equal(initial.mode,"static");assert.equal(initial.iframes,0);
    assert.equal(initial.bodies.length,3);assert.ok(initial.horizontalOverflow<=1);
    assert.ok(Math.max(...initial.bodies.map(body=>body.bottom))-Math.min(...initial.bodies.map(body=>body.bottom))<.2,"physical bottoms must share the floor");
    for(const contact of initial.contacts)assert.ok(Math.abs(contact-initial.bodies[0].bottom)<1,"contact shadows meet the floor");
    for(const body of initial.bodies)assert.ok(body.x>=0&&body.x+body.width<=initial.width+1);
    assert.ok(initial.paper[5].depth>initial.paper[4].depth);
    assert.ok(initial.paper[5].height>initial.paper[4].height,"side thumbnails must appear closer/larger");
    const visual=page.locator("[data-device-platform] [role=img]");const box=await visual.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height*.6);const before=await page.evaluate(()=>scrollY);
    await page.mouse.wheel(0,220);await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>scrollY)>before,"native wheel scroll");
    for(const index of [0,1,2,3,2,1,0]){
      await seek(index/3);const state=await geometry(page);
      assert.equal(state.index,index,`${viewport.width}px template ${index}`);
      assert.equal(new Set(state.templates).size,1,"all three screens use the same template");
      assert.equal(state.transform,initial.transform,"scroll and copy changes must not move artwork");
      for(let item=0;item<state.bodies.length;item++)for(const prop of ["x","y","width","height","bottom"]){
        assert.ok(Math.abs(state.bodies[item][prop]-initial.bodies[item][prop])<1,`${viewport.width}px ${prop} changed during scroll`);
      }
      for(const screen of state.screens){assert.ok(screen[index].opacity>.999&&screen[index].loaded);assert.equal(screen[index].scene,scenes[index]);assert.ok(screen.every(image=>image.filter==="none"));}
      results.push({viewport:state.width,height:state.height,template:scenes[index],floor:state.bodies[0].bottom});
      if(index===0||index===3)await page.screenshot({path:`${output}/${viewport.width}-${scenes[index]}.png`});
    }
    await seek(1);const last=await geometry(page);
    await page.evaluate(y=>scrollTo({top:y,behavior:"instant"}),scroll.start+scroll.range+viewport.height*.35);await page.waitForTimeout(180);
    assert.equal((await geometry(page)).transform,last.transform,"the outgoing device artwork stays fixed under the next service section");
    await seek(0);assert.equal((await geometry(page)).index,0);
    assert.deepEqual(errors,[],`${viewport.width}px runtime errors`);
    await page.close();
  }
  const reducedContext=await browser.newContext({reducedMotion:"reduce",viewport:{width:390,height:844}});
  const page=await reducedContext.newPage();await page.goto(`${base}/#device-platform`,{waitUntil:"domcontentloaded"});
  const story=page.locator("[data-device-platform]");await story.waitFor();
  await page.waitForFunction(()=>document.querySelector("[data-device-platform]")?.getAttribute("data-reduced")==="true",{},{timeout:20000});
  assert.equal(await story.getAttribute("data-reduced"),"true");
  assert.equal(await story.getAttribute("data-template-index"),"0");
  assert.equal(await story.evaluate(node=>getComputedStyle(node.children[0]).position),"relative");
  assert.equal(await story.locator("iframe").count(),0);await reducedContext.close();
}finally{await browser.close();}

await writeFile(`${output}/results.json`,JSON.stringify({passed:results.length,reducedMotion:true,results},null,2));
console.log(JSON.stringify({passed:results.length,viewports:viewports.length,reducedMotion:true,output}));
