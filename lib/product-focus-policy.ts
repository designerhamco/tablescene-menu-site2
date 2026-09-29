export const DESIGN_MENU_FOCUS_POLICY = Object.freeze({
  representativeQr: true,
  smartCall: false,
  storeOperations: false,
  staffManagement: false,
  tableManagement: false,
  pickupQueue: false,
});

export function isStoreOperationsAvailable() {
  return DESIGN_MENU_FOCUS_POLICY.storeOperations;
}

export function isStaffManagementAvailable() {
  return DESIGN_MENU_FOCUS_POLICY.staffManagement;
}
