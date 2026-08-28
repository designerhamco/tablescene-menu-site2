import {
  businessBasicMonthlyProduct,
  businessBasicMultiMonthlyProduct,
  businessBasicMultiYearlyProduct,
  businessBasicYearlyProduct,
  personalTrialBasicProduct,
  type BasicProductKey,
} from "@/lib/payments";

export type PublicBasicProduct = {
  slug: string;
  productKey: BasicProductKey;
  name: string;
  shortName: string;
  summary: string;
  price: number;
  regularPrice: number;
  billingLabel: string;
  servicePeriod: string;
  buyerRequirement: string;
  provision: string;
  cancellation: readonly string[];
};

export const publicBasicProducts: readonly PublicBasicProduct[] = [
  {
    slug: "basic-trial",
    productKey: personalTrialBasicProduct.product_key,
    name: personalTrialBasicProduct.name,
    shortName: "개인 1개월 체험",
    summary: "사업자 인증 없이 단일페이지 다이닝 메뉴판 1개를 1개월 동안 이용하는 1회 결제 상품입니다.",
    price: personalTrialBasicProduct.amount,
    regularPrice: personalTrialBasicProduct.regular_amount,
    billingLabel: "1회 결제",
    servicePeriod: "결제 완료일로부터 1개월",
    buyerRequirement: "개인 회원 또는 사업자 회원",
    provision: "결제 완료 즉시 메뉴판이 생성되고 편집 화면, 공개 URL과 QR 이용이 시작됩니다.",
    cancellation: [
      "디지털 서비스가 결제 즉시 제공되므로 제공 개시 후 단순 변심·착오 구매·미사용에 따른 청약철회 및 환불이 제한될 수 있습니다.",
      "중복 결제, 결제 오류, 회사 귀책 또는 관련 법령상 환불이 필요한 경우 고객지원 확인 후 취소·환불합니다.",
    ],
  },
  {
    slug: "dining-single-monthly",
    productKey: businessBasicMonthlyProduct.product_key,
    name: businessBasicMonthlyProduct.name,
    shortName: "단일페이지 월결제",
    summary: "사업자 인증 후 단일페이지 다이닝 메뉴판 1개를 매월 자동결제로 이용하는 정기구독 상품입니다.",
    price: businessBasicMonthlyProduct.amount,
    regularPrice: businessBasicMonthlyProduct.regular_amount,
    billingLabel: "매월 자동결제",
    servicePeriod: "결제일부터 1개월 단위로 자동 갱신",
    buyerRequirement: "국세청 사업자 상태 확인을 완료한 사업자 회원",
    provision: "최초 결제 완료 즉시 메뉴판이 생성되며, 갱신 결제 시 기존 메뉴판의 이용기간이 연장됩니다.",
    cancellation: [
      "언제든 구독 해지를 예약할 수 있으며 다음 결제일부터 자동결제가 중단됩니다. 이미 결제된 기간까지는 계속 이용할 수 있습니다.",
      "이미 시작된 월 이용기간은 원칙적으로 중도 환불되지 않습니다. 중복 결제, 결제 오류, 회사 귀책 또는 법령상 필요한 경우는 예외입니다.",
    ],
  },
  {
    slug: "dining-single-yearly",
    productKey: businessBasicYearlyProduct.product_key,
    name: businessBasicYearlyProduct.name,
    shortName: "단일페이지 연결제",
    summary: "사업자 인증 후 단일페이지 다이닝 메뉴판 1개를 연 자동결제로 이용하는 할인 정기구독 상품입니다.",
    price: businessBasicYearlyProduct.amount,
    regularPrice: businessBasicYearlyProduct.regular_amount,
    billingLabel: "매년 자동결제",
    servicePeriod: "결제일부터 1년 단위로 자동 갱신",
    buyerRequirement: "국세청 사업자 상태 확인을 완료한 사업자 회원",
    provision: "최초 결제 완료 즉시 메뉴판이 생성되며, 갱신 결제 시 기존 메뉴판의 이용기간이 연장됩니다.",
    cancellation: [
      "언제든 구독 해지를 예약할 수 있으며 다음 연간 결제일부터 자동결제가 중단됩니다. 이미 결제된 기간까지는 계속 이용할 수 있습니다.",
      "중도해지 환불 요청 시 사용 기간을 월결제 기준으로 재정산하고, 산출된 1차 환불 가능액에서 중도해지 수수료 10%가 공제될 수 있습니다.",
      "중복 결제, 결제 오류, 회사 귀책 또는 관련 법령상 환불이 필요한 경우는 예외입니다.",
    ],
  },
  {
    slug: "dining-multi-monthly",
    productKey: businessBasicMultiMonthlyProduct.product_key,
    name: businessBasicMultiMonthlyProduct.name,
    shortName: "멀티페이지 월결제",
    summary: "사업자 인증 후 멀티페이지 다이닝 메뉴판 1개를 매월 자동결제로 이용하는 정기구독 상품입니다.",
    price: businessBasicMultiMonthlyProduct.amount,
    regularPrice: businessBasicMultiMonthlyProduct.regular_amount,
    billingLabel: "매월 자동결제",
    servicePeriod: "결제일부터 1개월 단위로 자동 갱신",
    buyerRequirement: "국세청 사업자 상태 확인을 완료한 사업자 회원",
    provision: "최초 결제 완료 즉시 메뉴판이 생성되며, 갱신 결제 시 기존 메뉴판의 이용기간이 연장됩니다.",
    cancellation: [
      "언제든 구독 해지를 예약할 수 있으며 다음 결제일부터 자동결제가 중단됩니다. 이미 결제된 기간까지는 계속 이용할 수 있습니다.",
      "이미 시작된 월 이용기간은 원칙적으로 중도 환불되지 않습니다. 중복 결제, 결제 오류, 회사 귀책 또는 법령상 필요한 경우는 예외입니다.",
    ],
  },
  {
    slug: "dining-multi-yearly",
    productKey: businessBasicMultiYearlyProduct.product_key,
    name: businessBasicMultiYearlyProduct.name,
    shortName: "멀티페이지 연결제",
    summary: "사업자 인증 후 멀티페이지 다이닝 메뉴판 1개를 연 자동결제로 이용하는 할인 정기구독 상품입니다.",
    price: businessBasicMultiYearlyProduct.amount,
    regularPrice: businessBasicMultiYearlyProduct.regular_amount,
    billingLabel: "매년 자동결제",
    servicePeriod: "결제일부터 1년 단위로 자동 갱신",
    buyerRequirement: "국세청 사업자 상태 확인을 완료한 사업자 회원",
    provision: "최초 결제 완료 즉시 메뉴판이 생성되며, 갱신 결제 시 기존 메뉴판의 이용기간이 연장됩니다.",
    cancellation: [
      "언제든 구독 해지를 예약할 수 있으며 다음 연간 결제일부터 자동결제가 중단됩니다. 이미 결제된 기간까지는 계속 이용할 수 있습니다.",
      "중도해지 환불 요청 시 사용 기간을 월결제 기준으로 재정산하고, 산출된 1차 환불 가능액에서 중도해지 수수료 10%가 공제될 수 있습니다.",
      "중복 결제, 결제 오류, 회사 귀책 또는 관련 법령상 환불이 필요한 경우는 예외입니다.",
    ],
  },
] as const;

export function getPublicBasicProduct(slug: string) {
  if (slug === "basic-monthly") {
    return publicBasicProducts.find((product) => product.slug === "dining-single-monthly") ?? null;
  }
  if (slug === "basic-yearly") {
    return publicBasicProducts.find((product) => product.slug === "dining-single-yearly") ?? null;
  }
  return publicBasicProducts.find((product) => product.slug === slug) ?? null;
}

export function formatProductPrice(amount: number) {
  return `${new Intl.NumberFormat("ko-KR").format(amount)}원`;
}
