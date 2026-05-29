import type { Metadata } from "next";

import PaidApplyPage from "../_components/PaidApplyPage";

export const metadata: Metadata = {
  title: "메뉴링크 베이직 신청/결제 | MenuLink",
  description: "개인 1개월 체험 또는 사업자 정식 월/연 결제를 선택해 메뉴링크 베이직 메뉴판을 신청합니다.",
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

  return <PaidApplyPage serviceType="menu" nextPath={createPathWithQuery("/apply/basic", resolvedSearchParams)} />;
}
