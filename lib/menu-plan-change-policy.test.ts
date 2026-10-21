import assert from 'node:assert/strict';
import test from 'node:test';
import {quoteMenuPlanChange,planChangeEligibility,matchesPlanChangeConsent,type PlanChangeSubscription} from './menu-plan-change-policy';
const now=new Date('2026-10-21T00:00:00Z');
const subscription:PlanChangeSubscription={id:'sub',user_id:'owner',menu_site_id:'menu',product_key:'business_basic_single_monthly',plan_type:'business_basic',billing_cycle:'monthly',status:'active',amount:5900,currency:'KRW',next_billing_at:'2026-11-01T00:00:00Z',cancel_at_period_end:false,billing_key_ref:'fake-test-key',menu_design_access:null,menu_plan_version:null};
const site={id:'menu',user_id:'owner',template_key:'cafe_mocha_forest_a',settings:{}};
test('opt-in quote leaves current legacy contract untouched until the exact next billing date',()=>{
 const before=structuredClone(subscription);const quote=quoteMenuPlanChange(subscription,site,'standard','basic-first-column',now);
 assert.equal(quote.amount,4900);assert.equal(quote.effectiveAt,subscription.next_billing_at);assert.equal(quote.billingCycle,'monthly');assert.deepEqual(subscription,before);assert.equal(subscription.menu_design_access,null);
 assert.equal(quoteMenuPlanChange(subscription,site,'all','cafe_mocha_forest_a',now).amount,6800);
 const dining={...site,template_key:'dining_aube_table_b'};
 assert.equal(quoteMenuPlanChange(subscription,dining,'standard','dining-sidebar',now).amount,6900);
 assert.equal(quoteMenuPlanChange(subscription,dining,'all','dining_aube_table_a',now).amount,8800);
});
test('yearly opt-in preserves the paid year and explicitly quotes monthly from its next billing date',()=>{
 const yearly={...subscription,billing_cycle:'yearly',next_billing_at:'2027-06-01T00:00:00Z'};
 const quote=quoteMenuPlanChange(yearly,site,'all','cafe_mocha_forest_a',now);
 assert.equal(quote.effectiveAt,'2027-06-01T00:00:00Z');assert.equal(quote.billingCycle,'monthly');assert.equal(yearly.billing_cycle,'yearly');
});
test('cross-owner, inactive, due, cancelled, no-card and wrong-currency quotes fail closed',()=>{
 for(const override of [{user_id:'other'},{menu_site_id:'other'},{plan_type:'business_display'},{status:'trialing'},{status:'past_due'},{cancel_at_period_end:true},{billing_key_ref:null},{currency:'USD'},{next_billing_at:null},{next_billing_at:'bad-date'},{next_billing_at:now.toISOString()}])assert.ok(planChangeEligibility({...subscription,...override},site,now));
 assert.throws(()=>quoteMenuPlanChange(subscription,{...site,template_key:'display_menu_a'},'all','cafe_mocha_forest_a',now));
 assert.throws(()=>quoteMenuPlanChange(subscription,site,'standard','cafe_mocha_forest_a',now));
 assert.throws(()=>quoteMenuPlanChange(subscription,site,'all','dining-full-page',now));
 assert.throws(()=>quoteMenuPlanChange(subscription,site,'forged','basic-first-column',now));
});
test('customer consent binds exact amount, effective date, cycle and contract/pricebook versions',()=>{
 const quote=quoteMenuPlanChange(subscription,site,'all','cafe_mocha_forest_a',now);
 assert.equal(matchesPlanChangeConsent(quote,quote),true);
 for(const override of [{designId:'basic-first-column'},{access:'standard'},{productKey:'business_basic_multi_monthly'},{currency:'USD'},{amount:4900},{amount:'6800'},{effectiveAt:'2026-12-01T00:00:00Z'},{billingCycle:'yearly'},{contractVersion:'old'},{pricebookVersion:'old'}])assert.equal(matchesPlanChangeConsent(quote,{...quote,...override}),false);
 assert.equal(matchesPlanChangeConsent(quote,null),false);
});
test('an unbroken recognized early-bird new contract retains its offer after the promotion closes',()=>{
 const after=new Date('2027-10-21T00:00:00Z'),next='2027-11-01T00:00:00Z';
 const early={...subscription,menu_design_access:'standard' as const,menu_plan_version:'2026-10-21',amount:4900,next_billing_at:next};
 assert.equal(quoteMenuPlanChange(early,site,'all','cafe_mocha_forest_a',after).amount,6800);
 assert.equal(quoteMenuPlanChange({...subscription,next_billing_at:next},site,'all','cafe_mocha_forest_a',after).amount,7800);
});
