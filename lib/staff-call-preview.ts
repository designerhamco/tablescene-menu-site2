import { getServiceStaffCallItems, type StaffCallService } from "./call-items";

/** Sample choices only. Saved store call settings are never replaced. */
export function getPreviewStaffCallItems(service: StaffCallService) {
  return getServiceStaffCallItems(service);
}
