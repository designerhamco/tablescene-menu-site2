import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BasicServiceStory from "../components/marketing/BasicServiceStory";
import { MARKETING_SERVICE_FEATURES } from "./marketing-service-features";
import { BASIC_TABLET_SCREEN, basicTabletScreenMatrix, basicFeatureIndex } from "./basic-feature-story";

const features=MARKETING_SERVICE_FEATURES.basic.map(feature=>({...feature,media:{poster:"/poster.jpg",mp4:"/clip.mp4"}}));
test("the Basic introduction does not add a progress segment",()=>{
  const html=renderToStaticMarkup(createElement(BasicServiceStory,{features}));
  assert.match(html,/베이직, 한 장에 담는/);
  assert.match(html,/우리 매장의 메뉴판/);
  assert.match(html,/data-feature-index="-1"/);
  assert.match(html,/data-basic-feature-preview="intro"/);
  assert.equal((html.match(/data-basic-tablet-screen/g)??[]).length,1);
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
