"use client";

import * as PortOne from "@portone/browser-sdk/v2";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { DISPLAY_CHECKOUT_QA_MOCK_BILLING_PREFIX } from "@/lib/display-checkout-qa-constants";
import { openDiscountPolicy } from "@/lib/promotion-policy";
import {
  basicPaymentProducts,
  businessDisplayMonthlyProduct,
  businessDisplayYearlyProduct,
  canIndividualPurchasePlan,
  displayPaymentProducts,
  formatKrw,
  getBasicPaymentProduct,
  isValidMenuSlug,
  menuCreationProduct,
  personalTrialBasicProduct,
  requiresBusinessInfo,
  type BasicPaymentProduct,
  type BasicProductKey,
  type BuyerType,
  type DisplayPaymentProduct,
  type MenuOrderPayload,
  type OrderSetupPayload,
  type PaymentProductKey,
  type PlanKey,
  type ScreenSetupPayload,
} from "@/lib/payments";
import { getPublicMenuUrl } from "@/lib/menu-url";
import { MENU_FIELD_LIMITS } from "@/lib/menu-limits";
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
import {
  getTemplateServiceLabel,
  getTemplateTypeOptionsForService,
  getTemplateTypeLabelByTemplateKey,
  type TemplateServiceType,
} from "@/lib/template-types";
import type { PaymentCompleteResponse } from "@/types/payment";

type ApplyOrderFormProps = {
  templates: readonly TemplateCatalogItem[];
  userEmail: string;
  userId: string;
  storeId: string | null;
  channelKey: string | null;
  billingChannelKey: string | null;
  mockEnabled: boolean;
  serviceType?: "menu" | "screen" | "order";
  displayCheckoutQaEnabled?: boolean;
  initialRecoverPaymentId?: string;
  initialRecoverSubscriptionId?: string;
};

type AgreementKey = "terms" | "privacy" | "contentPolicy" | "marketing";
type BusinessVerificationResponse = {
  ok?: boolean;
  verified?: boolean;
  businessProfileId?: string;
  businessName?: string | null;
  representativeName?: string;
  businessRegistrationNumberMasked?: string;
  businessStatus?: string | null;
  taxType?: string | null;
  verifiedAt?: string | null;
  message?: string;
};

type BillingKeyIssueResponse = {
  code?: string;
  message?: string;
  billingKey?: string;
  billingKeyInfo?: {
    billingKey?: string;
  };
};

type BusinessSubscriptionResponse = {
  ok?: boolean;
  step?: string;
  debugCode?: string;
  message?: string;
  menuSiteId?: string;
  slug?: string;
  safeDebug?: {
    portoneStatus?: number;
    portoneCode?: string;
    portoneMessage?: string;
  };
  debug?: {
    portoneStatus?: number;
    portoneCode?: string;
    portoneMessage?: string;
  };
};

type PaymentPreflightResponse = {
  ok?: boolean;
  message?: string;
};

type PersonalTrialEligibilityResponse = {
  eligible?: boolean;
  reason?: string;
  message?: string;
  existingMenuSiteId?: string;
  existingEntitlementStatus?: string;
};

type BusinessVerificationState =
  | { type: "idle"; message: string }
  | { type: "checking"; message: string }
  | { type: "verified"; message: string; result: BusinessVerificationResponse }
  | { type: "failed"; message: string };

