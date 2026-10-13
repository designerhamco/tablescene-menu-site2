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

test('conventional order separates signature, coffee, latte, drinks and bakery', async () => {
  const { getConventionalCategoryRank, getFallbackCategoryOrders } = await import('./one-page-category-order');
  const names = ['BAKERY', '라떼', 'TEA & ADE', 'COFFEE', 'SIGNATURE COFFEE'];
  const input = names.map((key, order) => ({ key, order, blockType: 'category' as const, affinity: getOnePageCategoryAffinity(key), categoryRank: getConventionalCategoryRank(key), orderBoundary: 'page', height: 100 }));
  assert.deepEqual(getFallbackCategoryOrders(input, 'conventional')[0].map(b => b.key), ['SIGNATURE COFFEE', 'COFFEE', '라떼', 'TEA & ADE', 'BAKERY']);
});

test('free packing is bounded and deterministic and never crosses widgets, unknown categories or pages', async () => {
  const { getFallbackCategoryOrders } = await import('./one-page-category-order');
  const known = (order: number, height: number, page = 'page') => ({ order, height, blockType: 'category' as const, affinity: 'coffee', orderBoundary: page });
  const input = [known(0, 10), known(1, 100), { ...known(2, 50), affinity: undefined }, known(3, 10), known(4, 100), { ...known(5, 50), blockType: 'widget' as const }, known(6, 100, 'next'), known(7, 10, 'last')];
  const plans = getFallbackCategoryOrders(input, 'free');
  assert.deepEqual(plans, getFallbackCategoryOrders(input, 'free'));
  assert.ok(plans.length <= 8);
  assert.ok(plans.length > 0);
  for (const plan of plans) {
    assert.deepEqual(plan.slice(0, 2).map(b => b.order).sort(), [0, 1]);
    assert.equal(plan[2].order, 2);
    assert.deepEqual(plan.slice(3, 5).map(b => b.order).sort(), [3, 4]);
    assert.equal(plan[5].order, 5);
    assert.equal(plan[6].order, 6);
    assert.equal(plan[7].order, 7);
  }
});

test('packing uses conventional order before free order and keeps healthy registration order', async () => {
  const input = [130, 130, 40, 40].map((height, order) => ({ key: String(order), order, height, visibleContentHeight: height, marginBottom: 0, estimatedHeight: height, blockType: 'category' as const, affinity: ['bread-and-spread', 'sandwich', 'dessert', 'coffee'][order], categoryRank: [4, 5, 6, 1][order], orderBoundary: 'page' }));
  const options = { allowRelatedOrder: true, targetHeight: 200, maxExhaustiveBlocks: 10, maxExhaustiveColumns: 4, targetMaxVisibleGap: 20 };
  const conventional = getCafeAOrderedBalancedContiguousColumnCandidates(input, 2, options);
  assert.ok(conventional.length > 0);
  assert.deepEqual(conventional[0].flatMap(column => column.blocks.map(block => block.order)), [3, 0, 1, 2]);
  const healthy = input.map(block => ({ ...block, height: 80, visibleContentHeight: 80 }));
  const registered = getCafeAOrderedBalancedContiguousColumnCandidates(healthy, 2, options);
  assert.ok(registered.length > 0);
  assert.ok(registered.every(candidate => candidate.flatMap(column => column.blocks.map(block => block.order)).join(',') === '0,1,2,3'));
  const free = getCafeAOrderedBalancedContiguousColumnCandidates(input.map(block => ({ ...block, categoryRank: undefined })), 2, options);
  assert.ok(free.length > 0);
  assert.ok(free.every(candidate => candidate.every(column => column.height <= 200)));
});
