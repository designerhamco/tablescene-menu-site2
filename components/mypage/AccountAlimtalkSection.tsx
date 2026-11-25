import AlimtalkWalletSettings from "@/components/mypage/AlimtalkWalletSettings";
import { loadAccountAlimtalkWallet } from "@/lib/server/alimtalk-wallet-service";
import { updateAccountAlimtalkWallet } from "@/app/mypage/alimtalk/actions";

export default async function AccountAlimtalkSection() {
  const wallet = await loadAccountAlimtalkWallet().catch(() => null);

  return wallet ? (
    <AlimtalkWalletSettings initial={wallet} action={updateAccountAlimtalkWallet} menuId="account" allowCheckout={false} />
  ) : (
    <p className="type-body-sm" role="alert">알림톡 잔액을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.</p>
  );
}
