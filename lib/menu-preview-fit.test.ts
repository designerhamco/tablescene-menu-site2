import assert from "node:assert/strict";
import test from "node:test";
import { fitMenuPreviewFrame } from "./menu-preview-fit";
import { getMenuPreviewFrame } from "./menu-preview-devices";

test("tablet and phone fill the canvas with preserved source ratios and a wide-screen ceiling", () => {
  for (const device of ["tablet", "mobile"] as const) for (const orientation of ["landscape", "portrait"] as const) {
    const frame=getMenuPreviewFrame(device,orientation), original={...frame};
    for (const [width,height] of [[288,600],[736,900],[1360,856],[2900,1300],[7000,4000]]) {
      const fit=fitMenuPreviewFrame({width,height,viewportWidth:width,device},frame);
      assert.ok(fit.displayWidth<=width+1e-6 && fit.displayHeight<=height+1e-6);
      assert.ok(Math.abs(fit.displayWidth/fit.displayHeight-fit.width/fit.height)<1e-6);
      assert.ok(fit.scale<=1.25);
      assert.ok(Math.abs(fit.displayWidth-width)<1e-6 || Math.abs(fit.displayHeight-height)<1e-6 || fit.scale===1.25);
      assert.deepEqual(frame,original);
    }
  }
});

test("PC uses the entire live viewport without bezel or aspect fitting on desktop and tablet browsers", () => {
  const frame=getMenuPreviewFrame("pc","landscape");
  for (const [width,height] of [[768,1180],[1440,900],[3440,1440]]) {
    assert.deepEqual(fitMenuPreviewFrame({width,height,viewportWidth:width,device:"pc"},frame),{width,height,scale:1,displayWidth:width,displayHeight:height});
  }
});

test("PC on phones remains a borderless 1440 by 900 desktop overview", () => {
  for (const [width,height] of [[320,740],[390,844],[667,375]]) {
    const fit=fitMenuPreviewFrame({width,height,viewportWidth:width,device:"pc"},getMenuPreviewFrame("pc","landscape"));
    assert.equal(fit.width,1440); assert.equal(fit.height,900);
    assert.ok(fit.displayWidth<=width && fit.displayHeight<=height);
    assert.ok(Math.abs(fit.displayWidth/fit.displayHeight-1.6)<1e-6);
  }
});

test("unmeasured previews stay hidden and actual source dimensions are never mutated", () => {
  for(const device of ["pc","tablet","mobile"] as const) assert.equal(fitMenuPreviewFrame({width:0,height:0,viewportWidth:1440,device},getMenuPreviewFrame(device,"landscape")).scale,0);
});
