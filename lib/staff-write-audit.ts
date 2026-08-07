import type { MenuSiteAccessContext, MenuSitePermission } from "@/lib/menu-site-permissions";

export const MENU_SITE_WRITE_SURFACES = [
  "menu_editor_action",
  "menu_image_upload",
  "menu_video_upload",
  "menu_widget_image_upload",
  "menu_widget_mutation",
  "menu_widget_final_save",
  "menu_table_management",
  "order_status_management",
  "order_unpaid_cancellation",
  "order_manual_payment",
  "call_acknowledgement",
  "call_completion",
] as const;

export type MenuSiteWriteSurface = (typeof MENU_SITE_WRITE_SURFACES)[number];
export type AuditedMenuSiteWritePermission = Extract<
  MenuSitePermission,
  | "menu.edit"
  | "menu.publish"
  | "ai.use"
  | "table.manage"
  | "order.manage"
  | "order.cancel_unpaid"
  | "payment.manual"
  | "call.manage"
>;

export function buildStaffWriteAuditEntry(
  context: MenuSiteAccessContext,
  permission: AuditedMenuSiteWritePermission,
  surface: MenuSiteWriteSurface,
) {
  if (context.isOwner) return null;

  return {
    menu_site_id: context.menuSiteId,
    actor_user_id: context.actorUserId,
    actor_role: context.accessRole,
    action: "staff.write_authorized",
    target_type: "menu_site",
    target_id: context.menuSiteId,
    metadata: {
      permission,
      surface,
      membership_id: context.membershipId,
    },
  } as const;
}
