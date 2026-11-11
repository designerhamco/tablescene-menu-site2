import assert from "node:assert/strict";
import test from "node:test";
import {fitMenuLogo,getMenuLogoAlphaBounds,getMenuLogoBox} from "./menu-brand-logo";

test("logo boxes use their actual slot and independent desktop/mobile limits",()=>{
 assert.deepEqual(getMenuLogoBox(400,120,false,true),{width:300,height:96});
 assert.deepEqual(getMenuLogoBox(400,120,false,false),{width:300,height:240});
 assert.deepEqual(getMenuLogoBox(342,0,true,false),{width:239.39999999999998,height:136.8});
 assert.equal(getMenuLogoBox(600,0,true,false).height,160);
 assert.equal(getMenuLogoBox(342,0,true,false,16,70).height,70);
});
test("wide, square and tall logos preserve all artwork while filling the first limiting axis",()=>{
 for(const [width,height] of [[900,200],[400,400],[180,600]])for(const box of [getMenuLogoBox(342,0,true,false),getMenuLogoBox(300,120,false,true),getMenuLogoBox(300,0,false,false)]){
  const fit=fitMenuLogo(width,height,{x:0,y:0,width,height},box)!;
  assert.ok(fit.width<=box.width+.001&&fit.height<=box.height+.001);
  assert.ok(Math.abs(fit.width/fit.height-width/height)<.001);
  assert.ok(Math.abs(fit.width-box.width)<.001||Math.abs(fit.height-box.height)<.001);
 }
});
test("transparent margins keep a protective inset and original image geometry",()=>{
 const pixels=new Uint8ClampedArray(100*100*4);
 for(let y=30;y<70;y++)for(let x=10;x<90;x++)pixels[(y*100+x)*4+3]=255;
 const bounds=getMenuLogoAlphaBounds(pixels,100,100);
 assert.ok(bounds.x<10&&bounds.y<30&&bounds.x+bounds.width>90&&bounds.y+bounds.height>70);
 const fit=fitMenuLogo(100,100,bounds,{width:200,height:120})!;
 assert.ok(fit.left<0&&fit.top<0);assert.equal(fit.imageWidth,fit.imageHeight);
 const opaque=new Uint8ClampedArray(8*8*4).fill(255);
 assert.deepEqual(getMenuLogoAlphaBounds(opaque,8,8),{x:0,y:0,width:8,height:8});
 assert.deepEqual(getMenuLogoAlphaBounds(new Uint8ClampedArray(16),2,2),{x:0,y:0,width:2,height:2});
});
