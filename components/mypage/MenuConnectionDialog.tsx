"use client";

import { useActionState, useId, useState } from "react";
import { manageCardMenuConnectionAction } from "@/app/mypage/menus/[menuId]/import/actions";
import { Button } from "@/app/components/ui/button";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { DetailField, DetailGrid } from "@/app/components/ui/detail-grid";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Link as LinkIcon } from "@/app/components/ui/site-icon";
import { MENU_CATALOG_CONFIRMATION, MENU_CATALOG_DISCONNECT_CONFIRMATION } from "@/lib/menu-catalog";

type MenuChoice = { id: string; name: string };
export type MenuConnection = { source: MenuChoice; target: MenuChoice };
type ConnectionProps = {
  menu: MenuChoice;
  connections: MenuConnection[];
  sourceOptions: MenuChoice[];
  canConnect: boolean;
};

function ConnectionForm({ menu, connections, sourceOptions, canConnect }: ConnectionProps) {
  const [result, action, pending] = useActionState(manageCardMenuConnectionAction.bind(null, menu.id), null);
  const [selectionId, setSelectionId] = useState("");
  const fieldId = useId();
  const confirmationId = useId();

  const isLinked = connections.length > 0;
  const connection = connections.find(({ target }) => target.id === selectionId) ?? connections[0];
  const source = sourceOptions.find(({ id }) => id === selectionId);
  const hasForm = isLinked || (canConnect && sourceOptions.length > 0);
  const confirmationPhrase = isLinked ? MENU_CATALOG_DISCONNECT_CONFIRMATION : MENU_CATALOG_CONFIRMATION;

  return (
    <form action={action} className="site-stack-group" aria-busy={pending}>
      {hasForm ? <>
        <input type="hidden" name="intent" value={isLinked ? "disconnect" : "connect"} />
        {!isLinked || connections.length > 1 ? (
          <div className="site-field-stack">
            <Label htmlFor={fieldId}>{isLinked ? "해제할 연결" : "원본 메뉴판"}</Label>
            <Select
              key={isLinked ? "disconnect" : "connect"}
              name={isLinked ? undefined : "sourceMenuSiteId"}
              value={isLinked ? connection?.target.id ?? "" : source?.id ?? ""}
              onValueChange={setSelectionId}
              disabled={pending}
            >
              <SelectTrigger id={fieldId}><SelectValue placeholder="메뉴판 선택" /></SelectTrigger>
              <SelectContent>
                {isLinked ? connections.map(({ source, target }) => (
                  <SelectItem key={target.id} value={target.id}>{source.name} → {target.name}</SelectItem>
                )) : sourceOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {connection ? <>
          <input type="hidden" name="connectionSourceId" value={connection.source.id} />
          <input type="hidden" name="connectionTargetId" value={connection.target.id} />
          <DetailGrid>
            <DetailField label="원본 메뉴판">{connection.source.name}</DetailField>
            <DetailField label="연결된 메뉴판">{connection.target.name}</DetailField>
          </DetailGrid>
        </> : null}
        <ContentPanel surface={isLinked ? "muted" : "notice"} density="compact">
          <p className="type-body-sm">{isLinked
            ? "현재 메뉴 내용은 유지되며, 해제한 메뉴판은 이후 공통 메뉴 정보가 따로 변경됩니다."
            : "연결하면 이 메뉴판의 기존 메뉴 구성이 선택한 원본의 메뉴 구성으로 교체됩니다. 이후 가져온 메뉴의 이름·가격·품절 상태 등 공통 정보가 함께 바뀝니다."}</p>
        </ContentPanel>
        <div className="site-field-stack">
          <Label htmlFor={confirmationId}>확인하려면 ‘{confirmationPhrase}’를 입력해 주세요.</Label>
          <Input key={`${confirmationPhrase}-${connection?.target.id ?? source?.id ?? ""}`} id={confirmationId} name="confirmation" type="text" autoComplete="off" required disabled={pending} />
        </div>
      </> : !result ? (
        <p className="type-body-sm site-copy-muted">원본으로 선택할 수 있는 다른 메뉴판이 없습니다.</p>
      ) : null}

      {result ? (
        <p role={result.status === "success" ? "status" : "alert"} className={`type-body-sm ${result.status === "success" ? "site-copy-muted" : "text-destructive"}`}>{result.message}</p>
      ) : null}

      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="outline" disabled={pending}>{hasForm ? "취소" : "닫기"}</Button></DialogClose>
        {hasForm ? (
          <Button type="submit" variant={isLinked ? "outline-danger" : "default"} disabled={pending || !(isLinked ? connection : source)}>
            {pending ? (isLinked ? "해제 중…" : "연결 중…") : isLinked ? "연결 해제" : "연결하기"}
          </Button>
        ) : null}
      </DialogFooter>
    </form>
  );
}

export default function MenuConnectionDialog(props: ConnectionProps) {
  const [open, setOpen] = useState(false);
  const linked = props.connections.length > 0;

  if (!open && !linked && !props.canConnect) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="icon" iconSize="compact" variant="ghost" className="site-menu-card-connection"
          data-menu-linked={linked}
          aria-label={`${props.menu.name} 메뉴판 연결${linked ? ` (${props.connections.length}개 연결됨)` : ""}`}
          title={linked ? `메뉴판 ${props.connections.length}개 연결됨` : "메뉴판 연결"}>
          <LinkIcon aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="site-management-scope" scrollable>
        <DialogHeader reserveCloseButton>
          <DialogTitle>메뉴판 연결</DialogTitle>
          <DialogDescription>{props.menu.name}</DialogDescription>
        </DialogHeader>
        {open ? <ConnectionForm {...props} /> : null}
      </DialogContent>
    </Dialog>
  );
}
