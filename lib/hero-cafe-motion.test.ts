import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import HomeHeroMotion from "../components/marketing/HomeHeroMotion";
import {HERO_CAFE_CHAPTERS,HERO_CAFE_SCREENS,HERO_CHAPTER_DURATION_MS,HERO_CHAPTER_SCROLL_LENGTHS,HERO_SCROLL_LENGTH,HERO_COUNTER_TIMELINE,HERO_PHONE_TIMELINE,heroTween,heroProgressAt,heroChapterAt,heroSceneAt,heroScreenMatrix,heroSaleZoom,heroDemoPhase,heroTemplateAt,heroPulseAt,heroPhoneValue,heroLiveSceneAt,heroSegmentProgressAt,type HeroQuad} from "./hero-cafe-motion";

test("only one demo is eligible, with a bounded tablet warmup before its scene",()=>{
 assert.deepEqual([0,1,2,3,4,-1].map(chapter=>heroLiveSceneAt(chapter,true,true,false)),[null,"counter","dining","phone",null,null]);
 assert.equal(heroLiveSceneAt(0,true,true,false,.649),null);
 assert.equal(heroLiveSceneAt(0,true,true,false,.65),"counter");
 assert.equal(heroLiveSceneAt(0,false,true,false,1),null);
 assert.equal(heroLiveSceneAt(0,true,false,false,1),null);
 assert.equal(heroLiveSceneAt(0,true,true,true,1),null);
 for(const chapter of [1,2,3]){
  assert.equal(heroLiveSceneAt(chapter,false,true,false),null);
  assert.equal(heroLiveSceneAt(chapter,true,false,false),null);
  assert.equal(heroLiveSceneAt(chapter,true,true,true),null);
 }
});
test("initial hero renders no nested applications and one capture per venue screen",()=>{
 const markup=renderToStaticMarkup(createElement(HomeHeroMotion));
 assert.doesNotMatch(markup,/<iframe\b/);
 assert.match(markup,/data-live-scene="none"/);
 assert.equal((markup.match(/role="progressbar"/g)??[]).length,4);
 assert.equal((markup.match(/data-hero-segment="/g)??[]).length,4);
 assert.doesNotMatch(markup,/data-hero-dots|ARTIMENU ·/);
 assert.equal((markup.match(/data-hero-capture="true"/g)??[]).length,4);
 assert.doesNotMatch(markup,/hero-cafe-v2|expanded\.webp|data-hero-expanded/);
 assert.equal((markup.match(/src="\/assets\/hero-cafe-v1\/venue.webp"[^>]*data-hero-ambient/g)??[]).length,4,"only the person-free room may fill the surroundings");
});

test("hero chapters follow scroll boundaries in either direction",()=>{
 assert.equal(HERO_CAFE_CHAPTERS.length,4);
 for(const [progress,chapter] of [[-1,0],[0,0],[1,3],[2,3],[NaN,0]]) assert.equal(heroChapterAt(progress),chapter);
 assert.equal(HERO_CHAPTER_SCROLL_LENGTHS[0],1.6,"opening has twice the former scroll distance");
 for(let index=1;index<4;index++)assert.ok(HERO_CHAPTER_SCROLL_LENGTHS[index]>.8*2);
 for(let index=1;index<HERO_CAFE_CHAPTERS.length;index++){
  assert.equal(heroChapterAt(heroProgressAt(index)-.00001),index-1);
  assert.equal(heroChapterAt(heroProgressAt(index)),index);
 }
});
test("each scene owns a complete 0–100% timeline, with reversible scroll seeking",()=>{
 for(let chapter=0;chapter<HERO_CAFE_CHAPTERS.length;chapter++) {
  const start=heroSceneAt(heroProgressAt(chapter));
  assert.equal(start.chapter,chapter);
  assert.ok(start.fraction<1e-10);
  const middle=heroSceneAt(heroProgressAt(chapter,.5));
  assert.equal(middle.chapter,chapter);
  assert.ok(Math.abs(middle.fraction-.5)<1e-10);
  assert.ok(Math.abs(middle.elapsed-HERO_CHAPTER_DURATION_MS[chapter]/2)<1e-10);
 }
 const forward=heroSceneAt(heroProgressAt(1,.75)),backward=heroSceneAt(heroProgressAt(1,.25));
 assert.ok(Math.abs(forward.fraction-.75)<1e-10);
 assert.ok(Math.abs(backward.fraction-.25)<1e-10);
 assert.ok(Math.abs(heroSceneAt(1).fraction-1)<1e-10);
 assert.ok(Math.abs(heroSceneAt(1).elapsed-HERO_CHAPTER_DURATION_MS[3])<1e-7);
 assert.ok(Math.abs(heroProgressAt(3,1)-1)<1e-10);
 assert.ok(HERO_SCROLL_LENGTH>10);
 assert.deepEqual(heroSceneAt(-1),{chapter:0,fraction:0,elapsed:0});
 assert.deepEqual(heroSceneAt(NaN),{chapter:0,fraction:0,elapsed:0});
});
test("projective screen overlays meet every authored device corner",()=>{
 for(const quad of [...HERO_CAFE_SCREENS.televisions,HERO_CAFE_SCREENS.venueTablet,HERO_CAFE_SCREENS.counter,HERO_CAFE_SCREENS.dining,HERO_CAFE_SCREENS.phone]) {
  const m=heroScreenMatrix(quad,1280,800).slice(9,-1).split(",").map(Number);
  [[0,0],[1280,0],[1280,800],[0,800]].forEach(([x,y],i)=>{
   const z=m[3]*x+m[7]*y+m[15];
   assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/z-quad[i][0])<.001);
   assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/z-quad[i][1])<.001);
  });
 }
 assert.throws(()=>heroScreenMatrix([[0,0],[0,0],[0,0],[0,0]] as HeroQuad,1280,800));
});
test("hero automation uses isolated synthetic catalog previews and preserves customer renderers",()=>{
 const component=readFileSync(new URL("../components/marketing/HeroLiveMenu.tsx",import.meta.url),"utf8");
 const route=readFileSync(new URL("../app/templates/[templateKey]/preview/page.tsx",import.meta.url),"utf8");
 assert.match(component,/view=actual&embedded=1&heroDemo=1&device=/);
 assert.doesNotMatch(component,/fetch\(|\/api\/public-menu/);
 assert.match(route,/getFirstParam\(resolvedSearchParams.heroDemo\) === "1"[\s\S]*?orderCallConfig.previewOnly = true;[\s\S]*?cartScope = `hero-demo-\$\{crypto.randomUUID\(\)\}`/);
});

test("scroll-only narrative has no timer-driven playback or advertisement steps",()=>{
 const component=readFileSync(new URL("../components/marketing/HomeHeroMotion.tsx",import.meta.url),"utf8");
 const native=readFileSync(new URL("../components/marketing/HeroLiveMenu.tsx",import.meta.url),"utf8");
 assert.doesNotMatch(component,/useHeroPlayback|setInterval|setTimeout|일시 정지|다시 재생/);
 assert.match(native,/popupPreview=off/);
 assert.doesNotMatch(native,/id:"advert|id:"popup"/);
 const times=[0,HERO_PHONE_TIMELINE.item[1],HERO_PHONE_TIMELINE.add[1],HERO_PHONE_TIMELINE.cart[1],HERO_PHONE_TIMELINE.typing[1],HERO_PHONE_TIMELINE.order[1],66];
 const forwards=times.map(t=>heroDemoPhase("phone",t));
 const backwards=[...times].reverse().map(t=>heroDemoPhase("phone",t));
 assert.deepEqual(forwards,[0,1,2,3,4,5,5]);
 assert.deepEqual(backwards,[...forwards].reverse());
 assert.equal(heroDemoPhase("dining",31),5);
 assert.equal(heroDemoPhase("dining",20),3);
});
test("opening presents just three templates without wrapping, and reverses the same sequence",()=>{
 const values=Array.from({length:101},(_,index)=>heroTemplateAt(index/100));
 assert.deepEqual([...new Set(values)],[0,1,2]);
 assert.equal(values.filter((value,index)=>index>0&&value!==values[index-1]).length,2);
 assert.equal(heroTemplateAt(1),2);
 assert.deepEqual([1,.5,0].map(heroTemplateAt),[2,1,0]);
});
test("each phone click has a long lead-in with repeated scroll-driven ripples",()=>{
 for(const [start,click,end] of [HERO_PHONE_TIMELINE.item,HERO_PHONE_TIMELINE.add,HERO_PHONE_TIMELINE.cart,HERO_PHONE_TIMELINE.order]){
  assert.ok(click-start>=6);
  assert.ok(end>click);
  assert.equal(heroDemoPhase("phone",click-.001)+1,heroDemoPhase("phone",click));
 }
 assert.equal(heroPulseAt(-.01),0);
 assert.equal(heroPulseAt(1),0);
 for(const point of [0,1/3,2/3])assert.ok(heroPulseAt(point)>.99);
 for(const point of [.3,.63,.96])assert.ok(heroPulseAt(point)<.13);
});
test("phone digits fill individually and erase at the same reverse scroll positions",()=>{
 const [start,end]=HERO_PHONE_TIMELINE.typing;
 assert.equal(heroPhoneValue(start),"");
 assert.equal(heroPhoneValue(end),"01000000000");
 const values=Array.from({length:12},(_,index)=>heroPhoneValue(start+(end-start)*index/11));
 assert.deepEqual(values.map(value=>value.length),Array.from({length:12},(_,index)=>index));
 assert.deepEqual(values.map(value=>value.length).reverse(),Array.from({length:12},(_,index)=>heroPhoneValue(end-(end-start)*index/11).length));
});
test("sale zoom is restrained on desktop while preserving the approved compact camera",()=>{
 assert.equal(heroSaleZoom(0,1440),0);
 assert.equal(heroSaleZoom(40,1440),.6);
 assert.equal(heroSaleZoom(40,390),1.8);
 assert.equal(heroSaleZoom(40,820),1.8);
 assert.ok(heroSaleZoom(30,1440)<heroSaleZoom(36,1440));
});

test("tablet browsing owns over two viewport lengths before sale enlargement starts",()=>{
 const duration=HERO_CHAPTER_DURATION_MS[1]/1000;
 const browseDistance=(HERO_COUNTER_TIMELINE.focus[1]-HERO_COUNTER_TIMELINE.browse[0])/duration*HERO_CHAPTER_SCROLL_LENGTHS[1];
 assert.ok(browseDistance>=2);
 assert.ok(HERO_COUNTER_TIMELINE.zoom[0]>HERO_COUNTER_TIMELINE.focus[1]);
 assert.equal(heroSaleZoom(HERO_COUNTER_TIMELINE.focus[1],390),0);
 const middle=heroTween(HERO_COUNTER_TIMELINE.browse[0]+8,...HERO_COUNTER_TIMELINE.browse);
 assert.equal(middle,.5);
 assert.equal(heroTween(HERO_COUNTER_TIMELINE.browse[0],...HERO_COUNTER_TIMELINE.browse),0);
 assert.equal(heroTween(HERO_COUNTER_TIMELINE.browse[1],...HERO_COUNTER_TIMELINE.browse),1);
});

test("chapter segments fill completed scenes, seek the current one and rewind together",()=>{
 const at=(chapter:number,progress:number)=>[0,1,2,3].map(index=>heroSegmentProgressAt(index,chapter,progress));
 assert.deepEqual(at(0,0),[0,0,0,0]);
 assert.deepEqual(at(1,.6),[1,.6,0,0]);
 assert.deepEqual(at(3,.9),[1,1,1,.9]);
 assert.deepEqual(at(1,.2),[1,.2,0,0]);
 assert.deepEqual(at(0,.5),[.5,0,0,0]);
 assert.deepEqual(at(3,1),[1,1,1,1]);
 assert.deepEqual(at(1,2),[1,1,0,0]);
 assert.deepEqual(at(1,-1),[1,0,0,0]);
});
