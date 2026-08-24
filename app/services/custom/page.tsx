import type { Metadata } from "next";

import OriginalAppNoSsr from "../../OriginalAppNoSsr";

export const metadata: Metadata = {
  title: "아티메뉴 커스텀 | 프리미엄 웹 메뉴 경험",
  description: "브랜딩과 인터랙션을 담은 맞춤형 웹 메뉴 경험을 제작합니다.",
};

export default function CustomServicePage() {
  return <OriginalAppNoSsr />;
}
