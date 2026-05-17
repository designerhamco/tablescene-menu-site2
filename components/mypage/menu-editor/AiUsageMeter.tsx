"use client";

type AiUsageMeterProps = {
  label: string;
  used: number;
  limit: number;
  compact?: boolean;
};

function getUsageTone(remaining: number, limit: number) {
  if (remaining <= 0) {
    return {
      badge: "bg-red-50 text-red-700 border-red-100",
      bar: "bg-red-500",
      text: "text-red-700",
    };
  }

  if (remaining === 1 || (limit > 0 && remaining / limit <= 0.25)) {
    return {
      badge: "bg-amber-50 text-amber-700 border-amber-100",
      bar: "bg-amber-500",
      text: "text-amber-700",
    };
  }

  return {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
    bar: "bg-zinc-950",
    text: "text-zinc-700",
  };
}

export default function AiUsageMeter({ label, used, limit, compact = false }: AiUsageMeterProps) {
  const safeLimit = Math.max(0, limit);
  const safeUsed = Math.max(0, Math.min(used, safeLimit));
  const remaining = Math.max(0, safeLimit - safeUsed);
  const percent = safeLimit > 0 ? Math.min(100, Math.round((safeUsed / safeLimit) * 100)) : 0;
  const tone = getUsageTone(remaining, safeLimit);

  return (
    <div className={`rounded-lg border border-zinc-100 bg-zinc-50 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">{label}</p>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${tone.badge}`}>
          남은 {remaining}회
        </span>
      </div>
      <p className={`mt-2 text-sm font-black ${tone.text}`}>
        이번 달 {safeUsed} / {safeLimit}회 사용
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${percent}%` }} />
      </div>
      {remaining <= 0 && (
        <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-red-700">
          이번 달 제공량을 모두 사용했습니다.
        </p>
      )}
    </div>
  );
}
