import "server-only";

import {
  getAllTemplates,
  isTemplateSupportedForService,
  type TemplateCatalogItem,
} from "@/lib/templates";
import type { TemplateServiceType } from "@/lib/template-types";

export const MOCHA_FOREST_CHECKOUT_QA_ENV = "ENABLE_MOCHA_FOREST_CHECKOUT_QA";
export const MOCHA_FOREST_CHECKOUT_QA_TEMPLATE_KEY = "cafe_mocha_forest_a";

const BASIC_SERVICE_LIST = ["basic"] as const satisfies readonly TemplateServiceType[];

export function isMochaForestCheckoutQaEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV !== "production" && env[MOCHA_FOREST_CHECKOUT_QA_ENV] === "true";
}

export function isMochaForestCheckoutSafeMockEnabled(env: NodeJS.ProcessEnv = process.env) {
  return isMochaForestCheckoutQaEnabled(env) && env.PORTONE_MOCK_ENABLED === "true";
}

export function canUseMochaForestCheckoutQaTemplate(
  templateKey: string | null | undefined,
  serviceType: TemplateServiceType,
  env: NodeJS.ProcessEnv = process.env
) {
  return (
    serviceType === "basic" &&
    templateKey === MOCHA_FOREST_CHECKOUT_QA_TEMPLATE_KEY &&
    isMochaForestCheckoutQaEnabled(env)
  );
}

export function isTemplateSupportedForCheckout(
  templateKey: string | null | undefined,
  serviceType: TemplateServiceType,
  env: NodeJS.ProcessEnv = process.env
) {
  return (
    isTemplateSupportedForService(templateKey, serviceType) ||
    canUseMochaForestCheckoutQaTemplate(templateKey, serviceType, env)
  );
}

function exposeMochaForestTemplateForQa(template: TemplateCatalogItem): TemplateCatalogItem {
  return {
    ...template,
    service: "basic",
    serviceLabel: "아티메뉴 베이직",
    supported_services: BASIC_SERVICE_LIST,
    supportedServices: BASIC_SERVICE_LIST,
    status: "available",
    active: true,
    featuredBasic: true,
  };
}

export function getCheckoutTemplatesWithMochaForestQa(
  templates: readonly TemplateCatalogItem[],
  serviceType: TemplateServiceType,
  env: NodeJS.ProcessEnv = process.env
) {
  const baseTemplates = [...templates];

  if (serviceType !== "basic" || !isMochaForestCheckoutQaEnabled(env)) {
    return baseTemplates;
  }

  if (baseTemplates.some((template) => template.key === MOCHA_FOREST_CHECKOUT_QA_TEMPLATE_KEY)) {
    return baseTemplates;
  }

  const mochaTemplate = getAllTemplates().find((template) => template.key === MOCHA_FOREST_CHECKOUT_QA_TEMPLATE_KEY);
  if (!mochaTemplate) return baseTemplates;

  return [...baseTemplates, exposeMochaForestTemplateForQa(mochaTemplate)].sort(
    (left, right) => left.sortOrder - right.sortOrder
  );
}
