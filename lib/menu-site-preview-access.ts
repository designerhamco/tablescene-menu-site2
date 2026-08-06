import {
  hasMenuSitePermission,
  type MenuSiteAccessContext,
} from "./menu-site-permissions";

export type MenuSitePreviewLifecycleAccess = {
  canOwnerPreview: boolean;
  canPreview: boolean;
};

export function canAccessMenuSitePreview(
  context: MenuSiteAccessContext,
  accessState: MenuSitePreviewLifecycleAccess | null,
) {
  if (!accessState || !hasMenuSitePermission(context, "menu.read")) {
    return false;
  }

  return context.isOwner
    ? accessState.canOwnerPreview
    : context.staffAccessAllowed && accessState.canPreview;
}
