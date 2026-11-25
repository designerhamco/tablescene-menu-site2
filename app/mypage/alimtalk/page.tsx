import { redirect } from "next/navigation";

export default function AccountAlimtalkPage() {
  redirect("/mypage?tab=payments&billingTab=alimtalk");
}
