// Google Sheets 연동을 붙일 때 사용할 변환 helper입니다.
// 지금은 실제 fetch를 하지 않고, 시트 행 데이터를 앱 내부 구조로 바꾸는 규칙만 준비합니다.

export const sheetLanguages = ["ko", "en", "zh", "ja"];

export function localizedFieldFromRow(row, fieldName) {
  return sheetLanguages.reduce((result, language) => {
    result[language] = row?.[`${fieldName}_${language}`] ?? "";
    return result;
  }, {});
}

export function normalizeSheetRow(row, localizedFields = []) {
  const normalized = { ...row };

  localizedFields.forEach((fieldName) => {
    normalized[fieldName] = localizedFieldFromRow(row, fieldName);
    sheetLanguages.forEach((language) => {
      delete normalized[`${fieldName}_${language}`];
    });
  });

  return normalized;
}

export function normalizeAboutSheetRow(row) {
  const normalized = normalizeSheetRow(row, [
    "storeName",
    "description",
    "address",
    "hours",
    "contactLabel",
    "heroImageAlt",
    "reservationHours",
    "parking",
    "wifi",
    "corkage",
    "closedDays",
  ]);

  return {
    ...normalized,
    heroImageEnabled: toSheetBoolean(row.heroImageEnabled),
    contact: {
      type: row.contactType ?? "",
      label: normalized.contactLabel,
      value: row.contactValue ?? "",
      link: row.contactLink ?? "",
    },
  };
}

export function toSheetBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["true", "TRUE", "yes", "Y", "1", "노출", "사용"].includes(value.trim());
  }
  return Boolean(value);
}
