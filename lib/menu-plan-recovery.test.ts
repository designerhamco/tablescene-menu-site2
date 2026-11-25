import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getRecoveredMenuPlanSnapshot } from './menu-plan-contract';
import { getBusinessProvisioningAmount } from './payment-provisioning-idempotency';

const old = { product_key: 'business_basic_single_monthly', initial_design_id: 'cafe_mocha_forest_a', amount: 6800, menu_design_access: 'all', menu_plan_version: '2026-10-21' };

test('a current 4900 form can recover an already-paid 6800 contract without repricing that payment', () => {
  for (const requested of [4900, 99999, '4900', undefined]) assert.equal(getBusinessProvisioningAmount(requested, old), 6800);
  assert.equal(getBusinessProvisioningAmount(4900), 4900);
  assert.equal(getBusinessProvisioningAmount('4900'), 4900);
  assert.equal(getBusinessProvisioningAmount(99999), 99999, 'new purchase validation still sees and rejects a forged amount');
  assert.ok(Number.isNaN(getBusinessProvisioningAmount('invalid')));
});

test('old paid recovery retains its saved amount, tier and contract/pricebook versions', () => {
  const before = structuredClone(old);
  const snapshot = getRecoveredMenuPlanSnapshot(old)!;
  assert.equal(snapshot.amount, 6800);
  assert.equal(snapshot.version, '2026-10-21');
  assert.equal(snapshot.pricebookVersion, '2026-10-19');
  assert.equal(snapshot.access, 'all');
  assert.equal(snapshot.designId, old.initial_design_id);
  assert.equal(snapshot.service, 'basic');
  assert.equal(snapshot.recovered, true);
  assert.equal('regularAmount' in snapshot, false);
  assert.equal('earlyBirdAmount' in snapshot, false);
  assert.deepEqual(old, before);
});

test('recovery never infers missing historical fields from current template or entitlement policy', () => {
  const legacy = getRecoveredMenuPlanSnapshot({ ...old, menu_design_access: null, menu_plan_version: null })!;
  assert.equal(legacy.access, null); assert.equal(legacy.version, null);
  assert.equal('pricebookVersion' in legacy, false);
  const standard = getRecoveredMenuPlanSnapshot({ ...old, initial_design_id: 'basic-first-column', menu_design_access: 'standard', amount: 4900 })!;
  assert.equal(standard.access, 'standard'); assert.equal(standard.amount, 4900);
  assert.equal(standard.version, '2026-10-21');
  for (const version of ['custom-old-contract', 'constructor']) assert.equal('pricebookVersion' in getRecoveredMenuPlanSnapshot({ ...old, menu_plan_version: version })!, false);
});

test('new-contract recovery also uses the saved purchase amount and rejects mismatched identities', () => {
  const unified = getRecoveredMenuPlanSnapshot({ ...old, amount: 4900, menu_plan_version: '2026-11-25' })!;
  assert.equal(unified.amount, 4900); assert.equal(unified.pricebookVersion, '2026-11-25');
  for (const override of [{ product_key: 'business_basic_multi_monthly' }, { initial_design_id: null }, { initial_design_id: 'unregistered' }, { amount: -1 }, { amount: NaN }]) assert.equal(getRecoveredMenuPlanSnapshot({ ...old, ...override }), null);
});

test('the payment route records recovery metadata from the owned saved contract rather than request data', () => {
  const source = readFileSync(new URL('../app/api/business-subscriptions/start/route.ts', import.meta.url), 'utf8');
  assert.match(source, /select\("amount,initial_design_id,product_key,business_profile_id,menu_design_access,menu_plan_version"\)/);
  assert.match(source, /recoveredMenuPlanContract = getRecoveredMenuPlanSnapshot\(contract\)/);
  assert.match(source, /isPaymentRecovery \? recoveredMenuPlanContract : getMenuPlanSelection/);
  assert.match(source, /getBusinessProvisioningAmount\(payload.amount, recoveryContract\)/);
  assert.match(source, /amount !== expectedAmount/);
  assert.doesNotMatch(source, /getRecoveredMenuPlanSnapshot\(body/);
});
