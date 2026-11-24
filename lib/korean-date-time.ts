const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function formatKoreanDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return "-";

  const kstDate = new Date(timestamp + KST_OFFSET_MS);
  const year = kstDate.getUTCFullYear();
  const month = kstDate.getUTCMonth() + 1;
  const day = kstDate.getUTCDate();
  const hour24 = kstDate.getUTCHours();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const period = hour24 < 12 ? "오전" : "오후";
  const minute = String(kstDate.getUTCMinutes()).padStart(2, "0");
  const second = String(kstDate.getUTCSeconds()).padStart(2, "0");

  return `${year}. ${month}. ${day}. ${period} ${hour12}:${minute}:${second}`;
}

const koreanClock = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function formatKoreanClockTime(value: string | undefined) {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? koreanClock.format(timestamp) : null;
}

export function formatElapsedMinutes(value: string | undefined, now: number | null) {
  const timestamp = Date.parse(value ?? "");
  if (now === null || !Number.isFinite(timestamp)) return null;
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`;
}
