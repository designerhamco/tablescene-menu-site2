import assert from "node:assert/strict";
import test from "node:test";
import { heroLandscapeFrame, heroLandscapeScale, heroLandscapePosition } from "./hero-background-layout";
import { HERO_CAFE_CHAPTERS, HERO_CAFE_SCREENS } from "./hero-cafe-motion";

test("device height and center-relative placement match the notebook across wide screens", () => {
  const sizes=[[1440,900],[1920,1080],[2560,1440],[3440,1440],[5120,1440]];
  for (const chapter of HERO_CAFE_CHAPTERS) {
    const quad=chapter.image==="venue"?HERO_CAFE_SCREENS.televisions[1]:HERO_CAFE_SCREENS[chapter.image];
    // Both normal framing and the later emphasis must obey the same invariant.
    for (const zoom of [1,1.6]) {
      const positions=sizes.map(([width,height])=>{
        const frame=heroLandscapeFrame(width,height),scale=heroLandscapeScale(width,height)*chapter.zoom*zoom;
        const p=heroLandscapePosition(frame.width,height,scale,chapter.focus);
        return quad.flatMap(([x,y])=>[(frame.left+p.x+x*scale-width/2)/height,(p.y+y*scale)/height]);
      });
      for (const position of positions.slice(1)) position.forEach((value,i)=>assert.ok(Math.abs(value-positions[0][i])<1e-12));
    }
  }
});

test("ultrawide width is left outside the clear frame; narrower windows remain bounded", () => {
  assert.deepEqual(heroLandscapeFrame(5120,1440),{left:1408,width:2304});
  assert.deepEqual(heroLandscapeFrame(1024,1366),{left:0,width:1024});
  assert.equal(heroLandscapeScale(1440,900),.9375);
  assert.equal(heroLandscapeScale(5120,1440),1.5);
});
