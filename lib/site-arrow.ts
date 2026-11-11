/** Official-site geometry only. Customer menu artwork keeps its own icons. */
export const SITE_ARROW_ROTATION = {
  right: 0, "down-right": 45, down: 90, "down-left": 135,
  left: 180, "up-left": 225, up: 270, "up-right": 315,
} as const;
export type SiteArrowDirection = keyof typeof SITE_ARROW_ROTATION;

/** Every shaft, bend and circular arrow shares this curved head profile. */
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
  refresh: `M19.5 12A7.5 7.5 0 0 0 6.697 6.697${curvedHead(6.697, 6.697, 135, 3.5)}M4.5 12A7.5 7.5 0 0 0 17.303 17.303${curvedHead(17.303, 17.303, 315, 3.5)}`,
  rotate: `M4.5 12A7.5 7.5 0 1 0 6.697 6.697${curvedHead(6.697, 6.697, 135, 3.5)}`,
} as const;
export type SiteArrowKind = keyof typeof SITE_ARROW_PATHS;
