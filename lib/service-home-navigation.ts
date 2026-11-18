/** Canonical destinations for the three service introductions on the home page. */
export const SERVICE_HOME_SECTIONS = {
  basic: "service-basic",
  dining: "service-dining",
  display: "service-display",
} as const;
export type HomeService = keyof typeof SERVICE_HOME_SECTIONS;
export const SERVICE_HOME_HREFS = {
  basic: `/#${SERVICE_HOME_SECTIONS.basic}`,
  dining: `/#${SERVICE_HOME_SECTIONS.dining}`,
  display: `/#${SERVICE_HOME_SECTIONS.display}`,
} as const;

export function isServiceHomeHref(href: unknown): href is typeof SERVICE_HOME_HREFS[HomeService] {
  return typeof href === "string" && Object.values(SERVICE_HOME_HREFS).some(value => value === href);
}

/** Flow anchors, rather than sticky panel bounds, determine the visible introduction. */
export function activeHomeService(anchors: readonly { id: string; top: number }[], stackBottom: number, headerHeight: number): string | null {
  if (!Number.isFinite(stackBottom) || stackBottom <= headerHeight) return null;
  return anchors.filter(anchor => Number.isFinite(anchor.top) && anchor.top <= headerHeight).at(-1)?.id ?? null;
}
