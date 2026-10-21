import assert from "node:assert/strict";
import test from "node:test";
import { catalogDesigns } from "./catalog-designs";
import { getServiceStaffCallItems, MAX_STAFF_CALL_ITEMS, normalizeStaffCallItems } from "./call-items";
import { getPreviewStaffCallItems } from "./staff-call-preview";
import { getPublicOrderCallCapabilityState } from "../components/public-menu/order-call/types";
import { getStoreOperationAccess } from "./operations-dashboard";

test("service call presets share preview labels, the five-choice limit and independent copies", () => {
  for(const service of ["basic", "dining"] as const) {
    const first=getServiceStaffCallItems(service), second=getServiceStaffCallItems(service);
    assert.equal(first.length,MAX_STAFF_CALL_ITEMS);
    assert.deepEqual(normalizeStaffCallItems(first),first);
    assert.deepEqual(first,getPreviewStaffCallItems(service));
    assert.equal(first.at(-1)?.key,"staff");
    first[0].label="다른 요청";
    assert.notDeepEqual(first,second);
  }
  assert.deepEqual(getServiceStaffCallItems("dining").slice(0,3).map(i=>i.label),["주문 요청","계산 요청","와인 문의"]);
});

test("every Basic and Dining catalog design uses independent session, runtime and store opt-in gates", () => {
  for(const design of catalogDesigns.filter(d=>d.service!=="display")) {
    const base={templateKey:design.templateKey,planType:"business_basic",hasValidTableSession:true,callRuntimeEnabled:true,postpayOrderRuntimeEnabled:true,settings:{table_order:{callEnabled:true,orderEnabled:true,postpayEnabled:true}}};
    const enabled=getPublicOrderCallCapabilityState(base);
    assert.equal(enabled.callEnabled,true,design.id);
    assert.equal(enabled.orderEnabled,true,design.id);
    for(const override of [{hasValidTableSession:false},{planType:"personal_trial"},{settings:{}},{callRuntimeEnabled:false,postpayOrderRuntimeEnabled:false}]) {
      const locked=getPublicOrderCallCapabilityState({...base,...override});
      assert.equal(locked.callEnabled,false,design.id);
      assert.equal(locked.orderEnabled,false,design.id);
    }
    const callOnly=getPublicOrderCallCapabilityState({...base,postpayOrderRuntimeEnabled:false});
    assert.equal(callOnly.callEnabled,true);assert.equal(callOnly.orderEnabled,false);
    const orderOnly=getPublicOrderCallCapabilityState({...base,callRuntimeEnabled:false});
    assert.equal(orderOnly.callEnabled,false);assert.equal(orderOnly.orderEnabled,true);
  }
});

test("operation roles and per-member overrides work across both design access levels", () => {
  for(const design of catalogDesigns.filter(d=>d.service!=="display")) {
    const base={templateKey:design.templateKey,orderDashboardEnabled:true,tableManagementEnabled:true,callManagementEnabled:true,pickupQueueEnabled:false};
    const owner=getStoreOperationAccess({...base,accessRole:"owner"});
    assert.equal(owner.calls,true);assert.equal(owner.tables,true);
    const viewer=getStoreOperationAccess({...base,accessRole:"viewer"});
    assert.equal(viewer.calls,false);assert.equal(viewer.tables,false);
    const limited=getStoreOperationAccess({...base,accessRole:"manager",permissions:["menu.read","table.manage"]});
    assert.equal(limited.calls,false);assert.equal(limited.tables,true);
    assert.equal(limited.orders,false);
  }
});
