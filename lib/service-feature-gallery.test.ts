import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ServiceFeatureGallery from "../components/marketing/ServiceFeatureGallery";
import { MediaPlayback } from "../app/components/ui/media-playback";
import { MARKETING_SERVICE_FEATURES } from "./marketing-service-features";

const gallery = () => createElement(ServiceFeatureGallery, { service: "basic", title: "베이직", description: "매장의 메뉴판", features: MARKETING_SERVICE_FEATURES.basic.map(feature => ({ ...feature, media: { poster: "/poster.jpg", mp4: "/clip.mp4" } })) });

test("Basic exposes all eight features once, with necessary reception and payment conditions", () => {
  const html = renderToStaticMarkup(gallery());
  assert.equal((html.match(/data-service-feature=/g) ?? []).length, 8);
  assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, 8);
  for (const feature of MARKETING_SERVICE_FEATURES.basic) {
    assert.ok(html.includes(`data-service-feature="${feature.kind}"`));
    assert.ok(html.includes(feature.body));
  }
  assert.ok(html.includes("실제 호출 접수는 매장별 운영 연결 후"));
  assert.ok(html.includes("선결제는 준비 중"));
  assert.doesNotMatch(html, /<iframe|role="dialog"|autoplay|ARTIMENU BASIC/);
});

test("gallery links its arrow tools to a focusable named list", () => {
  const html = renderToStaticMarkup(gallery());
  assert.match(html, /aria-label="이전 기능 보기"[^>]*disabled/);
  assert.match(html, /aria-label="다음 기능 보기"/);
  assert.match(html, /<ol[^>]*aria-label="베이직 기능 소개"[^>]*tabindex="0"/);
  assert.equal((html.match(/aria-controls=/g) ?? []).length, 2);
});

test("a future video uses a poster and deferred media loading with no autoplay", () => {
  const html = renderToStaticMarkup(createElement(ServiceFeatureGallery, { service: "dining", title: "다이닝", description: "페이지를 넘기는 메뉴판", features: [{ ...MARKETING_SERVICE_FEATURES.basic[0], media: { poster: "/poster.jpg", mp4: "/clip.mp4", webm: "/clip.webm" } }] }));
  assert.match(html, /<video[^>]*poster="\/poster.jpg"[^>]*muted[^>]*playsInline[^>]*preload="none"/i);
  assert.match(html, /src="\/clip.mp4" type="video\/mp4"/);
  assert.match(html, /src="\/clip.webm" type="video\/webm"/);
  assert.doesNotMatch(html, /autoplay/i);
  assert.match(html, /aria-label="다이닝 기능 소개"/);
});

test("shared playback conveys its state and keeps one semantic hit target", () => {
  for (const playing of [false, true]) {
    const html = renderToStaticMarkup(createElement(MediaPlayback, { playing, label: "기간 할인" }));
    assert.equal((html.match(/<button/g) ?? []).length, 1);
    assert.match(html, new RegExp(`aria-pressed="${playing}"`));
    assert.ok(html.includes(playing ? "기간 할인 일시 정지" : "기간 할인 재생"));
  }
});
