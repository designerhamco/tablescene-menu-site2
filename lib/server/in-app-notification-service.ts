import "server-only";
import { findNotificationDeliveryKey } from "@/lib/server/notification-delivery-key";

import type { Json } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationEventType } from "@/lib/notification-events";

type CreateInAppNotificationInput = {
  userId: string;
  eventType: NotificationEventType;
  title: string;
  message: string;
  href: string;
  inquiryId?: string;
  periodKey: string;
  metadata?: Record<string, Json>;
};

export async function createInAppNotificationOnce(input: CreateInAppNotificationInput) {
  const adminSupabase = createAdminClient();
  const metadata = {
    ...(input.metadata ?? {}),
    href: input.href,
    period_key: input.periodKey,
    ...(input.inquiryId ? { inquiry_id: input.inquiryId } : {}),
  };

  try {
    const existing = await findNotificationDeliveryKey(adminSupabase, {
      userId: input.userId, eventType: input.eventType, channel: "in_app", periodKey: input.periodKey,
    });
    if (existing) return { ok: true as const, skipped: true, id: existing.id };
  } catch (error) {
    return { ok: false as const, skipped: false, error: error instanceof Error ? error.message : "Notification lookup failed" };
  }

  const { data, error } = await adminSupabase
    .from("notification_events" as never)
    .insert({
      user_id: input.userId,
      event_type: input.eventType,
      channel: "in_app",
      title: input.title,
      message: input.message,
      status: "sent",
      scheduled_for: new Date().toISOString(),
      metadata,
    } as never)
    .select("id")
    .single();

  if (error?.code === "23505") {
    try {
      const existing = await findNotificationDeliveryKey(adminSupabase, {
        userId: input.userId, eventType: input.eventType, channel: "in_app", periodKey: input.periodKey,
      });
      if (existing) return { ok: true as const, skipped: true, id: existing.id };
    } catch { /* Preserve the original insert error if the follow-up lookup fails. */ }
  }
  if (error) {
    return { ok: false as const, skipped: false, error: error.message };
  }

  return { ok: true as const, skipped: false, id: (data as unknown as { id: string }).id };
}
