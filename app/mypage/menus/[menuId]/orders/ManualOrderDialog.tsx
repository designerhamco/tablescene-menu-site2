"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/app/components/ui/accordion";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { FieldMessage } from "@/app/components/ui/field-message";
import { Input } from "@/app/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import { Minus, Plus, ShoppingCart, Trash2 } from "@/app/components/ui/site-icon";
import type { PostpayOrderCatalogItem } from "@/components/public-menu/order-call/types";
import type { ManualOrderActions, ManualOrderCategory } from "@/lib/manual-order";
import { getApplicableOrderCustomization, isOrderCustomizationValid, ORDER_LINE_REQUEST_LIMIT } from "@/lib/menu-order-customization";
import { normalizeOrderPhone } from "@/lib/order-session-policy";
import { POSTPAY_ORDER_MAX_LINES, POSTPAY_ORDER_MAX_LINE_UNITS, POSTPAY_ORDER_MAX_TOTAL_UNITS, type PostpayOrderLineInput } from "@/lib/postpay-order-payload";

type CartLine = { id: string; name: string; unitPrice: number; labels: string[]; input: PostpayOrderLineInput };
type Point = { id: string; label: string };

const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

function Quantity({ name, value, maximum, change }: { name: string; value: number; maximum: number; change: (value: number) => void }) {
  return (
    <div role="group" aria-label={`${name} 수량`} className="site-action-row flex-nowrap">
      <Button type="button" variant="ghost" size="icon" iconSize="compact" aria-label={`${name} 수량 줄이기`}
        disabled={value <= 1} onClick={() => change(value - 1)}><Minus aria-hidden /></Button>
      <output className="type-label tabular-nums">{value}</output>
      <Button type="button" variant="ghost" size="icon" iconSize="compact" aria-label={`${name} 수량 늘리기`}
        disabled={value >= maximum} onClick={() => change(value + 1)}><Plus aria-hidden /></Button>
    </div>
  );
}

