"use client";

import * as PortOne from "@portone/browser-sdk/v2";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  canIndividualPurchasePlan,
  formatKrw,
  isValidMenuSlug,
  menuCreationProduct,
  normalizeMenuSlug,
  requiresBusinessInfo,
  type BuyerType,
  type MenuOrderPayload,
  type OrderSetupPayload,
  type PlanKey,
  type ScreenSetupPayload,
} from "@/lib/payments";
import { getPublicMenuUrl } from "@/lib/menu-url";
import {
  getBusinessTypeOptions,
  getDefaultBusinessCoverLabel,
  type BusinessTypeKey,
} from "@/lib/business-types";
import {
  TEMPLATE_CATEGORIES,
  getTemplateCategoryLabel,
  type TemplateCatalogItem,
  type TemplateCategoryKey,
  type TemplateKey,
} from "@/lib/templates";
import type { PaymentCompleteResponse } from "@/types/payment";

type ApplyOrderFormProps = {
  templates: readonly TemplateCatalogItem[];
  userEmail: string;
  userId: string;
  storeId: string | null;
  channelKey: string | null;
  mockEnabled: boolean;
  serviceType?: "menu" | "screen" | "order";
};

type AgreementKey = "terms" | "privacy" | "contentPolicy";

type FormState = {
  buyerType: BuyerType;
  template_category: TemplateCategoryKey;
  template_key: TemplateKey;
  menuName: string;
  desiredSlug: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  restaurantType: BusinessTypeKey | "";
  screenPurpose: string;
  screenTemplateCategory: string;
  screenOrientation: string;
  screenDevice: string;
  businessName: string;
  representativeName: string;
  businessNumber: string;
  businessPhone: string;
  tableCount: string;
  posUsage: string;
  paymentPreference: string;
  kitchenDashboard: string;
  callFeature: string;
  launchTimeline: string;
  additionalRequests: string;
};

type SlugState =
  | { slug: string; type: "idle"; message: string }
  | { slug: string; type: "checking"; message: string }
  | { slug: string; type: "available"; message: string }
  | { slug: string; type: "unavailable"; message: string }
  | { slug: string; type: "error"; message: string };

