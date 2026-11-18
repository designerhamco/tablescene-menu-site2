let pendingCleanup: (() => void) | null = null;

/** One navigation intent; late embedded-preview focus cannot steal its destination. */
function scrollHome(id: string | null, behavior: ScrollBehavior) {
  pendingCleanup?.();
  let initialFrame = 0, readyFrame = 0, topFrame = 0, finished = false, started = false;
  const inputs = ["wheel", "touchstart", "pointerdown", "keydown", "popstate"] as const;
  const cleanup = () => {
    finished = true; cancelAnimationFrame(initialFrame); cancelAnimationFrame(readyFrame); cancelAnimationFrame(topFrame); observer.disconnect();
    window.removeEventListener("scroll", holdStart);
    for (const input of inputs) window.removeEventListener(input, cleanup);
    if (pendingCleanup === cleanup) pendingCleanup = null;
  };
  const move = (nextBehavior: ScrollBehavior) => {
    if (id === null) window.scrollTo({ top: 0, left: 0, behavior: nextBehavior });
    else document.getElementById(id)?.scrollIntoView({ block: "start", behavior: nextBehavior });
  };
  // A logo is an explicit start intent until the next user action. Embedded
  // demos can take focus after reporting readiness; do not let them undo it.
  const holdStart = () => {
    if (window.location.pathname !== "/") { cleanup(); return; }
    if (finished || !started || window.scrollY <= 1 || topFrame) return;
    topFrame = requestAnimationFrame(() => { topFrame = 0; if (!finished) move("instant"); });
  };
  const releaseReady = () => {
    if (id !== null) cleanup();
    else observer.disconnect();
  };
  const ready = () => {
    const hero = document.querySelector<HTMLElement>("[data-hero-motion]");
    const previews = [...document.querySelectorAll<HTMLElement>("[data-hero-live]")];
    return Boolean(hero && document.fonts.status === "loaded" && (hero.dataset.reduced === "true" || (previews.length >= 3 && previews.every(preview => preview.dataset.ready === "true"))));
  };
  const settle = () => {
    readyFrame = 0;
    if (finished || !started || !ready()) return;
    releaseReady();
    move("instant");
  };
  const schedule = () => { if (!finished && !readyFrame) readyFrame = requestAnimationFrame(settle); };
  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector("main") ?? document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-ready", "data-reduced"] });
  for (const input of inputs) window.addEventListener(input, cleanup, { passive: true });
  if (id === null) window.addEventListener("scroll", holdStart, { passive: true });
  pendingCleanup = cleanup;
  initialFrame = requestAnimationFrame(() => {
    if (finished) return;
    started = true;
    const alreadyReady = ready();
    if (alreadyReady) releaseReady();
    move(behavior);
    if (!alreadyReady) schedule();
  });
  void document.fonts.ready.then(schedule);
  return cleanup;
}

export function scrollToHomeService(id: string, behavior: ScrollBehavior) {
  return scrollHome(id, behavior);
}

/** Brand navigation restarts the scroll-driven hero, including late preview readiness. */
export function scrollToHomeStart() {
  return scrollHome(null, "instant");
}
