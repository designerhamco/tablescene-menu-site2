import {
  businessBasicMonthlyProduct,
  businessBasicMultiMonthlyProduct,
  type BasicProductKey,
} from "@/lib/payments";
import { getEarlyBirdMonthlyPrice } from "@/lib/template-subscription-pricing";

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
    slug: "dining-single-monthly",
    productKey: businessBasicMonthlyProduct.product_key,
    name: businessBasicMonthlyProduct.name,
    shortName: "원페이지 템플릿 월 구독",
    summary: "선택한 원페이지 디자인 템플릿 1개를 매월 구독합니다. 다른 디자인은 별도 구독이며, 계정당 최초 1회는 30일간 무료로 이용할 수 있습니다.",
    price: getEarlyBirdMonthlyPrice(businessBasicMonthlyProduct.product_key) ?? businessBasicMonthlyProduct.amount,
    regularPrice: businessBasicMonthlyProduct.regular_amount,
    billingLabel: "매월 자동결제",
    servicePeriod: "무료체험 대상은 등록일부터 30일, 이후 첫 결제일부터 1개월 단위로 자동 갱신",
    buyerRequirement: "국세청 사업자 상태 확인을 완료한 사업자 회원",
    provision: "무료체험 대상은 결제수단 등록 즉시 메뉴판이 생성되며 30일 뒤 첫 결제가 진행됩니다. 무료체험 비대상은 최초 결제 완료 즉시 제공됩니다.",
    cancellation: [
      "무료체험 중 해지하면 첫 결제 없이 30일 체험 종료일까지 이용할 수 있습니다. 유료 전환 후에는 언제든 해지를 예약할 수 있으며 다음 결제일부터 자동결제가 중단됩니다.",
      "이미 시작된 월 이용기간은 원칙적으로 중도 환불되지 않습니다. 중복 결제, 결제 오류, 회사 귀책 또는 법령상 필요한 경우는 예외입니다.",
    ],
  },
  {
    slug: "dining-multi-monthly",
    productKey: businessBasicMultiMonthlyProduct.product_key,
    name: businessBasicMultiMonthlyProduct.name,
    shortName: "다이닝·멀티페이지 템플릿 월 구독",
    summary: "선택한 다이닝·멀티페이지 디자인 템플릿 1개를 매월 구독합니다. 다른 디자인은 별도 구독이며, 계정당 최초 1회는 30일간 무료로 이용할 수 있습니다.",
    price: getEarlyBirdMonthlyPrice(businessBasicMultiMonthlyProduct.product_key) ?? businessBasicMultiMonthlyProduct.amount,
    regularPrice: businessBasicMultiMonthlyProduct.regular_amount,
    billingLabel: "매월 자동결제",
    servicePeriod: "무료체험 대상은 등록일부터 30일, 이후 첫 결제일부터 1개월 단위로 자동 갱신",
    buyerRequirement: "국세청 사업자 상태 확인을 완료한 사업자 회원",
    provision: "무료체험 대상은 결제수단 등록 즉시 메뉴판이 생성되며 30일 뒤 첫 결제가 진행됩니다. 무료체험 비대상은 최초 결제 완료 즉시 제공됩니다.",
    cancellation: [
      "무료체험 중 해지하면 첫 결제 없이 30일 체험 종료일까지 이용할 수 있습니다. 유료 전환 후에는 언제든 해지를 예약할 수 있으며 다음 결제일부터 자동결제가 중단됩니다.",
      "이미 시작된 월 이용기간은 원칙적으로 중도 환불되지 않습니다. 중복 결제, 결제 오류, 회사 귀책 또는 법령상 필요한 경우는 예외입니다.",
    ],
  },
] as const;

export function getPublicBasicProduct(slug: string) {
  if (slug === "basic-monthly") {
    return publicBasicProducts.find((product) => product.slug === "dining-single-monthly") ?? null;
  }
  return publicBasicProducts.find((product) => product.slug === slug) ?? null;
}

export function formatProductPrice(amount: number) {
  return `${new Intl.NumberFormat("ko-KR").format(amount)}원`;
}
