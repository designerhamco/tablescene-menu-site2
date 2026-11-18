let pendingCleanup: (() => void) | null = null;

/** One explicit link activation, with no background readiness observers or automatic restoration. */
export function scrollToHomeService(id: string, behavior: ScrollBehavior) {
  pendingCleanup?.();
  let frame = 0;
  const inputs = ["wheel", "touchstart", "pointerdown", "keydown", "popstate"] as const;
  const cleanup = () => {
    cancelAnimationFrame(frame);
    for (const input of inputs) window.removeEventListener(input, cleanup);
    if (pendingCleanup === cleanup) pendingCleanup = null;
  };
  for (const input of inputs) window.addEventListener(input, cleanup, { passive: true });
  pendingCleanup = cleanup;
  frame = requestAnimationFrame(() => {
    cleanup();
    document.getElementById(id)?.scrollIntoView({ block: "start", behavior });
  });
  return cleanup;
}
