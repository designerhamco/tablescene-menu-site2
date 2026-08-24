import type { Metadata } from "next";

import OriginalAppNoSsr from "../../OriginalAppNoSsr";

export const metadata: Metadata = {
  title: "아티메뉴 베이직 | 디지털 메뉴판/가격표",
  description: "누구나 쉽고 빠르게 만드는 디지털 메뉴판과 가격표 서비스입니다.",
};

export default function BasicServiceRoutePage() {
  return <OriginalAppNoSsr />;
}
