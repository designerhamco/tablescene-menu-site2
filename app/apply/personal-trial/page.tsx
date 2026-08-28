import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "아티메뉴 다이닝 신청/결제 | ArtiMenu",
  description: "결제수단 등록 후 30일 무료체험이 적용되는 아티메뉴 다이닝 단일페이지 월결제 신청 페이지로 이동합니다.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function createRedirectPath(searchParams: Record<string, string | string[] | undefined>) {
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

  params.set("product", "business_basic_single_monthly");

  const query = params.toString();
  return query ? `/apply/basic?${query}` : "/apply/basic";
}

export default async function ApplyPersonalTrialPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  redirect(createRedirectPath(await searchParams));
}
