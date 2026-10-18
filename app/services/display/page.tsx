import type { Metadata } from "next";

import OriginalAppNoSsr from "../../OriginalAppNoSsr";

export const metadata: Metadata = {
  title: "디스플레이 준비 중 | 아티메뉴",
  description: "아티메뉴 디스플레이는 더 안정적인 서비스를 위해 준비 중입니다.",
};

export default function DisplayServiceRoutePage() {
  return <OriginalAppNoSsr />;
}
