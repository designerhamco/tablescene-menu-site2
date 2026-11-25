import { notFound } from "next/navigation";
import SitePage from "@/components/layout/SitePage";
import WalletDemo from "./WalletDemo";
export default function LocalAlimtalkWalletPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <SitePage title="알림톡 충전·차감 체험" typography="management" align="start"><WalletDemo /></SitePage>;
}
