import { Bell } from "./site-icon";
import { formatNotificationBadgeCount } from "@/lib/notification-display-policy";

/** Badge geometry belongs to the glyph, independent of the surrounding hit target. */
export function NotificationBellIcon({ unreadCount = 0, compact = false, indicator = "count" }: {
  unreadCount?: number; compact?: boolean; indicator?: "count" | "dot";
}) {
  return <span className="site-notification-bell" aria-hidden="true">
    <Bell size={23} className="size-full" />
    {unreadCount > 0 ? <span className="site-notification-bell-badge type-footnote" data-compact={compact || undefined} data-indicator={indicator}>
      {indicator === "count" ? formatNotificationBadgeCount(unreadCount) : null}
    </span> : null}
  </span>;
}
