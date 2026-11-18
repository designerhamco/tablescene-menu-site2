let pendingCleanup: (() => void) | null = null;

/** One navigation intent; late embedded-preview focus cannot steal its destination. */
export function scrollToHomeService(id: string, behavior: ScrollBehavior) {
  pendingCleanup?.();
  let initialFrame = 0, readyFrame = 0, finished = false, started = false;
  const inputs = ["wheel", "touchstart", "pointerdown", "keydown", "popstate"] as const;
  const cleanup = () => {
    finished = true; cancelAnimationFrame(initialFrame); cancelAnimationFrame(readyFrame); observer.disconnect();
    for (const input of inputs) window.removeEventListener(input, cleanup);
    if (pendingCleanup === cleanup) pendingCleanup = null;
  };
  const ready = () => {
    const hero = document.querySelector<HTMLElement>("[data-hero-motion]");
    const previews = [...document.querySelectorAll<HTMLElement>("[data-hero-live]")];
    return Boolean(hero && document.fonts.status === "loaded" && (hero.dataset.reduced === "true" || (previews.length >= 3 && previews.every(preview => preview.dataset.ready === "true"))));
  };
  const settle = () => {
    readyFrame = 0;
    if (finished || !started || !ready()) return;
    cleanup();
    document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
  };
  const schedule = () => { if (!finished && !readyFrame) readyFrame = requestAnimationFrame(settle); };
  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector("main") ?? document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-ready", "data-reduced"] });
  for (const input of inputs) window.addEventListener(input, cleanup, { passive: true });
  pendingCleanup = cleanup;
  initialFrame = requestAnimationFrame(() => {
    if (finished) return;
    started = true;
    const alreadyReady = ready();
    if (alreadyReady) cleanup();
    document.getElementById(id)?.scrollIntoView({ block: "start", behavior });
    if (!alreadyReady) schedule();
  });
  void document.fonts.ready.then(schedule);
  return cleanup;
}
