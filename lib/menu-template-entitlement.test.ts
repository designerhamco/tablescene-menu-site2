import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogDesigns } from './catalog-designs';
import { canSelectMenuDesign, getNewMenuPlanSelection } from './menu-plan-contract';
import { resolveMenuTemplateEntitlement, type MenuTemplateSubscription } from './menu-template-entitlement';
import { getMenuPlanRenewalAmount } from './menu-plan-pricing';
import { displayPricing } from './display-pricing';

const now = Date.parse('2026-11-25T00:00:00Z');
const base: MenuTemplateSubscription = { id: 'sub', user_id: 'owner', menu_site_id: 'menu', product_key: 'business_basic_single_monthly', status: 'active', current_period_end: '2026-12-01T00:00:00Z', trial_ends_at: null };
const site = { id: 'menu', user_id: 'owner', template_key: 'cafe_design_a' };

test('all supported templates are accessible in their service, including old standard-tier subscribers', () => {
  for (const design of catalogDesigns) {
    const product_key = design.service === 'basic' ? 'business_basic_single_monthly' : design.service === 'dining' ? 'business_basic_multi_monthly' : 'business_display_monthly';
    const original = { ...base, product_key, menu_design_access: 'standard', menu_plan_version: null };
    const before = structuredClone(original);
    const entitlement = resolveMenuTemplateEntitlement(original, { ...site, template_key: design.templateKey }, 'owner', now)!;
    assert.equal(entitlement.service, design.service, design.id);
    assert.equal(entitlement.access, 'all', design.id);
    for (const target of catalogDesigns) assert.equal(canSelectMenuDesign(entitlement.service, 'standard', target.id), target.service === design.service);
    assert.deepEqual(original, before, 'access does not mutate an existing contract');
    if (design.service !== 'display') {
      const selection = getNewMenuPlanSelection(product_key, design.id)!;
      assert.equal(selection.access, 'all');
      assert.deepEqual([selection.regularAmount, selection.earlyBirdAmount], design.service === 'basic' ? [5900, 4900] : [8900, 6900]);
    }
  }
  assert.deepEqual([displayPricing.regularMonthly, displayPricing.earlyBirdMonthly], [12900, 10900]);
});

test('legacy and annual subscriptions keep service access without opting into another contract', () => {
  for (const product_key of ['business_basic_monthly', 'business_basic_yearly', 'business_basic_single_yearly']) {
    assert.equal(resolveMenuTemplateEntitlement({ ...base, product_key }, site, 'owner', now)?.service, 'basic');
  }
  assert.equal(resolveMenuTemplateEntitlement({ ...base, product_key: 'business_basic_multi_yearly' }, { ...site, template_key: 'dining_aube_table_b' }, 'owner', now)?.service, 'dining');
  assert.equal(resolveMenuTemplateEntitlement({ ...base, product_key: 'business_display_yearly' }, { ...site, template_key: 'display_menu_a' }, 'owner', now)?.service, 'display');
  assert.equal(resolveMenuTemplateEntitlement({ ...base, status: 'trialing', current_period_end: null, trial_ends_at: '2026-12-01T00:00:00Z' }, site, 'owner', now)?.access, 'all');
});

test('owner, menu binding, service, validity and unknown-product checks still fail closed', () => {
  for (const override of [{ user_id: 'foreign' }, { menu_site_id: 'foreign' }, { product_key: 'business_basic_multi_monthly' }, { product_key: 'business_display_monthly' }, { product_key: 'forged' }, { status: 'past_due' }, { status: 'pending' }, { status: 'canceled' }, { current_period_end: null }, { current_period_end: 'bad-date' }, { current_period_end: new Date(now).toISOString() }, { status: 'trialing', trial_ends_at: null }]) {
    assert.equal(resolveMenuTemplateEntitlement({ ...base, ...override }, site, 'owner', now), null, JSON.stringify(override));
  }
  for (const override of [{ user_id: 'foreign' }, { id: 'foreign' }, { template_key: 'dining_aube_table_a' }, { template_key: 'unknown' }, { template_key: null }]) assert.equal(resolveMenuTemplateEntitlement(base, { ...site, ...override }, 'owner', now), null);
});

test('next renewal removes only a recognized design surcharge and retains its original offer', () => {
  for (const [product_key, original, expected] of [['business_basic_single_monthly', 6800, 4900], ['business_basic_single_monthly', 7800, 5900], ['business_basic_multi_monthly', 8800, 6900], ['business_basic_multi_monthly', 10800, 8900]] as const) {
    const subscription = { product_key, billing_cycle: 'monthly', amount: original, menu_design_access: 'all', menu_plan_version: '2026-10-21' };
    const before = structuredClone(subscription);
    assert.equal(getMenuPlanRenewalAmount(subscription, 9999), expected);
    assert.equal(getMenuPlanRenewalAmount({ ...subscription, amount: expected }, 9999), expected, 'renewal is idempotent');
    assert.deepEqual(subscription, before, 'calculation never rewrites the stored/paid amount');
  }
  for (const override of [{ amount: 0 }, { amount: 6000 }, { amount: 9999 }, { product_key: 'business_basic_monthly' }, { product_key: 'business_basic_single_yearly', billing_cycle: 'yearly' }, { product_key: 'business_display_monthly' }, { menu_plan_version: null }, { menu_design_access: 'standard' }, { billing_cycle: 'yearly' }]) {
    const subscription = { product_key: 'business_basic_single_monthly', billing_cycle: 'monthly', amount: 6800, menu_design_access: 'all', menu_plan_version: '2026-10-21', ...override };
    assert.equal(getMenuPlanRenewalAmount(subscription, 5900), subscription.amount);
  }
});
