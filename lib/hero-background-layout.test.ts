import assert from "node:assert/strict";
import test from "node:test";
import { heroBackgroundBounds, heroLandscapeScale, heroWidePosition, heroExpansionMatrix } from "./hero-background-layout";

test("notebook and ordinary 16:9 retain the authored camera scale", () => {
  for (const [width,height] of [[1280,800],[1440,900],[1920,1080],[2560,1440]]) {
    assert.equal(heroLandscapeScale(width,height), Math.max(width/1536,height/1024));
  }
});

test("tall phone coverage grows the surroundings without changing device geometry", () => {
  const camera={x:-120,y:202,scale:.3467};
  const before={...camera};
  const [a,, ,d,x,y]=heroExpansionMatrix(camera,320,740);
  assert.deepEqual(camera,before);
  assert.ok(camera.x+x*camera.scale<=.01);
  assert.ok(camera.x+(1536*a+x)*camera.scale>=319.99);
  assert.ok(camera.y+y*camera.scale<=.01);
  assert.ok(camera.y+(1024*d+y)*camera.scale>=739.99);
});

test("ultrawide reveals more surroundings instead of enlarging the device", () => {
  assert.equal(heroLandscapeScale(3440,1440),heroLandscapeScale(2560,1440));
  assert.equal(heroLandscapeScale(5120,1440),heroLandscapeScale(2560,1440));
  for (const width of [3440,5120]) for (const image of ["venue","counter","dining","phone"] as const) {
    const bounds=heroBackgroundBounds(image);
    assert.ok(bounds.left<0 && bounds.top<0 && bounds.right>1536 && bounds.bottom>1024);
    const scale=heroLandscapeScale(3440,1440);
    const p=heroWidePosition(image,width,1440,scale,[1000,500],1260,54);
    assert.ok(p.x+bounds.left*scale<=1);
    assert.ok(p.x+bounds.right*scale>=width-1);
    assert.ok(p.y+bounds.top*scale<=1);
    assert.ok(p.y+bounds.bottom*scale>=1439);
    if(image==="phone") assert.ok(p.y+810*scale<=1206.01);
  }
});
