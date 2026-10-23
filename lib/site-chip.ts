/** Site UI only. Customer menu artwork owns its own badges and palette. */
export type SiteChipTone = "neutral" | "new" | "best" | "draft" | "private" | "active" | "paid" | "settled" | "pending" | "trial" | "ending" | "ended" | "error" | "role" | "basic" | "dining" | "display";

export function getSiteChipTone(label: string): SiteChipTone {
  const value = label.replace(/\s+/g, "").toLowerCase();
  const states: Record<string, SiteChipTone> = { draft: "draft", private: "private", published: "active", active: "active", inactive: "ended", pending: "pending", paid: "settled", failed: "error", cancelled: "ended", expired: "ended", archived: "pending", answered: "paid" };
  if (Object.hasOwn(states, value)) return states[value];
  if (/^(사장|직원|매니저|관리자|소유자|운영직원|편집담당|직원참여)$|^직원[·/]/.test(value)) return "role";
  if (/복구불가|복구불가능|복구가능기간종료|처리확인필요|실패|오류|결제확인필요|거절/.test(value)) return "error";
  if (/해지예약|해지예정/.test(value)) return "ending";
  if (/종료|만료|삭제|해지완료|취소됨|비활성/.test(value)) return "ended";
  if (/작성중|초안/.test(value)) return "draft";
  if (/비공개|공개전/.test(value)) return "private";
  if (/공개중|이용중|사용중|활성|공개됨/.test(value) || value === "공개") return "active";
  if (/결제완료/.test(value)) return "settled";
  if (/지급완료|답변완료|처리완료|준비완료/.test(value)) return "paid";
  if (/체험/.test(value)) return "trial";
  if (/대기|접수|미처리|미결제|확인필요|보관|임박|제한/.test(value)) return "pending";
  if (/^(new|신규)$/.test(value)) return "new";
  if (/^(best|인기|추천)$/.test(value)) return "best";
  if (/디스플레이/.test(value)) return "display";
  if (/다이닝/.test(value) && !/베이직/.test(value)) return "dining";
  if (/베이직|기본디자인/.test(value)) return "basic";
  return "neutral";
}
