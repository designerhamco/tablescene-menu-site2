import "server-only";

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
    inquiry_id: input.inquiryId ?? null,
    period_key: input.periodKey,
  };

  const { data: existingEvent, error: existingError } = await adminSupabase
    .from("notification_events" as never)
    .select("id")
    .eq("user_id" as never, input.userId as never)
    .eq("event_type" as never, input.eventType as never)
    .eq("channel" as never, "in_app" as never)
    .contains("metadata" as never, { period_key: input.periodKey } as never)
    .maybeSingle();

  if (existingError && existingError.code !== "PGRST116") {
    return { ok: false as const, skipped: false, error: existingError.message };
  }

  if (existingEvent) {
    return { ok: true as const, skipped: true, id: (existingEvent as { id: string }).id };
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

  if (error) {
    return { ok: false as const, skipped: false, error: error.message };
  }

  return { ok: true as const, skipped: false, id: (data as unknown as { id: string }).id };
}
