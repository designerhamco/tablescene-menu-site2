import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogDesigns, filterCatalogDesigns, getCatalogDesign, getCatalogPricing } from './catalog-designs';
import { canSelectMenuDesign, getMenuPlanSelection } from './menu-plan-contract';
import { getOpenPromotionSnapshot, getPromotionAwareChargeAmount, validatePromotionForOrder } from './promotions';
import { readTemplateFavorites, setTemplateFavorite, TEMPLATE_FAVORITES_KEY } from './template-favorites';

const offers = [
  ['business_basic_single_monthly', 'basic-first-column', 4900, 5900, 'standard'],
  ['business_basic_single_monthly', 'cafe_mocha_forest_a', 6800, 7800, 'all'],
  ['business_basic_multi_monthly', 'dining-full-page', 6900, 8900, 'standard'],
  ['business_basic_multi_monthly', 'dining_aube_table_a', 8800, 10800, 'all'],
] as const;
for (const [product,id,early,regular,access] of offers) test(`catalog and checkout agree on ${id} contract`, () => {
  const design=getCatalogDesign(id)!;
  const quote=getMenuPlanSelection(product,id,design.templateKey)!;
  assert.equal(quote.access,access);assert.equal(quote.regularAmount,regular);assert.equal(quote.earlyBirdAmount,early);
  assert.equal(getCatalogPricing(design.service as 'basic'|'dining',design.kind).earlyBirdMonthly,early);
  const promotion=getOpenPromotionSnapshot(product,new Date('2026-10-21T12:00:00Z'),id)!;
  assert.equal(promotion.finalAmount,early);assert.equal(promotion.originalAmount,regular);
  assert.equal(getPromotionAwareChargeAmount(product,null,id),regular);
  assert.equal(getPromotionAwareChargeAmount(product,promotion,id),early);
});

test('untrusted service, renderer and design combinations fail closed',()=>{
  assert.equal(getMenuPlanSelection('business_basic_single_monthly','dining-full-page'),null);
  assert.equal(getMenuPlanSelection('business_basic_multi_monthly','basic-first-column'),null);
  assert.equal(getMenuPlanSelection('business_basic_single_monthly','basic-first-column','cafe_mocha_forest_a'),null);
  assert.equal(getMenuPlanSelection('business_basic_single_monthly','retired-template'),null);
  assert.equal(getMenuPlanSelection('business_display_monthly','basic-first-column'),null);
  assert.equal(canSelectMenuDesign('basic','standard','cafe_mocha_forest_a'),false);
  assert.equal(canSelectMenuDesign('basic','all','dining-full-page'),false);
  assert.equal(canSelectMenuDesign('basic','standard','basic-top-row-album'),true);
  assert.equal(canSelectMenuDesign('basic','all','cafe_mocha_forest_a'),true);
});

test('a designer purchase cannot reuse the cheaper standard promotion snapshot',()=>{
  const standard=getOpenPromotionSnapshot('business_basic_single_monthly',new Date(),'basic-first-column')!;
  assert.equal(validatePromotionForOrder({productKey:'business_basic_single_monthly',menuDesignId:'cafe_mocha_forest_a',promotionCode:'OPEN',promotion:standard}).ok,false);
  const missing=validatePromotionForOrder({productKey:'business_basic_single_monthly',menuDesignId:'cafe_mocha_forest_a'});
  assert.ok(missing.ok);assert.equal(getPromotionAwareChargeAmount('business_basic_single_monthly',missing.promotion,'cafe_mocha_forest_a'),7800);
  assert.equal(getPromotionAwareChargeAmount('business_basic_single_monthly',null),5900); // legacy callers keep their quote
});

test('public catalog, checkout and filter identities are complete and unique',()=>{
  assert.equal(catalogDesigns.length,20);assert.equal(new Set(catalogDesigns.map(d=>d.id)).size,20);
  assert.equal(filterCatalogDesigns('basic','standard').length,6);
  assert.equal(filterCatalogDesigns('basic','standard','album').length,2);
  assert.equal(filterCatalogDesigns('dining','standard','list').length,2);
  assert.equal(filterCatalogDesigns('dining','designer').length,2);
  for(const design of catalogDesigns.filter(d=>d.service!=='display')) {
    const url=new URL(design.startHref,'https://example.test');
    assert.equal(url.searchParams.get('design'),design.id);
    assert.ok(getMenuPlanSelection(url.searchParams.get('product'),design.id,url.searchParams.get('template')));
  }
});

