import test from "node:test";
import assert from "node:assert/strict";
import {getOrderedFlowNextBlockTypes} from "./one-page-flow-boundaries";

test("a category continued in the next column uses its trailing fragment's boundary", () => {
  const next=getOrderedFlowNextBlockTypes([
    {block:"signature",type:"category",left:20,top:400,order:0},
    {block:"signature",type:"category",left:500,top:20,order:0},
    {block:"starters",type:"category",left:500,top:200,order:1},
    {block:"mains",type:"category",left:500,top:450,order:2},
  ]);
  assert.equal(next.get("signature"),"category");
  assert.equal(next.get("starters"),"category");
  assert.equal(next.has("mains"),false);
});

test("a fragment ending a column does not borrow a follower from an earlier fragment", () => {
  const next=getOrderedFlowNextBlockTypes([
    {block:"first",type:"category",left:20,top:20,order:0},
    {block:"long",type:"category",left:20,top:200,order:1},
    {block:"long",type:"category",left:500,top:20,order:1},
    {block:"footer-widget",type:"widget",left:1000,top:700,order:2},
  ]);
  assert.equal(next.get("first"),"category");
  assert.equal(next.has("long"),false);
});
