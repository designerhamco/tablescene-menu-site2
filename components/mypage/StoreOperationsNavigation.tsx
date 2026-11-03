import type { ReactNode } from "react";
import { MypageNavigationRail } from "@/components/mypage/MypageNavigationRail";

export default function StoreOperationsNavigation({ activeKey, account, selector, children }: {
  activeKey: string;
  account?: ReactNode;
  selector?: ReactNode;
  children: ReactNode;
}) {
  return <aside className="site-account-sidebar site-operations-sidebar">
    {account ? <div className="site-operations-account">{account}</div> : null}
    <div className="site-operations-navigation">
      {selector}
      <MypageNavigationRail activeKey={activeKey} navLabel="매장 운영 메뉴" moreLabel="다음 매장 운영 메뉴 보기">
        {children}
      </MypageNavigationRail>
    </div>
  </aside>;
}
