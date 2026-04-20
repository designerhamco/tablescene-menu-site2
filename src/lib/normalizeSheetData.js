import { normalizeRestaurantData, toNumber } from "./normalizeRestaurantData.js";

// Google Apps Script 웹앱 JSON을 앱 내부 restaurantData 구조로 바꾸는 helper입니다.
// 시트에서는 name_ko, name_en 같은 컬럼을 쓰고, 앱 안에서는 { ko, en, zh, ja } 객체로 사용합니다.

export const sheetLanguages = ["ko", "en", "zh", "ja"];
const menuContentSlideOrder = ["set", "main-side", "dessert-drink"];

export function localizedFieldFromRow(row, fieldName) {
  return sheetLanguages.reduce((result, language) => {
    result[language] =
      language === "ko"
        ? row?.[`${fieldName}_ko`] ?? row?.[fieldName] ?? ""
        : row?.[`${fieldName}_${language}`] ?? "";
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

export function normalizeSheetData(sheetData, fallbackData) {
  if (!sheetData) return normalizeRestaurantData(fallbackData);

  if (sheetData.restaurantData) {
    return normalizeRestaurantData(sheetData.restaurantData);
  }

  if (sheetData.settings && sheetData.intro && sheetData.about && sheetData.menu && sheetData.events) {
    return normalizeRestaurantData(sheetData);
  }

  const tables = getSheetTables(sheetData);
  const settingsRows = rowsFromTables(tables, ["Settings", "settings"]);
  const introRow = firstRow(tables, ["Intro", "intro", "Intros", "intros", "IntroRows", "introRows"]);
  const aboutRow = firstRow(tables, ["About", "about"]);
  const chefRows = rowsFromTables(tables, ["Chefs", "chefs"]);
  const snsRows = rowsFromTables(tables, ["SNS", "Sns", "sns"]);
  const menuSlideRows = rowsFromTables(tables, ["MenuSlides", "menuSlides", "menu_slides"]);
  const menuCategoryRows = rowsFromTables(tables, ["MenuCategories", "menuCategories", "menu_categories"]);
  const menuItemRows = rowsFromTables(tables, ["MenuItems", "menuItems", "menu_items"]);
  const eventRows = rowsFromTables(tables, ["Events", "events"]);
  const hasChefTable = hasTable(tables, ["Chefs", "chefs"]);
  const hasSnsTable = hasTable(tables, ["SNS", "Sns", "sns"]);
  const hasMenuSlidesTable = hasTable(tables, ["MenuSlides", "menuSlides", "menu_slides"]);
  const hasEventsTable = hasTable(tables, ["Events", "events"]);

  return normalizeRestaurantData({
    settings: normalizeSettings(settingsRows, fallbackData.settings),
    intro: normalizeIntro(introRow, fallbackData.intro),
    about: normalizeAbout(aboutRow, chefRows, snsRows, fallbackData.about, hasChefTable, hasSnsTable),
    menu: normalizeMenu(
      menuSlideRows,
      menuCategoryRows,
      menuItemRows,
      fallbackData.menu,
      hasMenuSlidesTable,
      hasTable(tables, ["MenuCategories", "menuCategories", "menu_categories"]),
      hasTable(tables, ["MenuItems", "menuItems", "menu_items"])
    ),
    events: normalizeEvents(eventRows, fallbackData.events, hasEventsTable),
  });
}

export function validateSheetData(sheetData) {
  const tables = getSheetTables(sheetData);
  const checks = {
    intro: rowsFromTables(tables, ["Intro", "intro", "Intros", "intros", "IntroRows", "introRows"]).length > 0,
    about: rowsFromTables(tables, ["About", "about"]).length > 0,
    menuSlides: menuContentSlideOrder.every((slideId) =>
      rowsFromTables(tables, ["MenuSlides", "menuSlides", "menu_slides"]).some((row) => row.id === slideId)
    ),
    menuCategories: rowsFromTables(tables, ["MenuCategories", "menuCategories", "menu_categories"]).length > 0,
    menuItems: rowsFromTables(tables, ["MenuItems", "menuItems", "menu_items"]).length > 0,
    events: rowsFromTables(tables, ["Events", "events"]).length > 0,
  };
  const missing = Object.entries(checks)
    .filter(([, isValid]) => !isValid)
    .map(([key]) => key);

  return {
    isValid:
      checks.intro || checks.about || (checks.menuSlides && checks.menuCategories && checks.menuItems) || checks.events,
    canUseIntro: checks.intro,
    canUseAbout: checks.about,
    canUseMenu: checks.menuSlides && checks.menuCategories && checks.menuItems,
    canUseEvents: checks.events,
    missing,
  };
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
  const contactLabel = hasLocalizedText(normalized.contactLabel)
    ? normalized.contactLabel
    : localizedFieldFromRow(row, "reservationInfo");

  return {
    ...normalized,
    heroImageEnabled: toSheetBoolean(row.heroImageEnabled),
    contact: {
      type: row.contactType ?? "",
      label: contactLabel,
      value: row.contactValue ?? row.phone ?? row.phone_ko ?? "",
      link: row.contactLink ?? "",
    },
  };
}

function normalizeSettings(rowsOrRow = {}, fallbackSettings = {}) {
  const row = normalizeSettingsRows(rowsOrRow);

  return {
    ...fallbackSettings,
    siteTitle: row.siteTitle || fallbackSettings.siteTitle,
    defaultPage: row.defaultPage || fallbackSettings.defaultPage,
    pages: {
      ...fallbackSettings.pages,
      intro: {
        ...fallbackSettings.pages?.intro,
        enabled: valueOrFallbackBoolean(row.introEnabled ?? row.intro_enabled, fallbackSettings.pages?.intro?.enabled),
      },
      about: {
        ...fallbackSettings.pages?.about,
        enabled: valueOrFallbackBoolean(row.aboutEnabled ?? row.about_enabled, fallbackSettings.pages?.about?.enabled),
      },
      menu: {
        ...fallbackSettings.pages?.menu,
        enabled: valueOrFallbackBoolean(row.menuEnabled ?? row.menu_enabled, fallbackSettings.pages?.menu?.enabled),
      },
      events: {
        ...fallbackSettings.pages?.events,
        enabled: valueOrFallbackBoolean(row.eventsEnabled ?? row.events_enabled, fallbackSettings.pages?.events?.enabled),
      },
    },
    sections: {
      ...fallbackSettings.sections,
      about: {
        ...fallbackSettings.sections?.about,
        chefs: valueOrFallbackBoolean(row.chefEnabled ?? row.chef_enabled, fallbackSettings.sections?.about?.chefs),
        sns: valueOrFallbackBoolean(row.snsEnabled ?? row.sns_enabled, fallbackSettings.sections?.about?.sns),
      },
    },
  };
}

function normalizeSettingsRows(rowsOrRow) {
  if (!Array.isArray(rowsOrRow)) return rowsOrRow ?? {};

  return rowsOrRow.reduce((result, row) => {
    if (row?.key) {
      result[row.key] = row.value;
    } else {
      Object.assign(result, row);
    }
    return result;
  }, {});
}

function normalizeIntro(row, fallbackIntro = {}) {
  if (!row) return fallbackIntro;

  const normalized = normalizeSheetRow(row, [
    "title",
    "subtitle",
    "description",
    "buttonText",
    "storeName",
    "headline",
    "shortText",
    "startButtonText",
  ]);
  const title = hasLocalizedText(normalized.title) ? normalized.title : normalized.storeName;
  const subtitle = hasLocalizedText(normalized.subtitle) ? normalized.subtitle : normalized.headline;
  const description = hasLocalizedText(normalized.description)
    ? normalized.description
    : normalized.shortText;
  const buttonText = hasLocalizedText(normalized.buttonText)
    ? normalized.buttonText
    : normalized.startButtonText;
  const backgroundImage =
    firstFilledValue(
      row.backgroundImageUrl,
      row.backgroundImage,
      fallbackIntro.backgroundImageUrl,
      fallbackIntro.backgroundImage
    );

  return {
    ...fallbackIntro,
    ...normalized,
    title,
    subtitle,
    description,
    buttonText,
    storeName: title,
    headline: subtitle,
    shortText: description,
    startButtonText: buttonText,
    enabled: valueOrFallbackBoolean(row.enabled, fallbackIntro.enabled),
    sortOrder: toNumber(row.sortOrder, fallbackIntro.sortOrder ?? 0),
    backgroundImage,
    backgroundImageUrl: backgroundImage,
  };
}

function normalizeAbout(row, chefRows, snsRows, fallbackAbout = {}, hasChefTable = false, hasSnsTable = false) {
  const about = row ? normalizeAboutSheetRow(row) : fallbackAbout;

  return {
    ...fallbackAbout,
    ...about,
    enabled: valueOrFallbackBoolean(row?.enabled, fallbackAbout.enabled),
    heroImageEnabled: valueOrFallbackBoolean(row?.heroImageEnabled, fallbackAbout.heroImageEnabled),
    heroImageUrl: row?.heroImageUrl ?? fallbackAbout.heroImageUrl,
    mapLink: row?.mapLink ?? fallbackAbout.mapLink,
    chefs: hasChefTable ? chefRows.map(normalizeChefRow) : fallbackAbout.chefs ?? [],
    sns: hasSnsTable ? snsRows.map(normalizeSnsRow) : fallbackAbout.sns ?? [],
  };
}

function normalizeChefRow(row) {
  const normalized = normalizeSheetRow(row, ["name", "title", "description"]);

  return {
    ...normalized,
    enabled: valueOrFallbackBoolean(row.enabled, true),
    sortOrder: toNumber(row.sortOrder, 0),
  };
}

function normalizeSnsRow(row) {
  return {
    ...normalizeSheetRow(row, ["label"]),
    enabled: valueOrFallbackBoolean(row.enabled, true),
    sortOrder: toNumber(row.sortOrder, 0),
  };
}

function normalizeMenu(
  slideRows,
  categoryRows,
  itemRows,
  fallbackMenu = {},
  hasMenuSlidesTable = false,
  hasMenuCategoriesTable = false,
  hasMenuItemsTable = false
) {
  if (!hasMenuSlidesTable || !hasMenuCategoriesTable || !hasMenuItemsTable) return fallbackMenu;

  const coverRow = slideRows.find((row) => row.id === "cover");
  const contentSlideRows = menuContentSlideOrder
    .map((slideId) => slideRows.find((row) => row.id === slideId))
    .filter(Boolean);

  if (contentSlideRows.length !== menuContentSlideOrder.length || categoryRows.length === 0 || itemRows.length === 0) {
    return fallbackMenu;
  }
  const categories = categoryRows.map((row) => ({
    ...normalizeSheetRow(row, ["name"]),
    enabled: valueOrFallbackBoolean(row.enabled, true),
    sortOrder: toNumber(row.sortOrder, 0),
  }));
  const items = itemRows.map(normalizeMenuItemRow);

  return {
    enabled: fallbackMenu.enabled ?? true,
    cover: coverRow
      ? {
          ...normalizeSheetRow(coverRow, ["title", "description"]),
          enabled: valueOrFallbackBoolean(coverRow.enabled, true),
          sortOrder: toNumber(coverRow.sortOrder, 0),
        }
      : fallbackMenu.cover,
    slides: contentSlideRows.map((row) => {
      const slide = normalizeSheetRow(row, ["title", "description"]);
      const slideCategories = categories
        .filter((category) => category.slideId === row.id)
        .map((category) => ({
          ...category,
          items: items.filter((item) => item.categoryId === category.id),
        }));

      return {
        ...slide,
        enabled: valueOrFallbackBoolean(row.enabled, true),
        sortOrder: toNumber(row.sortOrder, 0),
        categories: slideCategories,
      };
    }),
  };
}

function normalizeMenuItemRow(row) {
  const normalized = normalizeSheetRow(row, ["name", "description", "labelName", "origin"]);

  return {
    ...normalized,
    enabled: valueOrFallbackBoolean(row.enabled, true),
    price: normalizePrice(row.price),
    isRecommended: valueOrFallbackBoolean(row.isRecommended, false),
    useLabel: valueOrFallbackBoolean(row.useLabel, false),
    isSoldOut: valueOrFallbackBoolean(row.isSoldOut, false),
    sortOrder: toNumber(row.sortOrder, 0),
  };
}

function normalizeEvents(eventRows, fallbackEvents = {}, hasEventsTable = false) {
  if (!hasEventsTable || eventRows.length === 0) return fallbackEvents;

  return {
    enabled: fallbackEvents.enabled ?? true,
    slides: eventRows.map((row) => ({
      ...normalizeSheetRow(row, [
        "title",
        "subtitle",
        "description",
        "period",
        "price",
        "benefitDetails",
      ]),
      enabled: valueOrFallbackBoolean(row.enabled, true),
      visible: valueOrFallbackBoolean(row.visible, true),
      sortOrder: toNumber(row.sortOrder, 0),
    })),
  };
}

function getSheetTables(sheetData) {
  if (sheetData.data && typeof sheetData.data === "object") return sheetData.data;
  if (sheetData.sheets && typeof sheetData.sheets === "object") return sheetData.sheets;
  return sheetData;
}

function firstRow(tables, names) {
  return rowsFromTables(tables, names)[0];
}

function rowsFromTables(tables, names) {
  const value = names.map((name) => getTableValue(tables, name)).find((tableValue) => tableValue !== undefined);
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function hasTable(tables, names) {
  return names.some((name) => getTableValue(tables, name) !== undefined);
}

function getTableValue(tables, name) {
  if (!tables) return undefined;
  if (Object.prototype.hasOwnProperty.call(tables, name)) return tables[name];

  const normalizedName = normalizeTableName(name);
  const matchedKey = Object.keys(tables).find((key) => normalizeTableName(key) === normalizedName);

  return matchedKey ? tables[matchedKey] : undefined;
}

function normalizeTableName(name) {
  return String(name).toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function normalizePrice(price) {
  if (price === "" || price === undefined || price === null) return "";
  const numericPrice = Number(String(price).replaceAll(",", ""));
  return Number.isFinite(numericPrice) ? numericPrice : price;
}

function valueOrFallbackBoolean(value, fallback) {
  if (value === "" || value === undefined || value === null) return fallback;
  return toSheetBoolean(value);
}

function hasLocalizedText(value) {
  return sheetLanguages.some((language) => Boolean(value?.[language]));
}

function firstFilledValue(...values) {
  return values.find((value) => value !== "" && value !== undefined && value !== null) ?? "";
}

export function toSheetBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["true", "TRUE", "yes", "Y", "1", "노출", "사용"].includes(value.trim());
  }
  return Boolean(value);
}
