"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useId, useState, useTransition, type ReactNode } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { BarChart3, X } from "@/app/components/ui/site-icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import OrderReceipt from "@/components/mypage/OrderReceipt";
import {
  canChangeKitchenStage, getKitchenStage, KITCHEN_ACTION_LABELS, KITCHEN_SELECTION_LIMIT,
  KITCHEN_STAGE_ACTIONS, KITCHEN_STAGE_LABELS, KITCHEN_STAGES,
  type KitchenMutation, type KitchenOrder, type KitchenStage, type KitchenStageAction,
} from "@/lib/kitchen-order";
import { mutateKitchenOrderAction } from "./actions";
import KitchenOrderCard, { KitchenOrderActions, KitchenOrderItems, KitchenOrderNumber, KitchenOrderTime, kitchenActionVariants, type KitchenOrderControls } from "./KitchenOrderCard";
import KitchenToolbar, { type KitchenSearchField } from "./KitchenToolbar";
import styles from "./KitchenDashboard.module.css";

const stageTones = { before: "error", cooking: "pending", ready: "active" } as const;

function KitchenProgress({ orders, close }: { orders: KitchenOrder[]; close: () => void }) {
  const totals = new Map<string, { incomplete: number; complete: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const total = totals.get(item.name) ?? { incomplete: 0, complete: 0 };
      total[item.done ? "complete" : "incomplete"] += item.quantity;
      totals.set(item.name, total);
    }
  }
  return (
    <aside className={styles.progress} aria-label="조리 진척도">
      <div className="site-stack-block">
        <div className="site-action-row" data-distribution="between">
          <h4 className="type-item-title">조리 진척도</h4>
          <Button size="icon" iconSize="compact" variant="ghost" aria-label="조리 진척도 닫기" onClick={close}><X /></Button>
        </div>
        <div className={`${styles.progressTable} site-stack-copy`} role="table" aria-label="메뉴별 조리 진척도">
          <div className={`${styles.progressHeader} ${styles.progressRow} type-caption site-copy-muted`} role="row">
            <span role="columnheader">메뉴명</span><span role="columnheader">미완성</span><span role="columnheader">완성</span>
          </div>
          {[...totals].map(([name, count]) => (
            <div key={name} className={`${styles.progressRow} type-body-sm`} role="row">
              <span className="min-w-0 break-words" role="cell">{name} × {count.incomplete + count.complete}</span>
              <span role="cell">{count.incomplete}</span><span role="cell">{count.complete}</span>
            </div>
          ))}
        </div>
        {!totals.size && <p className="type-body-sm site-copy-muted">조리 중인 메뉴가 없습니다.</p>}
      </div>
    </aside>
  );
}

