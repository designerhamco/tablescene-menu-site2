"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { formatNotificationDateTime, NOTIFICATION_FALLBACK_HREF } from "@/lib/notification-display-policy";
import type { Json } from "@/lib/supabase/types";

export type MypageNotificationEvent = {
  id: string | null;
  title: string | null;
  message: string | null;
  status: string | null;
  channel: string | null;
  sent_at: string | null;
  read_at: string | null;
  created_at: string | null;
  metadata: Json | null;
};

type NotificationHistorySectionProps = {
  events: MypageNotificationEvent[];
};

function getNotificationHref(metadata: Json | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return NOTIFICATION_FALLBACK_HREF;
  }

  const record = metadata as Record<string, Json | undefined>;
  const value = record.href ?? record.action_url;

  if (typeof value !== "string") {
    return NOTIFICATION_FALLBACK_HREF;
  }

  const trimmed = value.trim();

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return NOTIFICATION_FALLBACK_HREF;
  }

  return trimmed;
}

function getDeliveryLabel(event: MypageNotificationEvent) {
  if (event.channel === "email") {
    if (event.status === "sent" || event.sent_at) return "이메일 발송 완료";
    if (event.status === "failed") return "이메일 발송 실패";
    if (event.status === "pending") return "이메일 발송 대기";
    return "이메일 고지";
  }

  return "인앱 알림";
}

export default function NotificationHistorySection({ events }: NotificationHistorySectionProps) {
  const [items, setItems] = useState(events);
  const router = useRouter();

  const markAsRead = async (notificationId: string) => {
    const event = items.find((item) => item.id === notificationId);

    if (!event || event.read_at) {
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) => item.id === notificationId ? { ...item, read_at: new Date().toISOString() } : item)
    );

    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("read failed");
      }
    } catch {
      setItems((currentItems) =>
        currentItems.map((item) => item.id === notificationId ? { ...item, read_at: event.read_at } : item)
      );
    }
  };

  return (
    <section id="notification-history" className="scroll-mt-28">
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">알림 내역</h2>
          <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
            메뉴링크 이용 중 발생한 알림과 중요한 안내를 확인할 수 있습니다.
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          {items.map((event, index) => {
            const eventId = event.id ?? `${event.title}-${event.created_at}-${index}`;
            const href = getNotificationHref(event.metadata);
            const isUnread = !event.read_at;

            return (
              <a
                key={eventId}
                href={href}
                onClick={(clickEvent) => {
                  clickEvent.preventDefault();

                  if (event.id) {
                    markAsRead(event.id).finally(() => {
                      if (href !== NOTIFICATION_FALLBACK_HREF) {
                        window.location.assign(href);
                        return;
                      }

                      router.refresh();
                    });
                    return;
                  }

                  if (href !== NOTIFICATION_FALLBACK_HREF) {
                    window.location.assign(href);
                  }
                }}
                className={`block p-5 text-left transition-colors hover:bg-zinc-50 ${index > 0 ? "border-t border-zinc-100" : ""}`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${isUnread ? "bg-red-500" : "bg-zinc-200"}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-keep text-base font-black text-zinc-950">{event.title ?? "알림"}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${isUnread ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-500"}`}>
                          {isUnread ? "읽지 않음" : "읽음"}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-keep text-sm font-semibold leading-relaxed text-zinc-600">
                        {event.message ?? "알림 내용을 확인할 수 없습니다."}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-left md:text-right">
                    <p className="text-xs font-bold text-zinc-400">{formatNotificationDateTime(event.created_at)}</p>
                    <p className="mt-2 text-[11px] font-black text-zinc-400">{getDeliveryLabel(event)}</p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <article className="rounded-3xl border border-dashed border-zinc-200 bg-white p-10 text-center shadow-sm">
          <h3 className="text-2xl font-bold">새 알림이 없습니다.</h3>
          <p className="mx-auto mt-3 max-w-md break-keep text-sm font-medium leading-relaxed text-zinc-500">
            메뉴링크 이용 중 새 알림이 생기면 이곳에 표시됩니다.
          </p>
        </article>
      )}
    </section>
  );
}
