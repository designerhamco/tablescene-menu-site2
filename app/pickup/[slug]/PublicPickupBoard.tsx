"use client";

import { useEffect, useState } from "react";

import type { PublicPickupQueueData } from "@/lib/server/pickup-queue-service";

export default function PublicPickupBoard({ initialData }: { initialData: PublicPickupQueueData }) {
  const [data, setData] = useState(initialData);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());

  useEffect(() => {
    let stopped = false;
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch(`/api/pickup/${encodeURIComponent(initialData.menuSite.slug)}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const nextData = await response.json() as PublicPickupQueueData;
        if (!stopped) {
          setData(nextData);
          setUpdatedAt(new Date());
        }
      } catch {
        // Keep the last valid board visible during transient network errors.
      }
    };
    const timer = window.setInterval(refresh, 10_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [initialData.menuSite.slug]);

  return (
    <main className="min-h-screen bg-[#f5f3ee] px-5 py-8 text-zinc-950 md:px-10 md:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1600px] flex-col">
        <header className="flex items-end justify-between gap-6 border-b border-zinc-300 pb-6">
          <div>
            <p className="text-sm font-bold tracking-[0.12em] text-zinc-500">PICKUP BOARD</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">{data.menuSite.name}</h1>
          </div>
          <p className="text-right text-xs font-bold text-zinc-400 md:text-sm">
            자동 갱신 · {updatedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </header>

        <section className="grid flex-1 gap-5 py-6 md:grid-cols-2 md:gap-8 md:py-8" aria-label="대기번호 현황">
          <QueueColumn title="준비 중" description="잠시만 기다려 주세요" numbers={data.waitingNumbers} />
          <QueueColumn title="픽업해주세요" description="카운터에서 메뉴를 받아 주세요" numbers={data.readyNumbers} ready />
        </section>
        <footer className="border-t border-zinc-300 pt-5 text-center text-sm font-bold text-zinc-500">
          번호가 보이지 않으면 카운터에 문의해 주세요.
        </footer>
      </div>
    </main>
  );
}

function QueueColumn({
  title,
  description,
  numbers,
  ready = false,
}: {
  title: string;
  description: string;
  numbers: number[];
  ready?: boolean;
}) {
  return (
    <article className={ready
      ? "flex min-h-[360px] flex-col rounded-[2rem] bg-zinc-950 p-6 text-white md:p-9"
      : "flex min-h-[360px] flex-col rounded-[2rem] bg-white p-6 md:p-9"}
    >
      <div>
        <h2 className="text-2xl font-black md:text-4xl">{title}</h2>
        <p className={ready ? "mt-2 text-sm font-bold text-zinc-400" : "mt-2 text-sm font-bold text-zinc-500"}>{description}</p>
      </div>
      {numbers.length > 0 ? (
        <ul className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:mt-10 md:gap-5 xl:grid-cols-5">
          {numbers.map((number) => (
            <li
              key={number}
              className={ready
                ? "flex aspect-square items-center justify-center rounded-3xl bg-white text-3xl font-black tabular-nums text-zinc-950 md:text-5xl"
                : "flex aspect-square items-center justify-center rounded-3xl bg-zinc-100 text-3xl font-black tabular-nums md:text-5xl"}
            >
              {number}
            </li>
          ))}
        </ul>
      ) : (
        <p className={ready
          ? "my-auto py-12 text-center text-base font-bold text-zinc-600"
          : "my-auto py-12 text-center text-base font-bold text-zinc-300"}
        >
          표시할 번호가 없습니다.
        </p>
      )}
    </article>
  );
}
