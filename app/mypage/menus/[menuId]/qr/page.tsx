import { redirect } from "next/navigation";

// Preserve existing bookmarks; QR management has a single canonical destination.
export default async function MenuQrManagementPage({ params }: { params: Promise<{ menuId: string }> }) {
  const { menuId } = await params;
  redirect(`/mypage/menus/${encodeURIComponent(menuId)}/tables`);
}