test('favorites are bounded public IDs, idempotent and independent from access',()=>{
  const ids=readTemplateFavorites({[TEMPLATE_FAVORITES_KEY]:['cafe_mocha_forest_a','basic-first-column','cafe_mocha_forest_a','deleted','admin',null]});
  assert.deepEqual(ids,['cafe_mocha_forest_a','basic-first-column']);
  assert.deepEqual(setTemplateFavorite(ids,'basic-first-column',true),['basic-first-column','cafe_mocha_forest_a']);
  assert.deepEqual(setTemplateFavorite(ids,'basic-first-column',false),['cafe_mocha_forest_a']);
  assert.deepEqual(readTemplateFavorites({menu_design_access:'all'}),[]);
});

test('switching restores each design appearance without replacing customer content',async()=>{
  const {buildMenuDesignMutation}=await import('./menu-design-mutation');
  const original={settings:{menu_design_id:'cafe_mocha_forest_a',typography:{english_font_key:'carme'},enabled_locales:['ko','en'],advertisementPopup:{enabled:true,images:[]}},pageSettings:{menu_cover_enabled:true,design:{backgroundColor:'#123456',appearance:{chipShape:'soft'}}},templateKey:'cafe_mocha_forest_a',brandColor:'#654321'};
  const first=buildMenuDesignMutation({...original,targetId:'basic-center-column'});
  assert.equal(first.settings.menu_design_id,'basic-center-column');assert.equal(first.pageSettings.menu_cover_enabled,true);assert.deepEqual(first.settings.enabled_locales,['ko','en']);
  const back=buildMenuDesignMutation({settings:first.settings,pageSettings:first.pageSettings,templateKey:'cafe_design_a',brandColor:first.brandColor,targetId:'cafe_mocha_forest_a'});
  assert.deepEqual(back.pageSettings.design,original.pageSettings.design);assert.deepEqual(back.settings.typography,original.settings.typography);assert.equal(back.brandColor,original.brandColor);
  assert.deepEqual(back.settings.advertisementPopup,original.settings.advertisementPopup);
  assert.deepEqual(Object.keys(back).sort(),['brandColor','pageSettings','settings']);
  assert.deepEqual(original.settings.typography,{english_font_key:'carme'});
});

test('favorites and switching accept the public proxy host, rejecting foreign origins',async()=>{
  const {isSameOriginRequest}=await import('./same-origin-request');
  const request=(origin:string,host:string,site='same-origin')=>new Request('http://localhost:3000/api/menu-design',{headers:{origin,host,'sec-fetch-site':site}});
  assert.equal(isSameOriginRequest(request('http://127.0.0.1:3000','127.0.0.1:3000')),true);
  assert.equal(isSameOriginRequest(request('https://menu.example','menu.example')),true);
  assert.equal(isSameOriginRequest(request('https://evil.example','menu.example')),false);
  assert.equal(isSameOriginRequest(request('https://menu.example:4000','menu.example')),false);
  assert.equal(isSameOriginRequest(request('https://menu.example','menu.example','cross-site')),false);
});


test('public base-price purchase links select the same standard contract and design-inclusive quotes', async () => {
  const { publicBasicProducts } = await import('./public-product-details');
  for (const product of publicBasicProducts) {
    const design = getCatalogDesign(product.standardDesignId)!;
    const quote = getMenuPlanSelection(product.productKey, design.id, design.templateKey)!;
    assert.equal(quote.access, 'standard');
    assert.equal(product.price, quote.earlyBirdAmount);
    assert.equal(product.regularPrice, quote.regularAmount);
    const designer = catalogDesigns.find(item => item.service === quote.service && item.kind === 'designer')!;
    const all = getMenuPlanSelection(product.productKey, designer.id)!;
    assert.equal(product.designPrice, all.earlyBirdAmount);
    assert.equal(product.designRegularPrice, all.regularAmount);
    assert.equal(new URL(design.startHref, 'https://example.test').searchParams.get('design'), product.standardDesignId);
  }
});
