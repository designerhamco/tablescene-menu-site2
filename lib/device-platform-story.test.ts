import assert from "node:assert/strict";
import test from "node:test";
import { DEVICE_ASSETS, DEVICE_MENU, DEVICE_STAGE_ITEMS, deviceRevealAt, deviceScreenMatrix, deviceStageFrame } from "./device-platform-story";

test("exactly one monitor, tablet and phone appear in order from an empty scene",()=>{
  assert.deepEqual(DEVICE_STAGE_ITEMS.map(i=>i.asset),["monitor","tablet","phone"]);
  assert.deepEqual(DEVICE_STAGE_ITEMS.map(i=>i.order),[0,1,2]);
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
test("actual catalog captures meet all four front-facing display corners without perspective skew",()=>{
  for(const {asset:kind} of DEVICE_STAGE_ITEMS){
    const asset=DEVICE_ASSETS[kind],capture=DEVICE_MENU[kind];
    const m=deviceScreenMatrix(kind).slice(9,-1).split(",").map(Number);
    assert.ok(Math.abs(m[3])<1e-10&&Math.abs(m[7])<1e-10);
    const points=[[0,0],[capture.width,0],[capture.width,capture.height],[0,capture.height]];
    points.forEach(([x,y],i)=>{
      const z=m[3]*x+m[7]*y+m[15],target=asset.screen[i];
      assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/z-target[0])<.001);
      assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/z-target[1])<.001);
      assert.ok(target[0]>=asset.body.x&&target[0]<=asset.body.x+asset.body.width);
      assert.ok(target[1]>=asset.body.y&&target[1]<=asset.body.y+asset.body.height);
    });
    const ratio=(asset.screen[3][1]-asset.screen[0][1])/(asset.screen[1][0]-asset.screen[0][0]);
    assert.ok(Math.abs(ratio-capture.height/capture.width)<.002,"capture aspect matches the real screen");
  }
});
test("all three complete devices fit below the title in wide and compact static compositions",()=>{
  for(const [width,height,copy,gutter] of [[320,676,214,20],[390,780,214,20],[820,1108,227,24],[1024,696,200,31],[1280,648,196,38.4],[1440,828,200,40],[1920,1008,212,48],[2560,1368,230,48],[3440,1368,230,48]]){
    const frame=deviceStageFrame(width,height,copy,gutter);
    assert.equal(frame.compact,width<1024);
    for(const item of frame.items){
      const asset=DEVICE_ASSETS[item.asset];
      assert.ok(Math.abs(item.height/item.width-asset.body.height/asset.body.width)<1e-10,"source body proportions are unchanged");
      assert.ok(item.x*frame.scale+frame.x>=gutter);
      assert.ok((item.x+item.width)*frame.scale+frame.x<=width-gutter);
      assert.ok(item.y*frame.scale+frame.y>=copy);
      assert.ok((item.y+item.height)*frame.scale+frame.y<=height);
    }
    assert.ok(frame.scale<=(frame.compact?1:1.25));
    if(!frame.compact){
      const bottom=Math.max(...frame.items.map(item=>(item.y+item.height)*frame.scale+frame.y));
      assert.ok(height-bottom>=(height-copy)*.1,"desktop composition reserves breathing room below the devices");
    }
  }
});
test("desktop foreground devices deliberately overlap the lower corners while mobile retains its composition",()=>{
  for(const width of [390,1440]){
    const frame=deviceStageFrame(width,900,200,20),monitor=frame.items[0],asset=DEVICE_ASSETS.monitor;
    const menuBottom=monitor.y+(asset.screen[3][1]-asset.body.y)*monitor.sourceScale;
    for(const front of frame.items.slice(1)){
      if(frame.compact)assert.ok(front.y>=menuBottom-.01);
      else {
        const overlap=menuBottom-front.y;
        assert.ok(overlap>20&&overlap<monitor.height*.1,"intentional small lower-screen overlap, rather than tangency");
        assert.ok(front.x<monitor.x+monitor.width&&front.x+front.width>monitor.x);
      }
      assert.ok(front.y+front.height>monitor.y+monitor.height);
      assert.ok(front.shadow.cy>=front.y+front.height);
    }
  }
});
test("longer title copy reduces the complete composition instead of covering or cropping it",()=>{
  const normal=deviceStageFrame(1440,828,200,40),long=deviceStageFrame(1440,828,350,40);
  assert.ok(long.scale<normal.scale);
  for(const item of long.items){
    assert.ok(item.y*long.scale+long.y>=350);
    assert.ok((item.y+item.height)*long.scale+long.y<=828);
  }
});
