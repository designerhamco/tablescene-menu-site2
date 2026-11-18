import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {HERO_CAFE_CHAPTERS,HERO_CAFE_SCREENS,HERO_CHAPTER_DURATION_MS,HERO_CHAPTER_SCROLL_LENGTHS,HERO_SCROLL_LENGTH,heroProgressAt,heroChapterAt,heroSceneAt,heroScreenMatrix,heroSaleZoom,heroDemoPhase,type HeroQuad} from "./hero-cafe-motion";

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
 const forwards=[0,23,28,33,34,40,46].map(t=>heroDemoPhase("phone",t));
 const backwards=[46,40,34,33,28,23,0].map(t=>heroDemoPhase("phone",t));
 assert.deepEqual(forwards,[0,1,2,3,4,5,5]);
 assert.deepEqual(backwards,[...forwards].reverse());
 assert.equal(heroDemoPhase("dining",31),5);
 assert.equal(heroDemoPhase("dining",20),3);
});
test("sale zoom is restrained on desktop while preserving the approved compact camera",()=>{
 assert.equal(heroSaleZoom(0,1440),0);
 assert.equal(heroSaleZoom(26,1440),.3);
 assert.equal(heroSaleZoom(26,390),1.8);
 assert.equal(heroSaleZoom(26,820),1.8);
 assert.ok(heroSaleZoom(18,1440)<heroSaleZoom(22,1440));
});
