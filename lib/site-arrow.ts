/** Official-site geometry only. Customer menu artwork keeps its own icons. */
export const SITE_ARROW_ROTATION = {
  right: 0, "down-right": 45, down: 90, "down-left": 135,
  left: 180, "up-left": 225, up: 270, "up-right": 315,
} as const;
export type SiteArrowDirection = keyof typeof SITE_ARROW_ROTATION;

/** Shafts and bends share this curved head profile. */
function curvedHead(x: number, y: number, angle: number, size = 8) {
  const radians = angle * Math.PI / 180;
  const point = (px: number, py: number) => {
    const scale = size / 8;
    const round = (value: number) => Number(value.toFixed(3));
    return `${round(x + (px * Math.cos(radians) - py * Math.sin(radians)) * scale)} ${round(y + (px * Math.sin(radians) + py * Math.cos(radians)) * scale)}`;
  };
  return `M${point(-8, -8)}C${point(-6.8, -4.2)} ${point(-3.8, -1.2)} ${point(0, 0)}C${point(-3.8, 1.2)} ${point(-6.8, 4.2)} ${point(-8, 8)}`;
}

export const SITE_ARROW_SHAFT = `M3 12H21${curvedHead(21, 12, 0)}`;
export const SITE_ARROW_CHEVRON = "M7.5 3.5L17 12L7.5 20.5L11 12Z";
export const SITE_ARROW_DOUBLE_CHEVRON = "M3.5 4L13 12L3.5 20L7 12ZM10.5 4L20 12L10.5 20L14 12Z";
export const SITE_ARROW_PATHS = {
  shaft: SITE_ARROW_SHAFT,
  chevron: SITE_ARROW_CHEVRON,
  "double-chevron": SITE_ARROW_DOUBLE_CHEVRON,
  turn: `M4 21V15A7 7 0 0 1 11 8H21${curvedHead(21, 8, 0, 6)}`,
  "turn-back": `M10 20H9A6.5 6.5 0 0 1 9 7H21${curvedHead(21, 7, 0, 5.5)}`,
  bidirectional: `M3 7H21${curvedHead(21, 7, 0, 5)}M21 17H3${curvedHead(3, 17, 180, 5)}`,
  // Remix Line refresh-line, pinned source/license: public/licenses/remix-icon-NOTICE.txt.
  refresh: "M5.463 4.433A9.96 9.96 0 0 1 12 2c5.523 0 10 4.477 10 10c0 2.136-.67 4.116-1.81 5.74L17 12h3A8 8 0 0 0 6.46 6.228zm13.074 15.134A9.96 9.96 0 0 1 12 22C6.477 22 2 17.523 2 12c0-2.136.67-4.116 1.81-5.74L7 12H4a8 8 0 0 0 13.54 5.772z",
  rotate: "M5 12A7 7 0 1 0 7.05 7.05",
} as const;
export type SiteArrowKind = keyof typeof SITE_ARROW_PATHS;

/** Rotate arrows use one curved outer wing, keeping the inner counter open.
 * A longer, wider wing and advanced tip remain legible at16–24px.
 * Filled geometry avoids acute stroked joins at small UI sizes.
 */
function circularHead(x: number, y: number, angle: number) {
  const radians = angle * Math.PI / 180;
  const point = (px: number, py: number) => `${Number((x + px * Math.cos(radians) - py * Math.sin(radians)).toFixed(3))} ${Number((y + px * Math.sin(radians) + py * Math.cos(radians)).toFixed(3))}`;
  return `M${point(0, 0)}L${point(-6.6, 4.4)}Q${point(-5.4, 1.5)} ${point(-3.4, 0)}Z`;
}
export const SITE_CIRCULAR_ARROW_HEADS = {
  rotate: circularHead(5.1, 9, 135),
} as const;
