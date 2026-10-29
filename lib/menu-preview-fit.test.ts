import assert from "node:assert/strict";
import test from "node:test";
import { fitMenuPreviewFrame, MENU_PREVIEW_PRESENTATION } from "./menu-preview-fit";
import { getMenuPreviewFrame, MENU_PREVIEW_DEVICE_ORDER } from "./menu-preview-devices";

test("every device fits and remains centered without changing its source viewport", () => {
  for (const device of MENU_PREVIEW_DEVICE_ORDER) for (const orientation of ["landscape", "portrait"] as const) {
    const frame = getMenuPreviewFrame(device, orientation);
    const original = { ...frame };
    for (const [width, height] of [[288, 600], [736, 900], [1360, 780], [2900, 1300]]) {
      const result = fitMenuPreviewFrame({ width, height, device }, frame);
      assert.ok(result.displayWidth <= width + 1e-6);
      assert.ok(result.displayHeight <= height + 1e-6);
      assert.ok(Math.abs(result.displayWidth / result.displayHeight - result.width / result.height) < 1e-6);
      assert.deepEqual(frame, original);
    }
  }
});

test("wide-screen space enlarges the mockup and unmeasured space stays hidden", () => {
  const frame = getMenuPreviewFrame("pc", "landscape");
  const laptop = fitMenuPreviewFrame({ width: 1000, height: 780 }, frame);
  const wide = fitMenuPreviewFrame({ width: 2900, height: 1300 }, frame);
  assert.ok(wide.scale > 1);
  assert.ok(wide.scale > laptop.scale);
  assert.ok(wide.scale <= MENU_PREVIEW_PRESENTATION.desktop.maxScale);
  assert.equal(fitMenuPreviewFrame({ width: 0, height: 0 }, frame).scale, 0);
});

test("PC fills a limiting canvas edge without cropping, distortion or a wide-screen scale cap", () => {
  for (const [width,height] of [[1000,780],[2900,1300],[7000,4000]]) {
    const frame=getMenuPreviewFrame("pc","landscape");
    const result=fitMenuPreviewFrame({width,height,viewportWidth:3440,device:"pc"},frame);
    assert.ok(Math.abs(result.displayWidth-width)<1e-6 || Math.abs(result.displayHeight-height)<1e-6);
    assert.ok(result.displayWidth<=width+1e-6 && result.displayHeight<=height+1e-6);
    if(width===7000) assert.ok(result.scale>1.25);
  }
});

test("tablet fills its 90 percent bounds and can grow beyond native size", () => {
  for (const [width,height] of [[796,1050],[1050,800],[3000,1320]]) {
    const available={width,height,viewportWidth:3440};
    const pc=fitMenuPreviewFrame({...available,device:"pc"},getMenuPreviewFrame("pc","landscape"));
    const tablet=fitMenuPreviewFrame({...available,device:"tablet"},getMenuPreviewFrame("tablet","landscape"));
    assert.ok(pc.displayWidth>tablet.displayWidth);
    assert.ok(Math.abs(tablet.displayWidth-width*.9)<1e-6 || Math.abs(tablet.displayHeight-height*.9)<1e-6);
    if(width===3000) assert.ok(tablet.scale>1);
  }
});

test("mobile mockup presentation stays independent of the PC fill correction", () => {
  const result=fitMenuPreviewFrame({width:1000,height:780,viewportWidth:1440,device:"mobile"},getMenuPreviewFrame("mobile","portrait"));
  assert.ok(Math.abs(result.scale-Math.min(900/410,655.2/864,1.25))<1e-9);
});

test("compact previews keep the usable phone width instead of adding desktop padding", () => {
  const frame = getMenuPreviewFrame("mobile","portrait");
  const result = fitMenuPreviewFrame({width:366,height:740,viewportWidth:390},frame);
  assert.ok(result.displayWidth > 330);
  assert.ok(result.scale <= 1);
});

test("phone viewports distinguish tablet from PC while preserving the mobile reading width", () => {
  for (const [viewportWidth,height] of [[320,600],[390,700],[430,800],[667,200],[767,600]]) {
    const available={width:viewportWidth-24,height,viewportWidth};
    const pc=fitMenuPreviewFrame({...available,device:"pc"},getMenuPreviewFrame("pc","landscape"));
    const tablet=fitMenuPreviewFrame({...available,device:"tablet"},getMenuPreviewFrame("tablet","landscape"));
    assert.ok(tablet.displayWidth<=pc.displayWidth*.9+1e-6);
    const portrait=fitMenuPreviewFrame({...available,device:"tablet"},getMenuPreviewFrame("tablet","portrait"));
    assert.ok(portrait.displayWidth<=available.width*.9+1e-6);
    assert.ok(portrait.displayHeight<=available.height*.9+1e-6);
  }
});
