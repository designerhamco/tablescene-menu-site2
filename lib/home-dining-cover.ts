import { SERVICE_HOME_HREFS, SERVICE_HOME_SECTIONS } from "./service-home-navigation";
import { scrollToHomeService } from "./service-home-scroll";

export function revealDiningFromBasic() {
  const root = document.documentElement;
  if (root.dataset.homeDiningCover !== undefined) return;

  const arrive = () => {
    if (window.location.hash !== `#${SERVICE_HOME_SECTIONS.dining}`) {
      window.history.pushState(window.history.state, "", SERVICE_HOME_HREFS.dining);
    }
    scrollToHomeService(SERVICE_HOME_SECTIONS.dining, "instant");
    document.getElementById("service-dining-heading")?.focus({ preventScroll:true });
  };

  if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    arrive();
    return;
  }

  root.dataset.homeDiningCover = "";
  const transition = document.startViewTransition(async () => {
    arrive();
    // Give the destination's scroll-driven copy time to reach its visible position.
    await new Promise<void>(resolve => {
      const timeout = window.setTimeout(resolve, 100);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.clearTimeout(timeout);
        resolve();
      }));
    });
  });

  const interrupt = () => transition.skipTransition();
  const inputs = ["wheel", "touchstart", "pointerdown", "keydown", "popstate"] as const;
  for (const input of inputs) window.addEventListener(input, interrupt, { passive:true });
  const cleanup = () => {
    delete root.dataset.homeDiningCover;
    for (const input of inputs) window.removeEventListener(input, interrupt);
  };
  void transition.ready.catch(() => {});
  void transition.finished.then(cleanup, cleanup);
}
