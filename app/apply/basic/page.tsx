import type { Metadata } from "next";

import PaidApplyPage from "../_components/PaidApplyPage";
import { getBasicPaymentProduct } from "@/lib/payments";

export const metadata: Metadata = {
  title: "아티메뉴 다이닝 신청/결제 | ArtiMenu",
  description: "개인 1개월 체험 또는 단일·멀티페이지 사업자 월결제/연결제를 선택해 아티메뉴 다이닝 메뉴판을 신청합니다.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function createPathWithQuery(pathname: string, searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      continue;
    }

    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default async function ApplyBasicPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const productParam = resolvedSearchParams.product;
  const requestedProductKey = Array.isArray(productParam) ? productParam[0] : productParam;
  const initialBasicProductKey = getBasicPaymentProduct(requestedProductKey)?.product_key;

  return (
    <PaidApplyPage
      serviceType="menu"
      nextPath={createPathWithQuery("/apply/basic", resolvedSearchParams)}
      initialBasicProductKey={initialBasicProductKey}
    />
  );
}
