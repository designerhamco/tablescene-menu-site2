"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function MenuEditorToastBridge({ message, error }: { message?: string | null; error?: string | null }) {
  const lastToastKeyRef = useRef("");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

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

  useEffect(() => {
    if (!message && !error) return;
    if (!searchParams.has("message") && !searchParams.has("error")) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("message");
    nextParams.delete("error");

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [error, message, pathname, router, searchParams]);

  return null;
}
