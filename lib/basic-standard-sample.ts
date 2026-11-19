import type { StarterCategory } from "./menu-starter-presets";
import type { SupportedLocale } from "./locales";
import { translateMenuText } from "./menu-ui-copy";

export const BASIC_STANDARD_INTRO = "취향에 맞는 메뉴로 맛있는 시간을 즐겨보세요.";
export const BASIC_STANDARD_SET_COPY = "(세트 선택 시 오늘의 수프 + 에이드 1잔 추가)";

/** Shared sample content for Basic standard designs only; never applied to saved menus. */
export function getBasicStandardCategories(withPriceColumns: boolean): StarterCategory[] {
  const groups = [
    { key: "basic-main", name: "메인 메뉴", description: "든든하게 즐기는 한 끼를 준비했습니다.", items: [
      ["grilled-chicken", "그릴 치킨 플레이트", "GRILLED CHICKEN PLATE", 14000, "노릇하게 구운 닭고기에 구운 채소를 곁들인 한 접시"],
      ["tomato-pasta", "토마토 파스타", "TOMATO PASTA", 12000, "잘 익은 토마토 소스에 마늘과 바질의 풍미를 더한 파스타"],
      ["mushroom-risotto", "버섯 크림 리조또", "MUSHROOM CREAM RISOTTO", 13000, "볶은 버섯과 부드러운 크림으로 완성한 고소한 리조또"],
      ["bulgogi-rice", "불고기 라이스", "BULGOGI RICE", 11000, "달콤짭짤한 불고기와 채소를 따뜻한 밥 위에 올린 한 그릇"],
    ] },
    { key: "basic-sides", name: "곁들임", description: "메인 메뉴와 함께 즐기기 좋은 메뉴입니다.", items: [
      ["green-salad", "그린 샐러드", "GREEN SALAD", 6000, "신선한 채소에 산뜻한 드레싱을 곁들였습니다."],
      ["fries", "바삭한 감자튀김", "CRISPY FRIES", 5000, "겉은 바삭하고 속은 포슬포슬한 감자튀김"],
      ["daily-soup", "오늘의 수프", "SOUP OF THE DAY", 4500, "오늘의 재료로 따뜻하게 끓여낸 부드러운 수프"],
      ["garlic-bread", "갈릭 브레드", "GARLIC BREAD", 4000, "마늘 버터를 발라 노릇하게 구운 빵"],
    ] },
    { key: "basic-desserts", name: "디저트", description: "식사 후 달콤하게 마무리해 보세요.", items: [
      ["vanilla-ice-cream", "바닐라 아이스크림", "VANILLA ICE CREAM", 4000, "부드러운 우유에 은은한 바닐라 향을 더한 아이스크림"],
      ["chocolate-brownie", "초콜릿 브라우니", "CHOCOLATE BROWNIE", 5000, "진한 초콜릿의 풍미를 담아 촉촉하게 구운 브라우니"],
      ["cheesecake", "치즈 케이크", "CHEESECAKE", 6000, "크림치즈의 고소함을 부드럽게 담은 케이크"],
      ["seasonal-fruit", "계절 과일", "SEASONAL FRUIT", 6500, "제철 과일을 먹기 좋게 담았습니다."],
    ] },
    { key: "basic-drinks", name: "음료", description: "식사에 산뜻함을 더하는 시원한 음료입니다.", items: [
      ["lemon-ade", "레몬 에이드", "LEMON ADE", 5000, "레몬의 상큼함과 탄산을 시원하게 즐겨보세요."],
      ["grapefruit-ade", "자몽 에이드", "GRAPEFRUIT ADE", 5000, "자몽의 쌉싸름함에 청량한 탄산을 더한 음료"],
      ["iced-tea", "아이스티", "ICED TEA", 4000, "은은한 홍차 향에 달콤함을 더한 시원한 차"],
      ["sparkling-water", "탄산수", "SPARKLING WATER", 3000, "가볍고 깔끔하게 즐기는 청량한 탄산수"],
    ] },
  ] as const;
  return groups.map(group => {
    const main = group.key === "basic-main" && withPriceColumns;
    return {
      key: group.key, name: group.name, description: group.description, description_visible: true,
      price_columns: main ? [{ key: "single", label: "단품", visible: true }, { key: "set", label: "세트", visible: true }] : [],
      items: group.items.map(([key, name, english, price, description], index) => ({
        key, name, set_name: english, price, price_visible: true,
        description: main ? `${description}\n${BASIC_STANDARD_SET_COPY}` : description,
        image_url: group.key === "basic-desserts" ? null : "/placeholders/starter/default-menu-item.svg",
        price_note: group.key === "basic-drinks" ? "ICE ONLY" : null,
        price_options: [],
        price_column_values: main ? [{ key: "single", price, visible: true }, { key: "set", price: price + 3000, visible: true }] : [],
        badge_label: group.key === "basic-main" && index === 0 ? "추천" : null,
      })),
    };
  });
}

export function translateBasicStandardText(text: string, locale: SupportedLocale) {
  return text.split("\n").map(line => translateMenuText(line, locale)).join("\n");
}