type FormState = {
  buyerType: BuyerType;
  template_category: TemplateCategoryKey;
  template_key: TemplateKey | "";
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
  businessName: string;
  representativeName: string;
  businessNumber: string;
  businessOpeningDate: string;
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

type SlugAvailabilityResponse = {
  available?: boolean;
  message?: string;
};

type DraftMenuOrderPayload = Omit<MenuOrderPayload, "template_key"> & {
  template_key: TemplateKey | "";
};

type PendingPaymentCompletion = {
  paymentId: string;
  order: DraftMenuOrderPayload;
  savedAt: number;
};

const MENU_ADDRESS_HELPER_TEXT =
  "결제 후 변경할 수 없습니다. QR 코드와 공유 링크에 사용되므로 신중하게 입력해주세요. 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다. 예: gangnam-cafe";
const PERSONAL_TRIAL_LIMIT_MESSAGE =
  "개인 1개월 체험은 계정당 1개만 이용할 수 있습니다. 기존 체험 메뉴판을 사업자 플랜으로 전환하거나 새 사업자 메뉴판을 신청해주세요.";
const DISPLAY_PAYMENT_COMPLETION_STORAGE_KEY = "menulink:display-payment-completion:v1";

type PaidApplyProduct = {
  key: string;
  name: string;
  label?: string;
  description: string;
  amount: number;
  regular_amount?: number;
  discount_rate?: number;
  currency: typeof menuCreationProduct.currency;
  product_key?: PaymentProductKey;
  plan_type?: MenuOrderPayload["plan_type"];
  payment_type?: MenuOrderPayload["payment_type"];
  billing_cycle?: MenuOrderPayload["billing_cycle"];
  requires_business_verification?: boolean;
  is_subscription?: boolean;
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
  marketing: false,
};

const agreementLabels: Record<AgreementKey, string> = {
  terms: "[필수] 메뉴링크 이용약관에 동의합니다.",
  privacy: "[필수] 개인정보 수집·이용 및 사업자 정보 수집·이용에 동의합니다.",
  contentPolicy: "[필수] 결제 즉시 서비스가 시작되며, 정기결제·해지·환불 제한 조건을 확인했습니다.",
  marketing: "[선택] 이벤트·혜택·신규 템플릿·AI 기능 업데이트 등 광고성 정보 수신에 동의합니다.",
};

const agreementDetails: Record<AgreementKey, string[]> = {
  terms: [
    "[서비스 목적] 메뉴링크는 음식점, 카페, 다이닝 매장 등에서 사용할 수 있는 웹 메뉴판 생성 및 관리 서비스입니다. 메뉴링크 베이직은 템플릿 기반 메뉴판 생성 및 데이터 편집 기능을 제공합니다.",
    "[개인 체험 1개월] 개인 체험은 사업자 인증 없이 메뉴링크 베이직 템플릿 메뉴판을 1개월 동안 사용할 수 있는 단건 결제 상품입니다. 자동결제는 제공되지 않습니다.",
    "[사업자 정식 이용] 메뉴링크 베이직 월/연 결제는 사업자 인증 후 자동결제로 이용하는 정식 플랜입니다. 실제 자동결제는 PG/PortOne 빌링키 설정과 인증 API 연결이 완료된 뒤 진행됩니다.",
    "[서비스 안내] 메뉴링크 디스플레이는 매장 TV와 모니터에 띄우는 디스플레이 메뉴보드 서비스입니다. 메뉴링크 커스텀과 비주얼 스튜디오는 상담 또는 준비 중인 서비스로, 제공 범위와 이용 조건은 별도 안내합니다.",
    "[서비스 이용 시작] 결제가 완료되고 메뉴판이 생성되면 서비스 이용이 시작된 것으로 봅니다. 생성된 메뉴판은 마이페이지에서 확인하고 편집할 수 있습니다.",
    "[메뉴판 주소] 사용자가 입력한 희망 메뉴판 주소는 중복 여부, 정책 위반 여부, 기술적 제한 등에 따라 사용할 수 없을 수 있습니다. 회사는 부적절하거나 오해를 유발하거나 제3자의 권리를 침해할 우려가 있는 주소 사용을 제한할 수 있습니다.",
    "[서비스 제공 범위] 회사는 서비스 안정성, 보안, 운영 정책, 기술적 사유에 따라 일부 기능을 변경, 중단, 제한할 수 있습니다.",
    "[정식 이용 전환] 개인 체험을 계속 이용하려면 체험 기간 안에 사업자 인증 후 정식 플랜으로 전환해야 합니다.",
    "[결제 및 환불] 결제 후 메뉴판 생성이 완료되면 서비스 이용이 시작된 것으로 봅니다. 단순 변심, 잘못된 정보 입력, 사용자의 편집 실수, 이미지 또는 콘텐츠 등록 오류로 인한 환불은 제한될 수 있습니다. 결제 오류, 중복 결제, 서비스 제공 불가 등 회사 귀책 사유가 확인되는 경우 별도 기준에 따라 환불 또는 조치할 수 있습니다.",
    "[이용 종료 후 데이터] 개인 체험 이용 기간이 종료되면 메뉴판은 비공개 처리됩니다. 종료 후 30일 동안 복구 가능 상태로 보관되며, 30일이 지나면 메뉴판 데이터와 업로드 이미지는 삭제 또는 삭제 예정 처리될 수 있습니다.",
    "[자료 백업 안내] 삭제된 메뉴판 데이터, 메뉴 이미지, 설정 정보는 복구할 수 없으므로 해지 전 필요한 자료를 반드시 백업해주세요.",
    "[회사 제공 콘텐츠의 권리] 메뉴링크 서비스, 소프트웨어, 코드, 관리자 화면, 공개 메뉴판 템플릿, 디자인, 레이아웃, 로고, 상표, starter preset, 공용 placeholder 이미지 등 회사가 제공하는 콘텐츠와 구성 요소에 대한 권리는 회사 또는 정당한 권리자에게 있습니다. 회원은 이를 메뉴링크 서비스 이용 범위 내에서만 사용할 수 있습니다.",
    "[회원 콘텐츠의 권리] 회원이 입력하거나 업로드한 매장 정보, 메뉴명, 설명, 가격, 소개 문구, 이벤트 문구, SNS 정보, 이미지 등 콘텐츠의 권리는 회원 또는 해당 콘텐츠의 정당한 권리자에게 귀속되며 회사는 소유권을 취득하지 않습니다.",
    "[서비스 제공을 위한 콘텐츠 이용허락] 회원은 서비스 제공, 메뉴판 생성, 공개 메뉴판 표시, 저장, 백업, 고객 지원, 오류 수정 및 서비스 개선에 필요한 범위에서 회사가 회원 콘텐츠를 이용, 저장, 복제, 전송, 표시할 수 있도록 허락합니다.",
    "[마케팅 사용] 회사는 회원 콘텐츠를 서비스 제공 목적 외의 광고, 홍보, 포트폴리오 목적으로 사용하려는 경우 회원의 별도 동의를 받습니다.",
  ],
  privacy: [
    "유료 메뉴판 생성, 정기결제, 구독 관리, 사업자 확인, 증빙 처리, 고객지원 및 부정 이용 방지를 위해 이름, 이메일, 휴대전화번호, 요금제, 결제 주기, 주문번호, 결제금액, 결제일시, 결제수단, 승인번호, 결제 상태, 구독 상태, 다음 결제 예정일, 상호명, 대표자명, 사업자등록번호, 사업장 주소, 업종, 업태, 담당자명, 담당자 연락처, 담당자 이메일 등을 수집·이용합니다.",
    "사업자 정보는 사업자 인증 API를 통해 유효성이 확인될 수 있으며, 사업자등록증 파일은 기본적으로 수집하지 않습니다.",
    "카드번호 전체, 비밀번호, CVC 등 민감한 결제수단 정보는 메뉴링크가 직접 저장하지 않으며, 포트원 및 NHN KCP 등 결제대행사 또는 결제사가 처리합니다.",
    "보유기간은 유료서비스 이용기간 동안이며, 구독 종료 후 메뉴판 데이터는 90일간 복구 가능 상태로 보관될 수 있습니다. 결제 실패, 미납 또는 결제수단 확인 필요로 이용이 제한된 경우에는 30일간 복구 가능 상태로 보관될 수 있습니다.",
    "결제·정산·계약·청약철회·소비자 분쟁 관련 기록은 관계 법령에 따라 일정 기간 보관됩니다.",
    "동의를 거부할 경우 유료서비스 신청, 메뉴판 생성, 결제 및 정기구독 이용이 제한될 수 있습니다.",
  ],
  contentPolicy: [
    "결제 완료 즉시 선택한 요금제의 메뉴판이 생성되고, 메뉴판 편집·공개 설정·QR 및 공개 URL 이용 등 유료서비스 제공이 시작됩니다.",
    "또한 요금제에 포함된 AI 크레딧이 지급됩니다.",
    "월구독 또는 연구독 상품은 정기결제 상품이며, 이용자가 구독을 해지하기 전까지 선택한 결제 주기에 따라 자동 결제됩니다.",
    "구독을 해지하는 경우 다음 결제일부터 결제가 중단되며, 이미 결제된 이용기간 동안은 서비스를 계속 이용할 수 있습니다.",
    "서비스 제공이 개시된 이후에는 관련 법령상 허용되는 범위 내에서 단순 변심, 착오 구매, 미사용 등을 이유로 한 청약철회 및 환불이 제한될 수 있습니다.",
    "단, 중복 결제, 결제 오류, 회사의 귀책사유로 서비스가 정상적으로 제공되지 않은 경우 등 회사가 환불이 필요하다고 인정하거나 관련 법령상 환불이 필요한 경우에는 회사의 환불 정책 및 관계 법령에 따라 처리됩니다.",
    "메뉴판에 등록되는 메뉴명, 가격, 설명, 이미지, 원산지, 알레르기 정보, 영업시간, 이벤트 정보 등은 이용자가 직접 입력·관리하며, AI 기능을 통해 생성된 문구와 번역은 참고용 초안으로 공개 전 이용자가 직접 검토해야 합니다.",
  ],
  marketing: [
    "메뉴링크는 이벤트, 할인 혜택, 신규 템플릿 출시, AI 기능 업데이트, 서비스 개선 소식, 유료 기능 안내 등 광고성 정보를 이메일, 문자메시지, 카카오 메시지 등으로 발송할 수 있습니다.",
    "마케팅 정보 수신 동의는 선택 사항이며, 동의하지 않아도 회원가입 및 서비스 이용에는 제한이 없습니다.",
    "이용자는 언제든지 마이페이지 또는 고객지원 문의를 통해 수신 동의를 철회할 수 있습니다.",
  ],
};

const personalTrialAgreementLabels: Record<AgreementKey, string> = {
  terms: "[필수] 메뉴링크 이용약관에 동의합니다.",
  privacy: "[필수] 개인정보 수집·이용에 동의합니다.",
  contentPolicy: "[필수] 첫 달 체험 이용 조건 및 종료 후 데이터 처리 기준을 확인했습니다.",
  marketing: agreementLabels.marketing,
};

const personalTrialAgreementDetails: Record<AgreementKey, string[]> = {
  ...agreementDetails,
  privacy: [
    "첫 달 체험 메뉴판 생성, 체험 기간 관리, 고객지원, 부정 이용 방지, 체험 종료 및 데이터 삭제 예정 안내를 위해 이름, 이메일, 휴대전화번호, 체험 신청일, 체험 시작일, 체험 종료일, 메뉴판 ID, 메뉴판 상태 등을 수집·이용합니다.",
    "보유기간은 첫 달 체험 기간 및 종료 후 30일까지이며, 사업자 플랜으로 전환하는 경우 유료서비스 이용기간 동안 보관됩니다.",
    "동의를 거부할 경우 첫 달 체험 신청 및 체험 메뉴판 제공이 제한될 수 있습니다.",
  ],
  contentPolicy: [
    "첫 달 체험은 메뉴링크 베이직 기준으로 신청일로부터 1개월간 제공됩니다.",
    "체험 기간 동안 메뉴링크 베이직 기준 AI 크레딧 18개가 제공됩니다.",
    "체험 기간 종료 후 메뉴판은 비공개 처리될 수 있으며, 종료 후 30일 이내 사업자 월구독 또는 연구독으로 전환하면 기존 메뉴판 데이터를 계속 사용할 수 있습니다.",
    "30일이 경과하면 메뉴판 데이터와 업로드 이미지가 삭제될 수 있으며, 삭제된 데이터는 복구되지 않을 수 있습니다.",
    "첫 달 체험 후 사업자 플랜으로 전환하는 경우, 유료서비스 제공 및 결제 처리를 위해 사업자 정보 입력과 관련 동의가 필요합니다.",
  ],
};

const screenCreationProduct = {
  ...menuCreationProduct,
  key: "large_screen",
  name: "메뉴링크 디스플레이 생성권",
  description: "매장 화면용 디지털 메뉴보드 운영을 준비합니다.",
} as const;

const orderCreationProduct = {
  ...menuCreationProduct,
  key: "qr_order",
  name: "메뉴링크 오더 1.0 신청권",
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

const basicProductCards = [
  {
    product: basicPaymentProducts[0],
    bullets: ["1회 결제", "자동결제 없음", "사업자 인증 없이 시작", "메뉴링크 베이직 체험 메뉴판 생성 시 AI 크레딧 18개 제공"],
    helperText: "체험 종료 후 30일 이내 사업자 플랜으로 전환하면 기존 메뉴판을 이어서 사용할 수 있습니다.",
  },
  {
    product: basicPaymentProducts[1],
    bullets: ["사업자 인증 필요", "월 자동결제", "메뉴링크 베이직 메뉴판 생성 시 AI 크레딧 18개 제공", "계속 이용 가능"],
    helperText: "국세청 사업자 인증과 PortOne 빌링키 연결 후 결제 진행",
  },
  {
    product: basicPaymentProducts[2],
    bullets: ["사업자 인증 필요", "연 자동결제", "메뉴링크 베이직 메뉴판 생성 시 AI 크레딧 18개 제공", "계속 이용 가능"],
    helperText: "국세청 사업자 인증과 PortOne 빌링키 연결 후 결제 진행",
  },
] as const satisfies readonly {
  product: BasicPaymentProduct;
  bullets: readonly string[];
  helperText: string;
}[];

const displayProductCards = [
  {
    product: businessDisplayMonthlyProduct,
    bullets: ["매월 자동결제", "언제든 해지 가능", "메뉴링크 디스플레이 메뉴판 생성 시 AI 크레딧 26개 제공"],
    helperText: "PortOne 빌링키 발급 후 첫 결제와 이후 정기결제를 연결합니다.",
  },
  {
    product: businessDisplayYearlyProduct,
    bullets: ["연 자동결제", "월 결제 대비 할인", "해지 예약 가능", "메뉴링크 디스플레이 메뉴판 생성 시 AI 크레딧 26개 제공"],
    helperText: "국세청 사업자 인증과 PortOne 빌링키 연결 후 연 정기결제를 진행합니다.",
  },
] as const satisfies readonly {
  product: DisplayPaymentProduct;
  bullets: readonly string[];
  helperText: string;
}[];

async function readSlugAvailabilityResponse(response: Response): Promise<SlugAvailabilityResponse> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as SlugAvailabilityResponse;
  } catch {
    return {
      message: response.ok ? undefined : `주소 확인 요청에 실패했습니다. (${response.status})`,
    };
  }
}

function normalizeMenuAddressInput(value: string) {
  return value.toLowerCase().slice(0, 40);
}

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
  cafe_dessert: ["cafe", "bakery", "dessert"],
  dining: ["restaurant", "brunch", "casual_dining", "fine_dining", "pub_bar"],
  fast_takeout: ["fast_food"],
  beauty_wellness: ["hair_salon", "nail_shop", "beauty_esthetic"],
  class_workshop: ["workshop_class"],
  fitness: ["fitness_pt"],
  pet: ["pet_shop"],
  clinic: ["clinic"],
  popup_event: ["popup_event"],
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
const defaultRecommendedMenuTemplateGroups = ["cafe_dessert", "dining"] as const satisfies readonly Exclude<MenuTemplateGroupKey, "recommended" | "all">[];
const templateTagMap = {
  cafe: ["카페", "디저트", "이미지형", "모바일/QR"],
  display: ["디스플레이", "메뉴보드", "16:9"],
  bakery: ["베이커리", "디저트", "모바일/QR"],
  dessert: ["디저트샵", "카페", "모바일/QR"],
  restaurant: ["식당", "메뉴판", "모바일/QR"],
  brunch: ["브런치", "다이닝", "모바일/QR"],
  casual_dining: ["식당", "캐주얼다이닝", "모바일/QR"],
  fine_dining: ["파인다이닝", "코스", "프리미엄"],
  fast_food: ["패스트푸드", "테이크아웃", "빠른 주문"],
  pub_bar: ["주점", "바", "모바일/QR"],
  hair_salon: ["미용실", "가격표", "모바일/QR"],
  nail_shop: ["네일샵", "가격표", "모바일/QR"],
  beauty_esthetic: ["에스테틱", "가격표", "모바일/QR"],
  workshop_class: ["공방", "클래스", "안내"],
  fitness_pt: ["피트니스", "PT", "가격표"],
  pet_shop: ["펫샵", "애견미용", "가격표"],
  clinic: ["병원", "클리닉", "안내"],
  popup_event: ["팝업", "행사", "안내"],
  etc: ["기타", "메뉴판", "가격표"],
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
const screenTemplateCategories = [
  { key: "cafe_screen", label: "카페 디스플레이", templateCategory: "cafe" },
  { key: "bakery_screen", label: "베이커리 디스플레이", templateCategory: "cafe" },
  { key: "foodcourt_screen", label: "푸드코트 디스플레이", templateCategory: "fast_food" },
  { key: "price_screen", label: "가격표 디스플레이", templateCategory: "casual_dining" },
  { key: "promo_screen", label: "안내/프로모션 디스플레이", templateCategory: "brunch" },
  { key: "waiting_screen", label: "대기화면 디스플레이", templateCategory: "fine_dining" },
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

function createMockDisplayBillingKey() {
  const timestamp = Date.now().toString(36);
  const randomId = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  return `${DISPLAY_CHECKOUT_QA_MOCK_BILLING_PREFIX}${timestamp}_${randomId}`;
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
    "[메뉴링크 오더 1.0 도입 정보]",
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
    "[메뉴링크 디스플레이 도입 정보]",
    `디스플레이 용도: ${screenSetup.purpose || "-"}`,
    `디스플레이 템플릿 카테고리: ${screenSetup.templateCategory || "-"}`,
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
    const recommendedGroups = businessType ? menuTemplateRecommendationMap[businessType] : defaultRecommendedMenuTemplateGroups;
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

  return templates.filter((template) => categories.some((category) => category === template.template_category));
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
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(value)) return "한글은 사용할 수 없습니다. 영문 소문자, 숫자, 하이픈(-)으로 입력해주세요.";
  if (/\s/.test(value)) return "공백은 사용할 수 없습니다. 단어 사이는 하이픈(-)으로 연결해주세요.";
  if (!/^[a-z0-9-]+$/.test(value)) return "특수문자는 사용할 수 없습니다. 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.";
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

function normalizeRecoverablePaymentId(value: string) {
  const paymentId = value.trim();

  if (!paymentId || paymentId.length > 120 || !/^[A-Za-z0-9._:-]+$/.test(paymentId)) {
    return "";
  }

  return paymentId;
}

function readPendingPaymentCompletion() {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.sessionStorage.getItem(DISPLAY_PAYMENT_COMPLETION_STORAGE_KEY);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as Partial<PendingPaymentCompletion>;
    const paymentId = normalizeRecoverablePaymentId(typeof parsed.paymentId === "string" ? parsed.paymentId : "");

    if (!paymentId || !parsed.order || typeof parsed.order !== "object" || typeof parsed.savedAt !== "number") {
      return null;
    }

    return {
      paymentId,
      order: parsed.order as DraftMenuOrderPayload,
      savedAt: parsed.savedAt,
    } satisfies PendingPaymentCompletion;
  } catch {
    return null;
  }
}

function writePendingPaymentCompletion(pendingCompletion: PendingPaymentCompletion) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(DISPLAY_PAYMENT_COMPLETION_STORAGE_KEY, JSON.stringify(pendingCompletion));
  } catch {
    // Recovery storage is best-effort only. The live form payload is still available in the current session.
  }
}

