import type { Metadata } from "next";

import OriginalAppNoSsr from "./OriginalAppNoSsr";

export const metadata: Metadata = {
  title: "TableScene | 모든 매장을 위한 디지털 메뉴판 플랫폼",
  description: "메뉴와 가격표를 하나의 링크로 관리하고, QR과 매장 디스플레이로 쉽게 보여주세요.",
};

export default function Home() {
  return <OriginalAppNoSsr />;
}
