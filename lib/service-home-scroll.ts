let pendingCleanup: (() => void) | null = null;

/** One explicit navigation intent, without background demo-readiness observers. */
function scrollHome(id: string | null, behavior: ScrollBehavior) {
  pendingCleanup?.();
  let frame = 0, topFrame = 0, started = false, finished = false;
  const inputs = ["wheel", "touchstart", "pointerdown", "keydown", "popstate"] as const;
  const cleanup = () => {
    finished = true;
    cancelAnimationFrame(frame); cancelAnimationFrame(topFrame);
    window.removeEventListener("scroll", holdStart);
    for (const input of inputs) window.removeEventListener(input, cleanup);
    if (pendingCleanup === cleanup) pendingCleanup = null;
  };
  const move = (nextBehavior: ScrollBehavior) => {
    if (id === null) window.scrollTo({ top: 0, left: 0, behavior: nextBehavior });
    else document.getElementById(id)?.scrollIntoView({ block: "start", behavior: nextBehavior });
  };
  // Only an explicit brand click owns the start until the next user action.
  // Normal visits and service navigation never install this scroll guard.
  const holdStart = () => {
    if (window.location.pathname !== "/") { cleanup(); return; }
    if (finished || !started || window.scrollY <= 1 || topFrame) return;
    topFrame = requestAnimationFrame(() => { topFrame = 0; if (!finished) move("instant"); });
  };
  for (const input of inputs) window.addEventListener(input, cleanup, { passive: true });
  if (id === null) window.addEventListener("scroll", holdStart, { passive: true });
  pendingCleanup = cleanup;
  frame = requestAnimationFrame(() => {
    started = true;
    if (id !== null) cleanup();
    move(behavior);
  });
  return cleanup;
}

export function scrollToHomeService(id: string, behavior: ScrollBehavior) {
  return scrollHome(id, behavior);
}

/** Brand navigation restarts the scroll-driven hero until the next user input. */
export function scrollToHomeStart() {
  return scrollHome(null, "instant");
}
