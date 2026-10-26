import { redirect } from "next/navigation";

export default async function LegacyOrderSettingsPage({ params }: { params: Promise<{ menuId: string }> }) {
  const { menuId } = await params;
  redirect(`/mypage/menus/${menuId}/orders/settings`);
}
