"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export default function MenuEditorToastBridge({ message, error }: { message?: string | null; error?: string | null }) {
  const lastToastKeyRef = useRef("");

  useEffect(() => {
    const toastKey = `${message ?? ""}:${error ?? ""}`;
    if ((!message && !error) || lastToastKeyRef.current === toastKey) return;

    lastToastKeyRef.current = toastKey;

    if (error) {
      toast.error(error);
      return;
    }

    if (message) toast.success(message);
  }, [message, error]);

  return null;
}
