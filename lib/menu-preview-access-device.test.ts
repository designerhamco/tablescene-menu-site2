import assert from "node:assert/strict";
import test from "node:test";
import {classifyMenuPreviewAccess} from "./menu-preview-access-device";

const desktop={userAgent:"Mozilla/5.0 Chrome/130.0 Safari/537.36",platform:"MacIntel",maxTouchPoints:0,coarsePointer:false,mobileViewport:false};
test("phone guidance stays absent in landscape, independently of the selected mockup",()=>{
  for(const userAgent of ["iPhone Version/18.0 Safari/605.1.15","iPhone CriOS/130.0 Safari/604.1","Linux Android 14 Chrome/130.0 Mobile Safari/537.36"])
    for(const mobileViewport of [true,false])assert.equal(classifyMenuPreviewAccess({...desktop,userAgent,mobileViewport}),"phone");
});
test("tablets keep their manual guide even with a desktop user agent or narrow viewport",()=>{
  for(const mobileViewport of [true,false]){
    assert.equal(classifyMenuPreviewAccess({...desktop,userAgent:"Macintosh Safari/605.1.15",maxTouchPoints:5,mobileViewport}),"tablet");
    assert.equal(classifyMenuPreviewAccess({...desktop,userAgent:"Linux Android 14 Chrome/130.0 Safari/537.36",coarsePointer:true,mobileViewport}),"tablet");
  }
});
test("a narrow desktop window retains PC guidance while an unknown small touch device is a phone",()=>{
  assert.equal(classifyMenuPreviewAccess({...desktop,mobileViewport:true}),"desktop");
  assert.equal(classifyMenuPreviewAccess({...desktop,coarsePointer:true,mobileViewport:true}),"phone");
});
