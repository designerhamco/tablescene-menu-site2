import { heroScreenMatrix, type HeroQuad } from "./hero-cafe-motion";

// Approved 1536×1024 foreground, mirrored to match the supplied composition.
// Coordinates are the display corners, not the outside of the tablet bezel.
export const BASIC_TABLET_SCREEN = [[302,221],[1120,116],[1229,667],[436,812]] as const satisfies HeroQuad;
export const BASIC_TABLET_CANVAS = { width:1536, height:1024 } as const;
export const BASIC_DEMO_CANVAS = { width:800, height:600 } as const;

export function basicTabletScreenMatrix(sceneWidth: number) {
  const scale = sceneWidth / BASIC_TABLET_CANVAS.width;
  return heroScreenMatrix(BASIC_TABLET_SCREEN.map(([x,y]) => [x*scale,y*scale]) as unknown as HeroQuad, BASIC_DEMO_CANVAS.width, BASIC_DEMO_CANVAS.height);
}

export function basicFeatureIndex(index: number, count: number) {
  return Math.max(-1, Math.min(count-1, index));
}

export const BASIC_FEATURE_INTRO = {
  title: "베이직, 한 장에 담는",
  subtitle: "우리 매장의 메뉴판.",
  body: "시그니처부터 오늘의 혜택까지. 필요한 기능을 골라 매장에 맞는 메뉴판을 완성하세요.",
  image: "/assets/device-platform-v2/menu-monitor.webp",
} as const;
