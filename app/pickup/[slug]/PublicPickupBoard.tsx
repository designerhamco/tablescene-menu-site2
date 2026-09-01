"use client";

import { useEffect, useState, type CSSProperties } from "react";

import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import ScriptAwareText from "@/components/menu-templates/shared/ScriptAwareText";
import type { PublicPickupQueueData } from "@/lib/server/pickup-queue-service";

export default function PublicPickupBoard({ initialData }: { initialData: PublicPickupQueueData }) {
  const [data, setData] = useState(initialData);

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

  const themeStyle = {
    ...data.theme.typographyStyle,
    "--pickup-canvas": data.theme.palette.canvas,
    "--pickup-surface": data.theme.palette.surface,
    "--pickup-text": data.theme.palette.text,
    "--pickup-muted-text": data.theme.palette.mutedText,
    "--pickup-accent": data.theme.palette.accent,
    "--pickup-accent-soft": data.theme.palette.accentSoft,
    "--pickup-accent-border": data.theme.palette.accentBorder,
    "--pickup-inverse-text": data.theme.palette.inverseText,
  } as CSSProperties;

  return (
    <>
      <KoreanFontAssets assets={data.theme.fontAssets} />
      <main
        className="menu-typography cafe-a-typography min-h-screen bg-[var(--pickup-canvas)] px-5 py-7 text-[var(--pickup-text)] md:px-10 md:py-9"
        style={themeStyle}
        data-pickup-board-theme={data.theme.key}
        data-pickup-board-template={data.menuSite.templateKey}
      >
        <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[1600px] flex-col rounded-[1.5rem] border border-[var(--pickup-accent-border)] bg-[var(--pickup-surface)] px-5 py-6 md:min-h-[calc(100vh-4.5rem)] md:rounded-[2rem] md:px-10 md:py-8">
          <header className="grid gap-5 border-b border-[var(--pickup-accent-border)] pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:pb-8">
            <div>
              <p className="menu-font-en text-sm font-bold tracking-[0.14em] text-[var(--pickup-accent)] md:text-base">PICKUP BOARD</p>
              <h1
                className="cafe-a-store-title mt-2 tracking-tight md:mt-3"
                style={{ color: "var(--pickup-text)" }}
              >
                <ScriptAwareText text={data.menuSite.name} />
              </h1>
            </div>
            <p className="cafe-a-menu-meta text-[var(--pickup-muted-text)] md:text-right">
              자동 갱신 · {data.refreshedAtLabel}
            </p>
          </header>

          <section className="grid flex-1 gap-5 py-6 md:grid-cols-2 md:gap-8 md:py-8" aria-label="대기번호 현황">
            <QueueColumn title="준비 중" description="잠시만 기다려 주세요" numbers={data.waitingNumbers} />
            <QueueColumn title="픽업해주세요" description="카운터에서 메뉴를 받아 주세요" numbers={data.readyNumbers} ready />
          </section>
          <footer className="border-t border-[var(--pickup-accent-border)] pt-5 text-center text-sm font-medium text-[var(--pickup-muted-text)] md:text-base">
            번호가 보이지 않으면 카운터에 문의해 주세요.
          </footer>
        </div>
      </main>
    </>
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
      ? "flex min-h-[340px] flex-col rounded-[1.25rem] bg-[var(--pickup-accent)] p-6 text-[var(--pickup-inverse-text)] md:min-h-[420px] md:rounded-[1.5rem] md:p-9"
      : "flex min-h-[340px] flex-col rounded-[1.25rem] border border-[var(--pickup-accent-border)] bg-[var(--pickup-surface)] p-6 md:min-h-[420px] md:rounded-[1.5rem] md:p-9"}
    >
      <div className={ready ? "border-b border-[var(--pickup-inverse-text)] pb-5" : "border-b border-[var(--pickup-accent-border)] pb-5"}>
        <h2 className="text-2xl font-black text-current md:text-4xl"><ScriptAwareText text={title} /></h2>
        <p className={ready ? "mt-2 text-sm font-medium text-[var(--pickup-inverse-text)] md:text-base" : "mt-2 text-sm font-medium text-[var(--pickup-muted-text)] md:text-base"}>
          <ScriptAwareText text={description} />
        </p>
      </div>
      {numbers.length > 0 ? (
        <ul className="mt-7 grid grid-cols-3 gap-3 sm:grid-cols-4 md:mt-9 md:gap-4 xl:grid-cols-5">
          {numbers.map((number) => (
            <li
              key={number}
              className={ready
                ? "menu-price flex aspect-square items-center justify-center rounded-xl bg-[var(--pickup-surface)] text-3xl font-black tabular-nums text-[var(--pickup-accent)] md:rounded-2xl md:text-5xl"
                : "menu-price flex aspect-square items-center justify-center rounded-xl bg-[var(--pickup-accent-soft)] text-3xl font-black tabular-nums text-[var(--pickup-text)] md:rounded-2xl md:text-5xl"}
            >
              {number}
            </li>
          ))}
        </ul>
      ) : (
        <p className={ready
          ? "my-auto py-12 text-center text-base font-medium text-[var(--pickup-inverse-text)] md:text-lg"
          : "my-auto py-12 text-center text-base font-medium text-[var(--pickup-muted-text)] md:text-lg"}
        >
          표시할 번호가 없습니다.
        </p>
      )}
    </article>
  );
}
