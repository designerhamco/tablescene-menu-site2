"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export type ActionFeedbackToastTone = "success" | "error" | "warning" | "info";

export default function ActionFeedbackToast({
  message,
  tone = "success",
  eventKey,
}: {
  message?: string | null;
  tone?: ActionFeedbackToastTone;
  eventKey?: unknown;
}) {
  const lastEventKeyRef = useRef<unknown>(null);

  useEffect(() => {
    if (!message) return;

    const nextEventKey = eventKey ?? `${tone}:${message}`;
    if (Object.is(lastEventKeyRef.current, nextEventKey)) return;
    lastEventKeyRef.current = nextEventKey;

    toast[tone](message, { duration: 4_500 });
  }, [eventKey, message, tone]);

  return null;
}
