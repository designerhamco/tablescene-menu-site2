import assert from 'node:assert/strict';
import test from 'node:test';
import { hasChipAddedNameLines, shouldPlaceOnePageChipBelow as below } from '../components/menu-templates/one-page-chip-layout';
test('a chip that alone causes a fitting name to wrap moves below',()=>assert.equal(below(180,60,220,6),true));
test('a fitting inline name and chip stay inline',()=>assert.equal(below(150,60,220,6),false));
test('a naturally long name does not blame the chip',()=>assert.equal(below(240,60,220,6),false));
test('empty or invalid chip measurements do not move content',()=>{assert.equal(below(180,0,220),false);assert.equal(below(NaN,60,220),false);});

test('reserved leader width makes the Basil row move its chip below', () => {
  assert.equal(below(77.5, 34, 124, 6), false);
  assert.equal(below(77.5, 34, 124 - 18, 6), true);
});
test('a chip cannot add lines to an already long name', () => {
  assert.equal(hasChipAddedNameLines(88, 44), true);
  assert.equal(hasChipAddedNameLines(44, 44), false);
  assert.equal(hasChipAddedNameLines(44, 0), false);
});