function clearPendingPaymentCompletion() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(DISPLAY_PAYMENT_COMPLETION_STORAGE_KEY);
  } catch {
    // Ignore browser storage failures.
  }
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
  billingChannelKey,
  mockEnabled,
  serviceType = "menu",
  displayCheckoutQaEnabled = false,
  initialRecoverPaymentId = "",
  initialRecoverSubscriptionId = "",
}: ApplyOrderFormProps) {
  const router = useRouter();
  const isMenuService = serviceType === "menu";
  const isScreenService = serviceType === "screen";
  const isOrderService = serviceType === "order";
  const isDisplayBusinessOnly = isScreenService && displayCheckoutQaEnabled;
  const templateServiceType: TemplateServiceType = isScreenService ? "display" : "basic";
  const serviceTemplates = useMemo(() => [...templates], [templates]);
  const templateTypeOptions = useMemo(() => getTemplateTypeOptionsForService(templateServiceType), [templateServiceType]);
  const currentPlanKey = servicePlanKeys[serviceType];
  const firstCategory = TEMPLATE_CATEGORIES[0].key;
  const firstTemplate = serviceTemplates.find((template) => template.template_category === firstCategory) ?? serviceTemplates[0] ?? templates[0];
  const [selectedBasicProductKey, setSelectedBasicProductKey] = useState<BasicProductKey>(personalTrialBasicProduct.product_key);
  const [selectedDisplayProductKey, setSelectedDisplayProductKey] = useState<PaymentProductKey>(businessDisplayMonthlyProduct.product_key);
  const selectedBasicProduct = getBasicPaymentProduct(selectedBasicProductKey) ?? personalTrialBasicProduct;
  const selectedDisplayProduct = displayPaymentProducts.find((product) => product.product_key === selectedDisplayProductKey) ?? businessDisplayMonthlyProduct;
  const activeProduct: PaidApplyProduct = isMenuService
    ? selectedBasicProduct
    : isScreenService && displayCheckoutQaEnabled
      ? selectedDisplayProduct
      : serviceProducts[serviceType];
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategoryKey>(firstTemplate?.template_category ?? firstCategory);
  const [selectedMenuTemplateGroup, setSelectedMenuTemplateGroup] = useState<MenuTemplateGroupKey>("recommended");
  const [agreements, setAgreements] = useState(initialAgreements);
  const [activeAgreement, setActiveAgreement] = useState<AgreementKey | null>(null);
  const [businessVerificationState, setBusinessVerificationState] = useState<BusinessVerificationState>({
    type: "idle",
    message: "사업자등록번호, 대표자명, 개업일자, 상호명을 입력한 뒤 확인합니다.",
  });
  const [uiState, setUiState] = useState<UiState>({ type: "idle", message: null });
  const [pendingPaymentCompletion, setPendingPaymentCompletion] = useState<PendingPaymentCompletion | null>(null);
  const [recoveryPaymentIdInput, setRecoveryPaymentIdInput] = useState(() => {
    return normalizeRecoverablePaymentId(initialRecoverPaymentId);
  });
  const [recoverySubscriptionIdInput, setRecoverySubscriptionIdInput] = useState(initialRecoverSubscriptionId);
  const [slugState, setSlugState] = useState<SlugState>({ slug: "", type: "idle", message: MENU_ADDRESS_HELPER_TEXT });
  const [form, setForm] = useState<FormState>({
    buyerType: isDisplayBusinessOnly ? "business" : "individual",
    template_category: firstTemplate?.template_category ?? firstCategory,
    template_key: firstTemplate?.key ?? "",
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
    businessName: "",
    representativeName: "",
    businessNumber: "",
    businessOpeningDate: "",
    businessPhone: "",
    tableCount: "",
    posUsage: "",
    paymentPreference: "",
    kitchenDashboard: "",
    callFeature: "",
    launchTimeline: "",
    additionalRequests: "",
  });

  useEffect(() => {
    let isActive = true;

    queueMicrotask(() => {
      if (!isActive) return;

      const storedCompletion = readPendingPaymentCompletion();
      setPendingPaymentCompletion(storedCompletion);

      if (!normalizeRecoverablePaymentId(initialRecoverPaymentId) && storedCompletion?.paymentId) {
        setRecoveryPaymentIdInput((currentValue) => currentValue || storedCompletion.paymentId);
      }
    });

    return () => {
      isActive = false;
    };
  }, [initialRecoverPaymentId]);

  const filteredTemplates = useMemo(() => {
    if (isMenuService) {
      return getTemplatesByMenuGroup(serviceTemplates, selectedMenuTemplateGroup, form.restaurantType);
    }

    return serviceTemplates.filter((template) => template.template_category === selectedCategory);
  }, [form.restaurantType, isMenuService, selectedCategory, selectedMenuTemplateGroup, serviceTemplates]);

  const selectedTemplate = useMemo(
    () => serviceTemplates.find((template) => template.key === form.template_key) ?? serviceTemplates[0] ?? templates[0],
    [form.template_key, serviceTemplates, templates]
  );
  const hasSelectableTemplate = Boolean(selectedTemplate && form.template_key);
  const currentPlanRequiresBusinessInfo = requiresBusinessInfo(currentPlanKey);
  const currentPlanAllowsIndividual = canIndividualPurchasePlan(currentPlanKey);
  const activeProductRequiresBusinessVerification = Boolean(activeProduct.requires_business_verification);
  const isSubscriptionProduct = activeProduct.payment_type === "subscription";
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
    }),
    [form.screenPurpose, selectedScreenTemplateCategory.label]
  );

  const payload = useMemo<DraftMenuOrderPayload>(
    () => ({
      product_key: activeProduct.product_key,
      plan_type: activeProduct.plan_type,
      payment_type: activeProduct.payment_type,
      billing_cycle: activeProduct.billing_cycle,
      plan_key: currentPlanKey,
      template_category: form.template_category,
      template_key: form.template_key,
      menuName: form.menuName.trim(),
      desiredSlug: normalizeMenuAddressInput(form.desiredSlug),
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
      buyerType: activeProductRequiresBusinessVerification ? "business" : form.buyerType,
      buyerName: form.buyerName.trim(),
      buyerPhone: form.buyerPhone.trim(),
      buyerEmail: form.buyerEmail.trim(),
      businessName: activeProductRequiresBusinessVerification || form.buyerType === "business" ? form.businessName.trim() : null,
      businessProfileId: businessVerificationState.type === "verified" ? businessVerificationState.result.businessProfileId ?? null : null,
      representativeName: activeProductRequiresBusinessVerification || form.buyerType === "business" ? form.representativeName.trim() : null,
      businessNumber: activeProductRequiresBusinessVerification || form.buyerType === "business" ? nullable(form.businessNumber) : null,
      businessOpeningDate: activeProductRequiresBusinessVerification || form.buyerType === "business" ? nullable(form.businessOpeningDate) : null,
      businessPhone: activeProductRequiresBusinessVerification || form.buyerType === "business" ? nullable(form.businessPhone) : null,
      termsAccepted: agreements.terms,
      privacyAccepted: agreements.privacy,
      contentPolicyAccepted: agreements.contentPolicy,
      marketingAccepted: agreements.marketing,
      consentAgreedAt: agreements.terms && agreements.privacy && agreements.contentPolicy ? new Date().toISOString() : null,
      consentContext: activeProduct.product_key === personalTrialBasicProduct.product_key ? "personal_trial_apply" : "paid_apply",
      amount: activeProduct.amount,
    }),
    [
      activeProduct.amount,
      activeProduct.billing_cycle,
      activeProduct.payment_type,
      activeProduct.plan_type,
      activeProduct.product_key,
      activeProductRequiresBusinessVerification,
      agreements.contentPolicy,
      agreements.marketing,
      agreements.privacy,
      agreements.terms,
      businessVerificationState,
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
  const isBillingPortOneReady = Boolean(storeId && billingChannelKey);
  const isDevelopment = process.env.NODE_ENV !== "production";
  const hasInitialRecoveryParams =
    Boolean(normalizeRecoverablePaymentId(initialRecoverPaymentId)) || Boolean(initialRecoverSubscriptionId.trim());
  const canShowPaymentCompletionRecovery = isScreenService && displayCheckoutQaEnabled && isDevelopment && hasInitialRecoveryParams;
  const menuAddressError = getMenuAddressError(payload.desiredSlug);
  const isSlugValid = !menuAddressError && isValidMenuSlug(payload.desiredSlug);
  const visibleSlugState = useMemo<SlugState>(() => {
    if (!hasSelectableTemplate) {
      return {
        slug: payload.desiredSlug,
        type: "idle",
        message: isScreenService ? "메뉴링크 디스플레이 템플릿 준비 후 공개 주소를 확인할 수 있습니다." : MENU_ADDRESS_HELPER_TEXT,
      };
    }

    if (!payload.desiredSlug) {
      return { slug: "", type: "idle", message: MENU_ADDRESS_HELPER_TEXT };
    }

    if (!isSlugValid) {
      return { slug: payload.desiredSlug, type: "unavailable", message: menuAddressError ?? "메뉴판 주소 형식이 올바르지 않습니다." };
    }

    if (slugState.slug !== payload.desiredSlug) {
      return { slug: payload.desiredSlug, type: "checking", message: "메뉴판 주소를 확인하고 있습니다." };
    }

    return slugState;
  }, [hasSelectableTemplate, isScreenService, isSlugValid, menuAddressError, payload.desiredSlug, slugState]);
  const isSlugAvailable = visibleSlugState.type === "available";
  const menuNameError = getRequiredMessage(isScreenService ? "디스플레이 이름" : "메뉴판 이름", payload.menuName);
  const restaurantNameError = getRequiredMessage("레스토랑 이름", payload.restaurantName);
  const restaurantTypeError = form.restaurantType ? null : "업종을 선택해주세요.";
  const visibleRestaurantTypeError = !form.restaurantType && (form.menuName.trim() || form.restaurantName.trim() || form.desiredSlug.trim()) ? restaurantTypeError : null;
  const templateSelectionError = !hasSelectableTemplate
    ? isScreenService
      ? "현재 선택 가능한 메뉴링크 디스플레이 템플릿이 준비 중입니다."
      : "선택 가능한 템플릿이 있는 카테고리를 선택해주세요."
    : isMenuService && filteredTemplates.length === 0
      ? "선택 가능한 템플릿이 있는 카테고리를 선택해주세요."
      : null;
  const restaurantAddressError = payload.restaurantAddress.length > MENU_FIELD_LIMITS.menuSites.restaurantAddress
    ? `매장 주소는 최대 ${MENU_FIELD_LIMITS.menuSites.restaurantAddress}자까지 입력할 수 있습니다.`
    : null;
  const restaurantPhoneError = validatePhoneNumber(payload.restaurantPhone);
  const buyerNameError = validatePersonName("담당자명", payload.buyerName);
  const buyerPhoneError = validatePhoneNumber(payload.buyerPhone);
  const buyerEmailError = getRequiredMessage("담당자 이메일", payload.buyerEmail) ?? (isEmail(payload.buyerEmail) ? null : "올바른 이메일 형식으로 입력해주세요.");
  const isBusinessBuyer = activeProductRequiresBusinessVerification || form.buyerType === "business";
  const businessNameError = isBusinessBuyer ? validateBusinessName(form.businessName) : null;
  const representativeNameError = isBusinessBuyer ? validatePersonName("대표자명", form.representativeName) : null;
  const businessNumberError = isBusinessBuyer
    ? form.businessNumber.trim()
      ? isBusinessNumber(form.businessNumber)
        ? null
        : "사업자등록번호는 숫자 10자리로 입력해주세요."
      : "사업자등록번호를 입력해주세요."
    : null;
  const businessOpeningDateError = isBusinessBuyer
    ? form.businessOpeningDate.trim()
      ? null
      : "개업일자를 입력해주세요."
    : null;
  const businessPhoneError = isBusinessBuyer && form.businessPhone.trim() ? validatePhoneNumber(form.businessPhone) : null;
  const hasVerifiedBusinessProfile =
    businessVerificationState.type === "verified" && Boolean(businessVerificationState.result.businessProfileId);
  const isBusinessVerificationChecking = businessVerificationState.type === "checking";
  const isBaseFormReady =
    !menuNameError &&
    isSlugValid &&
    isSlugAvailable &&
    hasSelectableTemplate &&
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
    !businessOpeningDateError &&
    !businessPhoneError &&
    agreements.terms &&
    agreements.privacy &&
    agreements.contentPolicy;
  const isFormReady = isBaseFormReady && (!activeProductRequiresBusinessVerification || hasVerifiedBusinessProfile);
  const isLoading = uiState.type === "loading";
  const paymentButtonDisabled = !isFormReady || isLoading;
  const businessPaymentActionMessage = activeProductRequiresBusinessVerification
    ? isBusinessVerificationChecking
      ? "사업자 정보를 확인하고 있습니다. 확인이 끝날 때까지 기다려주세요."
      : hasVerifiedBusinessProfile
        ? isSubscriptionProduct
          ? "사업자 인증이 완료되었습니다. 빌링키를 발급한 뒤 첫 결제를 진행합니다."
          : "사업자 인증이 완료되었습니다. 결제를 진행합니다."
        : businessVerificationState.type === "failed"
          ? "사업자 정보가 확인되지 않았습니다. 입력 정보를 다시 확인해주세요."
          : isSubscriptionProduct
            ? "사업자 월/연 정기결제는 사업자 인증 완료 후 진행할 수 있습니다."
            : "사업자 결제는 사업자 인증 완료 후 진행할 수 있습니다."
    : null;

  const paymentButtonLabel = isLoading
    ? "처리 중..."
    : isScreenService && !hasSelectableTemplate
      ? "메뉴링크 디스플레이 템플릿 준비 중"
      : activeProductRequiresBusinessVerification && !hasVerifiedBusinessProfile
        ? isBusinessVerificationChecking
          ? "사업자 인증 확인 중"
          : "사업자 인증 후 진행 가능"
      : isSubscriptionProduct
        ? "정기결제 테스트 진행"
        : visibleSlugState.type === "checking"
          ? "메뉴판 주소 확인 중..."
          : isPortOneReady
            ? "신청하고 결제하기"
            : isDevelopment && mockEnabled
              ? "mock 결제로 신청 테스트"
              : "결제 설정 필요";

  useEffect(() => {
    const slug = normalizeMenuAddressInput(form.desiredSlug);

    if (!hasSelectableTemplate) {
      return;
    }

    if (!slug || getMenuAddressError(slug)) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSlugState({ slug, type: "checking", message: "메뉴판 주소를 확인하고 있습니다." });

      try {
        const response = await fetch(`/api/menu-sites/slug-availability?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });
        const result = await readSlugAvailabilityResponse(response);

        if (!response.ok) {
          setSlugState({ slug, type: "error", message: result.message ?? "주소 확인 중 오류가 발생했습니다." });
          return;
        }

        setSlugState({
          slug,
          type: result.available ? "available" : "unavailable",
          message: result.message ?? (result.available ? "사용 가능한 주소입니다." : "이미 사용 중인 공개 주소입니다. 다른 주소를 입력해주세요."),
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
  }, [form.desiredSlug, hasSelectableTemplate]);

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
      ...(isDisplayBusinessOnly ? { buyerType: "business" as BuyerType } : {}),
      [key]: key === "desiredSlug" ? normalizeMenuAddressInput(String(value)) : key === "businessNumber" ? formatBusinessNumber(String(value)) : value,
      ...(isDisplayBusinessOnly && key === "buyerType" ? { buyerType: "business" as BuyerType } : {}),
    }));

    if (["businessName", "representativeName", "businessNumber", "businessOpeningDate"].includes(String(key))) {
      setBusinessVerificationState({
        type: "idle",
        message: "사업자등록번호, 대표자명, 개업일자, 상호명을 입력한 뒤 확인합니다.",
      });
    }
  }

  function selectBasicProduct(product: BasicPaymentProduct) {
    setSelectedBasicProductKey(product.product_key);
    setUiState({ type: "idle", message: null });
    setForm((current) => ({
      ...current,
      buyerType: product.requires_business_verification ? "business" : "individual",
    }));
    setBusinessVerificationState({
      type: "idle",
      message: product.requires_business_verification
        ? "사업자 월/연 결제는 국세청 사업자 인증 성공 후 자동결제를 진행합니다."
        : "개인 체험은 사업자 인증 없이 1개월 동안 사용할 수 있습니다.",
    });
  }

  function selectDisplayProduct(product: DisplayPaymentProduct) {
    setSelectedDisplayProductKey(product.product_key);
    setUiState({ type: "idle", message: null });
    setForm((current) => ({
      ...current,
      buyerType: "business",
    }));
    setBusinessVerificationState({
      type: "idle",
      message: product.billing_cycle === "yearly"
        ? "디스플레이 연결제는 사업자 인증 성공 후 빌링키 연 자동결제를 진행합니다."
        : "디스플레이 월결제는 사업자 인증 성공 후 빌링키 월 자동결제를 진행합니다.",
    });
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

      const nextTemplate = getTemplatesByMenuGroup(serviceTemplates, "recommended", value)[0];
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

  function toggleAllAgreements(checked: boolean) {
    setAgreements({
      terms: checked,
      privacy: checked,
      contentPolicy: checked,
      marketing: checked,
    });
  }

  async function handleBusinessVerificationCheck() {
    if (businessNameError || representativeNameError || businessNumberError || businessOpeningDateError || businessPhoneError) {
      setBusinessVerificationState({
        type: "failed",
        message: businessNameError ?? representativeNameError ?? businessNumberError ?? businessOpeningDateError ?? businessPhoneError ?? "사업자 정보를 다시 확인해주세요.",
      });
      return;
    }

    setBusinessVerificationState({
      type: "checking",
      message: "사업자 정보를 확인하고 있습니다.",
    });

    try {
      const response = await fetch("/api/business/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName: form.businessName,
          representativeName: form.representativeName,
          businessRegistrationNumber: form.businessNumber,
          openingDate: form.businessOpeningDate,
          phone: form.businessPhone,
        }),
      });
      const result = (await response.json()) as BusinessVerificationResponse;

      if (!response.ok || !result.ok || !result.verified) {
        setBusinessVerificationState({
          type: "failed",
          message: result.message ?? "입력한 사업자 정보가 국세청 정보와 일치하지 않습니다.",
        });
        return;
      }

      setBusinessVerificationState({
        type: "verified",
        message: result.message ?? "사업자 인증이 완료되었습니다.",
        result,
      });
    } catch {
      setBusinessVerificationState({
        type: "failed",
        message: "사업자 정보 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      });
    }
  }

  async function completePayment(paymentId: string, orderPayload: DraftMenuOrderPayload = payload) {
    const response = await fetch("/api/payment/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentId,
        order: orderPayload,
      }),
    });
    const result = (await response.json()) as PaymentCompleteResponse;

    if (!response.ok || !result.ok) {
      throw new Error(getPaymentCompleteErrorMessage(result));
    }

    clearPendingPaymentCompletion();
    setPendingPaymentCompletion(null);
    router.push(`/success?${result.menuSiteId ? `menuSiteId=${encodeURIComponent(result.menuSiteId)}` : `slug=${encodeURIComponent(result.slug ?? payload.desiredSlug)}`}`);
  }

  async function retryApprovedPaymentCompletion() {
    const paymentId = normalizeRecoverablePaymentId(recoveryPaymentIdInput || pendingPaymentCompletion?.paymentId || "");
    const subscriptionId = recoverySubscriptionIdInput.trim();

    if (!paymentId) {
      setUiState({ type: "error", message: "후처리할 paymentId를 입력해주세요." });
      return;
    }

    if (isSubscriptionProduct) {
      if (!hasVerifiedBusinessProfile || businessVerificationState.type !== "verified") {
        setUiState({ type: "error", message: "구독 결제 후처리 복구는 사업자 인증 완료 후 진행할 수 있습니다." });
        return;
      }

      if (!subscriptionId) {
        setUiState({ type: "error", message: "후처리할 실패 구독 기록 ID를 입력해주세요." });
        return;
      }

      if (!isFormReady) {
        setUiState({
          type: "error",
          message: "현재 신청 정보를 기준으로 재처리해야 합니다. 필수 신청 정보를 먼저 확인해주세요.",
        });
        return;
      }

      const isOrderAccepted = await verifyOrderBeforePayment();
      if (!isOrderAccepted) {
        return;
      }

      setUiState({ type: "loading", message: "새 결제창 없이 승인된 월결제의 생성 처리만 다시 진행하고 있습니다." });

      try {
        const response = await fetch("/api/business-subscriptions/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "new",
            businessProfileId: businessVerificationState.result.businessProfileId,
            productKey: activeProduct.product_key,
            billingCycle: activeProduct.billing_cycle,
            recoverPaymentId: paymentId,
            recoverSubscriptionId: subscriptionId,
            order: payload,
          }),
        });
        const result = (await response.json()) as BusinessSubscriptionResponse;

        if (!response.ok || !result.ok) {
          throw new Error(getBusinessSubscriptionErrorMessage(result));
        }

        router.push(`/success?${result.menuSiteId ? `menuSiteId=${encodeURIComponent(result.menuSiteId)}` : `slug=${encodeURIComponent(result.slug ?? payload.desiredSlug)}`}`);
      } catch (error) {
        setUiState({
          type: "error",
          message: error instanceof Error ? error.message : "승인 월결제 후처리 중 알 수 없는 오류가 발생했습니다.",
        });
      }

      return;
    }

    const storedOrder = pendingPaymentCompletion?.paymentId === paymentId ? pendingPaymentCompletion.order : null;

    if (!storedOrder && !isFormReady) {
      setUiState({
        type: "error",
        message: "저장된 주문 정보가 없어서 현재 신청 정보를 기준으로 재처리해야 합니다. 필수 신청 정보를 먼저 확인해주세요.",
      });
      return;
    }

    setUiState({ type: "loading", message: "새 결제창 없이 승인된 결제의 생성 처리만 다시 진행하고 있습니다." });

    try {
      await completePayment(paymentId, storedOrder ?? payload);
    } catch (error) {
      setUiState({
        type: "error",
        message: error instanceof Error ? error.message : "승인 결제 후처리 중 알 수 없는 오류가 발생했습니다.",
      });
    }
  }

  function getBillingKeyFromIssueResponse(response: unknown) {
    const billingKeyResponse = response as BillingKeyIssueResponse | null | undefined;
    return billingKeyResponse?.billingKeyInfo?.billingKey ?? billingKeyResponse?.billingKey ?? "";
  }

  function getBusinessSubscriptionErrorMessage(result: BusinessSubscriptionResponse) {
    const baseMessage = result.message ?? "사업자 자동결제 첫 결제 처리에 실패했습니다.";

    if (process.env.NODE_ENV === "production") {
      return baseMessage;
    }

    const safeDebug = result.safeDebug ?? result.debug;
    const details = [
      result.step ? `step: ${result.step}` : null,
      result.debugCode ? `debugCode: ${result.debugCode}` : null,
      typeof safeDebug?.portoneStatus === "number" ? `portoneStatus: ${safeDebug.portoneStatus}` : null,
      safeDebug?.portoneCode ? `portoneCode: ${safeDebug.portoneCode}` : null,
      safeDebug?.portoneMessage ? `portoneMessage: ${safeDebug.portoneMessage}` : null,
    ].filter(Boolean);

    return details.length > 0 ? `${baseMessage}\n${details.join("\n")}` : baseMessage;
  }

  function getPaymentCompleteErrorMessage(result: PaymentCompleteResponse) {
    const message = result.message ?? "";

    if (
      message.includes("사용할 수 없는 템플릿") ||
      message.includes("메뉴판 생성") ||
      message.includes("신청 정보를 생성")
    ) {
      return "결제는 승인되었지만 메뉴판 생성 처리에 실패했습니다. 재결제하지 말고 고객지원으로 문의해주세요.";
    }

    if (message.includes("빌링키") || message.includes("자동결제")) {
      return "결제 완료 처리에 실패했습니다. 잠시 후 다시 시도해주세요.";
    }

    return message || "결제 검증 또는 메뉴판 생성에 실패했습니다.";
  }

  async function verifySlugBeforePayment() {
    const slug = payload.desiredSlug;

    if (!slug || getMenuAddressError(slug)) {
      setSlugState({
        slug,
        type: "unavailable",
        message: menuAddressError ?? "메뉴판 주소 형식이 올바르지 않습니다.",
      });
      setUiState({ type: "error", message: "공개 메뉴판 주소를 다시 확인해주세요." });
      return false;
    }

    setSlugState({ slug, type: "checking", message: "결제 전 메뉴판 주소를 다시 확인하고 있습니다." });

    try {
      const response = await fetch(`/api/menu-sites/slug-availability?slug=${encodeURIComponent(slug)}`, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });
      const result = await readSlugAvailabilityResponse(response);
      const message = result.available
        ? result.message ?? "사용 가능한 주소입니다."
        : "방금 다른 고객이 이 주소를 사용했습니다. 다른 공개 주소를 입력해주세요.";

      if (!response.ok || !result.available) {
        setSlugState({ slug, type: "unavailable", message });
        setUiState({ type: "error", message });
        return false;
      }

      setSlugState({ slug, type: "available", message });
      return true;
    } catch {
      const message = "주소 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      setSlugState({ slug, type: "error", message });
      setUiState({ type: "error", message });
      return false;
    }
  }

  async function verifyPersonalTrialEligibilityBeforePayment() {
    if (payload.product_key !== personalTrialBasicProduct.product_key) {
      return true;
    }

    setUiState({ type: "loading", message: "개인 체험 이용 가능 여부를 확인하고 있습니다." });

    try {
      const response = await fetch("/api/orders/personal-trial-eligibility", {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });
      const result = (await response.json()) as PersonalTrialEligibilityResponse;

      if (!response.ok || !result.eligible) {
        setUiState({
          type: "error",
          message: result.message ?? PERSONAL_TRIAL_LIMIT_MESSAGE,
        });
        return false;
      }

      return true;
    } catch {
      setUiState({
        type: "error",
        message: "개인 체험 이용 가능 여부를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
      });
      return false;
    }
  }

  async function verifyOrderBeforePayment() {
    setUiState({ type: "loading", message: "결제 전 상품과 템플릿 조합을 확인하고 있습니다." });

    try {
      const response = await fetch("/api/payment/preflight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order: payload,
        }),
      });
      const result = (await response.json()) as PaymentPreflightResponse;

      if (!response.ok || !result.ok) {
        setUiState({
          type: "error",
          message: result.message ?? "결제 전 검증에 실패했습니다. 신청 정보를 다시 확인해주세요.",
        });
        return false;
      }

      return true;
    } catch {
      setUiState({
        type: "error",
        message: "결제 전 검증 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      });
      return false;
    }
  }

  async function handlePayment() {
    setUiState({ type: "idle", message: null });

    if (process.env.NODE_ENV !== "production") {
      console.info("[apply:submit]", {
        productKey: activeProduct.product_key,
        paymentType: activeProduct.payment_type,
        billingCycle: activeProduct.billing_cycle,
        isSubscriptionProduct,
        route: isSubscriptionProduct ? "/api/business-subscriptions/start" : "/api/payment/complete",
      });
    }

    if (isSubscriptionProduct) {
      if (!hasVerifiedBusinessProfile || businessVerificationState.type !== "verified") {
        setUiState({
          type: "error",
          message: "사업자 월/연 결제는 사업자 인증 완료 후 진행할 수 있습니다.",
        });
        return;
      }

      if (!isFormReady || isLoading) {
        return;
      }

      const isOrderAccepted = await verifyOrderBeforePayment();
      if (!isOrderAccepted) {
        return;
      }

      const canUseDisplayCheckoutQaMock =
        isScreenService && displayCheckoutQaEnabled && isDevelopment && mockEnabled;

      if (!storeId || !billingChannelKey) {
        if (canUseDisplayCheckoutQaMock) {
          setUiState({ type: "loading", message: "개발 환경 mock 빌링키로 Display 결제 QA 흐름을 확인하고 있습니다." });

          try {
            const response = await fetch("/api/business-subscriptions/start", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                mode: "new",
                billingKey: createMockDisplayBillingKey(),
                businessProfileId: businessVerificationState.result.businessProfileId,
                productKey: activeProduct.product_key,
                billingCycle: activeProduct.billing_cycle,
                order: payload,
              }),
            });
            const result = (await response.json()) as BusinessSubscriptionResponse;

            if (!response.ok || !result.ok) {
              throw new Error(getBusinessSubscriptionErrorMessage(result));
            }

            router.push(`/success?${result.menuSiteId ? `menuSiteId=${encodeURIComponent(result.menuSiteId)}` : `slug=${encodeURIComponent(result.slug ?? payload.desiredSlug)}`}`);
          } catch (error) {
            setUiState({
              type: "error",
              message: error instanceof Error ? error.message : "Display mock 정기결제 처리 중 알 수 없는 오류가 발생했습니다.",
            });
          }
          return;
        }

        setUiState({
          type: "error",
          message: "사업자 정기결제용 PortOne 빌링키 채널 환경변수가 필요합니다. NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY 설정을 확인해주세요.",
        });
        return;
      }

      setUiState({ type: "loading", message: "PortOne 빌링키 발급창을 준비하고 있습니다." });

      try {
        const issueResponse = await PortOne.requestIssueBillingKey({
          storeId,
          channelKey: billingChannelKey,
          billingKeyMethod: "CARD",
          customer: {
            id: userId,
            email: payload.buyerEmail,
            phoneNumber: payload.buyerPhone,
            name: {
              full: payload.buyerName,
            },
          },
          customData: {
            product_key: activeProduct.product_key,
            plan_type: activeProduct.plan_type,
            billing_cycle: activeProduct.billing_cycle,
            billing_channel: "subscription",
            source: isScreenService ? "apply_display" : "apply_basic",
            terms_accepted: agreements.terms,
            privacy_accepted: agreements.privacy,
            content_policy_accepted: agreements.contentPolicy,
            marketing_accepted: agreements.marketing,
          },
        } as unknown as Parameters<typeof PortOne.requestIssueBillingKey>[0]);
        const issueResult = issueResponse as BillingKeyIssueResponse | null | undefined;

        if (!issueResponse || issueResult?.code) {
          throw new Error(issueResult?.message ?? "빌링키 발급이 취소되었거나 실패했습니다.");
        }

        const billingKey = getBillingKeyFromIssueResponse(issueResponse);

        if (!billingKey) {
          throw new Error("빌링키 발급 결과를 확인하지 못했습니다.");
        }

        setUiState({ type: "loading", message: "빌링키로 첫 결제를 요청하고 있습니다." });

        const response = await fetch("/api/business-subscriptions/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "new",
            billingKey,
            businessProfileId: businessVerificationState.result.businessProfileId,
            productKey: activeProduct.product_key,
            billingCycle: activeProduct.billing_cycle,
            order: payload,
          }),
        });
        const result = (await response.json()) as BusinessSubscriptionResponse;

        if (!response.ok || !result.ok) {
          throw new Error(getBusinessSubscriptionErrorMessage(result));
        }

        router.push(`/success?${result.menuSiteId ? `menuSiteId=${encodeURIComponent(result.menuSiteId)}` : `slug=${encodeURIComponent(result.slug ?? payload.desiredSlug)}`}`);
      } catch (error) {
        setUiState({
          type: "error",
          message: error instanceof Error ? error.message : "사업자 자동결제 처리 중 알 수 없는 오류가 발생했습니다.",
        });
      }
      return;
    }

    if (!isFormReady || isLoading) {
      return;
    }

    if (activeProductRequiresBusinessVerification && (!hasVerifiedBusinessProfile || businessVerificationState.type !== "verified")) {
      setUiState({
        type: "error",
        message: "사업자 인증 완료 후 결제를 진행할 수 있습니다.",
      });
      return;
    }

    if (!hasSelectableTemplate || !payload.template_key) {
      setUiState({ type: "error", message: templateSelectionError ?? "선택 가능한 템플릿이 없습니다." });
      return;
    }

    const isSlugStillAvailable = await verifySlugBeforePayment();
    if (!isSlugStillAvailable) {
      return;
    }

    const isPersonalTrialEligible = await verifyPersonalTrialEligibilityBeforePayment();
    if (!isPersonalTrialEligible) {
      return;
    }

    const isOrderAccepted = await verifyOrderBeforePayment();
    if (!isOrderAccepted) {
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
          plan_type: payload.plan_type,
          payment_type: payload.payment_type,
          billing_cycle: payload.billing_cycle,
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

      const pendingCompletion = {
        paymentId: payment.paymentId,
        order: payload,
        savedAt: Date.now(),
      } satisfies PendingPaymentCompletion;

      writePendingPaymentCompletion(pendingCompletion);
      setPendingPaymentCompletion(pendingCompletion);
      setRecoveryPaymentIdInput(payment.paymentId);
      setUiState({ type: "loading", message: "서버에서 결제를 검증하고 신청 정보를 생성하고 있습니다." });
      await completePayment(payment.paymentId, payload);
    } catch (error) {
      setUiState({
        type: "error",
        message: error instanceof Error ? error.message : "결제 처리 중 알 수 없는 오류가 발생했습니다.",
      });
    }
  }

  const activeAgreementLabels = activeProduct.product_key === personalTrialBasicProduct.product_key ? personalTrialAgreementLabels : agreementLabels;
  const activeAgreementDetails = activeProduct.product_key === personalTrialBasicProduct.product_key ? personalTrialAgreementDetails : agreementDetails;
  const allAgreementsChecked = Object.values(agreements).every(Boolean);
  const nextBillingLabel = activeProduct.billing_cycle === "monthly"
    ? "결제 완료일로부터 1개월 후"
    : activeProduct.billing_cycle === "yearly"
      ? "결제 완료일로부터 1년 후"
      : "-";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-6">
        {isMenuService && (
          <section className="order-3 rounded-3xl bg-white p-7 shadow-sm">
            <div className="mb-6">
              <h2 className="text-3xl font-bold tracking-tight">이용 방식 선택</h2>
              <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                개인 1개월 체험은 단건 결제로 바로 이용하고, 사업자 월/연 결제는 사업자 인증과 자동결제 구조로 이어집니다.
                메뉴링크 베이직 메뉴판을 생성하면 AI 크레딧 18개가 계정에 지급됩니다.
              </p>
              <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-amber-700">
                ※ 모든 금액은 부가세 포함가입니다. ※ 오픈할인은 공식 오픈일로부터 1년간 제공됩니다.
              </p>
              <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                체험 종료 후 30일 이내 사업자 플랜으로 전환하면 기존 메뉴판을 이어서 사용할 수 있습니다.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {basicProductCards.map(({ product, bullets, helperText }) => {
                const isSelected = selectedBasicProductKey === product.product_key;

                return (
                  <button
                    key={product.product_key}
                    type="button"
                    onClick={() => selectBasicProduct(product)}
                    className={`flex min-h-[260px] flex-col rounded-2xl border p-5 text-left transition ${
                      isSelected
                        ? "border-zinc-950 bg-zinc-950 text-white shadow-md"
                        : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="break-keep text-xl font-black tracking-tight">{product.label}</h3>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${isSelected ? "bg-[#F8E731] text-zinc-950" : "bg-zinc-100 text-zinc-500"}`}>
                        {isSelected ? "선택됨" : product.payment_type === "one_time" ? "단건" : product.billing_cycle === "yearly" ? "연 자동결제" : "자동결제"}
                      </span>
                    </div>
                    <div className="mt-5">
                      <p className={`text-xs font-bold line-through ${isSelected ? "text-white/35" : "text-zinc-400"}`}>
                        정가 {product.billing_cycle === "monthly" ? "월 " : product.billing_cycle === "yearly" ? "연 " : ""}
                        {formatKrw(product.regular_amount)}
                      </p>
                      <p className="mt-1 text-2xl font-black">
                        {product.product_key === personalTrialBasicProduct.product_key
                          ? `첫 달 체험가 ${formatKrw(product.amount)}`
                          : `${formatKrw(product.amount)} / ${product.billing_cycle === "monthly" ? "월" : "년"}`}
                      </p>
                      <p className={`mt-2 break-keep text-xs font-bold leading-relaxed ${isSelected ? "text-white/55" : "text-zinc-400"}`}>
                        {product.product_key === personalTrialBasicProduct.product_key
                          ? "정가 13,200원 · 오픈할인 50%"
                          : product.billing_cycle === "monthly"
                            ? "정가 13,200원 · 오픈할인 25%"
                            : "연 정가 158,400원 대비 약 40% 할인 · 오픈 월결제 12개월 대비 약 20% 할인"}
                      </p>
                    </div>
                    <ul className={`mt-5 space-y-1.5 text-sm font-bold leading-relaxed ${isSelected ? "text-white/75" : "text-zinc-500"}`}>
                      {bullets.map((bullet) => (
                        <li key={bullet}>• {bullet}</li>
                      ))}
                    </ul>
                    <p className={`mt-auto pt-5 break-keep text-xs font-bold leading-relaxed ${isSelected ? "text-white/50" : "text-zinc-400"}`}>
                      {helperText}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {isScreenService && (
          <section className="order-2 rounded-3xl bg-white p-7 shadow-sm">
            <div className="mb-6">
              <h2 className="text-3xl font-bold tracking-tight">디스플레이 용도 / 설치 정보</h2>
              <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                매장 TV나 모니터에 띄울 화면의 목적을 알려주세요. 입력값은 초기 세팅 안내와 추후 디스플레이 전용 템플릿 분리에 활용됩니다.
              </p>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">디스플레이 용도</span>
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
          </section>
        )}

        {isScreenService && displayCheckoutQaEnabled && (
          <section className="order-3 rounded-3xl bg-white p-7 shadow-sm">
            <div className="mb-6">
              <h2 className="text-3xl font-bold tracking-tight">이용 방식 선택</h2>
              <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                월 결제와 연 결제 모두 빌링키 정기결제로 진행합니다. 연결제는 매년 자동결제되는 연 정기결제 상품입니다.
              </p>
              <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-amber-700">
                ※ 모든 금액은 부가세 포함가입니다. Display QA는 개발 환경에서만 열립니다.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {displayProductCards.map(({ product, bullets, helperText }) => {
                const isSelected = selectedDisplayProductKey === product.product_key;

                return (
                  <button
                    key={product.product_key}
                    type="button"
                    onClick={() => selectDisplayProduct(product)}
                    className={`flex min-h-[230px] flex-col rounded-2xl border p-5 text-left transition ${
                      isSelected
                        ? "border-zinc-950 bg-zinc-950 text-white shadow-md"
                        : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="break-keep text-xl font-black tracking-tight">{product.label}</h3>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${isSelected ? "bg-[#F8E731] text-zinc-950" : "bg-zinc-100 text-zinc-500"}`}>
                        {isSelected ? "선택됨" : product.billing_cycle === "yearly" ? "연 자동결제" : "월 자동결제"}
                      </span>
                    </div>
                    <div className="mt-5">
                      <p className={`text-xs font-bold line-through ${isSelected ? "text-white/35" : "text-zinc-400"}`}>
                        정가 {product.billing_cycle === "monthly" ? "월 " : "연 "}
                        {formatKrw(product.regular_amount)}
                      </p>
                      <p className="mt-1 text-2xl font-black">
                        {formatKrw(product.amount)} / {product.billing_cycle === "monthly" ? "월" : "년"}
                      </p>
                      <p className={`mt-2 break-keep text-xs font-bold leading-relaxed ${isSelected ? "text-white/55" : "text-zinc-400"}`}>
                        {product.billing_cycle === "yearly" ? "연 자동결제 · 빌링키 필요" : "매월 자동결제 · 빌링키 필요"}
                      </p>
                    </div>
                    <ul className={`mt-5 space-y-1.5 text-sm font-bold leading-relaxed ${isSelected ? "text-white/75" : "text-zinc-500"}`}>
                      {bullets.map((bullet) => (
                        <li key={bullet}>• {bullet}</li>
                      ))}
                    </ul>
                    <p className={`mt-auto pt-5 break-keep text-xs font-bold leading-relaxed ${isSelected ? "text-white/50" : "text-zinc-400"}`}>
                      {helperText}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="order-2 rounded-3xl bg-white p-7 shadow-sm">
          <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight">
              {isScreenService ? "디스플레이 템플릿 카테고리 / 디스플레이 템플릿 선택" : "템플릿 선택"}
            </h2>
            {isMenuService && (
              <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                업종에 맞는 템플릿을 선택하세요. 선택한 템플릿은 결제 후 생성되는 메뉴판에 적용됩니다.
              </p>
            )}
            {isScreenService && (
              <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                디스플레이 전용 카테고리를 고른 뒤 TV/모니터 화면에 맞는 메뉴보드 템플릿을 선택해주세요. 현재는 구현된 템플릿을 기반으로 연결됩니다.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {templateTypeOptions.map((option) => (
                <span key={option.type} className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-black text-zinc-600">
                  {option.label}
                </span>
              ))}
            </div>
            {isScreenService && (
              <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                일정표형 템플릿은 현재 메뉴링크 베이직에서만 지원됩니다. 디스플레이용 일정표 템플릿은 추후 검토 예정입니다.
              </p>
            )}
            <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
              현재 선택 화면은 {getTemplateServiceLabel(templateServiceType)}에서 지원하는 템플릿만 보여줍니다.
            </p>
          </div>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {isScreenService && displayCheckoutQaEnabled
              ? Array.from(new Set(serviceTemplates.map((template) => template.template_category))).map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      const nextTemplate = serviceTemplates.find((template) => template.template_category === category);
                      setSelectedCategory(category);
                      if (nextTemplate) {
                        setForm((current) => ({
                          ...current,
                          template_category: category,
                          template_key: nextTemplate.key,
                        }));
                      }
                    }}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                      selectedCategory === category
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    {getTemplateCategoryLabel(category)}
                  </button>
                ))
              : isScreenService
              ? screenTemplateCategories.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => {
                      const nextTemplate = serviceTemplates.find((template) => template.template_category === filter.templateCategory);
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
                      const nextTemplates = getTemplatesByMenuGroup(serviceTemplates, filter.key, form.restaurantType);
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
                        const nextTemplate = serviceTemplates.find((template) => template.template_category === filter.key);
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
              const templateTypeLabel = template.templateTypeLabel ?? getTemplateTypeLabelByTemplateKey(template.key);

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
                        {isScreenService && !displayCheckoutQaEnabled ? selectedScreenTemplateCategory.label : getTemplateCategoryLabel(template.template_category)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isSelected ? "bg-[#F8E731] text-zinc-950" : "bg-zinc-100 text-zinc-500"}`}>
                        {isSelected ? "선택됨" : template.badge}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${isSelected ? "bg-white/10 text-white/80" : "bg-[#F8E731] text-zinc-950"}`}>
                        {templateTypeLabel}
                      </span>
                    </div>
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
              <p className="text-base font-black text-zinc-800">
                {isScreenService && serviceTemplates.length === 0
                  ? "현재 선택 가능한 메뉴링크 디스플레이 템플릿이 준비 중입니다."
                  : "해당 카테고리 템플릿은 준비 중입니다."}
              </p>
              <p className="mt-2 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                {isScreenService && serviceTemplates.length === 0
                  ? "메뉴링크 디스플레이 상품은 템플릿 준비 후 신청할 수 있습니다."
                  : "현재 선택 가능한 템플릿은 추천 또는 전체 탭에서 확인할 수 있습니다."}
              </p>
            </div>
          )}
        </section>

        <section className="order-1 rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="mb-6 text-3xl font-bold tracking-tight">{isScreenService || isMenuService ? "기본 신청 정보" : "메뉴판 기본 정보"}</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label={isScreenService ? "디스플레이 이름 또는 메뉴보드 이름" : "메뉴판 관리용 이름"}
              value={form.menuName}
              onChange={(value) => updateField("menuName", value)}
              required
              helperText={isScreenService ? "마이페이지에서 구분할 수 있는 디스플레이/메뉴보드 이름을 입력해주세요." : "관리자가 구분할 수 있는 이름을 입력해주세요."}
              errorText={form.menuName.trim() ? menuNameError : null}
              successText="입력 완료"
            />
            <div>
              <Field
                label={isScreenService ? "희망 공개 주소" : "희망 메뉴판 주소"}
                value={form.desiredSlug}
                onChange={(value) => updateField("desiredSlug", value)}
                required
                maxLength={40}
                placeholder="예: gangnam-cafe"
                helperText={visibleSlugState.type === "checking" ? visibleSlugState.message : MENU_ADDRESS_HELPER_TEXT}
                helperIcon={visibleSlugState.type === "checking" ? <LoadingSpinner className="h-3.5 w-3.5" /> : undefined}
                errorText={visibleSlugState.type === "unavailable" || visibleSlugState.type === "error" ? visibleSlugState.message : null}
                successText={visibleSlugState.type === "available" ? visibleSlugState.message : undefined}
              />
              <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                생성될 주소: {isSlugValid ? getPublicMenuUrl(payload.desiredSlug) : getPublicMenuUrl("your-menu")}
              </p>
              <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-amber-700">
                주소 확인 후 결제를 완료하면 이 공개 주소는 고객 화면에서 변경할 수 없습니다.
              </p>
            </div>
            <Field label="매장명" value={form.restaurantName} onChange={(value) => updateField("restaurantName", value)} required helperText={isScreenService ? "디스플레이 메뉴보드에 표시될 매장명을 입력해주세요." : "공개 메뉴판에 표시될 매장명을 입력해주세요."} errorText={form.restaurantName.trim() ? restaurantNameError : null} successText="입력 완료" />
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
            <Field
              label="매장 주소"
              value={form.restaurantAddress}
              onChange={(value) => updateField("restaurantAddress", value)}
              maxLength={MENU_FIELD_LIMITS.menuSites.restaurantAddress}
              helperText={isScreenService ? "선택 입력입니다. 설치 매장 또는 화면 운영 매장 주소로 사용할 수 있습니다." : "선택 입력입니다. 템플릿에 따라 공개 메뉴판에 표시될 수 있습니다."}
              errorText={restaurantAddressError}
              successText={form.restaurantAddress.trim() ? "입력 완료" : undefined}
              className="md:col-span-2"
            />
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
          <section className="order-3 rounded-3xl bg-white p-7 shadow-sm">
            <h2 className="text-3xl font-bold tracking-tight">오더 도입 정보</h2>
            <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
              입력해주신 정보는 메뉴링크 오더 1.0 도입 준비와 초기 세팅 안내에 활용됩니다.
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

        <section className="order-4 rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="mb-6 text-3xl font-bold tracking-tight">구매자 및 담당자 정보</h2>
          <div className="mb-6 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
            <p className="break-keep text-sm font-bold leading-relaxed text-zinc-600">
              {isDisplayBusinessOnly
                ? "메뉴링크 디스플레이는 사업자 전용 상품입니다. 사업자 정보를 확인한 뒤 정기 결제를 진행할 수 있습니다."
                : isScreenService
                  ? "메뉴링크 디스플레이는 전용 템플릿 준비 전까지 결제를 진행하지 않습니다."
                : activeProductRequiresBusinessVerification
                  ? "사업자 월/연 결제는 사업자 인증 후 자동결제로 이용합니다. 현재 화면은 인증 입력 구조와 자동결제 연결 전 상태를 명확히 구분합니다."
                  : "개인 체험은 사업자 인증 없이 1개월 동안 사용하는 단건 결제 상품입니다. 자동결제 없이 1회 결제로 이용합니다."}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">구매자 유형 *</span>
              {isDisplayBusinessOnly ? (
                <div className="mt-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-black text-emerald-900">사업자 전용</p>
                  <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-emerald-700">
                    디스플레이 메뉴보드는 사업자 정보 확인 후 결제할 수 있습니다. 개인 구매자로는 신청할 수 없습니다.
                  </p>
                </div>
              ) : isMenuService ? (
                <div className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-black text-zinc-700">
                  {activeProductRequiresBusinessVerification ? "사업자 정식 이용" : "개인 체험 이용"}
                </div>
              ) : (
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
              )}
              {payload.buyerType === "individual" && currentPlanAllowsIndividual && !currentPlanRequiresBusinessInfo && (
                <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                  {isScreenService ? "메뉴링크 디스플레이는 현재 준비 중입니다." : "개인 체험은 계정당 1회만 이용할 수 있습니다."}
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
            {isBusinessBuyer && (
              <>
                <Field label="상호명" value={form.businessName} onChange={(value) => updateField("businessName", value)} required maxLength={50} placeholder="메뉴링크카페" helperText="사업자 증빙에 사용할 상호명을 입력해주세요." errorText={form.businessName.trim() ? businessNameError : null} successText="입력 완료" />
                <Field label="대표자명" value={form.representativeName} onChange={(value) => updateField("representativeName", value)} required maxLength={30} placeholder="홍길동" helperText="사업자등록증 기준 대표자명을 입력해주세요." errorText={form.representativeName.trim() ? representativeNameError : null} successText="입력 완료" />
                <Field
                  label="사업자등록번호"
                  value={form.businessNumber}
                  onChange={(value) => updateField("businessNumber", value)}
                  required
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="123-45-67890"
                  helperText="숫자 10자리를 입력하면 XXX-XX-XXXXX 형식으로 표시됩니다."
                  errorText={form.businessNumber.trim() ? businessNumberError : null}
                  successText={form.businessNumber.trim() ? "사업자등록번호 형식이 올바릅니다." : undefined}
                />
                <Field
                  label="개업일자"
                  value={form.businessOpeningDate}
                  onChange={(value) => updateField("businessOpeningDate", value)}
                  required
                  placeholder="2024-01-15 또는 20240115"
                  helperText="국세청 진위확인에 사용할 개업일자입니다."
                  errorText={form.businessOpeningDate.trim() ? businessOpeningDateError : null}
                  successText="입력 완료"
                />
                <PhoneInput
                  label="사업장 연락처"
                  value={form.businessPhone}
                  onChange={(value) => updateField("businessPhone", value)}
                  errorText={form.businessPhone.trim() ? businessPhoneError : null}
                />
                <div className="md:col-span-2 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-800">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black text-amber-900">사업자 인증</p>
                      <p className="mt-1 break-keep">
                        사업자 월/연 결제는 사업자 정보 확인 후 이용할 수 있습니다. 자동결제는 아직 준비 중이며, 이번 단계에서는 인증만 진행됩니다.
                      </p>
                      <p className={`mt-2 break-keep ${businessVerificationState.type === "failed" ? "text-red-700" : businessVerificationState.type === "verified" ? "text-emerald-700" : "text-amber-800"}`}>
                        {businessVerificationState.message}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleBusinessVerificationCheck}
                      disabled={businessVerificationState.type === "checking"}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-amber-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {businessVerificationState.type === "checking" ? <LoadingSpinner className="h-3.5 w-3.5" /> : null}
                      {businessVerificationState.type === "checking" ? "확인 중..." : "사업자 정보 확인"}
                    </button>
                  </div>
                  {businessVerificationState.type === "verified" && (
                    <div className="mt-4 grid gap-2 rounded-2xl border border-emerald-100 bg-white p-4 text-xs font-bold text-emerald-800 md:grid-cols-2">
                      <BusinessVerificationSummaryRow label="상호명" value={businessVerificationState.result.businessName || form.businessName || "-"} />
                      <BusinessVerificationSummaryRow label="대표자명" value={businessVerificationState.result.representativeName || form.representativeName || "-"} />
                      <BusinessVerificationSummaryRow label="사업자등록번호" value={businessVerificationState.result.businessRegistrationNumberMasked ?? "-"} />
                      <BusinessVerificationSummaryRow label="사업자 상태" value={businessVerificationState.result.businessStatus ?? "-"} />
                      <BusinessVerificationSummaryRow label="과세 유형" value={businessVerificationState.result.taxType ?? "-"} />
                      <BusinessVerificationSummaryRow label="인증일" value={businessVerificationState.result.verifiedAt ? new Date(businessVerificationState.result.verifiedAt).toLocaleDateString("ko-KR") : "-"} />
                    </div>
                  )}
                  <p className="mt-3 break-keep text-xs">
                    사업자 명의로 매입세액 공제를 받으시려면 결제창에서 지출증빙용을 선택하고 사업자번호를 입력해 주세요.
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-bold tracking-tight">주문 요약</h2>
          <dl className="mt-6 space-y-4 text-sm font-medium">
            <SummaryRow label="상품명" value={activeProduct.name} />
            {isMenuService && (
              <SummaryRow
                label="이용 방식"
                value={
                  activeProduct.billing_cycle === "monthly"
                    ? "사업자 월 자동결제"
                    : activeProduct.billing_cycle === "yearly"
                      ? activeProduct.is_subscription ? "사업자 연 자동결제" : "사업자 연 결제"
                      : "개인 1개월 단건 결제"
                }
              />
            )}
            {isScreenService && displayCheckoutQaEnabled && (
              <SummaryRow
                label="이용 방식"
                value={activeProduct.billing_cycle === "yearly" ? "디스플레이 연 자동결제" : "디스플레이 월 자동결제"}
              />
            )}
            {(isMenuService || (isScreenService && displayCheckoutQaEnabled)) && <SummaryRow label="자동결제" value={activeProduct.is_subscription ? "필요" : "없음"} />}
            {isScreenService && <SummaryRow label="디스플레이 용도" value={form.screenPurpose || "-"} />}
            {isScreenService && <SummaryRow label="디스플레이 카테고리" value={selectedScreenTemplateCategory.label} />}
            {isMenuService && <SummaryRow label="템플릿 그룹" value={getMenuTemplateGroupLabel(selectedMenuTemplateGroup)} />}
            <SummaryRow label="선택 템플릿" value={selectedTemplate ? `${selectedTemplate.name} (${selectedTemplate.key})` : "-"} />
            <SummaryRow label={isScreenService ? "메뉴보드 이름" : "메뉴판 이름"} value={payload.menuName || "-"} />
            <SummaryRow label="공개 메뉴판 주소" value={payload.desiredSlug ? getPublicMenuUrl(payload.desiredSlug) : "-"} />
            <SummaryRow label="구매자 유형" value={payload.buyerType === "business" ? "사업자" : "개인"} />
            {(isMenuService || (isScreenService && displayCheckoutQaEnabled)) && activeProduct.regular_amount && (
              <SummaryRow
                label="정가"
                value={`${activeProduct.billing_cycle === "monthly" ? "월 " : activeProduct.billing_cycle === "yearly" ? "연 " : ""}${formatKrw(activeProduct.regular_amount)}`}
              />
            )}
            {(isMenuService || (isScreenService && displayCheckoutQaEnabled)) && activeProduct.regular_amount ? (
              <SummaryRow label="오픈 할인 적용" value={`${activeProduct.discount_rate ?? 0}% 할인`} />
            ) : null}
            {isMenuService ? <SummaryRow label="오픈 할인 적용 기간" value={openDiscountPolicy.durationLabel} /> : null}
            <SummaryRow label={isMenuService ? "오늘 결제 금액" : "금액"} value={formatKrw(activeProduct.amount)} strong />
            {activeProduct.is_subscription ? <SummaryRow label="다음 결제 예정일" value={nextBillingLabel} /> : null}
            {activeProduct.is_subscription ? <SummaryRow label="다음 결제 예정 금액" value={formatKrw(activeProduct.amount)} /> : null}
          </dl>
          <p className="mt-5 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
            {isMenuService
              ? activeProduct.is_subscription
                ? `${openDiscountPolicy.note} VAT 포함 금액입니다. 사업자 인증과 PortOne 빌링키 자동결제 연결 후 결제를 진행합니다.`
                : "VAT 포함 금액입니다. 체험 종료 후 메뉴판은 비공개로 전환될 수 있으며, 30일 이내 사업자 플랜으로 전환하면 기존 메뉴판을 이어서 사용할 수 있습니다."
              : activeProduct.is_subscription
                ? "VAT 포함 금액입니다. 사업자 인증과 PortOne 빌링키 자동결제 연결 후 결제를 진행합니다."
                : "VAT 포함 금액입니다. 일반 결제 검증 후 메뉴판이 생성됩니다."}
          </p>
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="mb-5 text-2xl font-bold tracking-tight">약관 동의</h2>
          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-black leading-relaxed text-zinc-900">
              <input type="checkbox" checked={allAgreementsChecked} onChange={(event) => toggleAllAgreements(event.target.checked)} className="mt-1 h-4 w-4 accent-zinc-950" />
              <span>전체 동의</span>
            </label>
            {(Object.keys(agreementLabels) as AgreementKey[]).map((key) => (
              <div key={key} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <div className="flex items-start gap-3 text-sm font-bold leading-relaxed text-zinc-600">
                  <input type="checkbox" checked={agreements[key]} onChange={() => toggleAgreement(key)} className="mt-1 h-4 w-4 accent-zinc-950" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{activeAgreementLabels[key]}</span>
                      {key === "terms" ? <a href="/terms" target="_blank" className="text-xs font-black text-zinc-400 underline underline-offset-4 transition-colors hover:text-zinc-800">링크</a> : null}
                      {key === "privacy" ? <a href="/privacy" target="_blank" className="text-xs font-black text-zinc-400 underline underline-offset-4 transition-colors hover:text-zinc-800">링크</a> : null}
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

          {isSubscriptionProduct && !isBillingPortOneReady && (
            <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-700">
              사업자 월/연 정기결제는 PortOne V2 빌링키 발급을 지원하는 채널의 channelKey가 필요합니다.
              `NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY`를 설정해주세요.
            </div>
          )}

          {uiState.message && (
            <div className={`mt-6 whitespace-pre-line rounded-2xl border p-4 text-sm font-bold leading-relaxed ${getUiStateClassName(uiState.type)}`}>{uiState.message}</div>
          )}

          {canShowPaymentCompletionRecovery && (
            <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-bold leading-relaxed text-sky-800">
              <p>
                이미 승인된 Display {activeProduct.billing_cycle === "yearly" ? "연결제" : "월결제"} 결제가 있다면 새 결제창 없이 생성 처리만 다시 시도할 수 있습니다.
              </p>
              {pendingPaymentCompletion && (
                <p className="mt-2 text-xs text-sky-700">
                  마지막 승인 결제: {pendingPaymentCompletion.paymentId}
                </p>
              )}
              <label className="mt-3 block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-sky-500">paymentId</span>
                <input
                  type="text"
                  value={recoveryPaymentIdInput}
                  onChange={(event) => setRecoveryPaymentIdInput(event.target.value)}
                  placeholder="승인된 paymentId"
                  className="mt-2 w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-xs font-semibold text-zinc-900 outline-none transition focus:border-sky-600"
                />
              </label>
              {isSubscriptionProduct && (
                <label className="mt-3 block">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-sky-500">failed subscriptionId</span>
                  <input
                    type="text"
                    value={recoverySubscriptionIdInput}
                    onChange={(event) => setRecoverySubscriptionIdInput(event.target.value)}
                    placeholder="실패 구독 기록 ID"
                    className="mt-2 w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-xs font-semibold text-zinc-900 outline-none transition focus:border-sky-600"
                  />
                </label>
              )}
              <button
                type="button"
                onClick={retryApprovedPaymentCompletion}
                disabled={
                  isLoading ||
                  !normalizeRecoverablePaymentId(recoveryPaymentIdInput || pendingPaymentCompletion?.paymentId || "") ||
                  (isSubscriptionProduct && !recoverySubscriptionIdInput.trim())
                }
                className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-sky-950 px-4 py-3 text-xs font-black text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-sky-200"
              >
                결제창 없이 후처리만 재시도
              </button>
              <p className="mt-2 text-xs text-sky-700">
                {isSubscriptionProduct
                  ? "현재 신청 정보로 `/api/business-subscriptions/start`의 복구 모드만 호출합니다."
                  : "현재 신청 정보 또는 이 탭에 임시 저장된 주문 정보로 `/api/payment/complete`만 호출합니다."}
              </p>
            </div>
          )}

          {businessPaymentActionMessage && (
            <div className={`mt-6 rounded-2xl border p-4 text-sm font-bold leading-relaxed ${hasVerifiedBusinessProfile ? "border-emerald-100 bg-emerald-50 text-emerald-700" : businessVerificationState.type === "failed" ? "border-red-100 bg-red-50 text-red-700" : "border-amber-100 bg-amber-50 text-amber-800"}`}>
              {businessPaymentActionMessage}
            </div>
          )}

          <button
            type="button"
            onClick={handlePayment}
            disabled={paymentButtonDisabled}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {activeProduct.product_key === personalTrialBasicProduct.product_key && paymentButtonLabel.includes("신청") ? "동의하고 첫 달 체험 시작하기" : isFormReady && !isLoading ? "동의하고 메뉴판 생성하기" : paymentButtonLabel}
          </button>
        </section>
      </aside>

      {activeAgreement && (
        <TermsModal
          title={getAgreementModalTitle(activeAgreement)}
          details={activeAgreementDetails[activeAgreement]}
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
  helperIcon,
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
  helperIcon?: ReactNode;
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
      {message && (
        <p className={`mt-2 flex min-h-[18px] items-center gap-1.5 break-keep text-xs font-bold leading-relaxed ${messageClassName}`}>
          {helperIcon}
          <span>{message}</span>
        </p>
      )}
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

function BusinessVerificationSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-emerald-50 px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-500">{label}</p>
      <p className="mt-1 break-keep text-xs font-black text-emerald-900">{value}</p>
    </div>
  );
}
