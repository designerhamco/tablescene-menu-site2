"use client";
import { formatMenuMoney } from "@/lib/menu-ui-copy";
import { useMenuLocale, useMenuText } from "@/components/menu-templates/shared/MenuLocaleScope";

import {
  ArrowLeft,
  Check,
  Minus,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  toggleOrderOption,
  isOrderOptionSelectionValid,
} from "@/lib/order-cart-options";
import { createPortal } from "react-dom";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type {
  OrderCheckoutMode,
  PostpayOrderCatalogItem,
  PostpayOrderCatalogOptionGroup,
} from "./types";

import CustomerOrderHistory from "./CustomerOrderHistory";
import { useCustomerOrderHistory } from "./useCustomerOrderHistory";
import { canCustomerCancelOrder, parsePreviewOrderHistory, type CustomerOrderSnapshot } from "@/lib/customer-order-history";
import type { MenuPreviewDevice } from "@/lib/menu-preview-devices";
import styles from "./PostpayOrderCartDrawer.module.css";
import ui from "./MenuInteractionUI.module.css";
import { MenuOrderIcon, type MenuOrderIconVariant } from "./MenuActionIcons";

type StoredCartLine = {
  menuItemId: string;
  quantity: number;
  optionValueIds: string[];
};

type CartLine = StoredCartLine & {
  key: string;
  name: string;
  unitPrice: number;
  optionNames: string[];
};

type PostpayOrderCartDrawerProps = {
  iconVariant?: MenuOrderIconVariant;
  open: boolean;
  onClose: () => void;
  menuSiteId: string;
  cartScope: string;
  catalog: PostpayOrderCatalogItem[];
  checkoutMode?: OrderCheckoutMode;
  checkoutModes?: OrderCheckoutMode[];
  previewOnly?: boolean;
  typographyStyle?: CSSProperties;
  interactionStyle?: CSSProperties;
  tableLabel?: string;
  device?: MenuPreviewDevice;
  selectedMenuItemId?: string | null;
  onCountChange: (count: number) => void;
  onItemAdded: (itemName: string) => void;
};


function getLineKey(menuItemId: string, optionValueIds: string[]) {
  return `${menuItemId}:${[...optionValueIds].sort().join(",")}`;
}

function hydrateCartLine(
  line: StoredCartLine,
  catalog: PostpayOrderCatalogItem[],
): CartLine | null {
  const item = catalog.find((candidate) => candidate.id === line.menuItemId);
  if (
    !item ||
    !Number.isInteger(line.quantity) ||
    line.quantity < 1 ||
    line.quantity > 20
  )
    return null;
  if (
    !Array.isArray(line.optionValueIds) ||
    new Set(line.optionValueIds).size !== line.optionValueIds.length ||
    item.optionGroups.some(
      (group) =>
        !isOrderOptionSelectionValid(group, new Set(line.optionValueIds)),
    )
  )
    return null;
  const values = item.optionGroups.flatMap((group) => group.values);
  const selected = line.optionValueIds.map((id) =>
    values.find((value) => value.id === id),
  );
  if (selected.some((value) => !value)) return null;
  return {
    ...line,
    key: getLineKey(line.menuItemId, line.optionValueIds),
    name: item.name,
    unitPrice:
      item.price +
      selected.reduce((sum, value) => sum + (value?.priceDelta ?? 0), 0),
    optionNames: selected.flatMap((value) => value?.name ?? []),
  };
}

function getCheckoutModeLabel(mode: OrderCheckoutMode) {
  return mode === "prepay" ? "지금 결제" : "후불 결제";
}

