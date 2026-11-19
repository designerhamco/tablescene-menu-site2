import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MARKETING_SERVICE_FEATURES } from "./marketing-service-features";
import { BASIC_FEATURE_COUNT, BASIC_FEATURE_TRAVEL, BASIC_INTRO_TRAVEL, BASIC_STORY_TRAVEL, basicStoryAt } from "./basic-service-story";

const at = (position: number) => basicStoryAt(position / BASIC_STORY_TRAVEL);

test("Basic begins with an absent tablet and holds the completed intro before feature one", () => {
  assert.equal(at(0).tablet, 0);
  assert.equal(at(0).introCopy, 0);
  assert.equal(at(0).chapter, -1);
  assert.ok(at(.5).tablet > 0 && at(.5).tablet < 1);
  assert.equal(at(1.1).tablet, 1);
  assert.equal(at(1.1).intro, 1);
  assert.equal(at(1.1).chapter, -1);
});

test("all eight features get one readable hold and the last does not fade away", () => {
  assert.equal(MARKETING_SERVICE_FEATURES.basic.length, BASIC_FEATURE_COUNT);
  for (let index = 0; index < BASIC_FEATURE_COUNT; index++) {
    const state = at(BASIC_INTRO_TRAVEL + index * BASIC_FEATURE_TRAVEL + .5);
    assert.equal(state.chapter, index);
    assert.equal(state.intro, 0);
    assert.equal(state.features[index], 1);
    assert.equal(state.features.filter(value => value > 0).length, 1);
  }
  assert.equal(basicStoryAt(1).chapter, 7);
  assert.equal(basicStoryAt(1).features[7], 1);
});

test("scene changes crossfade and seeking backward restores the same state without a clock", () => {
  const boundary = at(BASIC_INTRO_TRAVEL + BASIC_FEATURE_TRAVEL);
  assert.ok(Math.abs(boundary.features[0] - .5) < 1e-8);
  assert.ok(Math.abs(boundary.features[1] - .5) < 1e-8);
  const first = at(.5);
  at(8);
  assert.deepEqual(at(.5), first);
  assert.deepEqual(basicStoryAt(-1), basicStoryAt(0));
  assert.deepEqual(basicStoryAt(NaN), basicStoryAt(0));
  assert.deepEqual(basicStoryAt(2), basicStoryAt(1));
});

test("Basic has no decorative ARTIMENU eyebrow and keeps all feature descriptions", () => {
  const source = readFileSync(new URL("../components/marketing/BasicServiceStory.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /ARTIMENU|type-caption|<iframe/);
  assert.match(source, /MARKETING_SERVICE_FEATURES\.basic\.map/);
  assert.match(source, /<h3[^>]*>\{feature\.label\}<\/h3>/);
  assert.match(source, /\{feature\.body\}/);
});
