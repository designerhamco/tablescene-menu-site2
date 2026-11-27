"use client";

import Link from "next/link";
import { Coins, PanelsTopLeft, QrCode } from "@/app/components/ui/site-icon";
import { ArrowUp, ArrowUpRight } from "@/app/components/ui/site-arrow";
import { LoadingState } from "@/app/components/ui/loading-state";
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { SupportSparkleIcon } from "@/app/components/ui/support-chat-icon";
import {
  AI_SUPPORT_CHAT_ACCESS_PATH,
  AI_SUPPORT_CHAT_MAX_INPUT_LENGTH,
  type AiSupportChatAccess,
  type AiSupportChatResponse,
} from "@/lib/ai-support-chat";
import styles from "./ai-support-chat.module.css";

type Message = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  { icon: PanelsTopLeft, text: "베이직·다이닝·디스플레이의 차이가 궁금해요" },
  { icon: QrCode, text: "대표 QR은 어떻게 사용하나요?" },
  { icon: Coins, text: "AI 크레딧은 언제, 얼마나 사용되나요?" },
] as const;

const resetTime = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

async function readAccess(signal?: AbortSignal): Promise<AiSupportChatAccess> {
  try {
    const response = await fetch(AI_SUPPORT_CHAT_ACCESS_PATH, { cache: "no-store", signal });
    const payload: AiSupportChatResponse = await response.json();
    if (payload.access) return payload.access;
  } catch {
    // An unavailable status keeps the composer closed until a successful retry.
  }
  return { status: "unavailable" };
}

