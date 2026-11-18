import assert from "node:assert/strict";
import test from "node:test";
import { DEVICE_ASSETS, DEVICE_FLOOR_AXES, DEVICE_STAGE_ITEMS, devicePlaneMatrix, deviceRevealAt, deviceStageFrame } from "./device-platform-story";

test("scroll reveals devices in order from an empty floor and reverses without retained state",()=>{
  for(const item of DEVICE_STAGE_ITEMS){
    assert.equal(deviceRevealAt(0,item.order),0);
    assert.equal(deviceRevealAt(1,item.order),1);
    assert.equal(deviceRevealAt(0,item.order,true),1);
    let previous=0;
    for(let step=0;step<=100;step++){const next=deviceRevealAt(step/100,item.order);assert.ok(next>=previous&&next<=1);previous=next;}
  }
  assert.equal(deviceRevealAt(.28,0),1);
  assert.equal(deviceRevealAt(.5,2),0);
  assert.ok(deviceRevealAt(.65,2)<deviceRevealAt(.8,2));
  assert.equal(deviceRevealAt(NaN,0),0);
});
test("physical device planes align to the floor without independently skewing their screens",()=>{
  for(const item of DEVICE_STAGE_ITEMS){
    const source=DEVICE_ASSETS[item.asset].plane;
    const m=devicePlaneMatrix(source,item.plane).slice(9,-1).split(",").map(Number);
    source.forEach(([x,y],i)=>{
      const z=m[3]*x+m[7]*y+m[15];
      assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/z-item.plane[i][0])<.001);
      assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/z-item.plane[i][1])<.001);
    });
  }
  assert.deepEqual(DEVICE_STAGE_ITEMS.map(i=>i.asset),["laptop","tablet","phone"]);
  assert.deepEqual(DEVICE_STAGE_ITEMS.map(i=>i.order),[0,1,2]);
});
test("all three devices retain their body proportions and the measured floor axes",()=>{
  for(const item of DEVICE_STAGE_ITEMS)for(let i=0;i<4;i++){
    const a=item.plane[i],b=item.plane[(i+1)%4];
    assert.ok(Math.abs((b[1]-a[1])/(b[0]-a[0])-(i%2?DEVICE_FLOOR_AXES.v[1]:DEVICE_FLOOR_AXES.u[1]))<1e-10);
  }
  const planeRatio=(q:readonly (readonly [number,number])[])=>{
    const length=(a:number,b:number)=>Math.hypot(q[b][0]-q[a][0],q[b][1]-q[a][1]);
    return (length(0,1)+length(3,2))/(length(0,3)+length(1,2));
  };
  for(const item of DEVICE_STAGE_ITEMS){
    assert.ok(Math.abs(planeRatio(item.plane)-planeRatio(DEVICE_ASSETS[item.asset].plane))<.05,`${item.id} retains its body proportions`);
  }
});
test("the static responsive composition fits all three devices below the title at once",()=>{
  for(const [width,height,copyBottom] of [[320,676,214],[390,780,214],[820,1108,227],[1024,696,200],[1280,648,196],[1440,828,200],[1920,1008,212]]){
    const frame=deviceStageFrame(width,height,copyBottom);
    for(const item of DEVICE_STAGE_ITEMS){
      const asset=DEVICE_ASSETS[item.asset];
      const m=devicePlaneMatrix(asset.plane,item.plane).slice(9,-1).split(",").map(Number);
      const display=asset.screen.map(([x,y])=>{const z=m[3]*x+m[7]*y+m[15];return [(m[0]*x+m[4]*y+m[12])/z,(m[1]*x+m[5]*y+m[13])/z];});
      for(const [x,y] of [...item.plane,...display]){
        assert.ok(x*frame.scale+frame.x>=0&&x*frame.scale+frame.x<=width,`${item.id} stays inside the width`);
        assert.ok(y*frame.scale+frame.y>=copyBottom&&y*frame.scale+frame.y<=height,`${item.id} stays below the title without a covering layer`);
      }
    }
    if(width>=768)assert.ok(1200*frame.scale<=width*.9+.001,"wide artwork has visible breathing room");
  }
});
test("longer title copy reduces the illustration instead of covering or cropping it",()=>{
  const normal=deviceStageFrame(1440,828,200),long=deviceStageFrame(1440,828,350);
  assert.ok(long.scale<normal.scale);
  assert.equal(long.x,(1440-1200*long.scale)/2);
  for(const item of DEVICE_STAGE_ITEMS)for(const [,y] of item.plane){
    assert.ok(y*long.scale+long.y>=350&&y*long.scale+long.y<=828);
  }
});
