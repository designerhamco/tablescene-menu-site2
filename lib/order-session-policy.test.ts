import assert from "node:assert/strict";
import test from "node:test";
import {normalizeOrderPhone,orderCartSignature} from "./order-session-policy";
import {getAllowedCheckoutModes,readMenuOrderSettings} from "./menu-order-settings";
test("personal checkout preferences never unlock prepay in a registered terminal",()=>{
  for(const customerCheckout of ["off","prepay","postpay","both"]){
    const prefs=readMenuOrderSettings({table_order:{orderEnabled:true,customerCheckout}});
    assert.deepEqual(getAllowedCheckoutModes(prefs,"terminal"),{postpay:true,prepayVisible:false,prepayAvailable:false});
    assert.equal(getAllowedCheckoutModes(prefs,"customer").postpay,["postpay","both"].includes(customerCheckout));
  }
  assert.equal(getAllowedCheckoutModes(readMenuOrderSettings({table_order:{orderEnabled:true,terminalOrderEnabled:false}}),"terminal").postpay,false);
});
test("phone normalization rejects forged or invalid contacts",()=>{
  assert.equal(normalizeOrderPhone("010-1234-5678"),"01012345678");assert.equal(normalizeOrderPhone(""),null);
  for(const value of [12345,"not a number","010<script>","02012345678","0101234","0".repeat(31)])assert.throws(()=>normalizeOrderPhone(value));
});
test("repeat comparison includes quantities/options and ignores line order/splitting",()=>{
  const a={menuItemId:"a",quantity:2,optionValueIds:["hot","large"]},b={menuItemId:"b",quantity:1,optionValueIds:[]};
  const signature=orderCartSignature([a,b]);
  assert.equal(signature,orderCartSignature([b,{...a,quantity:1},{...a,quantity:1,optionValueIds:["large","hot"]}]));
  assert.notEqual(signature,orderCartSignature([{...a,quantity:1},b]));
  assert.notEqual(signature,orderCartSignature([{...a,optionValueIds:["ice","large"]},b]));
});

test("repeat comparison preserves legacy signatures and distinguishes customized lines", () => {
  const line = { menuItemId: "a", quantity: 1, optionValueIds: [] };
  const mild = { ...line, productOption: "덜 맵게", lineRequest: "파 제외" };
  const hot = { ...mild, productOption: "맵게" };
  const onion = { ...mild, lineRequest: "양파 제외" };
  assert.equal(orderCartSignature([line]), orderCartSignature([{ ...line, productOption: null, lineRequest: null }]));
  assert.equal(orderCartSignature([mild, onion]), orderCartSignature([onion, mild]));
  assert.notEqual(orderCartSignature([mild]), orderCartSignature([hot]));
  assert.notEqual(orderCartSignature([mild]), orderCartSignature([onion]));
  assert.notEqual(orderCartSignature([mild, onion]), orderCartSignature([{ ...mild, quantity: 2 }]));
});
