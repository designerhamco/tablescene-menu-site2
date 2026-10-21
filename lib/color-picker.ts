/** Opaque sRGB colors used by the catalog's compact color picker. */
export type HSV = { h: number; s: number; v: number };
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function hexToHsv(hex: string): HSV {
  const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const hue = !delta ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: (hue * 60 + 360) % 360, s: max ? delta / max : 0, v: max };
}

export function hsvToHex({ h, s, v }: HSV): string {
  const saturation = clamp(s), value = clamp(v), hue = ((h % 360) + 360) % 360 / 60;
  const c = value * saturation, x = c * (1 - Math.abs(hue % 2 - 1)), m = value - c;
  const channels = hue < 1 ? [c, x, 0] : hue < 2 ? [x, c, 0] : hue < 3 ? [0, c, x] : hue < 4 ? [0, x, c] : hue < 5 ? [x, 0, c] : [c, 0, x];
  return "#" + channels.map(channel => Math.round((channel + m) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}
