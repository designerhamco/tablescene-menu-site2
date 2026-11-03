"use client";

import { useActionState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { NewWindowIndicator } from "@/app/components/ui/new-window-indicator";
import { mutateMenuTableAction } from "@/app/mypage/menus/[menuId]/tables/actions";
import { initialMenuTableActionState } from "@/app/mypage/menus/[menuId]/tables/action-state";
import { LoadingState } from "@/app/components/ui/loading-state";

const subscribeToOrigin = () => () => {};
const getBrowserOrigin = () => window.location.origin;
const getServerOrigin = () => null;

export default function TableMenuAddressActions({ path, publicBaseUrl, tableId, disabledReason, terminalMenuSiteId, openDisabledReason }: {
  path: string; publicBaseUrl: string | null; tableId: string; disabledReason?: string;
  terminalMenuSiteId?: string; openDisabledReason?: string;
}) {
  const [state, action, pending] = useActionState(mutateMenuTableAction, initialMenuTableActionState);
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
      <div className="site-action-row">
        {disabledReason || openDisabledReason ? <button type="button" disabled className="site-button site-button-outline">메뉴판 열기</button>
          : terminalMenuSiteId ? <form action={action} aria-busy={pending}>
            <input type="hidden" name="menuSiteId" value={terminalMenuSiteId} /><input type="hidden" name="tableId" value={tableId} />
            <button name="intent" value="open-terminal-menu" disabled={pending} className="site-button site-button-outline">메뉴판 열기</button>
          </form> : <a href={url} target="_blank" rel="noopener noreferrer" className="site-button site-button-outline">메뉴판 열기<NewWindowIndicator /></a>}
        <button type="button" onClick={copyAddress} className="site-button site-button-outline">주소 복사</button>
      </div>
    </div>
    {disabledReason ? <p className="type-body-sm site-copy-muted">{disabledReason}</p> : null}
    {openDisabledReason && !disabledReason ? <p className="type-body-sm site-copy-muted">{openDisabledReason}</p> : null}
    {pending ? <LoadingState inline label="메뉴판을 열고 있습니다." /> : null}
    {state.status === "error" ? <p className="type-body-sm" role="alert">{state.message}</p> : null}
  </div>;
}
