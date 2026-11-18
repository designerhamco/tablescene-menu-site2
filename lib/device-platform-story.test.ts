import assert from "node:assert/strict";
import test from "node:test";
import { DEVICE_ASSETS, DEVICE_FLOOR_AXES, DEVICE_STAGE_ITEMS, devicePlaneMatrix, deviceRevealAt, deviceStageCamera } from "./device-platform-story";

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
  const planeRatio=(q:readonly (readonly [number,number])[])=>{
    const length=(a:number,b:number)=>Math.hypot(q[b][0]-q[a][0],q[b][1]-q[a][1]);
    return (length(0,1)+length(3,2))/(length(0,3)+length(1,2));
  };
  for(const item of DEVICE_STAGE_ITEMS)if(item.asset){
    assert.ok(Math.abs(planeRatio(item.plane)-planeRatio(DEVICE_ASSETS[item.asset].plane))<.05,`${item.id} retains its body proportions`);
  }
});
test("wide pinned scene keeps full width while revealing each row inside the viewport below the title",()=>{
  for(const [width,height,copyBottom] of [[1024,696,200],[1280,648,196],[1440,828,200],[1920,1008,212]]){
    const initial=deviceStageCamera(0,width,height,false,copyBottom);
    for(const item of DEVICE_STAGE_ITEMS){
      const p=.19+item.order*.17,camera=deviceStageCamera(p,width,height,false,copyBottom),side=1200*camera.scale;
      assert.ok(Math.abs(side-width*1.05)<1e-9);
      assert.equal(camera.x,(width-side)/2);
      assert.equal(camera.scale,initial.scale);
      const centerY=item.plane.reduce((sum,p)=>sum+p[1],0)/4*camera.scale+camera.y;
      assert.ok(centerY>=copyBottom&&centerY<=height,`${item.id} appears below the pinned title`);
    }
    assert.notEqual(initial.y,deviceStageCamera(1,width,height,false,copyBottom).y);
  }
});
test("mobile camera follows the composition below the integrated title without exposing a hard floor boundary",()=>{
  for(const [w,h,copy] of [[320,676,214],[390,780,214],[820,1108,257]])for(let step=0;step<=100;step++){
    const c=deviceStageCamera(step/100,w,h,false,copy),side=1200*c.scale;
    assert.ok([c.scale,c.x,c.y].every(Number.isFinite));
    if(side>=w){assert.ok(c.x<=.001);assert.ok(c.x+side>=w-.001);}
    assert.ok(c.y<=copy+.001);assert.ok(c.y+side>=h-.001);
  }
});
test("reduced motion shows the complete static composition below the title with no camera travel",()=>{
  for(const [w,h,copy] of [[320,676,214],[820,1108,257],[1440,828,200]]){
    const c=deviceStageCamera(0,w,h,true,copy),side=1200*c.scale;
    assert.deepEqual(c,deviceStageCamera(1,w,h,true,copy));
    assert.ok(c.y>=copy&&c.y+side<=h+.001);
    assert.ok(c.x>=0&&c.x+side<=w+.001);
  }
});
