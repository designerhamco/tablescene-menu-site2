import assert from 'node:assert/strict';
import test from 'node:test';
import {getMenuReadingViewportHeight, menuPageReadingHeight} from './menu-page-scroll';

test('page flow retains the original viewport packing budget, including header and action clearance', () => {
  assert.ok(Math.abs(menuPageReadingHeight(720,17.28,34.56,113,25.92,0)-529.24)<.001);
  assert.ok(Math.abs(menuPageReadingHeight(720,17.28,34.56,113,25.92,64)-465.24)<.001);
  assert.equal(menuPageReadingHeight(1180,0,24,158,24,56,8),910);
  assert.equal(menuPageReadingHeight(200,24,24,160,24,56),1);
});

test('other menu structures keep their existing measured capacity', () => {
  const menu={closest:()=>null} as unknown as HTMLElement;
  assert.equal(getMenuReadingViewportHeight(menu,612),612);
});
