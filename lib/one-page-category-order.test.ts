import assert from 'node:assert/strict';
import test from 'node:test';
import { canRelaxCategoryOrder, getOnePageCategoryAffinity, getRelatedCategoryOrders, hasRelatedCategoryRegrouping, inferOnePageCategoryAffinity, parseCategoryOrder } from './one-page-category-order';
import { getCafeAOrderedBalancedContiguousColumnCandidates, getCafeAOrderedBalancedBreaksFromColumns } from '../components/menu-templates/cafe-a-balanced-layout';

const names = ['클래식 베이글', '베이글 샌드위치', '크림치즈', '커피&드링크'];
const blocks = names.map((name, order) => ({ key: name, order, blockType: 'category' as const, affinity: getOnePageCategoryAffinity(name), orderBoundary: 'page', height: [310, 450, 180, 210][order], visibleContentHeight: [310, 450, 180, 210][order], marginBottom: 24, estimatedHeight: 0 }));

test('related category plans retain family order, never sort by height or cross a page/widget', () => {
  assert.deepEqual(getRelatedCategoryOrders(blocks).map((order) => order.map((b) => b.key)), [[names[0], names[2], names[1], names[3]]]);
  assert.deepEqual(getRelatedCategoryOrders(blocks.map((b, i) => ({ ...b, orderBoundary: i < 2 ? 'first' : 'second' }))), []);
  assert.deepEqual(getRelatedCategoryOrders([...blocks.slice(0, 2), { ...blocks[1], blockType: 'widget' as const }, ...blocks.slice(2)]), []);
  assert.deepEqual(getRelatedCategoryOrders(blocks.map((b) => ({ ...b, affinity: undefined }))), []);
  assert.deepEqual(getRelatedCategoryOrders(blocks.map((b, i) => ({ ...b, affinity: i === 1 ? undefined : b.affinity }))), []);
  assert.equal(getOnePageCategoryAffinity('CLASSIC BAGELS'), getOnePageCategoryAffinity('CREAM CHEESE'));
  assert.notEqual(getOnePageCategoryAffinity('BAGEL SANDWICHES'), getOnePageCategoryAffinity('CREAM CHEESE'));
});

test('order relaxation needs poor balance and a material gain, not a few pixels', () => {
  assert.equal(canRelaxCategoryOrder([570, 600, 560], [585, 570, 575], 650), false);
  assert.equal(canRelaxCategoryOrder([220, 590, 590], [350, 510, 540], 650), true);
  assert.equal(canRelaxCategoryOrder([220, 590, 590], [230, 580, 590], 650), false);
  assert.equal(canRelaxCategoryOrder([220, 590, 590], [350, 680, 450], 650), false);
});

test('a related fallback fits where the registered contiguous sequence cannot fit', () => {
  const options = { maxExhaustiveBlocks: 12, maxExhaustiveColumns: 4, targetHeight: 700, targetMaxVisibleGap: 6 };
  assert.equal(getCafeAOrderedBalancedContiguousColumnCandidates(blocks, 2, options).length, 0);
  const candidates = getCafeAOrderedBalancedContiguousColumnCandidates(blocks, 2, { ...options, allowRelatedOrder: true });
  assert.ok(candidates.length > 0);
  const encoded = getCafeAOrderedBalancedBreaksFromColumns(candidates[0]);
  assert.deepEqual(parseCategoryOrder(encoded, 4), [0, 2, 1, 3]);
  assert.deepEqual(candidates[0].flatMap((c) => c.blocks.map((b) => b.key)), [names[0], names[2], names[1], names[3]]);
});

test('serialized placement rejects missing/duplicated/out of range category IDs', () => {
  for (const value of ['2|order=0,2,1', '2|order=0,2,2,3', '2|order=0,2,1,4', '2|order=0,2,1,NaN']) assert.equal(parseCategoryOrder(value, 4), null);
  assert.equal(parseCategoryOrder('1,2', 4), null);
});

test('custom category titles use a strong item consensus, while ambiguous titles stay ordered', () => {
  assert.equal(inferOnePageCategoryAffinity('MASTERPIECE', ['밤 라떼', '크림 커피', '콜드브루']), 'coffee');
  assert.equal(inferOnePageCategoryAffinity('오늘의 추천', ['커피', '케이크', '알 수 없는 상품']), undefined);
  assert.equal(inferOnePageCategoryAffinity('고객 카테고리', ['알 수 없는 상품']), undefined);
});

test('coffee families can pair a lighter beverage category without moving food into the beverage family', () => {
  const drinks = blocks.map((b, i) => ({ ...b, affinity: ['coffee', 'coffee', 'coffee', 'other-drinks'][i] }));
  assert.ok(getRelatedCategoryOrders(drinks).some((plan) => plan.map((b) => b.order).join(',') === '0,3,1,2'));
  assert.ok(getRelatedCategoryOrders(blocks).every((plan) => plan[3].order === 3));
});

test('a changed order alone is insufficient: the related pair must actually share a column', () => {
  assert.equal(hasRelatedCategoryRegrouping([{ blocks: [blocks[0], blocks[2]] }, { blocks: [blocks[1], blocks[3]] }]), true);
  assert.equal(hasRelatedCategoryRegrouping([{ blocks: [blocks[0]] }, { blocks: [blocks[2], blocks[1]] }, { blocks: [blocks[3]] }]), false);
  assert.equal(getOnePageCategoryAffinity('STEAK'), undefined);
  assert.equal(getOnePageCategoryAffinity('MADELEINE'), 'dessert');
});
