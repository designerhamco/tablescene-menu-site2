"use client";

import Link from "next/link";
import { ArrowUp, ArrowUpRight, Coins, LoaderCircle, PanelsTopLeft, QrCode } from "lucide-react";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import SupportBotAvatar from "./SupportBotAvatar";
import styles from "./ai-support-chat.module.css";

type Message = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  { icon: PanelsTopLeft, text: "단일페이지와 멀티페이지의 차이가 궁금해요" },
  { icon: QrCode, text: "대표 QR은 어떻게 사용하나요?" },
  { icon: Coins, text: "AI 크레딧은 언제, 얼마나 사용되나요?" },
] as const;

export default function AiSupportChat({ compact = false }: { compact?: boolean }) {
  const inputId = useId();
  const messageViewportRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [overseasTransferConsent, setOverseasTransferConsent] = useState(false);

  useEffect(() => {
    const viewport = messageViewportRef.current;
    if (!viewport || messages.length === 0) return;

    const animationFrame = window.requestAnimationFrame(() => {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: messages.length > 1 ? "smooth" : "auto",
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [error, messages, pending]);

  const submitQuestion = async (value: string) => {
    const normalized = value.trim();
    if (!normalized || pending) return;
    if (!overseasTransferConsent) {
      setError("AI 상담을 이용하려면 국외 이전 안내를 확인하고 동의해 주세요.");
      return;
    }
    setPending(true);
    setError("");
    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: normalized }]);
    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: normalized, overseasTransferConsent }),
      });
      const payload = await response.json().catch(() => null) as { answer?: string; error?: string } | null;
      const answer = payload?.answer;
      if (!response.ok || !answer) {
        if (response.status === 429) {
          throw new Error("질문이 잠시 많습니다. 10분 뒤 다시 이용하거나 1:1 문의를 남겨 주세요.");
        }
        throw new Error(payload?.error || "답변을 불러오지 못했습니다.");
      }
      setMessages((current) => [...current, { role: "assistant", text: answer }]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "AI 상담을 이용하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitQuestion(question);
  };

  return (
    <section className={`${styles.root} ${compact ? styles.compact : ""}`} data-ai-support-chat>
      <div
        ref={messageViewportRef}
        className={styles.viewport}
        role="log"
        aria-label="AI 상담 대화"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className={styles.welcome}>
            <SupportBotAvatar size={96} className={styles.mascot} />
            <h2 className={styles.welcomeTitle}>안녕하세요.<br />무엇을 도와드릴까요?</h2>
            <p className={`type-body-sm ${styles.subtitle}`}>아티메뉴 이용 방법을 물어보세요.</p>
            <p className={`type-caption ${styles.suggestionLabel}`}>이런 질문은 어떠세요?</p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => void submitQuestion(text)}
                  disabled={pending || !overseasTransferConsent}
                  className={styles.suggestion}
                >
                  <Icon size={16} aria-hidden="true" /><span>{text}</span><ArrowUpRight size={14} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        ) : <div className={styles.messages}>{messages.map((message, index) => message.role === "user" ? (
          <p key={`user-${index}`} className={`type-body-sm ${styles.userMessage}`}>{message.text}</p>
        ) : (
          <div key={`assistant-${index}`} className={styles.assistantMessage}>
            <p className={`type-caption ${styles.speaker}`}><SupportBotAvatar size={36} className={styles.avatar} />아티메뉴 AI</p>
            <p className={`type-body-sm ${styles.answer}`}>{message.text}</p>
          </div>
        ))}</div>}
        {pending ? <p className={`type-label ${styles.pending}`} role="status"><LoaderCircle size={16} aria-hidden="true" />답변을 확인하고 있습니다…</p> : null}
        {error ? (
          <div className={`site-notice site-notice-warning type-label px-4 py-3 ${styles.error}`} role="alert">
            {error} <Link href="/mypage/inquiries" className="underline underline-offset-4">1:1 문의</Link>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={`type-caption ${styles.consent}`}>
          <input
            type="checkbox"
            checked={overseasTransferConsent}
            onChange={(event) => {
              setOverseasTransferConsent(event.target.checked);
              if (event.target.checked) setError("");
            }}
          />
          {overseasTransferConsent ? (
            <span className={`${styles.consentText} ${styles.consentDone}`}>
              <strong className={styles.consentTitle}>국외 이전 동의 완료</strong>
              <Link href="/privacy" className="shrink-0 font-bold underline underline-offset-2">자세히 보기</Link>
            </span>
          ) : (
            <span className={styles.consentText}>
              <strong className={styles.consentTitle}>[필수] AI 상담을 위한 개인정보 국외 이전에 동의합니다.</strong>
              <span className={styles.consentBody}>
                질문과 생성 답변 및 처리에 필요한 기술 정보가 미국 등 국외의 OpenAI OpCo, LLC 및 하위처리자에게 암호화 전송되며,
                답변 생성과 악용 방지를 위해 최대 30일 보관될 수 있습니다. 동의를 거부하면 AI 상담은 이용할 수 없지만
                일반 서비스와 1:1 문의는 계속 이용할 수 있습니다. <Link href="/privacy" className="font-bold underline underline-offset-2">자세히 보기</Link>
              </span>
            </span>
          )}
        </label>
        <div className={styles.composer}>
          <label htmlFor={inputId} className="sr-only">AI 상담 질문</label>
          <input
            id={inputId}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={500}
            placeholder="궁금한 내용을 입력해 주세요"
            className={styles.input}
          />
          <button
            type="submit"
            disabled={pending || !question.trim() || !overseasTransferConsent}
            className="site-button site-button-ai site-button-icon"
            aria-label="질문 보내기"
          >
            <ArrowUp size={20} aria-hidden="true" />
          </button>
        </div>
        <p className={`type-caption ${styles.privacyNote}`}>
          비밀번호, 인증번호, 카드정보 등 민감한 정보는 입력하지 마세요. 아티메뉴 계정과 DB에는 대화를 저장하지 않습니다.
        </p>
      </form>
    </section>
  );
}
