// 나중에 Google Sheets 데이터를 연결할 때 이 파일에서 최종 restaurantData 형태로 변환합니다.
// 지금은 로컬 데이터 파일을 그대로 통과시키되, 화면이 기대하는 기본 구조만 보강합니다.
// 시트의 name_ko, name_en 같은 컬럼 변환 helper는 normalizeSheetData.js에 모아두었습니다.

export function normalizeRestaurantData(rawData) {
  return {
    settings: rawData.settings ?? {},
    intro: rawData.intro ?? { enabled: false },
    about: rawData.about ?? { enabled: false },
    menu: {
      enabled: rawData.menu?.enabled ?? false,
      slides: rawData.menu?.slides ?? [],
    },
    events: {
      enabled: rawData.events?.enabled ?? false,
      slides: rawData.events?.slides ?? [],
    },
  };
}

export function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["true", "TRUE", "yes", "Y", "1", "노출", "사용"].includes(value.trim());
  }
  return Boolean(value);
}

export function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}
