"use client";

import { toDataURL } from "qrcode";
import { useActionState, useState } from "react";

import type { MenuTableListItem } from "@/lib/menu-table-management";

import {
  createMenuTableAction,
  initialMenuTableActionState,
  mutateMenuTableAction,
  type MenuTableActionState,
} from "./actions";

function resolvePublicUrl(path: string, publicBaseUrl: string | null) {
  return new URL(path, publicBaseUrl ?? window.location.origin).toString();
}

function ActionNotice({ state }: { state: MenuTableActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
      state.status === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-rose-200 bg-rose-50 text-rose-800"
    }`}>
      {state.message}
    </p>
  );
}

function QrAddressActions({
  copyKey,
  fileName,
  path,
  publicBaseUrl,
}: {
  copyKey: string;
  fileName: string;
  path: string;
  publicBaseUrl: string | null;
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "working" | "error">("idle");
  const publicUrl = publicBaseUrl ? new URL(path, publicBaseUrl).toString() : path;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(resolvePublicUrl(path, publicBaseUrl));
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("error");
    }
  }

  async function downloadQr() {
    setDownloadStatus("working");
    try {
      const dataUrl = await toDataURL(resolvePublicUrl(path, publicBaseUrl), {
        type: "image/png",
        width: 1024,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#18181b", light: "#ffffff" },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloadStatus("idle");
    } catch {
      setDownloadStatus("error");
    }
  }

  return (
    <div className="mt-4">
      <label className="block text-xs font-black text-zinc-500" htmlFor={`qr-address-${copyKey}`}>
        연결 주소
      </label>
      <div className="mt-2 flex flex-col gap-2 lg:flex-row">
        <input
          id={`qr-address-${copyKey}`}
          readOnly
          value={publicUrl}
          className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-xs font-bold text-zinc-700 outline-none sm:text-sm"
        />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={copyUrl}
            className="rounded-full border border-zinc-300 bg-white px-4 py-3 text-xs font-black text-zinc-800 transition-colors hover:bg-zinc-100"
          >
            {copyStatus === "copied" ? "복사 완료" : copyStatus === "error" ? "다시 복사" : "주소 복사"}
          </button>
          <button
            type="button"
            onClick={downloadQr}
            disabled={downloadStatus === "working"}
            className="rounded-full bg-zinc-950 px-4 py-3 text-xs font-black text-white transition-colors hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
            data-table-qr-download=""
          >
            {downloadStatus === "working" ? "QR 만드는 중" : "QR 다운로드"}
          </button>
        </div>
      </div>
      {downloadStatus === "error" ? (
        <p className="mt-2 text-xs font-black text-rose-700">QR 이미지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      ) : null}
    </div>
  );
}

export default function MenuTableManager({
  menuSiteId,
  menuSlug,
  publicBaseUrl,
  tables,
}: {
  menuSiteId: string;
  menuSlug: string;
  publicBaseUrl: string | null;
  tables: MenuTableListItem[];
}) {
  const [createState, createAction, createPending] = useActionState(createMenuTableAction, initialMenuTableActionState);
  const [mutationState, mutationAction, mutationPending] = useActionState(mutateMenuTableAction, initialMenuTableActionState);
  const representativePath = `/menu/${encodeURIComponent(menuSlug)}`;

  return (
    <div className="space-y-6">
      <ActionNotice state={createState} />
      <ActionNotice state={mutationState} />

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">대표 메뉴 QR</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">테이블 정보 없이 메뉴판 공유</h2>
        <p className="mt-2 max-w-3xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
          매장 입구·포스터·SNS에 사용하는 대표 QR입니다. 메뉴는 볼 수 있지만 테이블 번호가 없어 스마트호출은 사용할 수 없습니다.
        </p>
        <QrAddressActions
          copyKey="representative"
          fileName={`arti-menu-${menuSlug}-qr.png`}
          path={representativePath}
          publicBaseUrl={publicBaseUrl}
        />
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">테이블별 QR</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">새 테이블 추가</h2>
        <p className="mt-2 max-w-3xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
          각 좌석에는 서로 다른 QR이 필요합니다. 테이블 이름을 바꿔도 QR은 유지되며, QR 교체를 선택한 경우에만 기존 인쇄물이 무효화됩니다.
        </p>
        <form action={createAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="menuSiteId" value={menuSiteId} />
          <label className="flex-1 text-sm font-black text-zinc-800">
            테이블 이름
            <input
              name="label"
              required
              maxLength={80}
              placeholder="예: 1번 테이블"
              className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-zinc-500"
            />
          </label>
          <button
            type="submit"
            disabled={createPending}
            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
          >
            {createPending ? "생성 중" : "테이블 만들기"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">운영 테이블</h2>
          <p className="mt-2 text-sm font-medium text-zinc-500">
            사용 중·비활성 테이블 {tables.length.toLocaleString("ko-KR")}개 · 각 QR은 언제든 다시 다운로드할 수 있습니다.
          </p>
        </div>

        {tables.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-sm font-bold text-zinc-500">
            아직 등록된 테이블이 없습니다.
          </p>
        ) : tables.map((table) => (
          <article key={table.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h3 className="text-xl font-black tracking-tight">{table.label}</h3>
                <p className="mt-1 text-xs font-bold text-zinc-400">
                  마지막 QR 교체 {new Date(table.tokenRotatedAt).toLocaleString("ko-KR")}
                </p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                table.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"
              }`}>
                {table.status === "active" ? "사용 중" : "비활성"}
              </span>
            </div>

            <QrAddressActions
              copyKey={table.id}
              fileName={`arti-menu-${menuSlug}-${table.label.replace(/[^0-9A-Za-z가-힣_-]+/g, "-")}-qr.png`}
              path={table.qrPath}
              publicBaseUrl={publicBaseUrl}
            />

            <form action={mutationAction} className="mt-5 grid gap-3 border-t border-zinc-100 pt-5 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
              <input type="hidden" name="menuSiteId" value={menuSiteId} />
              <input type="hidden" name="tableId" value={table.id} />
              <label className="text-sm font-black text-zinc-800">
                이름
                <input name="label" required maxLength={80} defaultValue={table.label} className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-bold" />
              </label>
              <label className="text-sm font-black text-zinc-800">
                상태
                <select name="status" defaultValue={table.status} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold">
                  <option value="active">사용 중</option>
                  <option value="disabled">비활성</option>
                </select>
              </label>
              <button name="intent" value="update" disabled={mutationPending} className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-black text-zinc-800 hover:bg-zinc-100 disabled:opacity-60">
                저장
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              <form action={mutationAction}>
                <input type="hidden" name="menuSiteId" value={menuSiteId} />
                <input type="hidden" name="tableId" value={table.id} />
                <button name="intent" value="rotate-token" disabled={mutationPending} title="기존에 인쇄한 QR과 방문 세션이 즉시 무효화됩니다." className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-900 hover:bg-amber-100 disabled:opacity-60">
                  QR 교체
                </button>
              </form>
              <form action={mutationAction}>
                <input type="hidden" name="menuSiteId" value={menuSiteId} />
                <input type="hidden" name="tableId" value={table.id} />
                <button name="intent" value="archive" disabled={mutationPending} className="rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-500 hover:bg-zinc-100 disabled:opacity-60">
                  테이블 보관
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
