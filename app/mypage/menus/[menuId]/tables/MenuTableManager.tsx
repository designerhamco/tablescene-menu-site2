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

function TokenDelivery({ state }: { state: MenuTableActionState }) {
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "working" | "error">("idle");
  if (!state.rawToken || !state.qrPath) return null;

  async function downloadQr() {
    setDownloadStatus("working");
    try {
      const tableUrl = new URL(state.qrPath!, window.location.origin).toString();
      const dataUrl = await toDataURL(tableUrl, {
        type: "image/png",
        width: 1024,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#18181b", light: "#ffffff" },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `arti-menu-table-${state.tableId?.slice(0, 8) ?? "new"}-qr.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloadStatus("idle");
    } catch {
      setDownloadStatus("error");
    }
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <h2 className="text-lg font-black">이 QR 주소를 지금 저장하세요</h2>
      <p className="mt-2 break-keep text-sm font-bold leading-relaxed">
        원본 token은 데이터베이스에 저장되지 않아 이 화면을 떠난 뒤 다시 표시할 수 없습니다. 잃어버리면 token을 교체해야 합니다.
      </p>
      <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-amber-800" htmlFor={`table-qr-path-${state.tableId ?? "new"}`}>
        테이블 QR 경로
      </label>
      <input
        id={`table-qr-path-${state.tableId ?? "new"}`}
        readOnly
        value={state.qrPath}
        className="mt-2 w-full rounded-2xl border border-amber-300 bg-white px-4 py-3 font-mono text-sm font-bold text-zinc-950"
      />
      <button
        type="button"
        onClick={downloadQr}
        disabled={downloadStatus === "working"}
        className="mt-3 rounded-full bg-amber-950 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-900 disabled:cursor-wait disabled:opacity-60"
        data-table-qr-download=""
      >
        {downloadStatus === "working" ? "QR 만드는 중" : "테이블 QR PNG 다운로드"}
      </button>
      {downloadStatus === "error" ? (
        <p className="mt-2 text-xs font-black text-rose-700">QR 이미지를 만들지 못했습니다. 이 화면을 닫기 전에 다시 시도해 주세요.</p>
      ) : null}
      <p className="mt-2 text-xs font-bold leading-relaxed text-amber-800">
        QR 이미지는 이 브라우저 안에서만 생성되며 원본 token을 별도 API로 전송하지 않습니다.
      </p>
      <details className="mt-3 text-xs font-bold text-amber-900">
        <summary className="cursor-pointer">원본 token 확인</summary>
        <p className="mt-2 break-all rounded-2xl bg-white/70 px-3 py-2 font-mono">{state.rawToken}</p>
      </details>
    </section>
  );
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

export default function MenuTableManager({
  menuSiteId,
  tables,
}: {
  menuSiteId: string;
  tables: MenuTableListItem[];
}) {
  const [createState, createAction, createPending] = useActionState(createMenuTableAction, initialMenuTableActionState);
  const [mutationState, mutationAction, mutationPending] = useActionState(mutateMenuTableAction, initialMenuTableActionState);

  return (
    <div className="space-y-6">
      <TokenDelivery state={createState} />
      <ActionNotice state={createState} />
      <TokenDelivery state={mutationState} />
      <ActionNotice state={mutationState} />

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black tracking-tight">테이블 추가</h2>
        <p className="mt-2 break-keep text-sm font-medium leading-relaxed text-zinc-500">
          테이블을 만들면 원본 QR 주소를 한 번만 전달합니다. 데이터베이스에는 SHA-256 hash만 저장됩니다.
        </p>
        <form action={createAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="menuSiteId" value={menuSiteId} />
          <label className="flex-1 text-sm font-black text-zinc-800">
            테이블 이름
            <input
              name="label"
              required
              maxLength={80}
              placeholder="예: 창가 1번"
              className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-zinc-500"
            />
          </label>
          <button
            type="submit"
            disabled={createPending}
            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
          >
            {createPending ? "생성 중" : "테이블 만들기"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">운영 테이블</h2>
          <p className="mt-2 text-sm font-medium text-zinc-500">사용 중·비활성 테이블 {tables.length.toLocaleString("ko-KR")}개</p>
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
                <p className="mt-1 text-xs font-bold text-zinc-400">마지막 token 교체 {new Date(table.tokenRotatedAt).toLocaleString("ko-KR")}</p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                table.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"
              }`}>
                {table.status === "active" ? "사용 중" : "비활성"}
              </span>
            </div>

            <form action={mutationAction} className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
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

            <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
              <form action={mutationAction}>
                <input type="hidden" name="menuSiteId" value={menuSiteId} />
                <input type="hidden" name="tableId" value={table.id} />
                <button name="intent" value="rotate-token" disabled={mutationPending} className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-900 hover:bg-amber-100 disabled:opacity-60">
                  QR token 교체
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
