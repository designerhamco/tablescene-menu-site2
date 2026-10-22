import type { DefaultDesignReview } from "./menu-design-policy";

export const diningSampleNames: Record<string, readonly [string, string]> = {
  "Amuse-bouche": ["아뮤즈 부슈", "AMUSE-BOUCHE"],
  "Cold starter": ["차가운 전채", "COLD STARTER"],
  "Warm starter": ["따뜻한 전채", "WARM STARTER"],
  "Fish": ["생선 요리", "FISH"],
  "Main": ["메인 요리", "MAIN"],
  "Dessert": ["디저트", "DESSERT"],
  "관자와 시금치": ["관자와 시금치", "SCALLOPS & SPINACH"],
  "랍스터 비스크": ["랍스터 비스크", "LOBSTER BISQUE"],
  "제주 옥돔": ["제주 옥돔", "JEJU TILEFISH"],
  "한우 안심": ["한우 안심", "HANWOO TENDERLOIN"],
  "금귤과 바닐라": ["금귤과 바닐라", "KUMQUAT & VANILLA"],
  "초콜릿과 헤이즐넛": ["초콜릿과 헤이즐넛", "CHOCOLATE & HAZELNUT"],
  "Champagne": ["샴페인", "CHAMPAGNE"],
  "Chardonnay": ["샤르도네", "CHARDONNAY"],
  "Pinot noir": ["피노 누아", "PINOT NOIR"],
  "Seasonal mocktail": ["제철 목테일", "SEASONAL MOCKTAIL"],
  "Sparkling tea": ["스파클링 티", "SPARKLING TEA"],
  "Mineral water": ["미네랄 워터", "MINERAL WATER"],
  "Cabernet sauvignon": ["카베르네 소비뇽", "CABERNET SAUVIGNON"],
  "Kombucha": ["콤부차", "KOMBUCHA"],
  "Wine pairing": ["와인 페어링", "WINE PAIRING"],
  "Non-alcohol pairing": ["논알코올 페어링", "NON-ALCOHOL PAIRING"],
};

export function getStandardDesignCopy(design: DefaultDesignReview) {
  const basic = design.layout.startsWith("basic-");
  return {
    title: basic ? "CAFE ARTIMENU" : "DINING ARTIMENU",
    description: basic ? design.layout === "basic-top-row"
      ? "좋은 커피와 갓 구운 디저트를 준비합니다. 향긋한 한 잔과 함께 편안한 시간을 즐겨보세요."
      : "좋은 커피와 갓 구운 디저트를 준비합니다."
      : "계절의 재료로 정성껏 준비한 식사를 만나보세요.",
    coverImage: basic ? "/placeholders/starter/default-basic-cover.svg" : "/placeholders/starter/default-cover.svg",
    notices: ["영업시간 10:00–21:00", "알레르기가 있다면 주문 전 알려주세요.", "모든 가격은 부가세 포함입니다."],
  };
}

/** Neutral sample copy must not retain the identity of its shared Dining renderer. */
export function neutralizeDiningSampleText(text: string) {
  return text.replace(/오브 테이블|메종 마레/g, "아티메뉴 다이닝")
    .replace(/AUBE TABLE|MAISON MARAIS/gi, "ArtiMenu Dining")
    .replace(/Marais evening/gi, "Seasonal evening")
    .replace(/马雷晚宴/g, "季节晚宴").replace(/マレ・イブニング/g, "季節のディナー");
}

/** Both approved Dining basic layouts use the same menu examples, with different renderers. */
export function getStandardDesignSampleTemplateKey(design: DefaultDesignReview): DefaultDesignReview["renderer"] {
  return design.layout.startsWith("dining-") ? "dining_aube_table_a" : design.renderer;
}
