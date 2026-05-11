import type { Metadata } from "next";

import OriginalAppNoSsr from "../../OriginalAppNoSsr";

export const metadata: Metadata = {
  title: "테이블씬 스크린 | 디지털 메뉴보드",
  description: "매장 화면을 감각적인 디지털 메뉴보드로",
};

export default function ScreenServicePage() {
  return <OriginalAppNoSsr />;
}
