import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import DevicePlatformStory from "../components/marketing/DevicePlatformStory";
import { DEVICE_MONITOR_PHOTO, DEVICE_STAGES, deviceMorphAt } from "./device-platform-story";

test("one device and four MELLO CREMA captures are rendered without mounting a menu", () => {
  assert.deepEqual(DEVICE_STAGES.map(stage => stage.id), ["monitor", "tablet-landscape", "tablet-portrait", "phone"]);
  for (const { src } of DEVICE_STAGES) {
    assert.match(src, /\/crema-[^/]+\.webp$/);
    assert.ok(existsSync(new URL(`../public${src}`, import.meta.url)));
  }
  assert.ok(existsSync(new URL(`../public${DEVICE_MONITOR_PHOTO.src}`, import.meta.url)));
  const markup = renderToStaticMarkup(createElement(DevicePlatformStory));
  assert.equal((markup.match(/data-device-body=/g) ?? []).length, 1);
  assert.equal((markup.match(/data-device-screen-scene=/g) ?? []).length, 4);
  assert.match(markup, /id="device-platform-heading"/);
  assert.doesNotMatch(markup, /<iframe|<video|<nav|<button|role="progressbar"|data-device-paper|\/templates\/[^" ]+\/preview/);
});

test("the sequence has four complete views with an unchanged tablet shell turning 90 degrees", () => {
  const frames = DEVICE_STAGES.map((_, index) => deviceMorphAt(1440, 650, index / (DEVICE_STAGES.length - 1)));
  frames.forEach((frame, index) => {
    assert.equal(frame.rotation, index < 2 ? 0 : -90);
    assert.equal(frame.active, index);
    assert.equal(frame.standOpacity, index === 0 ? 1 : 0);
    assert.deepEqual(frame.screenOpacity, [0, 1, 2, 3].map(step => step === index ? 1 : 0));
  });
  for (const progress of [.4, .5, .6]) {
    const turn = deviceMorphAt(1440, 650, progress);
    assert.equal(turn.width, frames[1].width);
    assert.equal(turn.height, frames[1].height);
    assert.equal(turn.radius, frames[1].radius);
    assert.ok(turn.rotation < 0 && turn.rotation > -90);
  }
  assert.ok(frames[3].height < frames[2].height);
});

test("every intermediate position fits the art area, while the menu remains visible and reversible", () => {
  for (const [width, height] of [[280, 400], [380, 150], [772, 810], [950, 470], [1360, 550], [1504, 905]]) {
    for (let step = 0; step <= 120; step++) {
      const progress = step / 120;
      const frame = deviceMorphAt(width, height, progress);
      const angle = frame.rotation * Math.PI / 180;
      const rotatedWidth = Math.abs(frame.width * Math.cos(angle)) + Math.abs(frame.height * Math.sin(angle));
      const rotatedHeight = Math.abs(frame.width * Math.sin(angle)) + Math.abs(frame.height * Math.cos(angle));
      assert.ok(rotatedWidth <= width && rotatedHeight <= height);
      if (frame.standOpacity > 0) assert.ok(rotatedHeight + frame.standHeight <= height);
      assert.ok(frame.screenOpacity.every(value => value >= 0 && value <= 1));
      assert.ok(frame.screenOpacity.some(value => value >= .3));
    }
  }
  const stops = [0, .1, .25, .5, .75, .85, 1];
  const forward = stops.map(progress => deviceMorphAt(1440, 650, progress));
  const backward = stops.reverse().map(progress => deviceMorphAt(1440, 650, progress));
  assert.deepEqual(forward, backward.reverse());
});
