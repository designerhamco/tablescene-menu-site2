import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;
type NotificationIdentity = {
  userId: string;
  eventType: string;
  channel: "in_app" | "email";
  periodKey: string;
  menuSiteId?: string | null;
  subscriptionId?: string | null;
};

// The fallback lets application code deploy before the additive migration.
// Once the ledger exists, a lookup error fails closed rather than re-sending.
export async function findNotificationDeliveryKey(admin: AdminClient, identity: NotificationIdentity) {
  async function lookup(ledger: boolean) {
    let query = admin.from((ledger ? "notification_delivery_keys" : "notification_events") as never)
      .select("id").eq("user_id" as never, identity.userId as never)
      .eq("event_type" as never, identity.eventType as never).eq("channel" as never, identity.channel as never);
    if (identity.menuSiteId !== undefined) query = identity.menuSiteId === null
      ? query.is("menu_site_id" as never, null) : query.eq("menu_site_id" as never, identity.menuSiteId as never);
    if (identity.subscriptionId !== undefined) query = identity.subscriptionId === null
      ? query.is("subscription_id" as never, null) : query.eq("subscription_id" as never, identity.subscriptionId as never);
    query = ledger ? query.eq("period_key" as never, identity.periodKey as never)
      : query.contains("metadata" as never, { period_key: identity.periodKey } as never);
    // Some old producers intentionally match more broadly than the unique key.
    return query.limit(1).maybeSingle();
  }
  let result = await lookup(true);
  if (result.error && ["42P01", "PGRST205"].includes(result.error.code)) result = await lookup(false);
  if (result.error) throw new Error(`NOTIFICATION_DELIVERY_LOOKUP_FAILED: ${result.error.message}`);
  return result.data as { id: string } | null;
}
