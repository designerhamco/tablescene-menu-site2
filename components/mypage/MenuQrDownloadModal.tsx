"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, LoaderCircle, QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import type { MenuQrDownloadData } from "@/lib/menu-qr-downloads";
import QrDownloadButton from "./QrDownloadButton";

export default function MenuQrDownloadModal({
  menuSiteId, menuName, disabled = false, disabledReason, className = "site-button site-button-outline",
}: {
  menuSiteId: string;
  menuName: string;
  disabled?: boolean;
  disabledReason?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<MenuQrDownloadData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  async function loadQrList() {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const response = await fetch(`/api/menu-sites/${encodeURIComponent(menuSiteId)}/qr`, {
        cache: "no-store", signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "QR 목록을 불러오지 못했습니다.");
      if (!controller.signal.aborted) setData(result);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "QR 목록을 불러오지 못했습니다.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (nextOpen) void loadQrList();
      else requestRef.current?.abort();
    }}>
      <DialogTrigger asChild>
        <button type="button" disabled={disabled} title={disabled ? disabledReason ?? undefined : undefined} className={className}>QR 관리</button>
      </DialogTrigger>
      <DialogContent className="site-management-scope max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <div className="pr-8">
          <DialogTitle>QR 다운로드</DialogTitle>
          <DialogDescription className="mt-2">{menuName}의 대표 QR과 테이블별 QR을 다운로드합니다.</DialogDescription>
        </div>
        <div aria-live="polite" aria-busy={loading}>
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-10 type-body-sm text-zinc-500"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" />QR 목록을 불러오는 중입니다.</p>
          ) : error ? (
            <div className="site-notice site-notice-error p-4">
              <p role="alert" className="type-body-sm">{error}</p>
              <button type="button" onClick={() => void loadQrList()} className="site-button site-button-outline mt-3">다시 시도</button>
            </div>
          ) : data ? (
            <div className="space-y-5">
              <section className="site-section p-4 sm:p-5" aria-label="대표 QR 다운로드">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="type-item-title flex items-center gap-2"><QrCode className="size-5" aria-hidden="true" />대표 메뉴 QR</h3>
                    <p className="type-body-sm mt-2 text-zinc-500">매장 입구·포스터·SNS에서 메뉴판을 공유할 때 사용합니다.</p>
                  </div>
                  <QrDownloadButton feedbackLabel="대표 메뉴" fileName={`arti-menu-${data.menuSite.slug}-qr.png`} path={`/menu/${encodeURIComponent(data.menuSite.slug)}`} publicBaseUrl={data.publicBaseUrl} disabled={!data.canDownloadRepresentativeQr} disabledReason={data.representativeQrDisabledReason} />
                </div>
                {data.representativeQrDisabledReason ? <p className="type-footnote mt-3 text-zinc-500">{data.representativeQrDisabledReason}</p> : null}
              </section>
              <section aria-labelledby={`table-qr-title-${menuSiteId}`}>
                <h3 id={`table-qr-title-${menuSiteId}`} className="type-item-title">테이블별 QR</h3>
                <p className="type-body-sm mt-2 text-zinc-500">각 테이블에 맞는 QR을 선택해 주세요.</p>
                {data.tables.length > 0 ? (
                  <ul className="mt-3 divide-y divide-zinc-100">
                    {data.tables.map((table) => (
                      <li key={table.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="type-body-sm break-words font-semibold">{table.label}</p>
                          {table.status === "disabled" ? <p className="type-footnote mt-1 text-zinc-500">비활성 테이블</p> : null}
                        </div>
                        <QrDownloadButton feedbackLabel={table.label} fileName={`arti-menu-${data.menuSite.slug}-${table.label}-qr.png`} path={table.qrPath} publicBaseUrl={data.publicBaseUrl} disabled={table.status !== "active"} disabledReason="비활성 테이블은 테이블 관리에서 활성화한 뒤 다운로드할 수 있습니다." className="site-button site-button-outline shrink-0" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="site-section mt-3 p-5 type-body-sm text-zinc-500">{data.tableQrUnavailableReason ?? "등록된 테이블이 없습니다."}</p>
                )}
              </section>
            </div>
          ) : null}
        </div>
        <div className="border-t border-zinc-100 pt-4">
          <Link href={`/mypage/menus/${menuSiteId}/${data?.canManageTables && data.tables.length === 0 ? "tables" : "qr"}`} className="site-button site-button-outline w-full" onClick={() => setOpen(false)}>
            {data?.canManageTables && data.tables.length === 0 ? "테이블 등록·관리로 이동" : "QR 관리로 이동"}<ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
          <p className="type-footnote mt-2 text-center text-zinc-500">테이블 설정은 테이블 관리에서, QR 다운로드와 교체는 QR 관리에서 할 수 있습니다.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
