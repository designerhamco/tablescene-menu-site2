import type { Metadata } from "next";
import SitePage from "@/components/layout/SitePage";
import { ALIMTALK_BILLING_TERMS, ALIMTALK_BILLING_TERMS_TITLE } from "@/lib/alimtalk-billing-policy";
export const metadata: Metadata = {title:"알림톡 충전·환불 안내 | 아티메뉴"};
export default function AlimtalkBillingPolicyPage() {
  return <SitePage title={ALIMTALK_BILLING_TERMS_TITLE} align="start"><div className="site-stack-block">
    <p className="type-caption site-copy-muted">2026년 11월 25일 기준</p>
    {ALIMTALK_BILLING_TERMS.map(text=><p key={text} className="type-body">{text}</p>)}
    <a href="/mypage/inquiries" className="site-button site-button-outline">고객지원 문의</a>
  </div></SitePage>;
}
