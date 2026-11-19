"use client";

import { useEffect, useState, type RefObject } from "react";
import { DISPLAY_PREVIEW_REQUEST, DISPLAY_PREVIEW_SELECT, DISPLAY_PREVIEW_STATE, getDisplayPreviewPageNumber, type DisplayPreviewPage } from "@/lib/display-preview";
import type { TemplatePreviewQuery } from "@/lib/menu-preview-devices";
import { SUPPORTED_LOCALES } from "@/lib/locales";

export function useDisplayPreviewNavigation(iframeRef: RefObject<HTMLIFrameElement | null>, pages: DisplayPreviewPage[] | undefined, query: TemplatePreviewQuery) {
  const source = JSON.stringify(query);
  const [selection, setSelection] = useState<{ source: string; page: number; lang: string }>();
  const current = selection?.source === source ? selection : {
    page: getDisplayPreviewPageNumber(query.page, pages?.length ?? 0),
    lang: String(Array.isArray(query.lang) ? query.lang[0] : query.lang ?? "ko"),
  };
  useEffect(() => {
    if (!pages) return;
    const iframe = iframeRef.current;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframe?.contentWindow || event.data?.type !== DISPLAY_PREVIEW_STATE) return;
      const index = pages.findIndex(page => page.id === event.data.pageId);
      const locale = event.data.locale;
      if (index < 0 || !SUPPORTED_LOCALES.includes(locale)) return;
      setSelection({ source, page: index + 1, lang: locale });
      const url = new URL(window.location.href);
      url.searchParams.set("page", String(index + 1));
      url.searchParams.set("lang", locale);
      if (url.href !== window.location.href) window.history.replaceState(null, "", url);
    };
    const request = () => iframe?.contentWindow?.postMessage({ type: DISPLAY_PREVIEW_REQUEST }, window.location.origin);
    window.addEventListener("message", receive);
    iframe?.addEventListener("load", request);
    request();
    return () => { window.removeEventListener("message", receive); iframe?.removeEventListener("load", request); };
  }, [iframeRef, pages, source]);
  const select = (page: number) => {
    const target = pages?.[page - 1];
    if (!target) return;
    iframeRef.current?.contentWindow?.postMessage({ type: DISPLAY_PREVIEW_SELECT, pageId: target.id }, window.location.origin);
  };
  return { ...current, select, ready: selection?.source === source };
}
