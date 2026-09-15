"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "단일페이지와 멀티페이지의 차이가 궁금해요",
  "테이블별 QR과 스마트호출은 어떻게 사용하나요?",
  "AI 크레딧은 언제, 얼마나 사용되나요?",
  "디스플레이에서 할인과 동영상을 사용할 수 있나요?",
] as const;

export default function AiSupportChat({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [overseasTransferConsent, setOverseasTransferConsent] = useState(false);

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
    <section className={`site-card min-h-0 overflow-hidden ${compact ? "site-card-compact flex flex-col" : ""}`}>
      {!compact ? (
        <div className="border-b border-zinc-100 px-5 py-5 md:px-7">
          <h2 className="type-content-title">상담 범위</h2>
          <p className="type-body-sm mt-1 text-zinc-500">
            요금제, 메뉴판 제작, 다국어, 스마트호출과 디스플레이 이용 방법을 안내합니다.
          </p>
        </div>
      ) : null}

      <div className={`${compact ? "min-h-[240px] flex-1 overflow-y-auto px-4 py-4 sm:min-h-[280px] sm:px-5 sm:py-5 md:max-h-[46dvh]" : "min-h-[420px] px-5 py-6 md:px-7"} space-y-4 bg-zinc-50`} aria-live="polite">
        {messages.length === 0 ? (
          <div className={`mx-auto flex max-w-xl flex-col items-center text-center ${compact ? "py-6 sm:py-9" : "py-12"}`}>
            <p className="type-subsection-title">무엇을 도와드릴까요?</p>
            <p className="type-body-sm mt-3 text-zinc-500">
              아래 질문을 선택하거나 궁금한 내용을 직접 입력해 주세요.
            </p>
            <div className={`flex w-full flex-wrap justify-center gap-2 ${compact ? "mt-5" : "mt-7"}`}>
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void submitQuestion(suggestion)}
                  disabled={pending || !overseasTransferConsent}
                  className="site-button site-button-secondary site-button-sm w-full text-zinc-600 disabled:text-zinc-300 sm:w-auto"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <p className={message.role === "user"
              ? "type-body-sm max-w-[92%] whitespace-pre-wrap rounded-3xl bg-zinc-950 px-4 py-3 text-white sm:max-w-[85%] sm:px-5 sm:py-3.5"
              : "type-body-sm max-w-[92%] whitespace-pre-wrap rounded-3xl border border-zinc-200 bg-white px-4 py-3 text-zinc-700 sm:max-w-[85%] sm:px-5 sm:py-3.5"}
            >
              {message.text}
            </p>
          </div>
        ))}
        {pending ? <p className="type-label text-zinc-400">답변을 확인하고 있습니다…</p> : null}
        {error ? (
          <div className="type-label rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800" role="alert">
            {error} <Link href="/mypage/inquiries" className="underline underline-offset-4">1:1 문의</Link>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className={`border-t border-zinc-100 ${compact ? "p-3 sm:p-4" : "p-4 md:p-5"}`}>
        <label className={`flex cursor-pointer items-start gap-3 rounded-2xl bg-zinc-50 ${compact ? "mb-3 px-3 py-3" : "mb-4 px-4 py-3.5"}`}>
          <input
            type="checkbox"
            checked={overseasTransferConsent}
            onChange={(event) => {
              setOverseasTransferConsent(event.target.checked);
              if (event.target.checked) setError("");
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-zinc-950"
          />
          <span className="type-caption text-zinc-600">
            <strong className="font-bold text-zinc-900">[필수] AI 상담을 위한 개인정보 국외 이전에 동의합니다.</strong>
            <span className="mt-1 block">
              질문과 생성 답변 및 처리에 필요한 기술 정보가 미국 등 국외의 OpenAI OpCo, LLC 및 하위처리자에게 암호화 전송되며,
              답변 생성과 악용 방지를 위해 최대 30일 보관될 수 있습니다. 동의를 거부하면 AI 상담은 이용할 수 없지만
              일반 서비스와 1:1 문의는 계속 이용할 수 있습니다. <Link href="/privacy" className="font-bold underline underline-offset-2">자세히 보기</Link>
            </span>
          </span>
        </label>
        <div className="flex gap-2">
          <label htmlFor="ai-support-question" className="sr-only">AI 상담 질문</label>
          <input
            id="ai-support-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={500}
            placeholder="질문을 입력해 주세요"
            className="type-body-sm min-w-0 flex-1 rounded-2xl border border-zinc-200 px-4 py-3 outline-none transition-colors focus:border-zinc-950"
          />
          <button
            type="submit"
            disabled={pending || !question.trim() || !overseasTransferConsent}
            className="site-button site-button-primary disabled:bg-zinc-300"
          >
            보내기
          </button>
        </div>
        <p className="type-caption mt-3 px-1 text-zinc-400">
          비밀번호, 인증번호, 카드정보 등 민감한 정보는 입력하지 마세요. 아티메뉴 계정과 DB에는 대화를 저장하지 않습니다.
        </p>
        <p className="type-caption mt-2 px-1 text-zinc-500">
          답변만으로 해결되지 않나요? <Link href="/mypage/inquiries" className="font-bold text-zinc-950 underline underline-offset-2">1:1 문의로 이어서 도움받기</Link>
        </p>
      </form>
    </section>
  );
}
