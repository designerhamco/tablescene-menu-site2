"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "다이닝 단일페이지와 멀티페이지의 차이가 뭐예요?",
  "스마트호출은 어떻게 사용하나요?",
  "디스플레이에서 동영상을 사용할 수 있나요?",
] as const;

export default function AiSupportChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submitQuestion = async (value: string) => {
    const normalized = value.trim();
    if (!normalized || pending) return;
    setPending(true);
    setError("");
    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: normalized }]);
    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: normalized }),
      });
      const payload = await response.json().catch(() => null) as { answer?: string; error?: string } | null;
      const answer = payload?.answer;
      if (!response.ok || !answer) {
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
    <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-5 md:px-7">
        <h2 className="text-lg font-black">AI 이용 안내</h2>
        <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-500">
          서비스 사용법을 안내합니다. 계정·결제 변경이나 개인정보 확인은 하지 않습니다.
        </p>
      </div>

      <div className="min-h-[420px] space-y-4 bg-zinc-50 px-5 py-6 md:px-7" aria-live="polite">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center py-12 text-center">
            <p className="text-2xl font-black tracking-tight">무엇이 궁금한가요?</p>
            <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
              요금제 차이, 메뉴판 제작, 다국어, 스마트호출과 디스플레이 이용법을 물어보세요.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void submitQuestion(suggestion)}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-950"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <p className={message.role === "user"
              ? "max-w-[85%] whitespace-pre-wrap rounded-3xl bg-zinc-950 px-5 py-3.5 text-sm font-medium leading-relaxed text-white"
              : "max-w-[85%] whitespace-pre-wrap rounded-3xl border border-zinc-200 bg-white px-5 py-3.5 text-sm font-medium leading-relaxed text-zinc-700"}
            >
              {message.text}
            </p>
          </div>
        ))}
        {pending ? <p className="text-sm font-bold text-zinc-400">답변을 확인하고 있습니다…</p> : null}
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-relaxed text-amber-800" role="alert">
            {error} <Link href="/mypage/inquiries" className="underline underline-offset-4">1:1 문의</Link>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-zinc-100 p-4 md:p-5">
        <div className="flex gap-2">
          <label htmlFor="ai-support-question" className="sr-only">AI 상담 질문</label>
          <input
            id="ai-support-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={500}
            placeholder="질문을 입력해 주세요"
            className="min-w-0 flex-1 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium outline-none transition-colors focus:border-zinc-950"
          />
          <button
            type="submit"
            disabled={pending || !question.trim()}
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            보내기
          </button>
        </div>
        <p className="mt-3 px-1 text-xs font-medium leading-relaxed text-zinc-400">
          비밀번호, 인증번호, 카드정보 등 민감한 정보는 입력하지 마세요. 대화는 이 화면을 벗어나면 저장되지 않습니다.
        </p>
      </form>
    </section>
  );
}
