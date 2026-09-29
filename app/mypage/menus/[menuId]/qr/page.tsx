import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import QrAddressActions from "@/components/mypage/QrAddressActions";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { getMenuQrManagementPageData } from "@/lib/server/menu-qr-management-service";

export const metadata: Metadata = {
  title: "QR 관리 | 아티메뉴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getConfiguredPublicBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_PUBLIC_MENU_BASE_URL?.trim()
    || process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || "";
  if (!configuredUrl) return null;

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return null;
  }
}

export default async function MenuQrManagementPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;
  let data;

  try {
    data = await getMenuQrManagementPageData(menuId);
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") {
        redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/qr`)}`);
      }
      if (error.status === 404) notFound();
      if (error.code === "MENU_SITE_PERMISSION_DENIED") {
        redirect("/mypage?tab=menus&message=qr-manage-permission-required");
      }
    }
    throw error;
  }

  const publicBaseUrl = getConfiguredPublicBaseUrl();
  const representativePath = `/menu/${encodeURIComponent(data.menuSite.slug)}`;

  return (
    <>
      <OfficialSiteNavbar />
      <main className="site-gutter site-page-spacing-compact min-h-screen bg-zinc-50 text-zinc-950">
        <div className="mx-auto w-full max-w-6xl">
          <Link href="/mypage?tab=menus" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">
            ← MY/메뉴판
          </Link>
          <header className="mt-6 border-b border-zinc-200 pb-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{data.menuSite.name}</p>
            <h1 className="type-page-title mt-2">QR 관리</h1>
            <p className="mt-3 max-w-3xl break-keep text-sm font-medium leading-relaxed text-zinc-500 md:text-base">
              이 메뉴판의 대표 QR을 확인하고 언제든 다시 다운로드할 수 있습니다.
            </p>
          </header>

          <div className="mt-8">
            <section className="site-card p-5 sm:p-6 md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">대표 메뉴 QR</p>
              <h2 className="type-subsection-title mt-2">메뉴판 공유 주소</h2>
              <p className="mt-2 max-w-3xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
                매장 입구·포스터·SNS에서 사용하는 대표 QR입니다. 메뉴판 주소가 유지되는 동안 같은 QR을 계속 사용할 수 있습니다.
              </p>
              <QrAddressActions
                copyKey="representative"
                feedbackLabel="대표 메뉴"
                fileName={`arti-menu-${data.menuSite.slug}-qr.png`}
                path={representativePath}
                publicBaseUrl={publicBaseUrl}
                disabled={!data.canDownloadRepresentativeQr}
                disabledReason={data.representativeQrDisabledReason}
              />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