export default function KitchenDashboard({
  menuSiteId, menuSiteName, orders, rooms = [], roomIdByTable = {}, canManage, receptionControl,
  mutateAction = mutateKitchenOrderAction,
}: {
  menuSiteId: string;
  menuSiteName: string;
  orders: KitchenOrder[];
  rooms?: { id: string; name: string }[];
  roomIdByTable?: Record<string, string>;
  canManage: boolean;
  receptionControl?: ReactNode;
  mutateAction?: typeof mutateKitchenOrderAction;
}) {
  const router = useRouter();
  const boardId = useId();
  const [roomFilter, setRoomFilter] = useState("all");
  const [view, setView] = useState("board");
  const [stage, setStage] = useState<KitchenStage>("before");
  const [stageFilter, setStageFilter] = useState<KitchenStage[]>([]);
  const [menuFilter, setMenuFilter] = useState<string[]>([]);
  const [sort, setSort] = useState("latest");
  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<KitchenSearchField>("order");
  const [selection, setSelection] = useState<string[]>([]);
  const [progressOpen, setProgressOpen] = useState(true);
  const [draggedId, setDraggedId] = useState<string>();
  const [dropTarget, setDropTarget] = useState<KitchenStage>();
  const [returnIds, setReturnIds] = useState<string[]>([]);
  const [printing, setPrinting] = useState<KitchenOrder[]>([]);
  const [now, setNow] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [refreshing, refresh] = useTransition();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!printing.length) return;
    const clear = () => setPrinting([]);
    window.addEventListener("afterprint", clear, { once: true });
    const timer = window.setTimeout(() => window.print(), 0);
    return () => {
      window.removeEventListener("afterprint", clear);
      window.clearTimeout(timer);
    };
  }, [printing]);

  const activeRoom = rooms.some(room => room.id === roomFilter) ? roomFilter : "all";
  const roomNames = new Map(rooms.map(room => [room.id, room.name]));
  const roomName = (order: KitchenOrder) => roomNames.get(roomIdByTable[order.tableId]);
  const roomOrders = orders.filter(order => activeRoom === "all" || roomIdByTable[order.tableId] === activeRoom);
  const menuChoices = [...new Set(roomOrders.flatMap(order => order.items.map(item => item.name)))].sort((a, b) => a.localeCompare(b, "ko"));
  const activeMenus = menuFilter.filter(name => menuChoices.includes(name));
  const visibleStages = stageFilter.length ? stageFilter : KITCHEN_STAGES;
  const mobileStage = visibleStages.includes(stage) ? stage : visibleStages[0];
  const search = query.trim().replace(/^#/, "").toLocaleLowerCase("ko");
  const visibleOrders = roomOrders.filter(order =>
    visibleStages.includes(getKitchenStage(order.status))
    && (!activeMenus.length || order.items.some(item => activeMenus.includes(item.name)))
    && (!search || (searchField === "order" ? String(order.orderNumber) : order.tableLabel.toLocaleLowerCase("ko")).includes(search))
  ).sort((a, b) => (Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.orderNumber - a.orderNumber) * (sort === "latest" ? 1 : -1));
  const selectedOrders = visibleOrders.filter(order => selection.includes(order.id));
  const ordersByStage = { before: [], cooking: [], ready: [] } as Record<KitchenStage, KitchenOrder[]>;
  for (const order of visibleOrders) ordersByStage[getKitchenStage(order.status)].push(order);

  function selectOrders(ids: string[], checked: boolean) {
    setSelection(current => {
      const activeIds = new Set(visibleOrders.map(order => order.id));
      const active = current.filter(id => activeIds.has(id));
      const next = checked ? [...new Set([...active, ...ids])] : current.filter(id => !ids.includes(id));
      return next.slice(0, KITCHEN_SELECTION_LIMIT);
    });
  }

  function submit(mutation: KitchenMutation) {
    if (pending || !canManage) return;
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await mutateAction(mutation);
        if (result.error) {
          setError(result.error);
          router.refresh();
          return;
        }
        if (mutation.action !== "check") {
          setSelection(current => current.filter(id => !mutation.orderIds.includes(id)));
          if (!stageFilter.length) {
            setStage(mutation.action === "start" ? "cooking" : mutation.action === "finish" ? "ready" : "before");
          }
        }
      } catch {
        setError("조리 상태를 저장하지 못했습니다. 다시 시도해 주세요.");
        router.refresh();
      }
    });
  }

  function move(orderIds: string[], action: KitchenStageAction) {
    if (action === "return") setReturnIds(orderIds);
    else submit({ menuSiteId, orderIds, action });
  }

  function controls(order: KitchenOrder): KitchenOrderControls {
    return {
      order, canManage, busy: pending,
      selected: selection.includes(order.id), select: checked => selectOrders([order.id], checked),
      check: (itemId, checked) => submit({ menuSiteId, orderIds: [order.id], action: "check", itemId, checked }),
      move: action => move([order.id], action),
    };
  }

  const dragged = visibleOrders.find(order => order.id === draggedId);
  const selectionFull = selectedOrders.length >= KITCHEN_SELECTION_LIMIT;
  const clearDrag = () => { setDraggedId(undefined); setDropTarget(undefined); };
  const showProgress = progressOpen && visibleStages.includes("cooking");

  return (
    <>
      {printing.length > 0 && createPortal(
        <div className={`${styles.printContainer} hidden print:block`}>
          {printing.map(order => (
            <div key={order.id} className={styles.printReceipt}><OrderReceipt order={order} menuSiteName={menuSiteName} /></div>
          ))}
        </div>,
        document.body,
      )}
      <div className="print:hidden">
        {rooms.length > 0 && (
          <Tabs purpose="section" appearance="rooms" value={activeRoom} onValueChange={value => {
            setRoomFilter(value);
            setMenuFilter([]);
            setSelection([]);
          }}>
            <TabsList aria-label="룸 선택">
              <TabsTrigger value="all" aria-controls={boardId}>모든 룸</TabsTrigger>
              {rooms.map(room => <TabsTrigger key={room.id} value={room.id} aria-controls={boardId}>{room.name}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        )}
        <div className={styles.workspace}>
          <div className={styles.viewBar}>
            <div className="site-action-row" data-distribution="between">
              <Tabs purpose="section" value={view} onValueChange={setView}>
                <TabsList size="sm" aria-label="주문 보기 방식">
                  <TabsTrigger value="board" aria-controls={boardId}>조리상태 칸반 뷰</TabsTrigger>
                  <TabsTrigger value="list" aria-controls={boardId}>리스트 뷰</TabsTrigger>
                </TabsList>
              </Tabs>
              {receptionControl}
            </div>
          </div>
          <div className={styles.toolbar}>
            <KitchenToolbar query={query} setQuery={setQuery} searchField={searchField} setSearchField={setSearchField}
              sort={sort} setSort={setSort} stages={stageFilter} setStages={setStageFilter}
              menus={activeMenus} setMenus={setMenuFilter} menuChoices={menuChoices} refreshing={refreshing}
              onRefresh={() => { setError(undefined); refresh(() => router.refresh()); }} />
          </div>
          {error && <p role="alert" className={`${styles.error} type-body-sm text-destructive`}>{error}</p>}
          <div id={boardId} aria-label="주방 주문" aria-busy={pending}>
            {view === "board" ? (
              <>
                <div className={`${styles.mobileTools} lg:hidden`}>
                  <Select value={mobileStage} onValueChange={value => {
                    const next = KITCHEN_STAGES.find(candidate => candidate === value);
                    if (next) setStage(next);
                  }}>
                    <SelectTrigger aria-label="조리 상태 보기"><SelectValue>{KITCHEN_STAGE_LABELS[mobileStage]} {ordersByStage[mobileStage].length}건</SelectValue></SelectTrigger>
                    <SelectContent>{visibleStages.map(value => <SelectItem key={value} value={value}>{KITCHEN_STAGE_LABELS[value]} {ordersByStage[value].length}건</SelectItem>)}</SelectContent>
                  </Select>
                  {!showProgress && visibleStages.includes("cooking") && (
                    <Button size="compact" variant="outline" onClick={() => setProgressOpen(true)}>조리 진척도</Button>
                  )}
                </div>
                <div className={styles.board} data-stage-count={visibleStages.length} data-progress-open={showProgress || undefined}>
                  {KITCHEN_STAGES.filter(value => visibleStages.includes(value)).map(value => {
                    const stageOrders = ordersByStage[value];
                    const stageIds = stageOrders.map(order => order.id);
                    const stageSelected = stageOrders.filter(order => selection.includes(order.id)).length;
                    const allSelected = stageIds.length > 0 && stageSelected === stageIds.length;
                    const canDrop = canManage && !pending && dragged && canChangeKitchenStage(dragged, KITCHEN_STAGE_ACTIONS[value]);
                    const headingId = `${boardId}-${value}`;
                    return (
                      <section key={value} className={styles.column} aria-labelledby={headingId}
                        data-stage={value} data-mobile-active={mobileStage === value}
                        data-drop-target={dropTarget === value || undefined}
                        onDragOver={event => {
                          if (!canDrop) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDropTarget(value);
                        }}
                        onDragLeave={event => {
                          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDropTarget(undefined);
                        }}
                        onDrop={event => {
                          if (!canDrop) return;
                          event.preventDefault();
                          clearDrag();
                          move([dragged.id], KITCHEN_STAGE_ACTIONS[value]);
                        }}>
                        <header className={styles.columnHeader}>
                          <Checkbox aria-label={`${KITCHEN_STAGE_LABELS[value]} 주문 선택`} disabled={!stageIds.length || pending}
                            checked={allSelected || (stageSelected > 0 ? "indeterminate" : false)}
                            onCheckedChange={() => selectOrders(stageIds, !allSelected && !(selectionFull && stageSelected > 0))} />
                          <h3 id={headingId} className={`${styles.stageName} type-item-title`}>
                            <span className={styles.stageDot} aria-hidden="true" />
                            {KITCHEN_STAGE_LABELS[value]}
                            <span className="type-caption site-copy-muted">{stageOrders.length}건</span>
                          </h3>
                          {value === "cooking" && !showProgress && (
                            <div className="hidden lg:block">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" iconSize="compact" variant="ghost" aria-label="조리 진척도" aria-expanded={false}
                                    onClick={() => setProgressOpen(true)}><BarChart3 /></Button>
                                </TooltipTrigger>
                                <TooltipContent>조리 진척도</TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </header>
                        <div className={styles.columnBody} data-progress={value === "cooking" && showProgress || undefined}>
                          <div className={styles.orderArea}>
                            {stageOrders.length ? (
                              <div className={styles.orderGrid}>{stageOrders.map(order => (
                                <KitchenOrderCard key={order.id} controls={controls(order)} now={now} roomName={roomName(order)}
                                  onDrag={setDraggedId} onDragEnd={clearDrag} selectionFull={selectionFull} />
                              ))}</div>
                            ) : <p className="type-body-sm site-copy-muted">주문이 없습니다.</p>}
                          </div>
                          {value === "cooking" && showProgress && (
                            <div className="hidden lg:contents">
                              <KitchenProgress orders={stageOrders} close={() => setProgressOpen(false)} />
                            </div>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
                {showProgress && <div className="lg:hidden">
                  <KitchenProgress orders={ordersByStage.cooking} close={() => setProgressOpen(false)} />
                </div>}
              </>
            ) : (
              <div className={`${styles.listView} site-stack-block`}>
                <div className="site-action-row" data-distribution="end">
                  <Button variant="outline" size="compact" aria-expanded={progressOpen} onClick={() => setProgressOpen(value => !value)}>조리 진척도</Button>
                </div>
                {progressOpen && <KitchenProgress orders={ordersByStage.cooking} close={() => setProgressOpen(false)} />}
                <Table variant="management" label="주방 주문 리스트" columns={["control", "text", "text", "detail", "actions"]}>
                  <TableHeader><TableRow>
                    <TableHead scope="col">주문번호</TableHead><TableHead scope="col">룸·테이블</TableHead>
                    <TableHead scope="col">주문시각</TableHead><TableHead scope="col">주문내역</TableHead><TableHead scope="col">조리상태</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {visibleOrders.length === 0 && <TableRow><TableCell colSpan={5}>주문이 없습니다.</TableCell></TableRow>}
                    {visibleOrders.map(order => {
                      const actions = controls(order);
                      const orderStage = getKitchenStage(order.status);
                      return <TableRow key={order.id} data-kitchen-order={order.id}>
                        <TableCell><KitchenOrderNumber order={order} selected={actions.selected} select={actions.select} disabled={pending || (selectionFull && !actions.selected)} /></TableCell>
                        <TableCell>{[roomName(order), order.tableLabel].filter(Boolean).join(" · ")}</TableCell>
                        <TableCell><KitchenOrderTime order={order} now={now} /></TableCell>
                        <TableCell><KitchenOrderItems {...actions} /></TableCell>
                        <TableCell><div className="site-stack-copy"><span><Badge tone={stageTones[orderStage]}>{KITCHEN_STAGE_LABELS[orderStage]}</Badge></span><KitchenOrderActions {...actions} /></div></TableCell>
                      </TableRow>;
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <footer className={styles.batchBar} aria-label="선택한 주문 일괄 처리">
            <div className="site-action-row" data-distribution="center">
              <p role="status" className="type-label">일괄 처리 <span className="type-caption site-copy-muted">{selectedOrders.length}건 선택</span></p>
              <div className="site-action-row">
                {canManage && (["return", "start", "finish"] as const).map(action => (
                  <Button key={action} size="compact" variant={view === "board" ? kitchenActionVariants[action] : "outline"} disabled={pending || !selectedOrders.length || !selectedOrders.every(order => canChangeKitchenStage(order, action))}
                    onClick={() => move(selectedOrders.map(order => order.id), action)}>{KITCHEN_ACTION_LABELS[action]}</Button>
                ))}
                <Button variant="outline" size="compact" disabled={!selectedOrders.length || pending} onClick={() => setPrinting(selectedOrders)}>청구서 인쇄</Button>
              </div>
            </div>
          </footer>
        </div>
      </div>
      <AlertDialog open={returnIds.length > 0} onOpenChange={open => { if (!open) setReturnIds([]); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>조리전으로 되돌릴까요?</AlertDialogTitle>
            <AlertDialogDescription>선택한 주문 {returnIds.length}건의 조리 시작을 되돌립니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => submit({ menuSiteId, orderIds: returnIds, action: "return" })}>조리전 처리</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
