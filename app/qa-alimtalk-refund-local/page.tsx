import { notFound } from "next/navigation";
import SitePage from "@/components/layout/SitePage";
import RefundDemo from "./RefundDemo";
export default function LocalAlimtalkRefundPage() {
  if(process.env.NODE_ENV!=="development")notFound();
  return <SitePage title="알림톡 카드 환불 체험" typography="management" align="start"><RefundDemo/></SitePage>;
}
