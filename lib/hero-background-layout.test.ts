import assert from "node:assert/strict";
import test from "node:test";
import { heroLandscapeFrame, heroLandscapeScale, heroLandscapePosition, heroOpeningCamera } from "./hero-background-layout";
import { HERO_CAFE_CHAPTERS, HERO_CAFE_SCREENS } from "./hero-cafe-motion";

test("device height and center-relative placement match the notebook across wide screens", () => {
  const sizes=[[1440,900],[1920,1080],[2560,1440],[3440,1440],[5120,1440]];
  for (const chapter of HERO_CAFE_CHAPTERS) {
    const quad=chapter.image==="venue"?HERO_CAFE_SCREENS.televisions[1]:HERO_CAFE_SCREENS[chapter.image];
    // Both normal framing and the later emphasis must obey the same invariant.
    for (const zoom of chapter.image === "venue" ? [1, 1.035] : [1, 1.6]) {
      const positions=sizes.map(([width,height])=>{
        const frame=heroLandscapeFrame(width,height),scale=heroLandscapeScale(width,height)*chapter.zoom*zoom;
        const p=chapter.image==="venue"
          ? heroOpeningCamera(width,height,scale,chapter.focus)
          : {...heroLandscapePosition(frame.width,height,scale,chapter.focus),scale};
        return quad.flatMap(([x,y])=>[(frame.left+p.x+x*p.scale-width/2)/height,(p.y+y*p.scale)/height]);
      });
      for (const position of positions.slice(1)) position.forEach((value,i)=>assert.ok(Math.abs(value-positions[0][i])<1e-12));
    }
  }
});

test("the opening centers all three televisions and keeps their outer edges visible", () => {
  const focus = HERO_CAFE_CHAPTERS[0].focus;
  for (const [width, height] of [[1024, 1366], [1280, 800], [1512, 762], [1920, 1080], [3440, 1440]]) {
    const frame = heroLandscapeFrame(width, height);
    const desiredScale = heroLandscapeScale(width, height);
    const camera = heroOpeningCamera(width, height, desiredScale, focus);
    const projectedXs = HERO_CAFE_SCREENS.televisions.flatMap(quad =>
      quad.map(([x]) => frame.left + camera.x + x * camera.scale));
    const left = Math.min(...projectedXs);
    const right = Math.max(...projectedXs);
    assert.ok(Math.abs((left + right) / 2 - width / 2) < 0.001);
    assert.ok(left > 0 && right < width);
    if (width !== 1024) assert.equal(camera.scale, desiredScale);
  }
});

test("ultrawide width is left outside the clear frame; narrower windows remain bounded", () => {
  assert.deepEqual(heroLandscapeFrame(5120,1440),{left:1408,width:2304});
  assert.deepEqual(heroLandscapeFrame(1024,1366),{left:0,width:1024});
  assert.equal(heroLandscapeScale(1440,900),.9375);
  assert.equal(heroLandscapeScale(5120,1440),1.5);
});
