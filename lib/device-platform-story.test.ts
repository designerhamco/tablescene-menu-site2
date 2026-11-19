import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import DevicePlatformStory from "../components/marketing/DevicePlatformStory";
import { DEVICE_ASSETS, DEVICE_CAPTURE_SIZE, DEVICE_STAGE_ITEMS, DEVICE_TEMPLATE_SCENES, devicePaperAt, deviceScreenMatrix, deviceStageFrame, deviceTemplateSequenceAt } from "./device-platform-story";

test("the three devices use real static captures for four templates, without a live menu",()=>{
  assert.deepEqual(DEVICE_STAGE_ITEMS,["monitor","tablet","phone"]);
  assert.deepEqual(DEVICE_TEMPLATE_SCENES.map(scene=>scene.id),["matcha","mellow","crema","rosy"]);
  for(const scene of DEVICE_TEMPLATE_SCENES)for(const kind of DEVICE_STAGE_ITEMS){
    const capture:{src:string;width:number;height:number}=scene.screens[kind];
    assert.match(capture.src,/^\/assets\/[^?]+\.webp$/);
    assert.ok(existsSync(new URL(`../public${capture.src}`,import.meta.url)));
    assert.deepEqual({width:capture.width,height:capture.height},DEVICE_CAPTURE_SIZE[kind]);
  }
  const html=renderToStaticMarkup(createElement(DevicePlatformStory));
  assert.doesNotMatch(html,/<iframe|<canvas|<video|\/templates\/[^" ]+\/preview/);
  assert.match(html,/data-image-mode="static"/);
  assert.equal((html.match(/data-device-screen-scene=/g)??[]).length,12);
});

test("all captures meet the unchanged real screen corners and native aspect ratios",()=>{
  for(const kind of DEVICE_STAGE_ITEMS){
    const asset=DEVICE_ASSETS[kind],capture=DEVICE_CAPTURE_SIZE[kind];
    const m=deviceScreenMatrix(kind).slice(9,-1).split(",").map(Number);
    assert.ok(Math.abs(m[3])<1e-10&&Math.abs(m[7])<1e-10);
    [[0,0],[capture.width,0],[capture.width,capture.height],[0,capture.height]].forEach(([x,y],index)=>{
      const z=m[3]*x+m[7]*y+m[15],target=asset.screen[index];
      assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/z-target[0])<.001);
      assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/z-target[1])<.001);
    });
    assert.ok(Math.abs((asset.screen[3][1]-asset.screen[0][1])/(asset.screen[1][0]-asset.screen[0][0])-capture.height/capture.width)<.002);
  }
});

test("physical device bottoms share one floor and fit below site copy at every viewport",()=>{
  for(const [width,height,copy,gutter] of [[320,676,214,20],[390,780,214,20],[820,1108,227,24],[1024,696,200,31],[1280,648,196,38.4],[1440,828,200,40],[1920,1008,212,48],[2560,1368,230,48],[3440,1368,230,48]]){
    const frame=deviceStageFrame(width,height,copy,gutter);
    for(const item of frame.items){
      const asset=DEVICE_ASSETS[item.asset];
      assert.ok(Math.abs(item.height/item.width-asset.body.height/asset.body.width)<1e-10);
      assert.ok(Math.abs(item.y+item.height-frame.floor)<1e-9,"align feet, not display centers");
      assert.ok(item.x*frame.scale+frame.x>=gutter-1e-6);
      assert.ok((item.x+item.width)*frame.scale+frame.x<=width-gutter+1e-6);
      assert.ok(item.y*frame.scale+frame.y>=copy);
      assert.ok((item.y+item.height)*frame.scale+frame.y<=height);
      assert.ok(item.sourceScale*frame.scale<=1.25);
    }
  }
});

test("longer copy uniformly fits complete grounded devices without cropping them",()=>{
  const normal=deviceStageFrame(1440,828,200,40),long=deviceStageFrame(1440,828,350,40);
  assert.ok(long.scale<normal.scale);
  for(const item of long.items){
    assert.ok(item.y*long.scale+long.y>=350);
    assert.ok((item.y+item.height)*long.scale+long.y<=828);
    assert.ok(Math.abs(item.y+item.height-long.floor)<1e-9);
  }
});

test("the concave paper path makes the sides closer and larger than the distant center",()=>{
  for(const width of [320,390,736,1024,1920]){
    const {paper}=deviceStageFrame(width,1000,150,20);
    const center=devicePaperAt(paper,4,0),left=devicePaperAt(paper,3,0),right=devicePaperAt(paper,5,0);
    assert.ok(center.visible&&left.visible&&right.visible);
    assert.ok(center.z<left.z&&center.z<right.z);assert.equal(left.z,right.z);
    assert.ok(left.theta<0&&right.theta>0);
    assert.ok(paper.perspective/(paper.perspective-right.z)>paper.perspective/(paper.perspective-center.z));
    assert.ok(center.blur>right.blur&&right.blur>=.65);
    assert.ok(paper.cardWidth<=(width>=1024?290:236)&&Math.abs(paper.cardWidth/paper.cardHeight-1024/697)<1e-10);
    assert.equal(devicePaperAt(paper,5,1).theta,0);
  }
});

test("one reversible sequence supplies identical bounded crossfade weights to every screen",()=>{
  for(let index=0;index<4;index++){
    const sequence=deviceTemplateSequenceAt(index/3);
    assert.equal(sequence.activeIndex,index);assert.equal(sequence.position,index);
    assert.deepEqual(sequence.weights,[0,1,2,3].map(i=>i===index?1:0));
  }
  let previous=-1;
  for(let step=0;step<=600;step++){
    const progress=step/600,sequence=deviceTemplateSequenceAt(progress);
    assert.ok(sequence.position>=previous);previous=sequence.position;
    assert.ok(sequence.weights.every(weight=>weight>=0&&weight<=1));
    assert.ok(Math.abs(sequence.weights.reduce((sum,weight)=>sum+weight,0)-1)<1e-12);
    assert.deepEqual(sequence,deviceTemplateSequenceAt(progress));
  }
  assert.equal(deviceTemplateSequenceAt(NaN).activeIndex,0);
  assert.equal(deviceTemplateSequenceAt(-1).activeIndex,0);
  assert.equal(deviceTemplateSequenceAt(2).activeIndex,3);
});
