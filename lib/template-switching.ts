import { getTemplateCapabilities } from "@/lib/template-capabilities";
import {
  getTemplatesForService,
  type TemplateCatalogItem,
  type TemplateKey,
} from "@/lib/templates";
import {
  getSupportedServices,
  type TemplateServiceType,
} from "@/lib/template-types";

export type TemplateCommercialTier =
  | "dining_single_page"
  | "dining_multi_page"
  | "display";

export type TemplateSwitchDecision =
  | {
      allowed: true;
      currentService: TemplateServiceType;
      targetService: TemplateServiceType;
      targetTemplate: TemplateCatalogItem;
    }
  | {
      allowed: false;
      reason: "same_template" | "unknown_template" | "coming_soon" | "cross_service" | "cross_tier";
      message: string;
    };

const SWITCHABLE_TEMPLATE_STATUSES = new Set(["available", "hidden"]);
const TEMPLATE_DESIGN_PAGE_SETTING_KEYS = [
  "design",
  "backgroundColor",
  "koreanFont",
  "englishFont",
  "fontSizeScale",
  "typographyRoles",
  "typography_roles",
  "onePageLayoutShell",
  "one_page_layout_shell",
] as const;

type JsonRecord = Record<string, unknown>;

export type TemplateSwitchAudit = {
  previousTemplateKey: string;
  targetTemplateKey: string;
  switchedAt: string;
  promotionsDisabled: number;
  widgetsHidden: number;
};

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as JsonRecord) }
    : {};
}

function getTemplateDesignSnapshot(pageSettings: JsonRecord) {
  return TEMPLATE_DESIGN_PAGE_SETTING_KEYS.reduce<JsonRecord>((snapshot, key) => {
    if (Object.prototype.hasOwnProperty.call(pageSettings, key)) {
      snapshot[key] = pageSettings[key];
    }
    return snapshot;
  }, {});
}

function applyTemplateDesignSnapshot(pageSettings: JsonRecord, snapshot: unknown) {
  const nextPageSettings = { ...pageSettings };
  TEMPLATE_DESIGN_PAGE_SETTING_KEYS.forEach((key) => delete nextPageSettings[key]);

  const snapshotRecord = toRecord(snapshot);
  TEMPLATE_DESIGN_PAGE_SETTING_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(snapshotRecord, key)) {
      nextPageSettings[key] = snapshotRecord[key];
    }
  });

  return nextPageSettings;
}

export function buildTemplateSwitchMutation({
  settings,
  pageSettings,
  currentTemplateKey,
  targetTemplateKey,
  switchedAt,
  promotionsDisabled,
  widgetsHidden,
}: {
  settings: unknown;
  pageSettings: unknown;
  currentTemplateKey: string;
  targetTemplateKey: string;
  switchedAt: string;
  promotionsDisabled: number;
  widgetsHidden: number;
}) {
  const currentSettings = toRecord(settings);
  const currentPageSettings = toRecord(pageSettings);
  const designSnapshots = toRecord(currentSettings.template_design_snapshots);
  const targetSnapshot = toRecord(designSnapshots[targetTemplateKey]);
  const targetPageSettingsSnapshot = Object.prototype.hasOwnProperty.call(targetSnapshot, "page_settings")
    ? targetSnapshot.page_settings
    : targetSnapshot;
  const nextSettings = { ...currentSettings };

  designSnapshots[currentTemplateKey] = {
    page_settings: getTemplateDesignSnapshot(currentPageSettings),
    ...(Object.prototype.hasOwnProperty.call(currentSettings, "badge_styles")
      ? { badge_styles: currentSettings.badge_styles }
      : {}),
  };
  delete nextSettings.badge_styles;
  if (Object.prototype.hasOwnProperty.call(targetSnapshot, "badge_styles")) {
    nextSettings.badge_styles = targetSnapshot.badge_styles;
  }

  const audit: TemplateSwitchAudit = {
    previousTemplateKey: currentTemplateKey,
    targetTemplateKey,
    switchedAt,
    promotionsDisabled,
    widgetsHidden,
  };

  return {
    settings: {
      ...nextSettings,
      template_design_snapshots: designSnapshots,
      latest_template_switch: audit,
    },
    pageSettings: applyTemplateDesignSnapshot(currentPageSettings, targetPageSettingsSnapshot),
    audit,
  };
}

function getSingleSupportedService(templateKey: string): TemplateServiceType | null {
  const services = getSupportedServices(templateKey);
  return services.length === 1 ? services[0] : null;
}

export function getTemplateCommercialTier(templateKey: string): TemplateCommercialTier {
  const service = getSingleSupportedService(templateKey);

  if (service === "display") {
    return "display";
  }

  return getTemplateCapabilities(templateKey).multiPage?.enabled
    ? "dining_multi_page"
    : "dining_single_page";
}

export function getTemplateCommercialTierLabel(tier: TemplateCommercialTier) {
  switch (tier) {
    case "dining_multi_page":
      return "멀티페이지";
    case "display":
      return "디스플레이";
    default:
      return "단일 페이지";
  }
}

export function getSwitchableTemplatesForService(service: TemplateServiceType) {
  return getTemplatesForService(service).filter((template) =>
    SWITCHABLE_TEMPLATE_STATUSES.has(template.status),
  );
}

export function getSwitchableTemplatesForTemplate(currentTemplateKey: string) {
  const currentService = getSingleSupportedService(currentTemplateKey);
  if (!currentService) return [];

  const currentTier = getTemplateCommercialTier(currentTemplateKey);
  return getSwitchableTemplatesForService(currentService).filter(
    (template) => getTemplateCommercialTier(template.key) === currentTier,
  );
}

export function getTemplateSwitchDecision(
  currentTemplateKey: string,
  targetTemplateKey: string,
): TemplateSwitchDecision {
  if (currentTemplateKey === targetTemplateKey) {
    return {
      allowed: false,
      reason: "same_template",
      message: "현재 사용 중인 템플릿입니다.",
    };
  }

  const currentService = getSingleSupportedService(currentTemplateKey);
  const targetTemplate = (["basic", "display"] as const)
    .flatMap((service) => getTemplatesForService(service))
    .find((template) => template.key === targetTemplateKey);
  const targetService = targetTemplate
    ? getSingleSupportedService(targetTemplate.key)
    : null;

  if (!currentService || !targetTemplate || !targetService) {
    return {
      allowed: false,
      reason: "unknown_template",
      message: "변경할 템플릿 정보를 확인하지 못했습니다.",
    };
  }

  if (!SWITCHABLE_TEMPLATE_STATUSES.has(targetTemplate.status)) {
    return {
      allowed: false,
      reason: "coming_soon",
      message: "아직 준비 중인 템플릿입니다.",
    };
  }

  if (currentService !== targetService) {
    return {
      allowed: false,
      reason: "cross_service",
      message: "다이닝과 디스플레이 서비스 사이에서는 템플릿만 바꿀 수 없습니다.",
    };
  }

  if (getTemplateCommercialTier(currentTemplateKey) !== getTemplateCommercialTier(targetTemplate.key)) {
    return {
      allowed: false,
      reason: "cross_tier",
      message: "단일 페이지와 멀티페이지 상품 사이에서는 템플릿만 바꿀 수 없습니다.",
    };
  }

  return {
    allowed: true,
    currentService,
    targetService,
    targetTemplate,
  };
}

export function isTemplateKey(value: string): value is TemplateKey {
  return (["basic", "display"] as const)
    .flatMap((service) => getTemplatesForService(service))
    .some((template) => template.key === value);
}
