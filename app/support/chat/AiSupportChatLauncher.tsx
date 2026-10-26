"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { SupportChatIcon } from "@/app/components/ui/support-chat-icon";
import { AI_SUPPORT_CHAT_OPEN_EVENT } from "@/lib/ai-support-chat-launcher";
import AiSupportChat from "./AiSupportChat";
import SupportHome from "./SupportHome";
import styles from "./support-home.module.css";

export default function AiSupportChatLauncher() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"home" | "chat">("home");
  const [chatVisited, setChatVisited] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // An explicit AI action (e.g. the customer-center card) keeps its direct route.
    const openChat = () => {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setView("chat"); setChatVisited(true); setOpen(true);
    };
    window.addEventListener(AI_SUPPORT_CHAT_OPEN_EVENT, openChat);
    return () => window.removeEventListener(AI_SUPPORT_CHAT_OPEN_EVENT, openChat);
  }, []);

  useEffect(() => {
    if (!open || enabled !== null) return;
    const controller = new AbortController();
    void fetch("/api/support/chat", { method: "GET", cache: "no-store", signal: controller.signal })
      .then(response => response.json())
      .then((payload: { enabled?: unknown }) => { if (!controller.signal.aborted) setEnabled(payload.enabled === true); })
      .catch(() => { if (!controller.signal.aborted) setEnabled(false); });
    return () => controller.abort();
  }, [enabled, open]);

  useEffect(() => { if (open) titleRef.current?.focus(); }, [open, view]);

  return <Dialog open={open} onOpenChange={setOpen}>
    <div className="site-support-launcher fixed z-40">
      <DialogTrigger asChild>
        <button type="button" className={`site-button site-button-ai ${styles.launcherButton}`} data-ai-support-launcher aria-label="고객지원 열기" title="AI 상담·고객지원"
          onClick={event => { returnFocusRef.current = event.currentTarget; setView("home"); setChatVisited(false); }}>
          <SupportChatIcon />
        </button>
      </DialogTrigger>
    </div>
    <DialogContent className={`site-dialog-sheet ${styles.panel}`} aria-describedby={undefined}
      onOpenAutoFocus={event => { event.preventDefault(); titleRef.current?.focus(); }}
      onCloseAutoFocus={event => { if (returnFocusRef.current?.isConnected) { event.preventDefault(); returnFocusRef.current.focus(); } }}>
      <header className={styles.header}>
        {view === "chat" ? <button type="button" className="site-button site-button-ghost site-button-icon" aria-label="고객지원 홈으로" onClick={() => setView("home")}><ArrowLeft size={20} aria-hidden="true" /></button> : null}
        <DialogTitle ref={titleRef} tabIndex={-1}>{view === "home" ? "도움이 필요하신가요?" : "AI 실시간 문의"}</DialogTitle>
      </header>
      {view === "home" ? <SupportHome enabled={enabled} onChat={() => { setView("chat"); setChatVisited(true); }} onNavigate={() => setOpen(false)} /> : null}
      {chatVisited ? <div className={styles.chat} hidden={view !== "chat"}>
        {enabled === null ? <div className={styles.unavailable} role="status">상담 가능 여부를 확인 중입니다…</div>
          : enabled ? <AiSupportChat compact /> : <div className={styles.unavailable}>
            <SupportChatIcon width={40} height={40} className="text-zinc-400" /><h3 className="type-content-title">AI 상담 준비 중</h3>
            <p>AI 상담을 준비하고 있습니다. 궁금한 점은 1:1 문의로 남겨 주세요.</p>
            <Link href="/mypage/inquiries" onClick={() => setOpen(false)} className="site-button site-button-primary">1:1 문의하기</Link>
          </div>}
      </div> : null}
    </DialogContent>
  </Dialog>;
}