export default function PostpayOrderCartDrawer({
  iconVariant = "cart",
  open,
  onClose,
  menuSiteId,
  cartScope,
  catalog,
  checkoutMode = "postpay",
  checkoutModes,
  previewOnly = false,
  typographyStyle,
  interactionStyle,
  tableLabel = "현재 테이블",
  device,
  selectedMenuItemId = null,
  onCountChange,
  onItemAdded,
}: PostpayOrderCartDrawerProps) {
  const t = useMenuText();
  const locale = useMenuLocale();
  const formatPrice = (value: number) => formatMenuMoney(value, locale);
  const dialogRef = useRef<HTMLDivElement>(null);
  const tabId = useId();
  const [activeTab, setActiveTab] = useState<"cart" | "history">("cart");
  const [historySurface, setHistorySurface] = useState(false);
  const [historyState, setHistoryState] = useState<{ scope: string; orders: CustomerOrderSnapshot[] }>({ scope: "", orders: [] });
  const historyKey = `artimenu-preview-order-history:${menuSiteId}:${cartScope}`;
  const liveHistory = useCustomerOrderHistory(menuSiteId, cartScope, open && !previewOnly && historySurface && activeTab === "history");
  const history = previewOnly ? (historyState.scope === historyKey ? historyState.orders : []) : liveHistory.orders;
  useEffect(() => {
    if (!previewOnly) return;
    let cancelled = false;
    let orders: CustomerOrderSnapshot[] = [];
    try { orders = parsePreviewOrderHistory(window.sessionStorage.getItem(historyKey)); } catch {}
    queueMicrotask(() => { if (!cancelled) setHistoryState({ scope: historyKey, orders }); });
    return () => { cancelled = true; };
  }, [historyKey, previewOnly]);
  useEffect(() => {
    if (!previewOnly || historyState.scope !== historyKey) return;
    try { window.sessionStorage.setItem(historyKey, JSON.stringify(historyState.orders)); } catch {}
  }, [historyState, historyKey, previewOnly]);

  useEffect(() => {
    if (!open || !historySurface) return;
    const frame = requestAnimationFrame(() => {
      const panel = document.getElementById(`${tabId}-panel`);
      if (panel) panel.scrollTop = 0;
      document.getElementById(`${tabId}-${activeTab}`)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, historySurface, activeTab, tabId]);

  function openHistory() {
    setActiveTab("history");
    setHistorySurface(true);
    setMessage("");
  }
  function cancelPreviewOrder(id: string) {
    if (!previewOnly) return;
    setHistoryState(current => current.scope !== historyKey ? current : ({ ...current,
      orders: current.orders.map(order => order.id === id && canCustomerCancelOrder(order.status, order.paymentStatus)
        ? { ...order, status: "cancelled" } : order),
    }));
    setMessage(t("미리보기 주문이 취소되었습니다."));
  }
  async function cancelOrder(id: string) {
    if (previewOnly) { cancelPreviewOrder(id); return; }
    setMessage("");
    const message = await liveHistory.cancel(id);
    if (message) setMessage(t(message));
  }
  function showHistoryExamples() {
    if (!previewOnly || !catalog.length || history.length) return;
    const orders: CustomerOrderSnapshot[] = (["received", "cooking", "served"] as const).map((status, index) => {
      const item = catalog[index % catalog.length];
      return { id: crypto.randomUUID(), orderNumber: 3-index, tableLabel, status,
        createdAt: new Date(Date.now() - index * 600000).toISOString(),
        paymentStatus: status === "served" ? "manual_paid" : "unpaid", example: true,
        totalAmount: item.price, lines: [{ name: item.name, quantity: 1, options: [], unitPrice: item.price }] };
    });
    setHistoryState({ scope: historyKey, orders });
  }
  const storageKey = `${previewOnly ? "artimenu-preview-cart" : "menulink-postpay-cart"}:${menuSiteId}:${cartScope}`;
  const availableCheckoutModes = useMemo(() => {
    const allowed = checkoutModes?.filter(
      (mode, index, modes) => modes.indexOf(mode) === index,
    ) ?? [checkoutMode];
    return allowed.length ? allowed : [checkoutMode];
  }, [checkoutMode, checkoutModes]);
  const [selectedCheckoutMode, setSelectedCheckoutMode] =
    useState<OrderCheckoutMode>("postpay");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydratedScope, setHydratedScope] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<PostpayOrderCatalogItem | null>(
    null,
  );
  const [editingLineKey, setEditingLineKey] = useState<string | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(
    new Set(),
  );
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let nextCart: CartLine[] = [];
    {
      try {
        const parsed = JSON.parse(
          (previewOnly ? window.sessionStorage : window.localStorage).getItem(
            storageKey,
          ) ?? "[]",
        ) as StoredCartLine[];
        nextCart = Array.isArray(parsed)
          ? parsed.flatMap((line) => hydrateCartLine(line, catalog) ?? [])
          : [];
      } catch {}
    }
    queueMicrotask(() => {
      if (cancelled) return;
      setCart(nextCart);
      setHydratedScope(storageKey);
    });
    return () => {
      cancelled = true;
    };
  }, [catalog, previewOnly, storageKey]);

  useEffect(() => {
    if (hydratedScope !== storageKey) return;
    const stored = cart.map(
      ({ menuItemId, quantity: lineQuantity, optionValueIds }) => ({
        menuItemId,
        quantity: lineQuantity,
        optionValueIds,
      }),
    );
    {
      try {
        (previewOnly ? window.sessionStorage : window.localStorage).setItem(
          storageKey,
          JSON.stringify(stored),
        );
      } catch {}
    }
    onCountChange(cart.reduce((sum, line) => sum + line.quantity, 0));
  }, [cart, hydratedScope, onCountChange, previewOnly, storageKey]);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setActiveItem(null);
        setEditingLineKey(null);
        setActiveTab("cart");
        setHistorySurface(false);
      });
      return;
    }
    if (!selectedMenuItemId) return;
    const item = catalog.find(
      (candidate) => candidate.id === selectedMenuItemId,
    );
    if (!item) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setActiveItem(item);
      setEditingLineKey(null);
      setSelectedOptionIds(new Set());
      setQuantity(1);
      setMessage("");
    });
    return () => {
      cancelled = true;
    };
  }, [catalog, open, selectedMenuItemId]);

  const totalAmount = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [cart],
  );
  const totalUnits = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart],
  );
  const activeItemUnitPrice = useMemo(() => {
    if (!activeItem) return 0;
    const selectedValues = activeItem.optionGroups
      .flatMap((group) => group.values)
      .filter((value) => selectedOptionIds.has(value.id));
    return (
      activeItem.price +
      selectedValues.reduce((sum, value) => sum + value.priceDelta, 0)
    );
  }, [activeItem, selectedOptionIds]);

  function resetPendingRequest() {
    setPendingRequestId(null);
    setMessage("");
  }

  function toggleOption(
    group: PostpayOrderCatalogOptionGroup,
    optionId: string,
  ) {
    setSelectedOptionIds((current) =>
      toggleOrderOption(group, current, optionId),
    );
  }

  function addActiveItem() {
    if (
      !activeItem ||
      activeItem.optionGroups.some(
        (group) => !isOrderOptionSelectionValid(group, selectedOptionIds),
      )
    ) {
      setMessage(t("필수 옵션과 선택 개수를 확인해 주세요."));
      return;
    }
    const optionValueIds = [...selectedOptionIds].sort();
    const hydrated = hydrateCartLine(
      { menuItemId: activeItem.id, quantity, optionValueIds },
      catalog,
    );
    if (!hydrated) {
      setMessage(t("메뉴 정보를 다시 확인해 주세요."));
      return;
    }
    const itemName = activeItem.name;
    const workingCart = editingLineKey
      ? cart.filter((line) => line.key !== editingLineKey)
      : cart;
    const existing = workingCart.find((line) => line.key === hydrated.key);
    let nextCart: CartLine[];
    if (existing) {
      const nextQuantity = existing.quantity + quantity;
      const nextUnitCount =
        workingCart.reduce((sum, line) => sum + line.quantity, 0) -
        existing.quantity +
        nextQuantity;
      if (nextQuantity > 20 || nextUnitCount > 50) {
        setMessage(t("한 메뉴는 20개, 장바구니 전체는 50개까지 담을 수 있어요."));
        return;
      }
      nextCart = workingCart.map((line) =>
        line.key === hydrated.key ? { ...line, quantity: nextQuantity } : line,
      );
    } else {
      const nextUnitCount =
        workingCart.reduce((sum, line) => sum + line.quantity, 0) + quantity;
      if (workingCart.length >= 20 || nextUnitCount > 50) {
        setMessage(t("장바구니에는 메뉴 20종, 전체 50개까지 담을 수 있어요."));
        return;
      }
      nextCart = [...workingCart, hydrated];
    }
    setCart(nextCart);
    resetPendingRequest();
    setActiveItem(null);
    setSelectedOptionIds(new Set());
    setQuantity(1);
    if (editingLineKey) {
      setEditingLineKey(null);
      setMessage(t("{0}의 옵션과 수량을 변경했어요.", itemName));
    } else {
      onItemAdded(itemName);
    }
  }

  function changeLineQuantity(key: string, delta: number) {
    setCart((current) =>
      current.flatMap((line) => {
        if (line.key !== key) return line;
        const nextQuantity = line.quantity + delta;
        if (nextQuantity < 1) return line;
        if (nextQuantity > 20 || totalUnits + delta > 50) return line;
        return { ...line, quantity: nextQuantity };
      }),
    );
    resetPendingRequest();
  }

  function removeLine(key: string) {
    setCart((current) => current.filter((line) => line.key !== key));
    resetPendingRequest();
  }

  function beginEditLine(line: CartLine) {
    const item = catalog.find((candidate) => candidate.id === line.menuItemId);
    if (!item) return;
    setActiveItem(item);
    setEditingLineKey(line.key);
    setSelectedOptionIds(new Set(line.optionValueIds));
    setQuantity(line.quantity);
    setMessage("");
  }

  async function submitOrder() {
    if (cart.length < 1 || submitting) return;
    if (previewOnly) {
      const order: CustomerOrderSnapshot = {
        id: crypto.randomUUID(), orderNumber: Math.max(0, ...history.map(order => order.orderNumber)) + 1,
        tableLabel, createdAt: new Date().toISOString(), status: "received", paymentStatus: "unpaid", totalAmount,
        lines: cart.map(line => ({ name: line.name, quantity: line.quantity, options: line.optionNames, unitPrice: line.unitPrice })),
      };
      setHistoryState(current => ({ scope: historyKey, orders: [order, ...(current.scope === historyKey ? current.orders : [])] }));
      if (window.parent !== window) window.parent.postMessage({ type: "artimenu-preview-order", order }, window.location.origin);
      setCart([]);
      setActiveTab("history");
      setHistorySurface(true);
      setMessage(t("미리보기 주문이 접수되었습니다. 실제 매장에는 전송되지 않습니다."));
      return;
    }
    const requestId = pendingRequestId ?? crypto.randomUUID();
    setPendingRequestId(requestId);
    setSubmitting(true);
    setMessage("");
    try {
      const result = await fetch("/api/public-menu/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuSiteId,
          clientRequestId: requestId,
          requestText: "",
          lines: cart.map(
            ({ menuItemId, quantity: lineQuantity, optionValueIds }) => ({
              ...(menuItemId.startsWith("course:")
                ? { menuCategoryId: menuItemId.slice(7) }
                : { menuItemId }),
              quantity: lineQuantity,
              optionValueIds,
            }),
          ),
        }),
      });
      const body = (await result.json()) as {
        ok?: boolean;
        message?: string;
        order?: { orderNumber?: number };
      };
      if (!result.ok || !body.ok)
        throw new Error(body.message || t("주문을 전송하지 못했습니다."));
      setCart([]);
      setPendingRequestId(null);
      setActiveTab("history");
      setHistorySurface(true);
      liveHistory.refresh();
      setMessage(t("주문 {0}번이 접수되었습니다.", body.order?.orderNumber ?? ""));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : t("주문을 전송하지 못했습니다."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function closeItemSheet() {
    setActiveItem(null);
    setEditingLineKey(null);
    setSelectedOptionIds(new Set());
    setQuantity(1);
    if (!editingLineKey) onClose();
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() =>
      dialogRef.current
        ?.querySelector<HTMLElement>(
          "button:not([disabled]),input:not([disabled])",
        )
        ?.focus(),
    );
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = [
        ...(dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]',
        ) ?? []),
      ].filter((el) => el.getClientRects().length);
      const first = nodes[0],
        last = nodes.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = old;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
    // The parent supplies a fresh close callback; dialog lifetime follows selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeItem?.id]);

  if (!open) return null;

  if (activeItem) {
    return createPortal(
      <div
        ref={dialogRef}
        style={{ ...typographyStyle, ...interactionStyle }}
        className={`${ui.typography} fixed inset-0 z-[1200] flex items-end justify-center bg-zinc-950/35 text-zinc-950`}
        role="dialog"
        aria-modal="true"
        aria-label={t("{0} 담기", activeItem.name)}
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label={t("메뉴 담기 닫기")}
          onClick={closeItemSheet}
        />
        <section className="relative z-10 mx-auto max-h-[72dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 shadow-none">
          <div
            className={ui.handle}
            aria-hidden="true"
          />
          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{activeItem.name}</p>
              <p className="mt-1 text-sm font-medium text-zinc-500">
                {formatPrice(activeItemUnitPrice)}
              </p>
            </div>
            <button
              type="button"
              className={ui.close}
              aria-label={t("메뉴 담기 닫기")}
              onClick={closeItemSheet}
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {activeItem.optionGroups.map((group) => (
              <fieldset
                key={group.id}
                className="border-0 border-b border-zinc-200 px-0 pb-4"
              >
                <legend className="px-1 text-sm font-semibold">
                  {t(group.name)}{" "}
                  {group.isRequired ? (
                    <span className="text-zinc-500">{t("필수")}</span>
                  ) : null}
                </legend>
                <p className="mb-3 text-xs font-medium text-zinc-400">
                  {group.minSelections}–{group.maxSelections}{t("개 선택")}</p>
                <div className="space-y-2">
                  {group.values.map((value) => {
                    const selected = selectedOptionIds.has(value.id);
                    return (
                      <button
                        key={value.id}
                        type="button"
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left text-sm font-medium ${selected ? ui.primary : "border-zinc-200"}`}
                        aria-pressed={selected}
                        onClick={() => toggleOption(group, value.id)}
                      >
                        <span>{value.name}</span>
                        <span>
                          {value.priceDelta > 0 ? (
                            `+${formatPrice(value.priceDelta)}`
                          ) : selected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            ""
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <div className="flex items-center justify-between border-y border-zinc-100 py-4">
              <span className="text-sm font-semibold">{t("수량")}</span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className={`${ui.quantity} border border-zinc-200 p-2`}
                  aria-label={t("수량 줄이기")}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-5 text-center font-semibold">
                  {quantity}
                </span>
                <button
                  type="button"
                  className={`${ui.quantity} border border-zinc-200 p-2`}
                  aria-label={t("수량 늘리기")}
                  onClick={() => setQuantity(Math.min(20, quantity + 1))}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button
              type="button"
              className={`${ui.primary} w-full px-5 py-3.5 text-sm`}
              onClick={addActiveItem}
            >
              {editingLineKey
                ? t("변경사항 저장")
                : t("{0} · 장바구니 담기", formatPrice(activeItemUnitPrice * quantity))}
            </button>
            {message ? (
              <p
                className="rounded-lg bg-zinc-100 p-4 text-sm font-medium"
                role="status"
              >
                {message}
              </p>
            ) : null}
          </div>
        </section>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      className={styles.backdrop}
      style={interactionStyle}
      data-device={device ?? "auto"}
      data-empty={cart.length || historySurface ? "false" : "true"}
      data-menu-cart=""
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div ref={dialogRef} className={`${styles.panel} ${ui.typography}`} role="dialog" aria-modal="true" aria-label={activeTab === "history" ? t("주문내역") : t("장바구니")}>
        {cart.length > 0 || historySurface ? <header className={styles.header}>
          <button type="button" className={styles.back} onClick={onClose} aria-label={t("메뉴판으로 돌아가기")} data-cart-back>
            <ArrowLeft aria-hidden="true" strokeWidth={1.7} />
          </button>
          <div className={styles.heading}>
            <h2>{activeTab === "history" ? t("주문내역") : t("장바구니")}</h2>
            <p data-cart-table>{tableLabel}</p>
          </div>
          <span className={styles.count}>{activeTab === "history" ? t("{0}건", history.length) : `${totalUnits}/50`}</span>
        </header> : null}

        {(cart.length > 0 || historySurface) ? <div className={styles.tabs} role="tablist" aria-label={t("주문 메뉴")}
          onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? "cart" : event.key === "End" ? "history" : activeTab === "cart" ? "history" : "cart";
            setActiveTab(next); setHistorySurface(true); setMessage("");
            event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
          }}>
          {(["cart", "history"] as const).map(tab => <button key={tab} type="button" role="tab" data-tab={tab}
            id={`${tabId}-${tab}`} aria-selected={activeTab === tab} aria-controls={`${tabId}-panel`} tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => { setActiveTab(tab); setHistorySurface(true); setMessage(""); }}>
            {tab === "cart" ? t("장바구니{0}", totalUnits ? ` (${totalUnits})` : "") : t("주문내역")}
          </button>)}
        </div> : null}
        <div className={styles.body} id={`${tabId}-panel`}
          role={(cart.length > 0 || historySurface) ? "tabpanel" : undefined}
          aria-labelledby={(cart.length > 0 || historySurface) ? `${tabId}-${activeTab}` : undefined}>

          <div className="space-y-6">
            {activeTab === "history" ? <CustomerOrderHistory orders={history} onCancel={cancelOrder} onExamples={previewOnly ? showHistoryExamples : undefined}
              previewOnly={previewOnly} loading={!previewOnly && liveHistory.loading} error={previewOnly ? "" : liveHistory.error}
              pendingId={liveHistory.pendingId} hasMore={!previewOnly && liveHistory.hasMore} onRefresh={liveHistory.refresh} /> : cart.length ? (
              <>
                <section>
                  <div className="divide-y divide-zinc-200">
                    {cart.map((line) => (
                      <div key={line.key} className="py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{line.name}</p>
                            {line.optionNames.length ? (
                              <p className="mt-1 text-xs font-medium text-zinc-400">
                                {line.optionNames.join(", ")}
                              </p>
                            ) : null}
                          </div>
                          <p className="text-sm font-semibold">
                            {formatPrice(line.unitPrice * line.quantity)}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1">
                            {catalog.find((item) => item.id === line.menuItemId)
                              ?.optionGroups.length ? (
                              <button
                                type="button"
                                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                                onClick={() => beginEditLine(line)}
                              >
                                <Pencil
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />{" "}
                                {t("옵션 변경")}</button>
                            ) : null}
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                              aria-label={t("{0} 삭제", line.name)}
                              onClick={() => removeLine(line.key)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className={`${ui.quantity} border border-zinc-200 p-2 disabled:cursor-not-allowed disabled:opacity-35`}
                              aria-label={t("{0} 수량 줄이기", line.name)}
                              disabled={line.quantity <= 1}
                              onClick={() => changeLineQuantity(line.key, -1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-sm font-semibold">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              className={`${ui.quantity} border border-zinc-200 p-2`}
                              aria-label={t("{0} 수량 늘리기", line.name)}
                              onClick={() => changeLineQuantity(line.key, 1)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <button
                  type="button"
                  className={`${ui.secondary} flex w-full items-center justify-center gap-2 px-5 py-3.5 text-sm`}
                  onClick={onClose}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> {t("메뉴 더 담기")}</button>
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>{t("최종 주문 금액")}</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
                <section>
                  <h3 className="text-sm font-semibold">{t("결제 방식")}</h3>
                  {availableCheckoutModes.length > 1 ? (
                    <div
                      className="mt-3 grid grid-cols-2 rounded-lg bg-zinc-100 p-1"
                      role="group"
                      aria-label={t("결제 방식 선택")}
                    >
                      {availableCheckoutModes.map((mode) => {
                        const selected = mode === selectedCheckoutMode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            aria-pressed={selected}
                            disabled={mode === "prepay"}
                            className={`rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${selected ? "bg-white text-zinc-950" : "text-zinc-500"}`}
                            onClick={() => {
                              setSelectedCheckoutMode(mode);
                              setMessage("");
                            }}
                          >
                            {mode === "prepay"
                              ? t("선결제 · 준비 중")
                              : t(getCheckoutModeLabel(mode))}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-between border-y border-zinc-200 py-3 text-sm font-normal">
                      <span>{t("매장에서 결제")}</span>
                      <span className="text-zinc-500">{t("후불 결제")}</span>
                    </div>
                  )}
                  <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">
                    {selectedCheckoutMode === "prepay"
                      ? t("휴대폰에서 바로 결제한 뒤 주문을 전송합니다.")
                      : t("지금 주문하고 매장에서 나중에 결제합니다.")}
                  </p>
                </section>
                <button
                  type="button"
                  className={`${ui.primary} w-full px-5 py-3.5 text-sm disabled:opacity-50`}
                  disabled={submitting}
                  onClick={submitOrder}
                >
                  {submitting
                    ? t("주문 전송 중…")
                    : selectedCheckoutMode === "prepay"
                      ? t("{0} 결제하기", formatPrice(totalAmount))
                      : t("후불로 주문하기")}
                </button>
              </>
            ) : (
              <div className={styles.empty}>
                <MenuOrderIcon variant={iconVariant} purpose="view" className="h-8 w-8 text-zinc-400" strokeWidth={1.5} />
                <h3 className="mt-5 text-xl font-semibold">
                  {t("장바구니가 비어 있어요")}</h3>
                <p className="mt-2 text-sm font-medium text-zinc-500">
                  {t("메뉴판에서 원하는 메뉴를 담아보세요.")}</p>
                <button
                  type="button"
                  className={`${ui.primary} mt-6 px-6 py-3 text-sm`}
                  onClick={onClose}
                >
                  {t("메뉴 보러 가기")}</button>
                {!historySurface ? <button type="button" className={styles.historyLink} onClick={openHistory}>{t("주문내역 보기")}</button> : null}
              </div>
            )}
            {message ? (
              <p
                className="rounded-lg bg-zinc-100 p-4 text-sm font-medium"
                role="status"
              >
                {message}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
