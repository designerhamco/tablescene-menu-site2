import type { Metadata } from "next";

import OriginalAppNoSsr from "../../OriginalAppNoSsr";

export const metadata: Metadata = {
  title: "테이블씬 메뉴 | 디지털 메뉴판",
  description: "누구나 쉽고 빠르게 만드는 디지털 메뉴판",
};

export default function MenuServicePage() {
  return <OriginalAppNoSsr />;
}
