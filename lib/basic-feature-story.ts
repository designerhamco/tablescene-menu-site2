import { heroScreenMatrix, type HeroQuad } from "./hero-cafe-motion";

// Approved 1536×1024 foreground, mirrored to match the supplied composition.
// Coordinates are the display corners, not the outside of the tablet bezel.
export const BASIC_TABLET_SCREEN = [[297,217],[1091,116],[1225,670],[429,810]] as const satisfies HeroQuad;
export const BASIC_TABLET_CANVAS = { width:1536, height:1024 } as const;
export const BASIC_DEMO_CANVAS = { width:800, height:600 } as const;

export function basicTabletScreenMatrix(sceneWidth: number) {
  const scale = sceneWidth / BASIC_TABLET_CANVAS.width;
  return heroScreenMatrix(BASIC_TABLET_SCREEN.map(([x,y]) => [x*scale,y*scale]) as unknown as HeroQuad, BASIC_DEMO_CANVAS.width, BASIC_DEMO_CANVAS.height);
}

export function basicFeatureIndex(index: number, count: number) {
  return Math.max(0, Math.min(count-1, index));
}
