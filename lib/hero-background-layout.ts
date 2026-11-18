/** Extended surroundings sit behind the unchanged 1536×1024 photograph/UI plane. */
export const HERO_BACKGROUND_LAYOUT = {
  venue: { src: "venue-expanded.webp", matrix: [2, 0, 0, 2, -768, -512] },
  counter: { src: "counter-expanded.webp", matrix: [2, 0, 0, 2, -768, -512] },
  dining: { src: "dining-expanded.webp", matrix: [2, 0, 0, 2, -768, -512] },
  phone: { src: "phone-expanded.webp", matrix: [2, 0, 0, 2, -768, -512] },
} as const;

/** Keep ordinary notebook/16:9 framing; a wider window reveals surroundings. */
export function heroLandscapeScale(width: number, height: number) {
  return Math.max(Math.min(width, height * 16 / 9) / 1536, height / 1024);
}

/** Grow only the surrounding layer for unusually tall/narrow viewports. */
export function heroExpansionMatrix(camera: {x:number;y:number;scale:number}, width:number, height:number) {
  const {x,y,scale}=camera;
  const expansion=Math.max(2,(768+x/scale)/768,((width-x)/scale-768)/768,(512+y/scale)/512,((height-y)/scale-512)/512);
  return [expansion,0,0,expansion,768*(1-expansion),512*(1-expansion)];
}

export function heroBackgroundBounds(image: keyof typeof HERO_BACKGROUND_LAYOUT) {
  const [a,b,c,d,x,y] = HERO_BACKGROUND_LAYOUT[image].matrix;
  const corners = [[0,0],[1536,0],[1536,1024],[0,1024]].map(([u,v]) => [a*u+c*v+x,b*u+d*v+y]);
  // The inner rectangle stays inside the slightly rotated image at all corners.
  return { left: Math.max(corners[0][0],corners[3][0]), right: Math.min(corners[1][0],corners[2][0]), top: Math.max(corners[0][1],corners[1][1]), bottom: Math.min(corners[2][1],corners[3][1]) };
}

export function heroWidePosition(image: keyof typeof HERO_BACKGROUND_LAYOUT, width: number, height: number, scale: number, focus: readonly number[], copyTop: number, gap: number) {
  const bounds = heroBackgroundBounds(image);
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const x = clamp(width * .66 - focus[0] * scale, width - bounds.right * scale, -bounds.left * scale);
  let y = height * .53 - focus[1] * scale;
  if (image === "phone") y = Math.min(y, copyTop - gap - 810 * scale);
  return { x, y: clamp(y, height - bounds.bottom * scale, -bounds.top * scale) };
}
