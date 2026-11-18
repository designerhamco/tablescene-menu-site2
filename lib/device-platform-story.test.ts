import assert from "node:assert/strict";
import test from "node:test";
import { DEVICE_ASSETS, DEVICE_STAGE_ITEMS, devicePlaneMatrix, deviceRevealAt, deviceStageCamera } from "./device-platform-story";

test("scroll reveals devices in order from an empty floor and reverses without retained state",()=>{
  for(const item of DEVICE_STAGE_ITEMS){
    assert.equal(deviceRevealAt(0,item.order),0);
    assert.equal(deviceRevealAt(1,item.order),1);
    assert.equal(deviceRevealAt(0,item.order,true),1);
    let previous=0;
    for(let step=0;step<=100;step++){const next=deviceRevealAt(step/100,item.order);assert.ok(next>=previous&&next<=1);previous=next;}
  }
  assert.equal(deviceRevealAt(.2,0),1);
  assert.equal(deviceRevealAt(.2,3),0);
  assert.ok(deviceRevealAt(.55,4)<deviceRevealAt(.65,4));
  assert.equal(deviceRevealAt(NaN,0),0);
});
test("restored device screens meet the fixed reference corners, including the cropped bottom device",()=>{
  for(const item of DEVICE_STAGE_ITEMS){
    if(!item.asset)continue;
    const source=DEVICE_ASSETS[item.asset].screen;
    const m=devicePlaneMatrix(source,item.screen).slice(9,-1).split(",").map(Number);
    source.forEach(([x,y],i)=>{
      const z=m[3]*x+m[7]*y+m[15];
      assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/z-item.screen[i][0])<.001);
      assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/z-item.screen[i][1])<.001);
    });
  }
  assert.ok(DEVICE_STAGE_ITEMS.find(i=>i.id==="bottom-tablet")!.screen.some(p=>p[1]>1200));
});
test("mobile camera follows the composition without exposing area outside its floor",()=>{
  for(const [w,h] of [[320,490],[390,560],[820,850]])for(let step=0;step<=100;step++){
    const c=deviceStageCamera(step/100,w,h),side=1200*c.scale;
    assert.ok([c.scale,c.x,c.y].every(Number.isFinite));
    if(side>=w){assert.ok(c.x<=.001);assert.ok(c.x+side>=w-.001);}
    if(side>=h){assert.ok(c.y<=.001);assert.ok(c.y+side>=h-.001);}
  }
  assert.deepEqual(deviceStageCamera(0,390,560,true),deviceStageCamera(1,390,560,true));
  assert.deepEqual(deviceStageCamera(.1,1440,828),deviceStageCamera(.9,1440,828));
});
