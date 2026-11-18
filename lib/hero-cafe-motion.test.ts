import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {HERO_CAFE_CHAPTERS,HERO_CAFE_SCREENS,HERO_CHAPTER_DURATION_MS,advanceHeroClock,heroChapterAt,heroScreenMatrix,type HeroQuad} from "./hero-cafe-motion";

test("hero chapters follow scroll boundaries in either direction",()=>{
 assert.equal(HERO_CAFE_CHAPTERS.length,5);
 for(const [progress,chapter] of [[-1,0],[0,0],[.199,0],[.2,1],[.4,2],[.6,3],[.8,4],[1,4],[2,4],[NaN,0]]) assert.equal(heroChapterAt(progress),chapter);
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
 const component=readFileSync(new URL("../components/marketing/HomeHeroMotion.tsx",import.meta.url),"utf8");
 const route=readFileSync(new URL("../app/templates/[templateKey]/preview/page.tsx",import.meta.url),"utf8");
 assert.match(component,/view=actual&embedded=1&heroDemo=1&device=/);
 assert.doesNotMatch(component,/fetch\(|\/api\/public-menu/);
 assert.match(route,/getFirstParam\(resolvedSearchParams.heroDemo\) === "1"[\s\S]*?orderCallConfig.previewOnly = true;[\s\S]*?cartScope = `hero-demo-\$\{crypto.randomUUID\(\)\}`/);
});

test("playback clock reaches each scene boundary without skipping after a suspended frame",()=>{
 assert.equal(HERO_CHAPTER_DURATION_MS.length,HERO_CAFE_CHAPTERS.length);
 for(const duration of HERO_CHAPTER_DURATION_MS) {
  assert.deepEqual(advanceHeroClock(0,80,duration),{elapsed:80,fraction:80/duration,done:false});
  assert.deepEqual(advanceHeroClock(duration-50,80,duration),{elapsed:duration,fraction:1,done:true});
  assert.deepEqual(advanceHeroClock(duration,80,duration),{elapsed:duration,fraction:1,done:true});
  assert.deepEqual(advanceHeroClock(0,60_000,duration),{elapsed:200,fraction:200/duration,done:false});
  assert.deepEqual(advanceHeroClock(-100,-80,duration),{elapsed:0,fraction:0,done:false});
 }
});
