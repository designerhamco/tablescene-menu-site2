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

test("desktop previews leave breathing room even on an ultrawide screen", () => {
  for (const device of MENU_PREVIEW_DEVICE_ORDER) for (const [width, height] of [[1000,780],[2900,1300],[7000,4000]]) {
    const result = fitMenuPreviewFrame({width,height,viewportWidth:3440,device},getMenuPreviewFrame(device,"landscape"));
    assert.ok(result.displayWidth <= width * .9 + 1e-6);
    assert.ok(result.displayHeight <= height * .84 + 1e-6);
    assert.ok(result.scale <= 1.25);
  }
});

test("tablet mockups stay visibly smaller than PC at the same workspace without changing device sources", () => {
  for (const [width,height] of [[796,1050],[1050,800],[3000,1320]]) {
    const available={width,height,viewportWidth:3440};
    const pc=fitMenuPreviewFrame({...available,device:"pc"},getMenuPreviewFrame("pc","landscape"));
    const tablet=fitMenuPreviewFrame({...available,device:"tablet"},getMenuPreviewFrame("tablet","landscape"));
    assert.ok(pc.displayWidth>tablet.displayWidth*1.15);
    assert.ok(tablet.displayWidth<=width*MENU_PREVIEW_PRESENTATION.tablet.widthRatio+1e-6);
    assert.ok(tablet.displayHeight<=height*MENU_PREVIEW_PRESENTATION.tablet.heightRatio+1e-6);
    assert.ok(tablet.scale<=1);
  }
});

test("compact previews keep the usable phone width instead of adding desktop padding", () => {
  const frame = getMenuPreviewFrame("mobile","portrait");
  const result = fitMenuPreviewFrame({width:366,height:740,viewportWidth:390},frame);
  assert.ok(result.displayWidth > 330);
  assert.ok(result.scale <= 1);
});

test("phone viewports distinguish tablet from PC while preserving the mobile reading width", () => {
  for (const viewportWidth of [320,390,430,767]) {
    const available={width:viewportWidth-24,height:600,viewportWidth};
    const pc=fitMenuPreviewFrame({...available,device:"pc"},getMenuPreviewFrame("pc","landscape"));
    const tablet=fitMenuPreviewFrame({...available,device:"tablet"},getMenuPreviewFrame("tablet","landscape"));
    assert.ok(tablet.displayWidth<=pc.displayWidth*.8+1e-6);
    const portrait=fitMenuPreviewFrame({...available,device:"tablet"},getMenuPreviewFrame("tablet","portrait"));
    assert.ok(portrait.displayWidth<=available.width*.8+1e-6);
    assert.ok(portrait.displayHeight<=available.height+1e-6);
  }
});
