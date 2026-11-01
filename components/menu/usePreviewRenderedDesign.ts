"use client";
import { useEffect, useState, type RefObject } from "react";
import { readPreviewRenderedDesign, type PreviewRenderedDesign } from "@/lib/menu-preview-rendered-design";

export function usePreviewRenderedDesign(iframeRef: RefObject<HTMLIFrameElement | null>, url: string, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<{url: string; value: PreviewRenderedDesign}>();
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !enabled) return;
    let disposed = false, frame = 0, timer = 0;
    let observer: MutationObserver | undefined;
    let resizeWindow: Window | null = null;
    const refresh = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      timer = window.setTimeout(() => { frame = requestAnimationFrame(() => {
        if (disposed) return;
        const doc = iframe.contentDocument;
        if (!doc) return;
        const value = readPreviewRenderedDesign(doc);
        if (value) setSnapshot(previous => previous?.url === url && JSON.stringify(previous.value) === JSON.stringify(value) ? previous : {url,value});
      }); }, 80);
    };
    const loaded = () => {
      observer?.disconnect();
      resizeWindow?.removeEventListener("resize", refresh);
      const doc = iframe.contentDocument;
      if (!doc?.body) return;
      observer = new MutationObserver(records => {
        const relevant = records.some(record => {
          if (record.type === "attributes") return true;
          return [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && !(node as Element).hasAttribute("data-preview-native-sample"));
        });
        if (relevant) refresh();
      });
      observer.observe(doc.body, {subtree:true,childList:true,attributes:true,attributeFilter:["class","style","data-native-ready","hidden"]});
      resizeWindow = doc.defaultView;
      resizeWindow?.addEventListener("resize", refresh);
      void doc.fonts.ready.then(() => { if (!disposed) refresh(); });
      refresh();
    };
    iframe.addEventListener("load", loaded);
    loaded();
    return () => { disposed=true; clearTimeout(timer); cancelAnimationFrame(frame); observer?.disconnect(); resizeWindow?.removeEventListener("resize",refresh); iframe.removeEventListener("load",loaded); };
  }, [iframeRef,url,enabled]);
  return snapshot?.url === url ? snapshot.value : undefined;
}
