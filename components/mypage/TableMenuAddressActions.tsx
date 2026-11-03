"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";

const subscribeToOrigin = () => () => {};
const getBrowserOrigin = () => window.location.origin;
const getServerOrigin = () => null;

export default function TableMenuAddressActions({ path, publicBaseUrl, tableId, disabledReason }: {
  path: string; publicBaseUrl: string | null; tableId: string; disabledReason?: string;
}) {
  const browserOrigin = useSyncExternalStore<string | null>(subscribeToOrigin, getBrowserOrigin, getServerOrigin);
  const origin = publicBaseUrl ?? browserOrigin;
  const url = origin ? new URL(path, origin).toString() : path;
  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(new URL(path, publicBaseUrl ?? window.location.origin).toString());
      toast.success("테이블 메뉴판 주소를 복사했습니다.");
    } catch { toast.error("주소를 복사하지 못했습니다. 다시 시도해 주세요."); }
  }
  return <div className="site-stack-copy">
    <div className="site-form-row">
    <label className="site-field-stack type-label" htmlFor={`table-menu-address-${tableId}`}>
      테이블 메뉴판 주소
      <input id={`table-menu-address-${tableId}`} className="site-field w-full" readOnly value={url} />
    </label>
      <button type="button" onClick={copyAddress} className="site-button site-button-outline">주소 복사</button>
    </div>
    {disabledReason ? <p className="type-body-sm site-copy-muted">{disabledReason}</p> : null}
  </div>;
}