export default function AiSupportChat({ compact = false }: { compact?: boolean }) {
  const inputId = useId();
  const messageViewportRef = useRef<HTMLDivElement>(null);
  const pendingRequest = useRef(false);
  const [access, setAccess] = useState<AiSupportChatAccess | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [overseasTransferConsent, setOverseasTransferConsent] = useState(false);

  const refreshAccess = useCallback((signal?: AbortSignal) => {
    void readAccess(signal).then((currentAccess) => {
      if (!signal?.aborted) setAccess(currentAccess);
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshAccess(controller.signal);
    return () => controller.abort();
  }, [refreshAccess]);

  const nextCheckAt = access?.status === "limited" ? access.resetAt : access?.status === "busy" ? access.retryAt : null;
  useEffect(() => {
    if (!nextCheckAt) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => refreshAccess(controller.signal),
      Math.max(1_000, Date.parse(nextCheckAt) - Date.now() + 1_000),
    );
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [nextCheckAt, refreshAccess]);

  function retryAccess() {
    setAccess(null);
    setError("");
    refreshAccess();
  }

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
  }, [access?.status, error, messages, pending]);

  const submitQuestion = async (value: string) => {
    const normalized = value.trim();
    if (!normalized || pendingRequest.current || access?.status !== "ready") return;
    if (!overseasTransferConsent) {
      setError("AI 상담을 이용하려면 국외 이전 안내를 확인하고 동의해 주세요.");
      return;
    }
    pendingRequest.current = true;
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
      const payload: AiSupportChatResponse | null = await response.json().catch(() => null);
      const answer = payload?.answer;
      const nextAccess = payload?.access;
      if (nextAccess) setAccess(nextAccess);
      if (!response.ok || !answer) {
        if (nextAccess?.status !== "limited" && nextAccess?.status !== "sign-in" && nextAccess?.status !== "busy") {
          setError(payload?.error || (response.status === 429
            ? "질문이 잠시 많습니다. 잠시 후 다시 이용해 주세요."
            : "답변을 불러오지 못했습니다."));
        }
        return;
      }
      setMessages((current) => [...current, { role: "assistant", text: answer }]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "AI 상담을 이용하지 못했습니다.");
    } finally {
      pendingRequest.current = false;
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
        <div className="site-stack-group">
          {messages.length === 0 && access?.status === "ready" ? (
            <div className={styles.welcome}>
              <h2 className="type-subsection-title">안녕하세요.<br />무엇을 도와드릴까요?</h2>
              <p className={`type-body-sm ${styles.subtitle}`}>아티메뉴 이용 방법을 물어보세요.</p>
              <p className={`type-caption ${styles.suggestionLabel}`}>이런 질문은 어떠세요?</p>
              <div className={styles.suggestions}>
                {SUGGESTIONS.map(({ icon: Icon, text }) => (
                  <Button
                    key={text}
                    type="button"
                    variant="outline"
                    onClick={() => void submitQuestion(text)}
                    disabled={pending || !overseasTransferConsent}
                    className={styles.suggestion}
                  >
                    <Icon size={16} aria-hidden="true" /><span>{text}</span><ArrowUpRight size={14} aria-hidden="true" />
                  </Button>
                ))}
              </div>
            </div>
          ) : messages.length > 0 ? <div className={styles.messages}>{messages.map((message, index) => message.role === "user" ? (
            <p key={`user-${index}`} className={`type-body-sm ${styles.userMessage}`}>{message.text}</p>
          ) : (
            <div key={`assistant-${index}`} className={styles.assistantMessage}>
              <p className={`type-caption ${styles.speaker}`}><SupportSparkleIcon width={18} height={18} />아티메뉴 AI</p>
              <p className={`type-body-sm ${styles.answer}`}>{message.text}</p>
            </div>
          ))}</div> : null}
          {access === null ? <LoadingState label="상담 가능 여부를 확인 중입니다…" /> : null}
          {pending ? <LoadingState label="답변을 확인하고 있습니다…" inline /> : null}
          {error ? (
            <div className="site-notice site-notice-warning type-label px-4 py-3" role="alert">
              {error}
            </div>
          ) : null}
          {access?.status === "limited" ? (
            <div className="site-stack-title">
              <h2 className="type-content-title">이번 AI 상담은 여기까지예요</h2>
              <p className="type-body-sm">추가 질문은 카카오톡으로 남겨 주세요.</p>
              <div className="site-action-row">
                <Button asChild>
                  <a href={access.kakaoChatUrl} target="_blank" rel="noopener noreferrer">카카오톡으로 문의하기</a>
                </Button>
              </div>
              <p className="type-caption">AI 상담은 {resetTime.format(new Date(access.resetAt))}부터 다시 이용할 수 있어요.</p>
            </div>
          ) : null}
          {access?.status === "sign-in" ? (
            <div className="site-stack-title">
              <h2 className="type-content-title">로그인하고 AI 상담을 이용해 주세요</h2>
              <div className="site-action-row">
                <Button asChild><Link href="/sign-in?next=%2Fsupport%2Fchat">로그인</Link></Button>
              </div>
            </div>
          ) : null}
          {access?.status === "busy" || access?.status === "unavailable" ? (
            <div className="site-stack-title">
              <h2 className="type-content-title">{access.status === "busy" ? "이미 질문에 답변하고 있어요" : "상담 가능 여부를 확인하지 못했어요"}</h2>
              <div className="site-action-row">
                <Button type="button" variant="outline" onClick={retryAccess}>다시 확인</Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {access?.status === "ready" ? <form onSubmit={handleSubmit} className={styles.form}>
        <label className={`type-footnote ${styles.consent}`}>
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
              <Link href="/privacy" className="shrink-0 font-medium underline underline-offset-2">자세히 보기</Link>
            </span>
          ) : (
            <span className={styles.consentText}>
              <strong className={styles.consentTitle}>[필수] AI 상담을 위한 개인정보 국외 이전에 동의합니다.</strong>
              <span className={styles.consentBody}>
                질문과 생성 답변 및 처리에 필요한 기술 정보가 미국 등 국외의 OpenAI OpCo, LLC 및 하위처리자에게 암호화 전송되며,
                답변 생성과 악용 방지를 위해 최대 30일 보관될 수 있습니다. 동의를 거부하면 AI 상담은 이용할 수 없지만
                일반 서비스와 1:1 문의는 계속 이용할 수 있습니다. <Link href="/privacy" className="font-medium underline underline-offset-2">자세히 보기</Link>
              </span>
            </span>
          )}
        </label>
        <div className={styles.composer}>
          <label htmlFor={inputId} className="sr-only">AI 상담 질문</label>
          <Input
            fieldSize="md"
            id={inputId}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={AI_SUPPORT_CHAT_MAX_INPUT_LENGTH}
            placeholder="궁금한 내용을 입력해 주세요"
            className={styles.input}
          />
          <Button
            type="submit"
            variant="ai"
            size="icon"
            disabled={pending || !question.trim() || !overseasTransferConsent}
            aria-label="질문 보내기"
          >
            <ArrowUp size={20} aria-hidden="true" />
          </Button>
        </div>
        <p className={`type-footnote ${styles.privacyNote}`}>
          비밀번호, 인증번호, 카드정보 등 민감한 정보는 입력하지 마세요. 아티메뉴 계정과 DB에는 대화를 저장하지 않습니다.
        </p>
      </form> : null}
    </section>
  );
}