function ItemDialog({ item, remaining, close, add, restoreFocus }: {
  item: PostpayOrderCatalogItem; remaining: number; close: () => void; add: (line: CartLine) => void; restoreFocus: (event: Event) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [productOption, setProductOption] = useState("");
  const [request, setRequest] = useState("");
  const fieldId = useId();
  const groupsValid = item.optionGroups.every(group => {
    const count = group.values.filter(value => selected.includes(value.id)).length;
    return count <= group.maxSelections && (count >= group.minSelections || (!group.isRequired && count === 0));
  });
  const chosen = item.optionGroups.flatMap(group => group.values.filter(value => selected.includes(value.id)));
  const priceColumn = chosen.find(value => value.priceColumnId)?.priceColumnId;
  const config = getApplicableOrderCustomization(item.customization, priceColumn);
  const unitPrice = item.price + chosen.reduce((sum, value) => sum + value.priceDelta, 0);
  const trimmed = request.trim();
  const valid = groupsValid && isOrderCustomizationValid(config, productOption || null, trimmed || null);

  function replaceGroup(groupIds: string[], current: string) {
    const newPriceColumn = item.optionGroups.flatMap(group => group.values).find(value => value.id === current)?.priceColumnId;
    if (item.customization?.priceColumnIds && newPriceColumn && newPriceColumn !== priceColumn) {
      setProductOption("");
      setRequest("");
    }
    setSelected(previous => [...previous.filter(id => !groupIds.includes(id)), ...(current ? [current] : [])]);
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) close(); }}>
      <DialogContent scrollable className="print:hidden" aria-describedby={undefined} onCloseAutoFocus={restoreFocus}>
        <DialogHeader reserveCloseButton>
          <DialogTitle>{item.name}</DialogTitle>
          <p className="type-body-sm">{won(item.price)}</p>
        </DialogHeader>
        <form className="site-stack-block" onSubmit={event => {
          event.preventDefault();
          if (!valid || remaining < quantity) return;
          add({
            id: crypto.randomUUID(), name: item.name, unitPrice,
            labels: [...chosen.map(option => option.name), `${productOption}${trimmed ? `${productOption ? " " : ""}(${trimmed})` : ""}`].filter(Boolean),
            input: {
              ...(item.id.startsWith("course:") ? { menuCategoryId: item.id.slice(7) } : { menuItemId: item.id }),
              quantity, optionValueIds: selected, productOption: productOption || null, lineRequest: trimmed || null,
            },
          });
        }}>
          {item.optionGroups.map(group => {
            const chosenIds = group.values.filter(value => selected.includes(value.id)).map(value => value.id);
            const optional = !group.isRequired || group.minSelections === 0;
            const title = group.name + (optional ? " (선택)" : " (필수)");
            const options = group.values.map(value => ({
              id: value.id, name: value.name, delta: value.priceDelta,
            }));
            return group.maxSelections === 1 ? (
              <div key={group.id} className="site-field-stack">
                <p id={group.id} className="type-label">{title}</p>
                <RadioGroup aria-labelledby={group.id} value={chosenIds[0] ?? "none"}
                  onValueChange={value => replaceGroup(options.map(option => option.id), value === "none" ? "" : value)}>
                  {optional && <label className="site-action-row type-body-sm"><RadioGroupItem value="none" /> 선택 안 함</label>}
                  {options.map(value => <label key={value.id} className="site-action-row type-body-sm">
                    <RadioGroupItem value={value.id} /> {value.name}{value.delta !== 0 && ` (${value.delta > 0 ? "+" : ""}${won(value.delta)})`}
                  </label>)}
                </RadioGroup>
              </div>
            ) : (
              <fieldset key={group.id} className="site-field-stack min-w-0">
                <legend className="type-label">{title}</legend>
                {options.map(value => <label key={value.id} className="site-action-row type-body-sm">
                  <Checkbox checked={selected.includes(value.id)} disabled={!selected.includes(value.id) && chosenIds.length >= group.maxSelections}
                    onCheckedChange={checked => setSelected(previous => checked === true ? [...previous, value.id] : previous.filter(id => id !== value.id))} />
                  {value.name}{value.delta !== 0 && ` (${value.delta > 0 ? "+" : ""}${won(value.delta)})`}
                </label>)}
              </fieldset>
            );
          })}
          {config.choices.length > 0 && (
            <div className="site-field-stack">
              <p id={fieldId + "-option"} className="type-label">{config.title || "상품 옵션"}{(!config.allowRequest || config.priceColumnIds) && " (필수)"}</p>
              <RadioGroup aria-labelledby={fieldId + "-option"} value={String(config.choices.indexOf(productOption))}
                onValueChange={value => setProductOption(config.choices[Number(value)] ?? "")}>
                {config.allowRequest && !config.priceColumnIds && <label className="site-action-row type-body-sm"><RadioGroupItem value="-1" /> 선택 안 함</label>}
                {config.choices.map((choice, index) => <label key={choice} className="site-action-row type-body-sm">
                  <RadioGroupItem value={String(index)} /> {choice}
                </label>)}
              </RadioGroup>
            </div>
          )}
          {config.allowRequest && (
            <div className="site-field-stack">
              <label htmlFor={fieldId + "-request"} className="type-label">{item.id.startsWith("course:") ? "코스 요청사항" : "상품 옵션 직접 입력"}</label>
              <Input id={fieldId + "-request"} value={request} maxLength={ORDER_LINE_REQUEST_LIMIT} onChange={event => setRequest(event.target.value)} />
            </div>
          )}
          <div className="site-content-divider" />
          <div className="site-action-row" data-distribution="between">
            <span className="type-label">수량</span>
            <Quantity name={item.name} value={quantity} maximum={Math.min(POSTPAY_ORDER_MAX_LINE_UNITS, remaining)} change={setQuantity} />
          </div>
          <Button type="submit" disabled={!valid || remaining < quantity} className="w-full">담기 · {won(unitPrice * quantity)}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ManualOrderDialog({ actions, point, close, onSuccess, onCloseAutoFocus }: {
  actions: ManualOrderActions;
  point: Point;
  close: () => void;
  onSuccess: (orderId: string) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const [catalog, setCatalog] = useState<ManualOrderCategory[]>();
  const [activeItem, setActiveItem] = useState<PostpayOrderCatalogItem>();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [notificationPhone, setNotificationPhone] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [catalogVersion, reloadCatalog] = useState(0);
  const [catalogStale, setCatalogStale] = useState(false);
  const [pending, startTransition] = useTransition();
  const requestId = useRef("");
  const itemTrigger = useRef<HTMLButtonElement>(null);
  const submitTrigger = useRef<HTMLButtonElement>(null);
  const phoneId = useId();
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.input.quantity, 0);
  const remaining = POSTPAY_ORDER_MAX_TOTAL_UNITS - lines.reduce((sum, line) => sum + line.input.quantity, 0);

  const load = actions.load;
  useEffect(() => {
    let active = true;
    void load().then(result => {
      if (!active) return;
      if ("error" in result) setError(result.error);
      else setCatalog(result.catalog);
    }).catch(() => { if (active) setError("메뉴 목록을 불러오지 못했습니다."); });
    return () => { active = false; };
  }, [load, catalogVersion]);

  function changeLines(next: CartLine[]) {
    requestId.current = "";
    setLines(next);
  }

  function refreshCatalog() {
    changeLines([]);
    setCatalog(undefined);
    setCatalogStale(false);
    setError("");
    reloadCatalog(version => version + 1);
  }

  function submit() {
    setError("");
    requestId.current ||= crypto.randomUUID();
    const clientRequestId = requestId.current;
    startTransition(async () => {
      try {
        const result = await actions.submit({ tableId: point.id, clientRequestId, lines: lines.map(line => line.input), notificationPhone, expectedTotal: total });
        if ("error" in result) {
          setError(result.error);
          setCatalogStale(Boolean(result.refreshCatalog));
        } else {
          onSuccess(result.orderId);
        }
      } catch {
        setError("주문 저장 결과를 확인하지 못했습니다. 같은 내용으로 다시 시도해 주세요.");
      }
    });
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !pending) close(); }}>
      <DialogContent scrollable data-manual-order className="print:hidden" aria-describedby={undefined} onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={event => { if (pending) event.preventDefault(); }}
        onInteractOutside={event => { if (pending) event.preventDefault(); }}>
        <DialogHeader reserveCloseButton><DialogTitle>수동 주문 추가 · {point.label}</DialogTitle></DialogHeader>
        <div className="site-stack-group" aria-busy={pending}>
          {catalog === undefined && !error && <p className="type-body-sm site-copy-muted" role="status">메뉴를 불러오는 중입니다.</p>}
          {catalog?.length === 0 && <p className="type-body-sm site-copy-muted" role="status">현재 주문 가능한 메뉴가 없습니다.</p>}
          {catalog && catalog.length > 0 && <Accordion type="single" collapsible defaultValue={catalog[0].id} aria-label="메뉴 카테고리">
            {catalog.map(category => <AccordionItem key={category.id} value={category.id}>
              <AccordionTrigger><span className="type-label">{category.name}</span></AccordionTrigger>
              <AccordionContent>
                <ul className="site-stack-detail">
                  {category.items.map(item => <li key={item.id} className="site-action-row" data-distribution="between">
                    <span className="type-body-sm break-words min-w-0">{item.name}</span>
                    <Button size="icon" iconSize="compact" variant="ghost" type="button" aria-label={`${item.name} 담기 옵션`}
                      disabled={pending || catalogStale || lines.length >= POSTPAY_ORDER_MAX_LINES || remaining < 1}
                      onClick={event => { itemTrigger.current = event.currentTarget; setActiveItem(item); }}>
                      <ShoppingCart aria-hidden />
                    </Button>
                  </li>)}
                </ul>
              </AccordionContent>
            </AccordionItem>)}
          </Accordion>}

          <section className="site-stack-block">
            <h3 className="type-label">담긴 내역</h3>
            {!lines.length && <p className="type-body-sm site-copy-muted">담긴 메뉴가 없습니다.</p>}
            <ul className="site-stack-copy">
              {lines.map(line => <li key={line.id} className="site-action-row" data-distribution="between">
                <div className="site-stack-detail min-w-0 break-words">
                  <span className="type-body-sm">{line.name}</span>
                  {line.labels.length > 0 && <span className="type-caption site-copy-muted">{line.labels.join(" · ")}</span>}
                </div>
                <div className="site-action-row">
                  <Quantity name={line.name} value={line.input.quantity}
                    maximum={pending ? line.input.quantity : Math.min(POSTPAY_ORDER_MAX_LINE_UNITS, line.input.quantity + remaining)}
                    change={quantity => { if (!pending) changeLines(lines.map(row => row.id === line.id ? { ...row, input: { ...row.input, quantity } } : row)); }} />
                  <span className="type-label tabular-nums">{won(line.unitPrice * line.input.quantity)}</span>
                  <Button size="icon" iconSize="compact" variant="ghost" type="button" disabled={pending} aria-label={`${line.name} 삭제`}
                    onClick={() => changeLines(lines.filter(row => row.id !== line.id))}><Trash2 aria-hidden /></Button>
                </div>
              </li>)}
            </ul>
            {(lines.length >= POSTPAY_ORDER_MAX_LINES || remaining < 1) && <p className="type-caption site-copy-muted">한 주문에 최대 20개 항목과 총 50개 수량을 담을 수 있습니다.</p>}
            <div className="site-content-divider" />
            <dl className="site-stack-copy">
              <div className="site-action-row type-label" data-distribution="between"><dt>최종 주문 금액</dt><dd className="tabular-nums">{won(total)}</dd></div>
              <div className="site-action-row type-body-sm" data-distribution="between"><dt>결제방식</dt><dd>후불결제</dd></div>
            </dl>
            <div className="site-field-stack">
              <label className="type-label" htmlFor={phoneId}>휴대폰 번호 (선택)</label>
              <Input id={phoneId} type="tel" maxLength={30} disabled={pending} value={notificationPhone}
                aria-invalid={Boolean(phoneError)} aria-describedby={phoneError ? phoneId + "-error" : undefined}
                onChange={event => { setNotificationPhone(event.target.value); setPhoneError(""); requestId.current = ""; }} />
              {phoneError && <FieldMessage id={phoneId + "-error"} role="alert">{phoneError}</FieldMessage>}
            </div>
            {error && <FieldMessage role="alert">{error}</FieldMessage>}
            {(catalogStale || (!catalog && error)) && (
              <div className="site-action-row">
                <Button variant="outline" onClick={refreshCatalog}>{catalogStale ? "담긴 내역 비우고 메뉴 다시 불러오기" : "메뉴 다시 불러오기"}</Button>
              </div>
            )}
            <div className="site-action-row" data-distribution="end">
              <Button type="button" variant="outline" disabled={pending} onClick={close}>취소</Button>
              <Button ref={submitTrigger} type="button" disabled={!lines.length || pending || catalogStale} onClick={() => {
                try { normalizeOrderPhone(notificationPhone.trim()); }
                catch { setPhoneError("휴대폰 번호를 확인해 주세요."); return; }
                setConfirming(true);
              }}>{pending ? "등록 중…" : "주문 추가"}</Button>
            </div>
          </section>
        </div>

        {activeItem && <ItemDialog key={activeItem.id} item={activeItem} remaining={remaining} close={() => setActiveItem(undefined)}
          restoreFocus={event => { event.preventDefault(); if (!itemTrigger.current?.disabled) itemTrigger.current?.focus(); else submitTrigger.current?.focus(); }}
          add={line => { changeLines([...lines, line]); setActiveItem(undefined); }} />}

        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); submitTrigger.current?.focus(); }}>
            <AlertDialogHeader>
              <AlertDialogTitle>{point.label}에 주문을 추가할까요?</AlertDialogTitle>
              <AlertDialogDescription>고객이 요청한 메뉴·옵션·수량을 다시 확인해 주세요. 후불 {won(total)}으로 등록됩니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>다시 확인</AlertDialogCancel>
              <Button onClick={() => { setConfirming(false); submit(); }}>후불 주문 등록</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
