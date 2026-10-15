import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRelaxOnePageCopyReference as relax } from './one-page-copy-reference';
const input = { hasHiddenSupport:true, overflow:false, height:1000, bottomGap:200, averageFill:0.7, referenceScale:1, actualScale:1.2 };
test('hidden support with material whitespace and safe type gain can relax the reference',()=>assert.equal(relax(input),true));
test('all three visible fields keep the default reference',()=>assert.equal(relax({...input,hasHiddenSupport:false}),false));
test('one empty column cannot justify enlarging an already full longest column',()=>assert.equal(relax({...input,bottomGap:40,averageFill:0.4}),false));
test('a minor font gain keeps the three-field reference',()=>assert.equal(relax({...input,actualScale:1.07}),false));
test('a verified linked fit-scale gain can relax a capped item name',()=>assert.equal(relax({...input,actualScale:1,referenceFitScale:1,actualFitScale:1.1}),true));
test('a minor linked fit-scale gain keeps the three-field reference',()=>assert.equal(relax({...input,actualScale:1,referenceFitScale:1,actualFitScale:1.07}),false));
test('a font clamped at the reading floor must not claim an enlargement',()=>assert.equal(relax({...input,referenceScale:16,actualScale:16}),false));
test('overflow and invalid measurements cannot relax the reference',()=>{
  for(const overrides of [{overflow:true},{height:0},{actualScale:NaN},{referenceScale:0}]) assert.equal(relax({...input,...overrides}),false);
});
test('broad low occupancy with modest longest-column room can relax',()=>assert.equal(relax({...input,bottomGap:100,averageFill:0.65}),true));
test('a safe type gain can use twelve percent longest-column headroom',()=>assert.equal(relax({...input,bottomGap:120,averageFill:0.8}),true));
test('eleven percent headroom with a broadly full layout keeps the reference',()=>assert.equal(relax({...input,bottomGap:110,averageFill:0.8}),false));
