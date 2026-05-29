import type { Metadata } from "next";

import OriginalAppNoSsr from "../../OriginalAppNoSsr";

export const metadata: Metadata = {
  title: "메뉴링크 디스플레이 | 디지털 메뉴보드",
  description: "매장 TV와 모니터에 띄우는 대형 화면용 디지털 메뉴보드입니다.",
};

export default function DisplayServiceRoutePage() {
  return <OriginalAppNoSsr />;
}
