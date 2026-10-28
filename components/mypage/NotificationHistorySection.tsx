"use client";
import { NotificationPanel } from "@/app/components/ui/notification-panel";


import { useState } from "react";
import { useRouter } from "next/navigation";

import { NOTIFICATION_FALLBACK_HREF } from "@/lib/notification-display-policy";
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
  showIntro?: boolean;
  fallbackHref?: string;
};

function getNotificationHref(metadata: Json | null, fallbackHref: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return fallbackHref;
  }

  const record = metadata as Record<string, Json | undefined>;
  const value = record.href ?? record.action_url;

  if (typeof value !== "string") {
    return fallbackHref;
  }

  const trimmed = value.trim();

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallbackHref;
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

export default function NotificationHistorySection({ events, showIntro = true, fallbackHref = NOTIFICATION_FALLBACK_HREF }: NotificationHistorySectionProps) {
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
      {showIntro ? <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="type-section-title">알림 내역</h2>
          <p className="mt-3 break-keep text-copy font-medium leading-relaxed text-zinc-600">
            아티메뉴 이용 중 발생한 알림과 중요한 안내를 확인할 수 있습니다.
          </p>
        </div>
      </div> : null}

      <NotificationPanel items={items.map((event,index)=>({
        id:event.id ?? `${event.title}-${event.created_at}-${index}`, title:event.title ?? "알림",
        message:event.message ?? "알림 내용을 확인할 수 없습니다.",createdAt:event.created_at,unread:!event.read_at,
        href:getNotificationHref(event.metadata, fallbackHref),detail:getDeliveryLabel(event),
      }))} onActivate={item=>{
        const event=items.find((event,index)=>(event.id ?? `${event.title}-${event.created_at}-${index}`)===item.id);
        const navigate=()=>{if(item.href!==fallbackHref) window.location.assign(item.href);else router.refresh();};
        if(event?.id) void markAsRead(event.id).finally(navigate); else if(item.href!==fallbackHref) window.location.assign(item.href);
      }} />
    </section>
  );
}
