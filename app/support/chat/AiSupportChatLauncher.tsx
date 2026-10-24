"use client";

import { AnimatePresence, motion } from "motion/react";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AI_SUPPORT_CHAT_OPEN_EVENT } from "@/lib/ai-support-chat-launcher";

import AiSupportChat from "./AiSupportChat";
import styles from "./ai-support-launcher.module.css";

export default function AiSupportChatLauncher() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener(AI_SUPPORT_CHAT_OPEN_EVENT, openChat);
    return () =>
      window.removeEventListener(AI_SUPPORT_CHAT_OPEN_EVENT, openChat);
  }, []);

  useEffect(() => {
    if (!open || enabled !== null) return;
    let active = true;
    void fetch("/api/support/chat", { method: "GET", cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { enabled?: unknown }) => {
        if (active) setEnabled(payload.enabled === true);
      })
      .catch(() => {
        if (active) setEnabled(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className="site-support-launcher pointer-events-none fixed bottom-5 z-40 flex items-center gap-2 md:bottom-8">
        <Link
          href="/guides"
          className="site-button site-button-outline type-label pointer-events-auto"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          사용가이드
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`site-button type-label pointer-events-auto ${styles.launcherButton}`}
          data-ai-support-launcher
          aria-label="AI 상담 열기"
          aria-expanded={open}
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M8 1.4C9 5.7 10.3 7 14.6 8c-4.3 1-5.6 2.3-6.6 6.6C7 10.3 5.7 9 1.4 8 5.7 7 7 5.7 8 1.4Z" />
          </svg>
          AI 상담
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="site-dialog-overlay fixed inset-0 z-50 md:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setOpen(false);
            }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="ai-support-dialog-title"
              className="site-dialog site-dialog-sheet absolute inset-x-0 bottom-0 flex h-[92dvh] max-h-[92dvh] flex-col overflow-hidden border-x-0 border-b-0 text-zinc-950 md:inset-x-auto md:bottom-6 md:right-6 md:h-auto md:w-[min(680px,calc(100vw-48px))] md:border"
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-5 py-4 md:px-6">
                <div>
                  <h2
                    id="ai-support-dialog-title"
                    className="type-content-title"
                  >
                    AI 상담
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="type-label px-1 py-2 text-zinc-500 transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
                >
                  닫기
                </button>
              </header>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-4">
                {enabled === null ? (
                  <div
                    className="type-label grid min-h-64 place-items-center text-zinc-400"
                    aria-live="polite"
                  >
                    상담 가능 여부를 확인 중입니다…
                  </div>
                ) : enabled ? (
                  <AiSupportChat compact />
                ) : (
                  <div className="px-5 py-14 text-center md:px-8">
                    <p className="type-subsection-title">AI 상담 준비 중</p>
                    <p className="type-body-sm mx-auto mt-3 max-w-md text-zinc-500">
                      안전성과 답변 품질을 확인한 다음 공개할 예정입니다. 지금은
                      1:1 문의로 도와드릴게요.
                    </p>
                    <Link
                      href="/mypage/inquiries"
                      className="site-button site-button-primary type-label mt-6 inline-flex"
                    >
                      1:1 문의
                    </Link>
                  </div>
                )}
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
