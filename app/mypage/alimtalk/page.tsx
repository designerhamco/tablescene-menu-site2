import Link from "next/link";
import {redirect} from "next/navigation";
import type {Metadata} from "next";
import SitePage from "@/components/layout/SitePage";
import AlimtalkWalletSettings from "@/components/mypage/AlimtalkWalletSettings";
import {loadAccountAlimtalkWallet} from "@/lib/server/alimtalk-wallet-service";
import {createClient} from "@/lib/supabase/server";
import {updateAccountAlimtalkWallet} from "./actions";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"알림톡 충전·환불 | 아티메뉴",robots:{index:false,follow:false}};
export default async function AccountAlimtalkPage(){
  const db=await createClient(),{data:{user}}=await db.auth.getUser();
  if(!user)redirect("/sign-in?next=/mypage/alimtalk");
  const wallet=await loadAccountAlimtalkWallet().catch(()=>null);
  return <SitePage title="알림톡 충전·환불" typography="management" align="start"><div className="site-stack-group">
    <Link href="/mypage" className="site-button site-button-link">마이페이지로</Link>
    {wallet?<AlimtalkWalletSettings initial={wallet} action={updateAccountAlimtalkWallet} menuId="account" allowCheckout={false}/>:<p className="type-body-sm" role="alert">알림톡 잔액을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.</p>}
  </div></SitePage>;
}
