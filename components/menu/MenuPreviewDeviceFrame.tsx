import Link from "next/link";

import {
  buildMenuPreviewUrl,
  getMenuPreviewFrame,
  MENU_PREVIEW_DEVICES,
  MENU_PREVIEW_ORIENTATIONS,
  MENU_PREVIEW_PAYMENT_MODES,
  type MenuPreviewDevice,
  type MenuPreviewOrientation,
  type MenuPreviewPaymentMode,
  type MenuPreviewQuery,
} from "@/lib/menu-preview-devices";

type MenuPreviewDeviceFrameProps = {
  device: MenuPreviewDevice;
  orientation: MenuPreviewOrientation;
  paymentMode: MenuPreviewPaymentMode;
  menuId: string;
  query: MenuPreviewQuery;
};

export default function MenuPreviewDeviceFrame({ device, orientation, paymentMode, menuId, query }: MenuPreviewDeviceFrameProps) {
  const frame = getMenuPreviewFrame(device, orientation);
  const orientationLabel = device === "tablet" ? MENU_PREVIEW_ORIENTATIONS[orientation] : null;
  const embeddedUrl = buildMenuPreviewUrl(menuId, query, {
    actual: true,
    embedded: true,
    device,
    orientation,
    paymentMode,
  });
  const actualUrl = buildMenuPreviewUrl(menuId, query, { actual: true, device, orientation, paymentMode });

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/mypage?tab=menus"
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              ← 메뉴판 목록
            </Link>
            <div>
              <p className="text-sm font-black">기기 미리보기</p>
              <p className="text-xs font-bold text-zinc-500">
                {frame.label}{orientationLabel ? ` · ${orientationLabel}` : ""} · {frame.width} × {frame.height}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label="미리보기 기기 선택" className="flex rounded-full border border-zinc-200 bg-zinc-100 p-1">
              {(Object.keys(MENU_PREVIEW_DEVICES) as MenuPreviewDevice[]).map((candidate) => {
                const candidateFrame = MENU_PREVIEW_DEVICES[candidate];
                const isSelected = candidate === device;

                return (
                  <Link
                    key={candidate}
                    href={buildMenuPreviewUrl(menuId, query, {
                      device: candidate,
                      orientation: candidate === "tablet" ? orientation : undefined,
                      paymentMode: candidate === "mobile" ? paymentMode : undefined,
                    })}
                    aria-current={isSelected ? "page" : undefined}
                    className={`rounded-full px-4 py-2 text-sm font-black transition-colors ${
                      isSelected ? "bg-zinc-950 text-white shadow-sm" : "text-zinc-600 hover:bg-white hover:text-zinc-950"
                    }`}
                  >
                    {candidateFrame.label}
                  </Link>
                );
              })}
            </nav>
            {device === "tablet" ? (
              <nav aria-label="태블릿 방향 선택" className="flex rounded-full border border-zinc-200 bg-zinc-100 p-1">
                {(Object.keys(MENU_PREVIEW_ORIENTATIONS) as MenuPreviewOrientation[]).map((candidate) => {
                  const isSelected = candidate === orientation;

                  return (
                    <Link
                      key={candidate}
                      href={buildMenuPreviewUrl(menuId, query, { device, orientation: candidate })}
                      aria-current={isSelected ? "page" : undefined}
                      className={`rounded-full px-4 py-2 text-sm font-black transition-colors ${
                        isSelected ? "bg-emerald-700 text-white shadow-sm" : "text-zinc-600 hover:bg-white hover:text-zinc-950"
                      }`}
                    >
                      {MENU_PREVIEW_ORIENTATIONS[candidate]}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
            {device === "mobile" ? (
              <nav aria-label="PG 결제 미리보기 선택" className="flex rounded-full border border-zinc-200 bg-zinc-100 p-1">
                {(Object.keys(MENU_PREVIEW_PAYMENT_MODES) as MenuPreviewPaymentMode[]).map((candidate) => {
                  const isSelected = candidate === paymentMode;

                  return (
                    <Link
                      key={candidate}
                      href={buildMenuPreviewUrl(menuId, query, { device, paymentMode: candidate })}
                      aria-current={isSelected ? "page" : undefined}
                      className={`rounded-full px-4 py-2 text-sm font-black transition-colors ${
                        isSelected ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"
                      }`}
                    >
                      {MENU_PREVIEW_PAYMENT_MODES[candidate]}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
            <Link
              href={actualUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-emerald-800"
            >
              새 창에서 실제 크기 보기 ↗
            </Link>
          </div>
        </div>
      </header>

      <section
        className="overflow-auto px-4 py-8"
        aria-label={`${frame.label}${orientationLabel ? ` ${orientationLabel}` : ""} 메뉴판 미리보기`}
      >
        <div
          className="mx-auto overflow-hidden rounded-[28px] border-[10px] border-zinc-900 bg-white shadow-2xl"
          style={{ width: frame.width + 20, height: frame.height + 20 }}
        >
          <iframe
            key={embeddedUrl}
            src={embeddedUrl}
            title={`${frame.label}${orientationLabel ? ` ${orientationLabel}` : ""} 메뉴판 미리보기`}
            className="h-full w-full border-0 bg-white"
            referrerPolicy="no-referrer"
          />
        </div>
      </section>
    </main>
  );
}
