import assert from "node:assert/strict";
import test from "node:test";
import { DEVICE_ASSETS, DEVICE_FLOOR_AXES, DEVICE_STAGE_ITEMS, devicePlaneMatrix, deviceRevealAt, deviceStageCamera } from "./device-platform-story";

test("scroll reveals devices in order from an empty floor and reverses without retained state",()=>{
  for(const wide of [false,true])for(const item of DEVICE_STAGE_ITEMS){
    assert.equal(deviceRevealAt(0,item.order,false,wide),0);
    assert.equal(deviceRevealAt(1,item.order,false,wide),1);
    assert.equal(deviceRevealAt(0,item.order,true,wide),1);
    let previous=0;
    for(let step=0;step<=100;step++){const next=deviceRevealAt(step/100,item.order,false,wide);assert.ok(next>=previous&&next<=1);previous=next;}
  }
  assert.equal(deviceRevealAt(.2,0),1);
  assert.equal(deviceRevealAt(.2,3),0);
  assert.ok(deviceRevealAt(.75,4)<deviceRevealAt(.85,4));
  assert.equal(deviceRevealAt(NaN,0),0);
});
test("physical device planes align to the floor without independently skewing their screens",()=>{
  for(const item of DEVICE_STAGE_ITEMS){
    if(!item.asset)continue;
    const source=DEVICE_ASSETS[item.asset].plane;
    const m=devicePlaneMatrix(source,item.plane).slice(9,-1).split(",").map(Number);
    source.forEach(([x,y],i)=>{
      const z=m[3]*x+m[7]*y+m[15];
      assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/z-item.plane[i][0])<.001);
      assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/z-item.plane[i][1])<.001);
    });
  }
  assert.equal(DEVICE_STAGE_ITEMS.length,5);
  assert.ok(!DEVICE_STAGE_ITEMS.some(i=>i.id==="bottom-tablet"||i.id==="upright-menu"));
});
test("every floor-facing edge follows the measured floor axes and both tablets are identical copies",()=>{
  for(const item of DEVICE_STAGE_ITEMS)for(let i=0;i<4;i++){
    const a=item.plane[i],b=item.plane[(i+1)%4];
    assert.ok(Math.abs((b[1]-a[1])/(b[0]-a[0])-(i%2?DEVICE_FLOOR_AXES.v[1]:DEVICE_FLOOR_AXES.u[1]))<1e-10);
  }
  const tablets=DEVICE_STAGE_ITEMS.filter(i=>i.asset==="tablet");
  const offsets=tablets.map(i=>i.plane.map(([x,y])=>[x-i.plane[0][0],y-i.plane[0][1]]));
  offsets[0].forEach((p,i)=>p.forEach((v,j)=>assert.ok(Math.abs(v-offsets[1][i][j])<1e-10)));
});
test("wide illustration fills the entire section with a small symmetric crop",()=>{
  for(const width of [1024,1440,1920]){
    const camera=deviceStageCamera(.5,width,width),side=1200*camera.scale;
    assert.equal(side,width*1.05);
    assert.equal(camera.x,(width-side)/2);
    assert.equal(camera.y,(width-side)/2);
    assert.deepEqual(camera,deviceStageCamera(0,width,width));
  }
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
