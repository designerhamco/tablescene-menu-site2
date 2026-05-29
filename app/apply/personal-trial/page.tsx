import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "메뉴링크 베이직 신청/결제 | MenuLink",
  description: "개인 체험과 사업자 정식 결제를 선택할 수 있는 메뉴링크 베이직 신청 페이지로 이동합니다.",
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
