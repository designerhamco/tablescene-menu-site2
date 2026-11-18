import assert from "node:assert/strict";
import test from "node:test";
import {shouldResetDocumentScroll} from "./site-navigation-scroll";

test("ordinary route changes reset to top while initial and same-route renders preserve position",()=>{
 assert.equal(shouldResetDocumentScroll(null,"/",""),false);
 assert.equal(shouldResetDocumentScroll("/faq","/",""),true);
 assert.equal(shouldResetDocumentScroll("/","/faq",""),true);
 assert.equal(shouldResetDocumentScroll("/","/",""),false);
});
test("route changes never overwrite an explicit anchor destination",()=>{
 for(const hash of ["#service-basic","#service-dining","#service-display","#content"]){
  assert.equal(shouldResetDocumentScroll("/faq","/",hash),false);
  assert.equal(shouldResetDocumentScroll(null,"/",hash),false);
 }
});
