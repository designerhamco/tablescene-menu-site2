import type { Metadata } from "next";

import OriginalAppNoSsr from "../../OriginalAppNoSsr";

export const metadata: Metadata = {
  title: "테이블씬 오더 1.0 | QR 오더 시스템",
  description: "QR로 주문하고 주방까지 바로 연결되는 오더 시스템",
};

export default function OrderServicePage() {
  return <OriginalAppNoSsr />;
}
