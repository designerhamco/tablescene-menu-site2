import type { HomeService } from "./service-home-navigation";
import { BASIC_FEATURE_INTRO } from "./basic-feature-story";

const directory = "/assets/service-mockups-v2";

export const SERVICE_STORY_INTROS = {
  basic: { ...BASIC_FEATURE_INTRO, image: `${directory}/basic-intro-monitor.webp` },
  dining: {
    title: "다이닝, 코스부터 디저트까지",
    subtitle: "흐름이 있는 메뉴판.",
    body: "커버부터 코스와 음료까지, 여러 장으로 이어지는 다이닝 메뉴판.",
    image: `${directory}/dining-intro.webp`,
  },
  display: {
    title: "디스플레이, 매장에서 한눈에",
    subtitle: "크게 보는 메뉴판.",
    body: "매장의 TV와 모니터에 메뉴와 프로모션을 크게 보여주는 메뉴판.",
    image: `${directory}/display-intro.webp`,
  },
} satisfies Record<HomeService, { title: string; subtitle: string; body: string; image: string }>;

export const BASIC_STORY_SCREENS = {
  intro: {
    key: "intro",
    desktop: SERVICE_STORY_INTROS.basic.image,
    mobile: `${directory}/basic-intro-phone.webp`,
  },
  ...Object.fromEntries(
    ["featured", "gallery", "prices", "sale", "widgets", "advertising"].map(key => [
      key,
      { key, desktop: `${directory}/basic-${key}-monitor.webp`, mobile: `${directory}/basic-${key}-phone.webp` },
    ]),
  ),
} as Record<string, { key: string; desktop: string; mobile: string }>;

export const SERVICE_STORY_SCREENS = {
  dining: {
    pages: "/assets/hero-mobile-v1/dining-page-2.webp",
    cover: `${directory}/dining-cover.webp`,
    gallery: `${directory}/dining-gallery.webp`,
    prices: `${directory}/dining-prices.webp`,
    sale: `${directory}/dining-sale.webp`,
    advertising: `${directory}/dining-advertising.webp`,
    call: `${directory}/dining-call.webp`,
    order: `${directory}/dining-order.webp`,
  },
  display: {
    pages: `${directory}/display-pages.webp`,
    media: `${directory}/display-media.webp`,
    prices: `${directory}/display-prices.webp`,
    sale: `${directory}/display-sale.webp`,
  },
} satisfies Record<"dining" | "display", Record<string, string>>;
