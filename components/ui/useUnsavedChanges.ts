"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { confirmUnsavedChanges, unsavedChanges, type UnsavedChange } from "@/lib/unsaved-changes";

let active = 0;
let stopListening: (() => void) | undefined;
function listen(navigateTo: (href: string) => void) {
  if (active++ === 0) {
    const unload = (event: BeforeUnloadEvent) => { if (unsavedChanges.hasChanges()) { event.preventDefault(); event.returnValue = ""; } };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      const target = new URL(anchor.href, window.location.href);
      if (!/^https?:$/.test(target.protocol) || (target.pathname === window.location.pathname && target.search === window.location.search && target.origin === window.location.origin)) return;
      if (!unsavedChanges.hasChanges()) return;
      event.preventDefault(); event.stopImmediatePropagation();
      void confirmUnsavedChanges().then(allowed => { if (allowed) navigateTo(target.href); });
    };
    const submit = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form || form.hasAttribute("data-unsaved-commit") || !unsavedChanges.hasChanges()) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const button = event.submitter;
      void confirmUnsavedChanges().then(allowed => { if (allowed && form.isConnected) form.requestSubmit(button ?? undefined); });
    };
    type GuardedNavigate = Event & { destination: { sameDocument: boolean; key: string }; hashChange: boolean; navigationType: string };
    const navigation = (window as Window & { navigation?: EventTarget & { traverseTo: (key: string) => { finished: Promise<unknown> } } }).navigation;
    const navigate = (event: Event) => {
      const next = event as GuardedNavigate;
      // Same-document back/forward happens before popstate. Do not rewrite history.
      if (next.navigationType !== "traverse" || !next.cancelable || !next.destination.sameDocument || next.hashChange || !unsavedChanges.hasChanges()) return;
      next.preventDefault();
      void confirmUnsavedChanges().then(allowed => { if (allowed) void navigation?.traverseTo(next.destination.key).finished.catch(() => {}); });
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    document.addEventListener("submit", submit, true);
    navigation?.addEventListener("navigate", navigate);
    stopListening = () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); document.removeEventListener("submit", submit, true); navigation?.removeEventListener("navigate", navigate); };
  }
  return () => { if (--active === 0) { stopListening?.(); stopListening = undefined; } };
}
/** Shared by the layout draft, registration forms and auto-saving short names. */
export function useUnsavedChanges({ dirty, pending = false, discard }: UnsavedChange, enabled = true) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const unregister = unsavedChanges.register({ dirty, pending, discard });
    const unlisten = listen(href => { const target = new URL(href, window.location.href); if (target.origin === window.location.origin) router.push(`${target.pathname}${target.search}${target.hash}`); else window.location.assign(target.href); });
    return () => { unregister(); unlisten(); };
  }, [dirty, pending, discard, enabled, router]);
}
