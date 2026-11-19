import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import test from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import sharp from 'sharp';
import HeroMobileMenu from '../components/marketing/HeroMobileMenu';
import {HERO_MOBILE_MEDIA,mobileCounterAt,mobileDiningAt,mobilePhoneAt} from './hero-mobile-stills';
import {HERO_CAFE_SCREENS} from './hero-cafe-motion';

test('stills seek directly and restore every modal/page when scrolling backwards',()=>{
 for(const at of [mobileCounterAt,mobileDiningAt,mobilePhoneAt]){
  const times=[0,1.6,3.7,5,11,18,20,25,27,28.5,31,35,36,42.5,53,60,62,66];
  assert.deepEqual([...times].reverse().map(t=>at(t)),times.map(t=>at(t)).reverse());
 }
 assert.deepEqual(mobileCounterAt(0).slides,[1,0,0]);
 assert.deepEqual(mobileCounterAt(2).slides,[0,1,0]);
 assert.deepEqual(mobileCounterAt(4).slides,[0,0,1]);
 assert.equal(mobileCounterAt(21).offset,167);
 assert.equal(mobileCounterAt(27).offset,0);
 assert.deepEqual(mobileDiningAt(11).pages,[0,0,1]);
 assert.equal(mobileDiningAt(18).modal,0);
 assert.equal(mobileDiningAt(20).modal,1);
 assert.equal(mobileDiningAt(25).dialog,'wine');
 assert.equal(mobileDiningAt(31).dialog,'sent');
 assert.equal(mobilePhoneAt(20).offset,2414);
 assert.equal(mobilePhoneAt(28).item,0);
 assert.equal(mobilePhoneAt(29).item,1);
 assert.equal(mobilePhoneAt(36).item,0);
 assert.equal(mobilePhoneAt(36).toast,1);
 assert.equal(mobilePhoneAt(43).cart,1);
 assert.equal(mobilePhoneAt(62).history,1);
});

test('all mobile states render captured assets with no applications or interactive form state',()=>{
 for(const kind of ['counter','dining','phone'] as const)for(const seconds of [0,6,19,25,28.5,32,35.5,42.5,61,66]){
  const markup=renderToStaticMarkup(createElement(HeroMobileMenu,{kind,seconds,reduced:false}));
  assert.doesNotMatch(markup,/<iframe|<input|<form|src="https?:|\/templates\//);
  assert.match(markup,/data-hero-still=/);
  for(const [,source]of markup.matchAll(/src="([^"]+)"/g))assert.ok(statSync(new URL('../public'+source,import.meta.url)).size>0,source);
 }
 const component=readFileSync(new URL('../components/marketing/HomeHeroMotion.tsx',import.meta.url),'utf8');
 assert.match(component,/presentation==="live"\?heroLiveSceneAt/);
 assert.match(component,/presentation==="stills"\?<HeroMobileMenu/);
 const stills=readFileSync(new URL('../components/marketing/HeroMobileMenu.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(stills,/setInterval|setTimeout|fetch\(|HeroLiveMenu/);
 assert.match(HERO_MOBILE_MEDIA,/max-width: 767px/);
 assert.match(HERO_MOBILE_MEDIA,/pointer: coarse.*max-height: 600px/);
});

test('mobile backgrounds are flattened and long menu tiles have a bounded decoded size',async()=>{
 for(const kind of ['venue','counter','dining','phone']){
  const asset=new URL(`../public/assets/hero-mobile-v1/${kind}-background.webp`,import.meta.url);
  const meta=await sharp(readFileSync(asset)).metadata();
  assert.equal(meta.width,2304);assert.equal(meta.height,768);
  assert.ok(statSync(asset).size<500_000);
  const stats=await sharp(readFileSync(asset)).stats();
  assert.ok(stats.channels[0].stdev>20,'background must contain the photograph, not an empty SVG raster');
  assert.ok(stats.channels[3].mean>30,'soft edges must retain a visible central photograph');
 }
 const manifest=JSON.parse(readFileSync(new URL('../public/assets/hero-mobile-v1/capture-manifest.json',import.meta.url),'utf8'));
 let end=0;
 for(const tile of manifest.phone.tiles){
  assert.equal(tile.top,end);
  const meta=await sharp(readFileSync(new URL(`../public/assets/hero-mobile-v1/${tile.file}`,import.meta.url))).metadata();
  assert.equal(meta.width,tile.width);assert.equal(meta.height,tile.height);
  assert.ok(tile.height<=900);end+=tile.height;
 }
 assert.equal(end,3314);
 for(const kind of ['counter','dining','phone'] as const){
  const {data,info}=await sharp(readFileSync(new URL(`../public/assets/hero-mobile-v1/${kind}-mask.png`,import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const q=HERO_CAFE_SCREENS[kind];
  for(const u of [.1,.5,.9]){
   const x=Math.round((q[0][0]*(1-u)*.5+q[1][0]*u*.5+q[2][0]*u*.5+q[3][0]*(1-u)*.5)/2);
   const y=Math.round((q[0][1]*(1-u)*.5+q[1][1]*u*.5+q[2][1]*u*.5+q[3][1]*(1-u)*.5)/2);
   assert.ok(data[(y*info.width+x)*info.channels+3]>200,`${kind}: screen edge must remain inside its resized native-photo mask`);
  }
 }
});
