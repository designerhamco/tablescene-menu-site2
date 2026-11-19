import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BasicServiceStory from "../components/marketing/BasicServiceStory";
import { MARKETING_SERVICE_FEATURES } from "./marketing-service-features";
import { BASIC_TABLET_SCREEN, basicTabletScreenMatrix, basicFeatureIndex } from "./basic-feature-story";

const features=MARKETING_SERVICE_FEATURES.basic.map(feature=>({...feature,media:{poster:"/poster.jpg",mp4:"/clip.mp4"}}));
test("service introduction is the initial scene and does not count as a ninth feature",()=>{
  const html=renderToStaticMarkup(createElement(BasicServiceStory,{features}));
  assert.match(html,/베이직, 한 장에 담는/);
  assert.match(html,/우리 매장의 메뉴판/);
  assert.match(html,/data-feature-index="-1"/);
  assert.match(html,/data-basic-feature-preview="intro"/);
  assert.equal((html.match(/data-basic-tablet-screen/g)??[]).length,1);
  assert.equal((html.match(/aria-controls=/g)??[]).length,2);
  assert.match(html,/aria-label="이전 기능 보기"[^>]*disabled/);
  assert.match(html,/aria-label="다음 기능 보기"/);
  assert.doesNotMatch(html,/<ol|<iframe|role="dialog"|data-service-gallery/);
  assert.match(html,/>소개<\/span>/);
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
test("eight manually selected features retain order, boundaries and operational conditions",()=>{
  assert.equal(features.length,8);
  assert.deepEqual(features.map(feature=>feature.kind),["featured","gallery","prices","sale","widgets","advertising","call","order"]);
  assert.equal(basicFeatureIndex(-1,8),-1);
  assert.equal(basicFeatureIndex(-2,8),-1);
  assert.equal(basicFeatureIndex(0,8),0);
  assert.equal(basicFeatureIndex(8,8),7);
  assert.match(features[6].body,/실제 호출 접수는 매장별 운영 연결 후/);
  assert.match(features[7].body,/선결제는 준비 중/);
});
