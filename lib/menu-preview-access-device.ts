export type MenuPreviewAccessDevice = "phone" | "tablet" | "desktop";

type AccessInput = { userAgent: string; platform: string; maxTouchPoints: number; coarsePointer: boolean; mobileViewport: boolean };

/** Classify the accessing browser, independently of the selected preview mockup. */
export function classifyMenuPreviewAccess(input: AccessInput): MenuPreviewAccessDevice {
  const {userAgent, platform, maxTouchPoints, coarsePointer, mobileViewport} = input;
  const ipad = /iPad/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
  const androidTablet = /Android/i.test(userAgent) && !/Mobile/i.test(userAgent);
  const touch = coarsePointer || /Android|iPhone|iPad|iPod/i.test(userAgent) || ipad;
  const phone = /iPhone|iPod|Android.*Mobile/i.test(userAgent) || (touch && !ipad && !androidTablet && mobileViewport);
  return phone ? "phone" : touch ? "tablet" : "desktop";
}

export function getMenuPreviewAccessDevice() {
  return classifyMenuPreviewAccess({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,
    coarsePointer:window.matchMedia("(pointer: coarse)").matches,mobileViewport:window.matchMedia("(max-width: 767px)").matches});
}
export const getServerMenuPreviewAccessDevice = () => null;
export function subscribeMenuPreviewAccess(onChange: () => void) {
  const pointer=window.matchMedia("(pointer: coarse)");
  pointer.addEventListener("change",onChange);window.addEventListener("resize",onChange);
  return () => {pointer.removeEventListener("change",onChange);window.removeEventListener("resize",onChange);};
}
