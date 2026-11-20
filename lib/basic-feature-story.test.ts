import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ServiceFeatureStory from "../components/marketing/ServiceFeatureStory";
import { existsSync } from "node:fs";
import { BASIC_STORY_SCREENS, SERVICE_STORY_INTROS, SERVICE_STORY_SCREENS } from "./service-story-screens";
import { MARKETING_SERVICE_FEATURES } from "./marketing-service-features";
import { BASIC_TABLET_SCREEN, basicTabletScreenMatrix, basicFeatureIndex } from "./basic-feature-story";

const features=MARKETING_SERVICE_FEATURES.basic.map(feature=>({...feature,media:{poster:"/poster.jpg",mp4:"/clip.mp4"}}));
test("the Basic introduction does not add a progress segment",()=>{
  const html=renderToStaticMarkup(createElement(ServiceFeatureStory,{service:"basic",features}));
  assert.match(html,/베이직, 한 장에 담는/);
  assert.match(html,/우리 매장의 메뉴판/);
  assert.match(html,/data-feature-index="-1"/);
  assert.match(html,/data-basic-feature-preview="intro"/);
  assert.match(html,/data-basic-device-screen="monitor" data-device-scene="intro"/);
  assert.match(html,/data-basic-device-screen="phone" data-device-scene="intro"/);
  assert.match(html,/handheld-phone-soft-white\.webp/);
  assert.equal((html.match(/data-basic-segment=/g)??[]).length,6);
  assert.match(html,/aria-label="1. 대표 상품 영역 · 장면 보기"/);
  assert.doesNotMatch(html,/aria-current="step"|직원 호출|테이블 주문/);
  assert.doesNotMatch(html,/이전 기능 보기|다음 기능 보기|<ol|<iframe|role="dialog"|data-service-gallery/);
  assert.match(html,/href="\/#service-dining"/);
  assert.doesNotMatch(html,/data-basic-management|site-media-playback|01.*08|<video/);
});
test("projected screen remains attached to every photo corner across phone and wide scene sizes",()=>{
  for(const width of [320,580,1100,1500]) {
    const m=basicTabletScreenMatrix(width).slice(9,-1).split(",").map(Number);
    [[0,0],[800,0],[800,600],[0,600]].forEach(([x,y],i)=>{
      const z=m[3]*x+m[7]*y+m[15];
      assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/z-BASIC_TABLET_SCREEN[i][0]*width/1536)<.001);
      assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/z-BASIC_TABLET_SCREEN[i][1]*width/1536)<.001);
    });
  }
});
test("the six Basic topics retain their order and the remaining services retain their topics", () => {
  assert.deepEqual(features.map(feature => feature.kind), ["featured", "gallery", "prices", "sale", "widgets", "advertising"]);
  assert.equal(basicFeatureIndex(-1, features.length), -1);
  assert.equal(basicFeatureIndex(-2, features.length), -1);
  assert.equal(basicFeatureIndex(0, features.length), 0);
  assert.equal(basicFeatureIndex(features.length, features.length), 5);
  assert.deepEqual(MARKETING_SERVICE_FEATURES.dining.slice(-2).map(feature => feature.kind), ["call", "order"]);
});

test("Dining and Display use the shared scroll layout with their respective mockups", () => {
  for (const [service, count, destination] of [["dining", 8, "service-display"], ["display", 4, "home-operations"]] as const) {
    const html = renderToStaticMarkup(createElement(ServiceFeatureStory, { service }));
    assert.ok(html.includes(`data-service-story="${service}"`));
    assert.ok(html.includes(`href="/#${destination}"`));
    assert.equal((html.match(/data-service-segment=/g) ?? []).length, count);
    if (service === "dining") assert.match(html, /handheld-tablet-dining\.webp/);
    else {
      assert.match(html, /display-ceiling-three\.webp/);
      assert.match(html, /display-close-up-single\.webp/);
      assert.doesNotMatch(html, /handheld-tablet-soft-rose\.webp/);
    }
    assert.doesNotMatch(html, /data-basic-device-screen|aria-current="step"/);
  }
});

test("All service chapters reference available screen captures", () => {
  for (const { desktop, mobile } of Object.values(BASIC_STORY_SCREENS)) {
    assert.notEqual(desktop, mobile);
    assert.ok(existsSync(`public${desktop}`), desktop);
    assert.ok(existsSync(`public${mobile}`), mobile);
  }
  for (const service of ["dining", "display"] as const) {
    for (const feature of MARKETING_SERVICE_FEATURES[service]) {
      const screens: Record<string, string> = SERVICE_STORY_SCREENS[service];
      assert.ok(existsSync(`public${screens[feature.kind]}`), `${service} ${feature.kind}`);
    }
    assert.ok(existsSync(`public${SERVICE_STORY_INTROS[service].image}`));
  }
});