type UiState =
  | { type: "idle"; message: string | null }
  | { type: "loading"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

type PaidApplyProduct = {
  key: PlanKey;
  name: string;
  description: string;
  amount: number;
  currency: typeof menuCreationProduct.currency;
};

type MenuTemplateGroupKey =
  | "recommended"
  | "cafe_dessert"
  | "dining"
  | "fast_takeout"
  | "beauty_wellness"
  | "class_workshop"
  | "fitness"
  | "pet"
  | "clinic"
  | "popup_event"
  | "all";

const phonePrefixes = [
  "010",
  "011",
  "016",
  "017",
  "018",
  "019",
  "02",
  "031",
  "032",
  "033",
  "041",
  "042",
  "043",
  "044",
  "051",
  "052",
  "053",
  "054",
  "055",
  "061",
  "062",
  "063",
  "064",
  "070",
] as const;

const initialAgreements: Record<AgreementKey, boolean> = {
  terms: false,
  privacy: false,
  contentPolicy: false,
};

const agreementLabels: Record<AgreementKey, string> = {
  terms: "[필수] 서비스 이용약관 및 플랜별 이용 조건에 동의합니다.",
  privacy: "[필수] 개인정보 수집 및 이용에 동의합니다.",
  contentPolicy: "[필수] 부적절한 사용 및 콘텐츠 정책에 동의합니다.",
};

const agreementDetails: Record<AgreementKey, string[]> = {
  terms: [
    "[서비스 목적] 테이블씬은 음식점, 카페, 다이닝 매장 등에서 사용할 수 있는 웹 메뉴판 생성 및 관리 서비스입니다. 현재 베이직 플랜은 템플릿 기반 메뉴판 생성 및 데이터 편집 기능을 제공합니다.",
    "[베이직 플랜] 베이직 플랜은 템플릿 디자인과 데이터 편집 기능을 제공하며, 개인 또는 사업자 모두 구매할 수 있습니다. 테이블 오더, 주방 대시보드, 선불/후불 주문 기능, 호출 기능은 포함되지 않습니다.",
    "[향후 플랜 안내] 베이직은 템플릿 디자인과 데이터 편집, 개인/사업자 구매를 지원합니다. 프로는 테이블 오더 선불/후불, 테이블 오더 ON/OFF, 주방 대시보드를 제공할 수 있으며 개인 구매가 제한될 수 있습니다. 대형스크린은 1페이지 중심 구성을 제공할 수 있고 구매 자격은 추후 별도 안내합니다. 고급 다이닝 태블릿은 주문제작 디자인과 호출 기능을 제공할 수 있으며 개인 구매가 제한될 수 있습니다.",
    "[서비스 이용 시작] 결제가 완료되고 메뉴판이 생성되면 서비스 이용이 시작된 것으로 봅니다. 생성된 메뉴판은 마이페이지에서 확인하고 편집할 수 있습니다.",
    "[메뉴판 주소] 사용자가 입력한 희망 메뉴판 주소는 중복 여부, 정책 위반 여부, 기술적 제한 등에 따라 사용할 수 없을 수 있습니다. 회사는 부적절하거나 오해를 유발하거나 제3자의 권리를 침해할 우려가 있는 주소 사용을 제한할 수 있습니다.",
    "[서비스 제공 범위] 회사는 서비스 안정성, 보안, 운영 정책, 기술적 사유에 따라 일부 기능을 변경, 중단, 제한할 수 있습니다.",
    "[결제 및 환불] 베이직 플랜 결제 후 메뉴판 생성이 완료되면 서비스 이용이 시작된 것으로 봅니다. 단순 변심, 잘못된 정보 입력, 사용자의 편집 실수, 이미지 또는 콘텐츠 등록 오류로 인한 환불은 제한될 수 있습니다. 결제 오류, 중복 결제, 서비스 제공 불가 등 회사 귀책 사유가 확인되는 경우 별도 기준에 따라 환불 또는 조치할 수 있습니다.",
    "[회사 제공 콘텐츠의 권리] 테이블씬 서비스, 소프트웨어, 코드, 관리자 화면, 공개 메뉴판 템플릿, 디자인, 레이아웃, 로고, 상표, starter preset, 공용 placeholder 이미지 등 회사가 제공하는 콘텐츠와 구성 요소에 대한 권리는 회사 또는 정당한 권리자에게 있습니다. 회원은 이를 테이블씬 서비스 이용 범위 내에서만 사용할 수 있습니다.",
    "[회원 콘텐츠의 권리] 회원이 입력하거나 업로드한 매장 정보, 메뉴명, 설명, 가격, 소개 문구, 이벤트 문구, SNS 정보, 이미지 등 콘텐츠의 권리는 회원 또는 해당 콘텐츠의 정당한 권리자에게 귀속되며 회사는 소유권을 취득하지 않습니다.",
    "[서비스 제공을 위한 콘텐츠 이용허락] 회원은 서비스 제공, 메뉴판 생성, 공개 메뉴판 표시, 저장, 백업, 고객 지원, 오류 수정 및 서비스 개선에 필요한 범위에서 회사가 회원 콘텐츠를 이용, 저장, 복제, 전송, 표시할 수 있도록 허락합니다.",
    "[마케팅 사용] 회사는 회원 콘텐츠를 서비스 제공 목적 외의 광고, 홍보, 포트폴리오 목적으로 사용하려는 경우 회원의 별도 동의를 받습니다.",
  ],
  privacy: [
    "[수집 목적] 회사는 서비스 신청, 결제 처리, 메뉴판 생성, 고객 응대, 서비스 운영, 부정 이용 방지, 고지사항 전달을 위해 개인정보를 수집 및 이용합니다.",
    "[수집 항목] 필수 수집 항목은 담당자명, 담당자 연락처, 담당자 이메일, 구매자 유형, 메뉴판 이름, 희망 메뉴판 주소, 매장명, 결제 정보, 서비스 이용 기록입니다.",
    "[사업자 정보] 사업자 구매 또는 사업자 정보 입력 시 상호명, 대표자명, 사업자등록번호, 사업장 연락처를 추가로 수집할 수 있습니다.",
    "[보유 및 이용 기간] 수집된 개인정보는 서비스 제공 및 고객 응대 목적 달성 시까지 보관합니다. 관계 법령에 따라 보관이 필요한 정보는 해당 법령에서 정한 기간 동안 보관할 수 있습니다.",
    "[개인정보 처리 위탁 및 결제] 결제 처리를 위해 결제대행사 또는 관련 서비스 제공업체가 필요한 정보를 처리할 수 있으며, 구체적인 결제 정보 처리는 결제대행사의 정책과 관련 법령을 따릅니다.",
    "[동의 거부 권리] 이용자는 개인정보 수집 및 이용에 대한 동의를 거부할 수 있으나, 필수 항목에 대한 동의를 거부할 경우 서비스 신청, 결제, 메뉴판 생성이 제한될 수 있습니다.",
    "[안전한 관리] 회사는 개인정보가 분실, 도난, 유출, 위조, 변조 또는 훼손되지 않도록 합리적인 보호 조치를 취합니다.",
  ],
  contentPolicy: [
    "[부적절한 사용 금지] 회원은 불법적이거나 허위 정보를 포함한 메뉴판 생성, 실제 매장 운영과 무관한 장난성 메뉴판 생성, 음란물, 혐오, 폭력, 차별, 사기성 콘텐츠 게시, 악성 코드, 피싱, 사기 링크 삽입, 허위 광고 또는 소비자를 오인하게 하는 콘텐츠 게시에 서비스를 사용할 수 없습니다.",
    "[이미지 업로드 책임] 회원은 자신이 업로드한 이미지에 대해 필요한 권리 또는 이용허락을 보유하고 있음을 보증합니다. 이미지가 제3자의 권리를 침해하여 발생하는 책임은 회원에게 있습니다.",
    "[텍스트 콘텐츠 책임] 회원이 입력한 매장명, 메뉴명, 설명, 가격, 이벤트 문구, 소개 문구, SNS 정보 등 콘텐츠의 정확성과 적법성에 대한 책임은 회원에게 있습니다.",
    "[개인 구매자 관련] 베이직 플랜은 개인도 구매할 수 있으나 개인 구매자도 부적절한 사용 금지 정책을 동일하게 준수해야 합니다.",
    "[사업자 전용 플랜 관련] 프로 플랜과 고급 다이닝 태블릿 플랜은 개인 구매가 제한될 수 있으며 사업자 또는 별도 상담 고객을 대상으로 합니다.",
    "[콘텐츠 조치] 회사는 권리 침해 우려, 신고 접수, 약관 위반, 부적절한 이미지 또는 텍스트가 확인된 경우 해당 콘텐츠를 임시 비공개, 삭제하거나 서비스 이용을 제한할 수 있습니다.",
    "[신고 및 대응] 제3자의 권리 침해 신고, 부적절한 콘텐츠 신고, 허위 정보 신고가 접수된 경우 회사는 회원에게 소명 또는 자료 제출을 요청할 수 있으며 확인 완료 전까지 콘텐츠를 임시 비공개 처리할 수 있습니다.",
  ],
};

const screenCreationProduct = {
  ...menuCreationProduct,
  key: "large_screen",
  name: "테이블씬 스크린 생성권",
  description: "매장 화면용 디지털 메뉴보드 운영을 준비합니다.",
} as const;

const orderCreationProduct = {
  ...menuCreationProduct,
  key: "qr_order",
  name: "테이블씬 오더 1.0 신청권",
  description: "QR 주문과 주방 연결을 위한 오더 1.0 도입 신청을 접수합니다.",
} as const;

const servicePlanKeys = {
  menu: "basic",
  screen: "large_screen",
  order: "qr_order",
} as const satisfies Record<NonNullable<ApplyOrderFormProps["serviceType"]>, PlanKey>;

const serviceProducts = {
  menu: menuCreationProduct,
  screen: screenCreationProduct,
  order: orderCreationProduct,
} as const satisfies Record<NonNullable<ApplyOrderFormProps["serviceType"]>, PaidApplyProduct>;

const orderPosUsageOptions = ["사용 중", "사용하지 않음", "잘 모름"] as const;
const orderPaymentPreferenceOptions = ["선불", "후불", "둘 다 필요", "아직 미정"] as const;
const orderNeedOptions = ["필요", "불필요", "아직 미정"] as const;
const orderLaunchTimelineOptions = ["즉시", "1개월 이내", "3개월 이내", "아직 미정"] as const;
const menuTemplateGroups = [
  { key: "recommended", label: "추천" },
  { key: "cafe_dessert", label: "카페·디저트" },
  { key: "dining", label: "음식점·다이닝" },
  { key: "fast_takeout", label: "패스트푸드·테이크아웃" },
  { key: "beauty_wellness", label: "뷰티·웰니스" },
  { key: "class_workshop", label: "클래스·공방" },
  { key: "fitness", label: "피트니스" },
  { key: "pet", label: "펫" },
  { key: "clinic", label: "병원·클리닉" },
  { key: "popup_event", label: "팝업·행사" },
  { key: "all", label: "전체" },
] as const satisfies readonly { key: MenuTemplateGroupKey; label: string }[];
const menuTemplateGroupCategoryMap = {
  cafe_dessert: ["cafe"],
  dining: ["brunch", "casual_dining", "fine_dining"],
  fast_takeout: ["fast_food"],
  beauty_wellness: [],
  class_workshop: [],
  fitness: [],
  pet: [],
  clinic: [],
  popup_event: [],
} as const satisfies Record<Exclude<MenuTemplateGroupKey, "recommended" | "all">, readonly TemplateCategoryKey[]>;
const menuTemplateRecommendationMap = {
  cafe: ["cafe_dessert"],
  bakery: ["cafe_dessert"],
  dessert: ["cafe_dessert"],
  restaurant: ["dining"],
  brunch: ["dining"],
  casual_dining: ["dining"],
  fine_dining: ["dining"],
  pub_bar: ["dining"],
  fast_food: ["fast_takeout"],
  hair_salon: ["beauty_wellness"],
  nail_shop: ["beauty_wellness"],
  beauty_esthetic: ["beauty_wellness"],
  workshop_class: ["class_workshop"],
  fitness_pt: ["fitness"],
  pet_shop: ["pet"],
  clinic: ["clinic"],
  popup_event: ["popup_event"],
  etc: ["cafe_dessert", "dining"],
} as const satisfies Record<BusinessTypeKey, readonly Exclude<MenuTemplateGroupKey, "recommended" | "all">[]>;
const templateTagMap = {
  cafe: ["카페", "디저트", "이미지형", "모바일/QR"],
  brunch: ["브런치", "다이닝", "모바일/QR"],
  casual_dining: ["식당", "캐주얼다이닝", "모바일/QR"],
  fine_dining: ["파인다이닝", "코스", "프리미엄"],
  fast_food: ["패스트푸드", "테이크아웃", "빠른 주문"],
} as const satisfies Record<TemplateCategoryKey, readonly string[]>;
const screenPurposeOptions = [
  "카페 메뉴보드",
  "베이커리/디저트 쇼케이스",
  "푸드코트 메뉴보드",
  "미용실/샵 가격표",
  "병원/클리닉 안내",
  "피트니스/PT 안내",
  "이벤트/프로모션",
  "대기 화면",
  "기타",
] as const;
const screenOrientationOptions = ["가로형 16:9", "세로형 9:16, 추후", "아직 미정"] as const;
const screenDeviceOptions = ["TV", "모니터", "PC", "미니PC/TV스틱", "아직 미정"] as const;
const screenTemplateCategories = [
  { key: "cafe_screen", label: "카페 스크린", templateCategory: "cafe" },
  { key: "bakery_screen", label: "베이커리 스크린", templateCategory: "cafe" },
  { key: "foodcourt_screen", label: "푸드코트 스크린", templateCategory: "fast_food" },
  { key: "price_screen", label: "가격표 스크린", templateCategory: "casual_dining" },
  { key: "promo_screen", label: "안내/프로모션 스크린", templateCategory: "brunch" },
  { key: "waiting_screen", label: "대기화면 스크린", templateCategory: "fine_dining" },
] as const satisfies readonly {
  key: string;
  label: string;
  templateCategory: TemplateCategoryKey;
}[];

function createPaymentId() {
  const timestamp = Date.now().toString(36);
  const randomId = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  return `ts-${timestamp}-${randomId}`;
}

function createMockPaymentId() {
  const timestamp = Date.now().toString(36);
  const randomId = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  return `mock_ts_${timestamp}_${randomId}`;
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getDigits(value: string, maxLength?: number) {
  const digits = value.replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

function parsePhoneNumber(value: string) {
  const parts = value.split("-");
  const prefix = phonePrefixes.includes(parts[0] as (typeof phonePrefixes)[number]) ? parts[0] : "010";

  return {
    prefix,
    middle: getDigits(parts[1] ?? "", 4),
    last: getDigits(parts[2] ?? "", 4),
  };
}

function normalizePhoneNumberParts(prefix: string, middle: string, last: string) {
  const safePrefix = phonePrefixes.includes(prefix as (typeof phonePrefixes)[number]) ? prefix : "010";
  const safeMiddle = getDigits(middle, 4);
  const safeLast = getDigits(last, 4);

  if (!safeMiddle && !safeLast) {
    return "";
  }

  return `${safePrefix}-${safeMiddle}-${safeLast}`;
}

function validatePhoneNumber(value: string) {
  const { middle, last } = parsePhoneNumber(value);

  if (!middle && !last) {
    return "전화번호를 입력해주세요.";
  }

  if (middle.length < 3 || middle.length > 4 || last.length !== 4) {
    return "전화번호 형식이 올바르지 않습니다.";
  }

  return null;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isBusinessNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return !digits || digits.length === 10;
}

function getRequiredMessage(label: string, value: string) {
  return value.trim() ? null : `${label}은 필수 입력입니다.`;
}

function formatBusinessNumber(value: string) {
  const digits = getDigits(value, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function validateBusinessName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "상호명을 입력해주세요.";
  }

  if (trimmed.length > 50) {
    return "상호명은 최대 50자까지 입력할 수 있습니다.";
  }

  return null;
}

function getOrderSetupNotes(orderSetup: OrderSetupPayload) {
  const hasOrderSetup = Object.values(orderSetup).some(Boolean);

  if (!hasOrderSetup) {
    return null;
  }

  return [
    "[테이블씬 오더 1.0 도입 정보]",
    `테이블 수: ${orderSetup.tableCount || "-"}`,
    `현재 POS 사용 여부: ${orderSetup.posUsage || "-"}`,
    `선불/후불 희망: ${orderSetup.paymentPreference || "-"}`,
    `주방 대시보드 필요 여부: ${orderSetup.kitchenDashboard || "-"}`,
    `호출 기능 필요 여부: ${orderSetup.callFeature || "-"}`,
    `도입 희망 시기: ${orderSetup.launchTimeline || "-"}`,
    "",
    "[추가 요청사항]",
    orderSetup.additionalRequests || "-",
  ].join("\n");
}

function getScreenSetupNotes(screenSetup: ScreenSetupPayload) {
  const hasScreenSetup = Object.values(screenSetup).some(Boolean);

  if (!hasScreenSetup) {
    return null;
  }

  return [
    "[테이블씬 스크린 도입 정보]",
    `스크린 용도: ${screenSetup.purpose || "-"}`,
    `스크린 템플릿 카테고리: ${screenSetup.templateCategory || "-"}`,
    `화면 방향: ${screenSetup.orientation || "-"}`,
    `설치 기기: ${screenSetup.device || "-"}`,
  ].join("\n");
}

function getScreenTemplateCategoryByKey(key: string) {
  return screenTemplateCategories.find((category) => category.key === key) ?? screenTemplateCategories[0];
}

function getMenuTemplateCategoriesByGroup(groupKey: MenuTemplateGroupKey, businessType: BusinessTypeKey | "") {
  if (groupKey === "all") {
    return TEMPLATE_CATEGORIES.map((category) => category.key);
  }

  if (groupKey === "recommended") {
    const recommendedGroups = businessType ? menuTemplateRecommendationMap[businessType] : ["cafe_dessert", "dining"];
    return recommendedGroups.flatMap((group) => menuTemplateGroupCategoryMap[group]);
  }

  return menuTemplateGroupCategoryMap[groupKey];
}

function getMenuTemplateGroupLabel(groupKey: MenuTemplateGroupKey) {
  return menuTemplateGroups.find((group) => group.key === groupKey)?.label ?? "추천";
}

function getTemplatesByMenuGroup(
  templates: readonly TemplateCatalogItem[],
  groupKey: MenuTemplateGroupKey,
  businessType: BusinessTypeKey | "",
) {
  const categories = getMenuTemplateCategoriesByGroup(groupKey, businessType);

  if (categories.length === 0) {
    return [];
  }

  return templates.filter((template) => categories.includes(template.template_category));
}

function getMenuTemplateTags(template: TemplateCatalogItem) {
  return templateTagMap[template.template_category] ?? [template.categoryLabel, "모바일/QR"];
}

function validatePersonName(label: string, value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return `${label}을 입력해주세요.`;
  }

  if (trimmed.length > 30) {
    return `${label}은 최대 30자까지 입력할 수 있습니다.`;
  }

  return null;
}

function getMenuAddressError(value: string) {
  if (!value) return "주소는 최소 3자 이상 입력해주세요.";
  if (!/^[a-z0-9-]+$/.test(value)) return "메뉴판 주소는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.";
  if (value.length < 3) return "주소는 최소 3자 이상 입력해주세요.";
  if (value.length > 40) return "주소는 최대 40자까지 입력할 수 있습니다.";
  if (value.startsWith("-") || value.endsWith("-")) return "주소는 하이픈으로 시작하거나 끝날 수 없습니다.";
  return null;
}

function getThumbnailClassName(tone: TemplateCatalogItem["thumbnailTone"]) {
  if (tone === "dark") {
    return "bg-zinc-950 text-white";
  }

  if (tone === "warm") {
    return "bg-[#f6eee3] text-zinc-950";
  }

  return "bg-white text-zinc-950";
}

function getUiStateClassName(type: UiState["type"]) {
  if (type === "success") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (type === "error") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function getAgreementModalTitle(key: AgreementKey) {
  if (key === "terms") return "서비스 이용약관 및 플랜별 이용 조건";
  if (key === "privacy") return "개인정보 수집 및 이용 동의";
  return "부적절한 사용 및 콘텐츠 정책";
}

function TemplatePreview({ template }: { template: TemplateCatalogItem }) {
  return (
    <div className={`mb-4 h-44 rounded-lg border border-zinc-100 p-4 ${getThumbnailClassName(template.thumbnailTone)}`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <div className="h-7 w-7 rounded-full bg-current opacity-90" />
          <div className="h-2 w-14 rounded-full bg-current opacity-20" />
        </div>
        <div className="mt-8 space-y-2">
          <div className="h-3 w-24 rounded-full bg-current opacity-90" />
          <div className="h-2 w-32 rounded-full bg-current opacity-20" />
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2">
          {[1, 2].map((item) => (
            <div key={item} className="rounded-lg border border-current/10 bg-white/70 p-2">
              <div className="h-2 w-14 rounded-full bg-zinc-800/70" />
              <div className="mt-2 h-1.5 w-20 rounded-full bg-zinc-400/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ApplyOrderForm({
  templates,
  userEmail,
  userId,
  storeId,
  channelKey,
  mockEnabled,
  serviceType = "menu",
}: ApplyOrderFormProps) {
  const router = useRouter();
  const isMenuService = serviceType === "menu";
  const isScreenService = serviceType === "screen";
  const isOrderService = serviceType === "order";
  const currentPlanKey = servicePlanKeys[serviceType];
  const activeProduct = serviceProducts[serviceType];
  const firstCategory = TEMPLATE_CATEGORIES[0].key;
  const firstTemplate = templates.find((template) => template.template_category === firstCategory) ?? templates[0];
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategoryKey>(firstTemplate?.template_category ?? firstCategory);
  const [selectedMenuTemplateGroup, setSelectedMenuTemplateGroup] = useState<MenuTemplateGroupKey>("recommended");
  const [agreements, setAgreements] = useState(initialAgreements);
  const [activeAgreement, setActiveAgreement] = useState<AgreementKey | null>(null);
  const [uiState, setUiState] = useState<UiState>({ type: "idle", message: null });
  const [slugState, setSlugState] = useState<SlugState>({ slug: "", type: "idle", message: "영문 소문자, 숫자, 하이픈만 사용할 수 있습니다." });
  const [form, setForm] = useState<FormState>({
    buyerType: "individual",
    template_category: firstTemplate?.template_category ?? firstCategory,
    template_key: firstTemplate?.key ?? "cafe_design_a",
    menuName: "",
    desiredSlug: "",
    restaurantName: "",
    restaurantAddress: "",
    restaurantPhone: "",
    buyerName: "",
    buyerPhone: "",
    buyerEmail: userEmail,
    restaurantType: "",
    screenPurpose: "카페 메뉴보드",
    screenTemplateCategory: "cafe_screen",
    screenOrientation: "",
    screenDevice: "",
    businessName: "",
    representativeName: "",
    businessNumber: "",
    businessPhone: "",
    tableCount: "",
    posUsage: "",
    paymentPreference: "",
    kitchenDashboard: "",
    callFeature: "",
    launchTimeline: "",
    additionalRequests: "",
  });

  const filteredTemplates = useMemo(() => {
    if (isMenuService) {
      return getTemplatesByMenuGroup(templates, selectedMenuTemplateGroup, form.restaurantType);
    }

    return templates.filter((template) => template.template_category === selectedCategory);
  }, [form.restaurantType, isMenuService, selectedCategory, selectedMenuTemplateGroup, templates]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.key === form.template_key) ?? templates[0],
    [form.template_key, templates]
  );
  const currentPlanRequiresBusinessInfo = requiresBusinessInfo(currentPlanKey);
  const currentPlanAllowsIndividual = canIndividualPurchasePlan(currentPlanKey);
  const templateStepLabel = isScreenService ? "Step 2" : "Step 1";
  const basicInfoStepLabel = isScreenService ? "Step 3" : "Step 2";
  const buyerInfoStepLabel = isScreenService ? "Step 4" : "Step 3";
  const summaryStepLabel = isScreenService ? "Step 5" : "Step 4";
  const agreementsStepLabel = isScreenService ? "Step 6" : "Step 5";
  const selectedScreenTemplateCategory = getScreenTemplateCategoryByKey(form.screenTemplateCategory);
  const businessTypeOptions = getBusinessTypeOptions(serviceType);
  const orderSetup = useMemo<OrderSetupPayload>(
    () => ({
      tableCount: nullable(form.tableCount),
      posUsage: nullable(form.posUsage),
      paymentPreference: nullable(form.paymentPreference),
      kitchenDashboard: nullable(form.kitchenDashboard),
      callFeature: nullable(form.callFeature),
      launchTimeline: nullable(form.launchTimeline),
      additionalRequests: nullable(form.additionalRequests),
    }),
    [form.additionalRequests, form.callFeature, form.kitchenDashboard, form.launchTimeline, form.paymentPreference, form.posUsage, form.tableCount]
  );
  const screenSetup = useMemo<ScreenSetupPayload>(
    () => ({
      purpose: nullable(form.screenPurpose),
      templateCategory: selectedScreenTemplateCategory.label,
      orientation: nullable(form.screenOrientation),
      device: nullable(form.screenDevice),
    }),
    [form.screenDevice, form.screenOrientation, form.screenPurpose, selectedScreenTemplateCategory.label]
  );

  const payload = useMemo<MenuOrderPayload>(
    () => ({
      plan_key: currentPlanKey,
      template_category: form.template_category,
      template_key: form.template_key,
      menuName: form.menuName.trim(),
      desiredSlug: normalizeMenuSlug(form.desiredSlug),
      restaurantName: form.restaurantName.trim(),
      restaurantCategory: isScreenService ? selectedScreenTemplateCategory.label : getTemplateCategoryLabel(form.template_category),
      restaurantType: form.restaurantType || null,
      restaurantAddress: form.restaurantAddress.trim(),
      restaurantPhone: form.restaurantPhone.trim(),
      openingHours: null,
      mapUrl: null,
      introTitle: null,
      introDescription: null,
      brandDescription: null,
      menuCoverTitle: null,
      menuCoverDescription: null,
      menuCoverLabel: isScreenService ? "DIGITAL MENU BOARD" : getDefaultBusinessCoverLabel(form.restaurantType),
      aboutDescription: null,
      orderSetup: isOrderService ? orderSetup : null,
      screenSetup: isScreenService ? screenSetup : null,
      notes: isOrderService ? getOrderSetupNotes(orderSetup) : isScreenService ? getScreenSetupNotes(screenSetup) : null,
      buyerType: form.buyerType,
      buyerName: form.buyerName.trim(),
      buyerPhone: form.buyerPhone.trim(),
      buyerEmail: form.buyerEmail.trim(),
      businessName: form.buyerType === "business" ? form.businessName.trim() : null,
      representativeName: form.buyerType === "business" ? form.representativeName.trim() : null,
      businessNumber: form.buyerType === "business" ? nullable(form.businessNumber) : null,
      businessPhone: form.buyerType === "business" ? nullable(form.businessPhone) : null,
      termsAccepted: agreements.terms,
      privacyAccepted: agreements.privacy,
      contentPolicyAccepted: agreements.contentPolicy,
      amount: activeProduct.amount,
    }),
    [
      activeProduct.amount,
      agreements.contentPolicy,
      agreements.privacy,
      agreements.terms,
      currentPlanKey,
      form,
      isOrderService,
      isScreenService,
      orderSetup,
      screenSetup,
      selectedScreenTemplateCategory.label,
    ]
  );

  const isPortOneReady = Boolean(storeId && channelKey);
  const isDevelopment = process.env.NODE_ENV !== "production";
  const menuAddressError = getMenuAddressError(payload.desiredSlug);
  const isSlugValid = !menuAddressError && isValidMenuSlug(payload.desiredSlug);
  const visibleSlugState = useMemo<SlugState>(() => {
    if (!payload.desiredSlug) {
      return { slug: "", type: "idle", message: "영문 소문자, 숫자, 하이픈만 사용할 수 있습니다." };
    }

    if (!isSlugValid) {
      return { slug: payload.desiredSlug, type: "unavailable", message: menuAddressError ?? "메뉴판 주소 형식이 올바르지 않습니다." };
    }

    if (slugState.slug !== payload.desiredSlug) {
      return { slug: payload.desiredSlug, type: "checking", message: "주소 중복을 확인하고 있습니다." };
    }

    return slugState;
  }, [isSlugValid, menuAddressError, payload.desiredSlug, slugState]);
  const isSlugAvailable = visibleSlugState.type === "available";
  const menuNameError = getRequiredMessage(isScreenService ? "스크린 이름" : "메뉴판 이름", payload.menuName);
  const restaurantNameError = getRequiredMessage("레스토랑 이름", payload.restaurantName);
  const restaurantTypeError = form.restaurantType ? null : "업종을 선택해주세요.";
  const visibleRestaurantTypeError = !form.restaurantType && (form.menuName.trim() || form.restaurantName.trim() || form.desiredSlug.trim()) ? restaurantTypeError : null;
  const templateSelectionError = isMenuService && filteredTemplates.length === 0 ? "선택 가능한 템플릿이 있는 카테고리를 선택해주세요." : null;
  const restaurantAddressError = getRequiredMessage("주소", payload.restaurantAddress);
  const restaurantPhoneError = validatePhoneNumber(payload.restaurantPhone);
  const buyerNameError = validatePersonName("담당자명", payload.buyerName);
  const buyerPhoneError = validatePhoneNumber(payload.buyerPhone);
  const buyerEmailError = getRequiredMessage("담당자 이메일", payload.buyerEmail) ?? (isEmail(payload.buyerEmail) ? null : "올바른 이메일 형식으로 입력해주세요.");
  const isBusinessBuyer = form.buyerType === "business";
  const businessNameError = isBusinessBuyer ? validateBusinessName(form.businessName) : null;
  const representativeNameError = isBusinessBuyer ? validatePersonName("대표자명", form.representativeName) : null;
  const businessNumberError = isBusinessBuyer
    ? form.businessNumber.trim()
      ? isBusinessNumber(form.businessNumber)
        ? null
        : "사업자등록번호는 숫자 10자리로 입력해주세요."
      : "사업자등록번호를 입력해주세요."
    : null;
  const businessPhoneError = isBusinessBuyer ? validatePhoneNumber(form.businessPhone) : null;
  const isFormReady =
    !menuNameError &&
    isSlugValid &&
    isSlugAvailable &&
    !templateSelectionError &&
    !restaurantNameError &&
    !restaurantTypeError &&
    !restaurantAddressError &&
    !restaurantPhoneError &&
    !buyerNameError &&
    !buyerPhoneError &&
    !buyerEmailError &&
    !businessNameError &&
    !representativeNameError &&
    !businessNumberError &&
    !businessPhoneError &&
    Object.values(agreements).every(Boolean);
  const isLoading = uiState.type === "loading";

  useEffect(() => {
    const slug = normalizeMenuSlug(form.desiredSlug);

    if (!slug || getMenuAddressError(slug)) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSlugState({ slug, type: "checking", message: "주소 중복을 확인하고 있습니다." });

      try {
        const response = await fetch(`/api/menu-sites/slug-availability?slug=${encodeURIComponent(slug)}`, {
          signal: controller.signal,
        });
        const result = (await response.json()) as { available?: boolean; message?: string };

        if (!response.ok) {
          setSlugState({ slug, type: "error", message: result.message ?? "주소 확인 중 오류가 발생했습니다." });
          return;
        }

        setSlugState({
          slug,
          type: result.available ? "available" : "unavailable",
          message: result.message ?? (result.available ? "사용 가능한 주소입니다." : "이미 사용 중인 주소입니다."),
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setSlugState({
            slug,
            type: "error",
            message: error instanceof Error ? error.message : "주소 확인 중 오류가 발생했습니다.",
          });
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [form.desiredSlug]);

  useEffect(() => {
    if (!activeAgreement) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveAgreement(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeAgreement]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: key === "desiredSlug" ? normalizeMenuSlug(String(value)) : key === "businessNumber" ? formatBusinessNumber(String(value)) : value,
    }));
  }

  function updateRestaurantType(value: FormState["restaurantType"]) {
    setForm((current) => {
      const nextState = {
        ...current,
        restaurantType: value,
      };

      if (!isMenuService || selectedMenuTemplateGroup !== "recommended") {
        return nextState;
      }

      const nextTemplate = getTemplatesByMenuGroup(templates, "recommended", value)[0];
      if (!nextTemplate) {
        return nextState;
      }

      return {
        ...nextState,
        template_category: nextTemplate.template_category,
        template_key: nextTemplate.key,
      };
    });
  }

  function toggleAgreement(key: AgreementKey) {
    setAgreements((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  async function completePayment(paymentId: string) {
    const response = await fetch("/api/payment/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentId,
        order: payload,
      }),
    });
    const result = (await response.json()) as PaymentCompleteResponse;

    if (!response.ok || !result.ok) {
      throw new Error(result.message ?? "결제 검증 또는 메뉴판 생성에 실패했습니다.");
    }

    router.push(`/success?${result.menuSiteId ? `menuSiteId=${encodeURIComponent(result.menuSiteId)}` : `slug=${encodeURIComponent(result.slug ?? payload.desiredSlug)}`}`);
  }

  async function handlePayment() {
    if (!isFormReady || isLoading) {
      return;
    }

    if (!isPortOneReady || !storeId || !channelKey) {
      if (!isDevelopment || !mockEnabled) {
        setUiState({
          type: "error",
          message:
            "PortOne 공개 환경변수가 없거나 개발용 mock이 꺼져 있어 결제를 진행할 수 없습니다. .env.local 설정을 확인해주세요.",
        });
        return;
      }

        setUiState({ type: "loading", message: "개발 환경 mock 결제로 신청 생성 흐름을 확인하고 있습니다." });

      try {
        await completePayment(createMockPaymentId());
      } catch (error) {
        setUiState({
          type: "error",
          message: error instanceof Error ? error.message : "mock 결제 처리 중 알 수 없는 오류가 발생했습니다.",
        });
      }

      return;
    }

    const paymentId = createPaymentId();

    setUiState({ type: "loading", message: "결제창을 준비하고 있습니다." });

    try {
      const paymentRequest = {
        storeId,
        channelKey,
        paymentId,
        orderName: activeProduct.name,
        totalAmount: activeProduct.amount,
        currency: activeProduct.currency,
        payMethod: "CARD",
        customer: {
          customerId: userId,
          fullName: payload.buyerName,
          phoneNumber: payload.buyerPhone,
          email: payload.buyerEmail,
        },
        customData: {
          product_key: activeProduct.key,
          plan_key: payload.plan_key,
          buyer_type: payload.buyerType,
          template_category: payload.template_category,
          template_key: payload.template_key,
          desired_slug: payload.desiredSlug,
          service_type: serviceType,
          business_type: payload.restaurantType,
          menu_template_group: isMenuService ? selectedMenuTemplateGroup : undefined,
          screen_purpose: isScreenService ? form.screenPurpose : undefined,
          screen_template_category: isScreenService ? selectedScreenTemplateCategory.label : undefined,
        },
      } as unknown as Parameters<typeof PortOne.requestPayment>[0];

      const payment = await PortOne.requestPayment(paymentRequest);

      if (!payment) {
        setUiState({ type: "error", message: "결제가 완료되지 않았습니다. 결제창이 닫혔거나 리디렉션 방식으로 진행 중일 수 있습니다." });
        return;
      }

      if (payment.code) {
        setUiState({ type: "error", message: payment.message ?? "결제가 취소되었거나 실패했습니다." });
        return;
      }

      setUiState({ type: "loading", message: "서버에서 결제를 검증하고 신청 정보를 생성하고 있습니다." });
      await completePayment(payment.paymentId);
    } catch (error) {
      setUiState({
        type: "error",
        message: error instanceof Error ? error.message : "결제 처리 중 알 수 없는 오류가 발생했습니다.",
      });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        {isScreenService && (
          <section className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="mb-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Step 1</p>
              <h2 className="text-3xl font-bold tracking-tight">스크린 용도 / 설치 정보</h2>
              <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                매장 TV나 모니터에 띄울 화면의 목적과 설치 환경을 알려주세요. 입력값은 초기 세팅 안내와 추후 스크린 전용 템플릿 분리에 활용됩니다.
              </p>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">스크린 용도</span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {screenPurposeOptions.map((option) => {
                  const isSelected = form.screenPurpose === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField("screenPurpose", option)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition-colors ${
                        isSelected
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-950"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <SelectField
                label="화면 방향"
                value={form.screenOrientation}
                onChange={(value) => updateField("screenOrientation", value)}
                options={screenOrientationOptions}
              />
              <SelectField
                label="설치 기기"
                value={form.screenDevice}
                onChange={(value) => updateField("screenDevice", value)}
                options={screenDeviceOptions}
              />
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <div className="mb-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">{templateStepLabel}</p>
            <h2 className="text-3xl font-bold tracking-tight">
              {isScreenService ? "스크린 템플릿 카테고리 / 스크린 템플릿 선택" : "템플릿 선택"}
            </h2>
            {isMenuService && (
              <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                업종에 맞는 템플릿을 선택하세요. 선택한 템플릿은 결제 후 생성되는 메뉴판에 적용됩니다.
              </p>
            )}
            {isScreenService && (
              <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                스크린 전용 카테고리를 고른 뒤 TV/모니터 화면에 맞는 메뉴보드 템플릿을 선택해주세요. 현재는 구현된 템플릿을 기반으로 연결됩니다.
              </p>
            )}
          </div>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {isScreenService
              ? screenTemplateCategories.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => {
                      const nextTemplate = templates.find((template) => template.template_category === filter.templateCategory);
                      setSelectedCategory(filter.templateCategory);
                      setForm((current) => ({
                        ...current,
                        screenTemplateCategory: filter.key,
                        template_category: filter.templateCategory,
                        template_key: nextTemplate?.key ?? current.template_key,
                      }));
                    }}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                      form.screenTemplateCategory === filter.key
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))
              : isMenuService
                ? menuTemplateGroups.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => {
                      const nextTemplates = getTemplatesByMenuGroup(templates, filter.key, form.restaurantType);
                      const nextTemplate = nextTemplates[0];
                      setSelectedMenuTemplateGroup(filter.key);
                      if (nextTemplate) {
                        setForm((current) => ({
                          ...current,
                          template_category: nextTemplate.template_category,
                          template_key: nextTemplate.key,
                        }));
                      }
                    }}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                      selectedMenuTemplateGroup === filter.key ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))
                : TEMPLATE_CATEGORIES.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => {
                        const nextTemplate = templates.find((template) => template.template_category === filter.key);
                        setSelectedCategory(filter.key);
                        if (nextTemplate) {
                          setForm((current) => ({
                            ...current,
                            template_category: filter.key,
                            template_key: nextTemplate.key,
                          }));
                        }
                      }}
                      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                        selectedCategory === filter.key ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
          </div>

          {filteredTemplates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {filteredTemplates.map((template) => {
              const isSelected = form.template_key === template.key;
              const tags = getMenuTemplateTags(template);

              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      template_category: template.template_category,
                      template_key: template.key,
                    }))
                  }
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    isSelected ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400"
                  }`}
                >
                  <TemplatePreview template={template} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{template.name}</h3>
                      <p className={`mt-1 font-mono text-xs font-bold ${isSelected ? "text-white/60" : "text-zinc-400"}`}>{template.key}</p>
                      <p className={`mt-1 text-xs font-bold ${isSelected ? "text-white/60" : "text-zinc-400"}`}>
                        {isScreenService ? selectedScreenTemplateCategory.label : getTemplateCategoryLabel(template.template_category)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isSelected ? "bg-[#F8E731] text-zinc-950" : "bg-zinc-100 text-zinc-500"}`}>
                      {isSelected ? "선택됨" : template.badge}
                    </span>
                  </div>
                  <p className={`mt-3 break-keep text-sm font-medium leading-relaxed ${isSelected ? "text-white/70" : "text-zinc-500"}`}>
                    {template.description}
                  </p>
                  {isMenuService && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            isSelected ? "border-white/15 bg-white/10 text-white/70" : "border-zinc-200 bg-zinc-50 text-zinc-500"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-8 text-center">
              <p className="text-base font-black text-zinc-800">해당 카테고리 템플릿은 준비 중입니다.</p>
              <p className="mt-2 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                현재 선택 가능한 템플릿은 추천 또는 전체 탭에서 확인할 수 있습니다.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">{basicInfoStepLabel}</p>
          <h2 className="mb-6 text-3xl font-bold tracking-tight">{isScreenService || isMenuService ? "기본 신청 정보" : "메뉴판 기본 정보"}</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label={isScreenService ? "스크린 이름 또는 메뉴보드 이름" : "메뉴판 관리용 이름"}
              value={form.menuName}
              onChange={(value) => updateField("menuName", value)}
              required
              helperText={isScreenService ? "마이페이지에서 구분할 수 있는 스크린/메뉴보드 이름을 입력해주세요." : "관리자가 구분할 수 있는 이름을 입력해주세요."}
              errorText={form.menuName.trim() ? menuNameError : null}
              successText="입력 완료"
            />
            <div>
              <Field label={isScreenService ? "희망 주소 또는 slug" : "희망 메뉴판 주소"} value={form.desiredSlug} onChange={(value) => updateField("desiredSlug", value)} required maxLength={40} helperText={visibleSlugState.type === "checking" ? visibleSlugState.message : "영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다."} errorText={visibleSlugState.type === "unavailable" || visibleSlugState.type === "error" ? visibleSlugState.message : null} successText={visibleSlugState.type === "available" ? visibleSlugState.message : undefined} />
              <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                생성될 주소: {payload.desiredSlug ? getPublicMenuUrl(payload.desiredSlug) : getPublicMenuUrl("your-menu")}
              </p>
            </div>
            <Field label="매장명" value={form.restaurantName} onChange={(value) => updateField("restaurantName", value)} required helperText={isScreenService ? "스크린 메뉴보드에 표시될 매장명을 입력해주세요." : "공개 메뉴판에 표시될 매장명을 입력해주세요."} errorText={form.restaurantName.trim() ? restaurantNameError : null} successText="입력 완료" />
            <SelectField
              label="업종"
              value={form.restaurantType}
              onChange={(value) => updateRestaurantType(value as FormState["restaurantType"])}
              options={businessTypeOptions}
              required
              helperText="업종은 템플릿 추천과 신청 정보 확인에 활용됩니다."
              placeholder="업종을 선택해주세요"
              errorText={visibleRestaurantTypeError}
            />
            <Field label="주소" value={form.restaurantAddress} onChange={(value) => updateField("restaurantAddress", value)} required helperText={isScreenService ? "설치 매장 또는 화면 운영 매장의 주소를 입력해주세요." : "공개 메뉴판의 소개 영역에 표시됩니다."} errorText={form.restaurantAddress.trim() ? restaurantAddressError : null} successText="입력 완료" className="md:col-span-2" />
            <PhoneInput
              label="매장 전화번호"
              value={form.restaurantPhone}
              onChange={(value) => updateField("restaurantPhone", value)}
              required
              errorText={form.restaurantPhone.trim() ? restaurantPhoneError : null}
            />
          </div>
        </section>

        {isOrderService && (
          <section className="rounded-3xl bg-white p-7 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Order Setup</p>
            <h2 className="text-3xl font-bold tracking-tight">오더 도입 정보</h2>
            <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
              입력해주신 정보는 테이블씬 오더 1.0 도입 준비와 초기 세팅 안내에 활용됩니다.
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field
                label="테이블 수"
                value={form.tableCount}
                onChange={(value) => updateField("tableCount", getDigits(value, 4))}
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="예: 12"
                helperText="매장 내 주문을 받을 테이블 수를 입력해주세요."
              />
              <SelectField
                label="현재 POS 사용 여부"
                value={form.posUsage}
                onChange={(value) => updateField("posUsage", value)}
                options={orderPosUsageOptions}
              />
              <SelectField
                label="선불/후불 희망"
                value={form.paymentPreference}
                onChange={(value) => updateField("paymentPreference", value)}
                options={orderPaymentPreferenceOptions}
              />
              <SelectField
                label="주방 대시보드 필요 여부"
                value={form.kitchenDashboard}
                onChange={(value) => updateField("kitchenDashboard", value)}
                options={orderNeedOptions}
              />
              <SelectField
                label="호출 기능 필요 여부"
                value={form.callFeature}
                onChange={(value) => updateField("callFeature", value)}
                options={orderNeedOptions}
              />
              <SelectField
                label="도입 희망 시기"
                value={form.launchTimeline}
                onChange={(value) => updateField("launchTimeline", value)}
                options={orderLaunchTimelineOptions}
              />
              <TextareaField
                label="추가 요청사항"
                value={form.additionalRequests}
                onChange={(value) => updateField("additionalRequests", value)}
                placeholder="POS 연동, 메뉴 등록 범위, 주방 동선, 호출 방식 등 필요한 내용을 남겨주세요."
                helperText="아직 정해지지 않은 내용이 있어도 괜찮습니다."
                className="md:col-span-2"
              />
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">{buyerInfoStepLabel}</p>
          <h2 className="mb-6 text-3xl font-bold tracking-tight">구매자 및 담당자 정보</h2>
          <div className="mb-6 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
            <p className="break-keep text-sm font-bold leading-relaxed text-zinc-600">
              {isScreenService
                ? "테이블씬 스크린은 개인 또는 사업자 모두 신청할 수 있습니다. 현재는 기존 생성 흐름을 재사용해 접수하고, 추후 스크린 전용 관리 구조로 분리할 수 있습니다."
                : "베이직 플랜은 개인 또는 사업자 모두 구매할 수 있습니다. 프로 및 고급 다이닝 플랜은 사업자 또는 별도 상담 고객만 이용할 수 있습니다."}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">구매자 유형 *</span>
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1">
                {(["individual", "business"] as BuyerType[]).map((buyerType) => (
                  <button
                    key={buyerType}
                    type="button"
                    onClick={() => updateField("buyerType", buyerType)}
                    className={`rounded-xl px-4 py-3 text-sm font-black transition-colors ${
                      form.buyerType === buyerType ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-white"
                    }`}
                  >
                    {buyerType === "individual" ? "개인" : "사업자"}
                  </button>
                ))}
              </div>
              {form.buyerType === "individual" && currentPlanAllowsIndividual && !currentPlanRequiresBusinessInfo && (
                <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                  {isScreenService ? "테이블씬 스크린은 개인 구매가 가능합니다." : "베이직 플랜은 개인 구매가 가능합니다."}
                </p>
              )}
            </div>
            <Field label="담당자명" value={form.buyerName} onChange={(value) => updateField("buyerName", value)} required maxLength={30} helperText="결제 및 문의 대응에 사용할 이름입니다." errorText={form.buyerName.trim() ? buyerNameError : null} successText="입력 완료" />
            <PhoneInput
              label="담당자 연락처"
              value={form.buyerPhone}
              onChange={(value) => updateField("buyerPhone", value)}
              required
              errorText={form.buyerPhone.trim() ? buyerPhoneError : null}
            />
            <Field label="담당자 이메일" value={form.buyerEmail} onChange={(value) => updateField("buyerEmail", value)} required type="email" helperText="결제 안내를 받을 이메일을 입력해주세요." errorText={form.buyerEmail.trim() ? buyerEmailError : null} successText="이메일 형식이 올바릅니다." />
            {form.buyerType === "business" && (
              <>
                <Field label="상호명" value={form.businessName} onChange={(value) => updateField("businessName", value)} required maxLength={50} helperText="사업자 증빙에 사용할 상호명을 입력해주세요." errorText={form.businessName.trim() ? businessNameError : null} successText="입력 완료" />
                <Field label="대표자명" value={form.representativeName} onChange={(value) => updateField("representativeName", value)} required maxLength={30} helperText="사업자등록증 기준 대표자명을 입력해주세요." errorText={form.representativeName.trim() ? representativeNameError : null} successText="입력 완료" />
                <Field
                  label="사업자등록번호"
                  value={form.businessNumber}
                  onChange={(value) => updateField("businessNumber", value)}
                  required
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="000-00-00000"
                  helperText="숫자 10자리를 입력하면 XXX-XX-XXXXX 형식으로 표시됩니다."
                  errorText={form.businessNumber.trim() ? businessNumberError : null}
                  successText={form.businessNumber.trim() ? "사업자등록번호 형식이 올바릅니다." : undefined}
                />
                <PhoneInput
                  label="사업장 연락처"
                  value={form.businessPhone}
                  onChange={(value) => updateField("businessPhone", value)}
                  required
                  errorText={form.businessPhone.trim() ? businessPhoneError : null}
                />
                <div className="md:col-span-2 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-800">
                  <p>사업자 명의로 매입세액 공제를 받으시려면 결제창에서 지출증빙용을 선택하고 사업자번호를 입력해 주세요.</p>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">{summaryStepLabel}</p>
          <h2 className="text-2xl font-bold tracking-tight">주문 요약</h2>
          <dl className="mt-6 space-y-4 text-sm font-medium">
            <SummaryRow label="상품명" value={activeProduct.name} />
            {isScreenService && <SummaryRow label="스크린 용도" value={form.screenPurpose || "-"} />}
            {isScreenService && <SummaryRow label="스크린 카테고리" value={selectedScreenTemplateCategory.label} />}
            {isScreenService && <SummaryRow label="화면 방향" value={form.screenOrientation || "-"} />}
            {isScreenService && <SummaryRow label="설치 기기" value={form.screenDevice || "-"} />}
            {isMenuService && <SummaryRow label="템플릿 그룹" value={getMenuTemplateGroupLabel(selectedMenuTemplateGroup)} />}
            <SummaryRow label="선택 템플릿" value={selectedTemplate ? `${selectedTemplate.name} (${selectedTemplate.key})` : "-"} />
            <SummaryRow label={isScreenService ? "메뉴보드 이름" : "메뉴판 이름"} value={payload.menuName || "-"} />
            <SummaryRow label="공개 예정 URL" value={payload.desiredSlug ? getPublicMenuUrl(payload.desiredSlug) : "-"} />
            <SummaryRow label="구매자 유형" value={payload.buyerType === "business" ? "사업자" : "개인"} />
            <SummaryRow label="금액" value={formatKrw(activeProduct.amount)} strong />
          </dl>
          <p className="mt-5 break-keep text-xs font-semibold leading-relaxed text-zinc-400">VAT 포함 금액입니다. 결제 검증 성공 후 신청 정보가 생성됩니다.</p>
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">{agreementsStepLabel}</p>
          <h2 className="mb-5 text-2xl font-bold tracking-tight">약관 동의</h2>
          <div className="space-y-3">
            {(Object.keys(agreementLabels) as AgreementKey[]).map((key) => (
              <div key={key} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <div className="flex items-start gap-3 text-sm font-bold leading-relaxed text-zinc-600">
                  <input type="checkbox" checked={agreements[key]} onChange={() => toggleAgreement(key)} className="mt-1 h-4 w-4 accent-zinc-950" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{agreementLabels[key]}</span>
                      <button
                        type="button"
                        onClick={() => setActiveAgreement(key)}
                        className="text-xs font-black text-zinc-400 underline underline-offset-4 transition-colors hover:text-zinc-800"
                      >
                        자세히보기
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isPortOneReady && (
            <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-700">
              {isDevelopment && mockEnabled
                ? "PortOne 공개 환경변수가 없어서 개발 환경 mock 결제로 신청 생성 흐름을 테스트합니다."
                : "PortOne 공개 환경변수가 없어서 결제를 진행할 수 없습니다. 개발 mock은 PORTONE_MOCK_ENABLED=true일 때만 동작합니다."}
            </div>
          )}

          {uiState.message && (
            <div className={`mt-6 rounded-2xl border p-4 text-sm font-bold leading-relaxed ${getUiStateClassName(uiState.type)}`}>{uiState.message}</div>
          )}

          <button
            type="button"
            onClick={handlePayment}
            disabled={!isFormReady || isLoading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isLoading ? "처리 중..." : isPortOneReady ? "신청하고 결제하기" : isDevelopment && mockEnabled ? "mock 결제로 신청 테스트" : "결제 설정 필요"}
          </button>
        </section>
      </aside>

      {activeAgreement && (
        <TermsModal
          title={getAgreementModalTitle(activeAgreement)}
          details={agreementDetails[activeAgreement]}
          onClose={() => setActiveAgreement(null)}
        />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required: isRequired,
  type = "text",
  inputMode,
  min,
  maxLength,
  placeholder,
  helperText,
  errorText,
  successText,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: number;
  maxLength?: number;
  placeholder?: string;
  helperText?: string;
  errorText?: string | null;
  successText?: string;
  className?: string;
}) {
  const message = errorText ?? (value.trim() && successText ? successText : helperText);
  const messageClassName = errorText ? "text-red-600" : value.trim() && successText ? "text-emerald-700" : "text-zinc-400";

  return (
    <label className={className}>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
        {label}
        {isRequired && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        min={min}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(errorText)}
        className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
          errorText ? "border-red-200 focus:border-red-500" : value.trim() && successText ? "border-emerald-200 focus:border-emerald-600" : "border-zinc-200 focus:border-zinc-950"
        }`}
      />
      {message && <p className={`mt-2 break-keep text-xs font-bold leading-relaxed ${messageClassName}`}>{message}</p>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  helperText = "선택해주세요.",
  placeholder = "선택해주세요.",
  required: isRequired,
  errorText,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (string | { value: string; label: string })[];
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  errorText?: string | null;
  className?: string;
}) {
  const message = errorText ?? helperText;

  return (
    <label className={className}>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
        {label}
        {isRequired && <span className="text-red-500"> *</span>}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={isRequired}
        aria-invalid={Boolean(errorText)}
        className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
          errorText ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={typeof option === "string" ? option : option.value} value={typeof option === "string" ? option : option.value}>
            {typeof option === "string" ? option : option.label}
          </option>
        ))}
      </select>
      {message && <p className={`mt-2 break-keep text-xs font-bold leading-relaxed ${errorText ? "text-red-600" : "text-zinc-400"}`}>{message}</p>}
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className="mt-2 w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-zinc-900 outline-none transition focus:border-zinc-950"
      />
      {helperText && <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">{helperText}</p>}
    </label>
  );
}

function PhoneInput({
  label,
  value,
  onChange,
  required: isRequired,
  errorText,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  errorText?: string | null;
  className?: string;
}) {
  const { prefix, middle, last } = parsePhoneNumber(value);
  const showSuccess = Boolean(value.trim() && !errorText);
  const message = errorText ?? (showSuccess ? "전화번호 형식이 올바릅니다." : "앞자리 선택 후 숫자만 입력해주세요.");

  function updatePhone(nextPrefix: string, nextMiddle: string, nextLast: string) {
    onChange(normalizePhoneNumberParts(nextPrefix, nextMiddle, nextLast));
  }

  return (
    <div className={className}>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
        {label}
        {isRequired && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-2 grid grid-cols-[96px_1fr_1fr] gap-2">
        <select
          value={prefix}
          onChange={(event) => updatePhone(event.target.value, middle, last)}
          className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950"
        >
          {phonePrefixes.map((phonePrefix) => (
            <option key={phonePrefix} value={phonePrefix}>
              {phonePrefix}
            </option>
          ))}
        </select>
        <input
          value={middle}
          onChange={(event) => updatePhone(prefix, getDigits(event.target.value, 4), last)}
          inputMode="numeric"
          maxLength={4}
          placeholder="1234"
          aria-invalid={Boolean(errorText)}
          className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
            errorText ? "border-red-200 focus:border-red-500" : showSuccess ? "border-emerald-200 focus:border-emerald-600" : "border-zinc-200 focus:border-zinc-950"
          }`}
        />
        <input
          value={last}
          onChange={(event) => updatePhone(prefix, middle, getDigits(event.target.value, 4))}
          inputMode="numeric"
          maxLength={4}
          placeholder="5678"
          aria-invalid={Boolean(errorText)}
          className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
            errorText ? "border-red-200 focus:border-red-500" : showSuccess ? "border-emerald-200 focus:border-emerald-600" : "border-zinc-200 focus:border-zinc-950"
          }`}
        />
      </div>
      <p className={`mt-2 break-keep text-xs font-bold leading-relaxed ${errorText ? "text-red-600" : showSuccess ? "text-emerald-700" : "text-zinc-400"}`}>
        {message}
      </p>
    </div>
  );
}

function TermsModal({ title, details, onClose }: { title: string; details: string[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/45 p-0 md:items-center md:p-6" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[86vh] w-full rounded-t-3xl bg-white shadow-2xl md:max-w-xl md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-zinc-100 p-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Policy</p>
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-2xl font-black tracking-tight text-zinc-950">{title}</h3>
            <button type="button" onClick={onClose} className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-black text-zinc-500">
              닫기
            </button>
          </div>
        </div>
        <div className="max-h-[56vh] space-y-4 overflow-y-auto p-6 text-sm font-semibold leading-relaxed text-zinc-600">
          {details.map((detail, index) => (
            <section key={detail} className="rounded-2xl bg-zinc-50 p-4">
              <h4 className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">항목 {index + 1}</h4>
              <p>{detail}</p>
            </section>
          ))}
        </div>
        <div className="border-t border-zinc-100 p-6">
          <button type="button" onClick={onClose} className="inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white">
            확인
          </button>
        </div>
      </section>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
      <dt className="text-zinc-400">{label}</dt>
      <dd className={`text-right ${strong ? "text-xl font-black text-zinc-950" : "font-bold text-zinc-800"}`}>{value}</dd>
    </div>
  );
}
