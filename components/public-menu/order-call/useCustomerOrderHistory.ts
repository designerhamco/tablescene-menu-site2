"use client";
import {useCallback, useEffect, useRef, useState} from "react";
import {parseCustomerOrderHistory, type CustomerOrderSnapshot} from "@/lib/customer-order-history";

const POLL_MS = 5000;
type State = {scope: string; orders: CustomerOrderSnapshot[]; hasMore: boolean; loading: boolean; error: string; pendingId: string | null};
const empty: State = {scope: "", orders: [], hasMore: false, loading: false, error: "", pendingId: null};
/** Poll only while the live history is visible. Preview storage never makes these requests. */
export function useCustomerOrderHistory(menuSiteId: string, cartScope: string, enabled: boolean) {
  const scope = `${menuSiteId}:${cartScope}`;
  const [state, setState] = useState<State>(empty);
  const [revision, setRevision] = useState(0);
  const pending = useRef(false);
  const mountedScope = useRef(scope);
  useEffect(() => {mountedScope.current = scope;}, [scope]);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let disposed = false, timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null, sequence = 0, failures = 0, terminal = false;
    async function read() {
      if (disposed || document.visibilityState === "hidden") return;
      const requestSequence = ++sequence;
      controller?.abort(); controller = new AbortController();
      setState(current => ({...(current.scope === scope ? current : empty), scope, loading: true}));
      try {
        const res = await fetch(`/api/public-menu/orders?${new URLSearchParams({menuSiteId})}`, {cache: "no-store", signal: controller.signal, credentials: "same-origin"});
        const body = await res.json();
        terminal = res.status === 401 || res.status === 403;
        if (!res.ok || !body.ok) throw new Error(res.status === 401 ? "테이블 방문 세션이 만료되었습니다." : "주문내역을 불러오지 못했습니다.");
        const history = parseCustomerOrderHistory(body);
        if (!disposed && requestSequence === sequence) {failures = 0; setState(current => ({...current, scope, ...history, loading: false, error: ""}));}
      } catch(error) {
        if (!disposed && requestSequence === sequence && !(error instanceof Error && error.name === "AbortError")) {failures++; setState(current => ({...current, scope, loading: false, orders: terminal ? [] : current.orders, error: error instanceof Error && error.message === "테이블 방문 세션이 만료되었습니다." ? error.message : "주문내역을 불러오지 못했습니다."}));}
      } finally {
        if (!disposed && requestSequence === sequence && !terminal) timer = setTimeout(read, Math.min(30000, POLL_MS * 2 ** failures));
      }
    }
    function resume() { clearTimeout(timer); if (document.visibilityState === "hidden") {sequence++; controller?.abort();} else if (!terminal) void read(); }
    queueMicrotask(() => {if (!disposed) void read();});
    document.addEventListener("visibilitychange", resume); window.addEventListener("focus", resume);
    return () => {disposed = true; clearTimeout(timer); controller?.abort(); document.removeEventListener("visibilitychange", resume); window.removeEventListener("focus", resume);};
  }, [enabled, menuSiteId, scope, revision]);
  async function cancel(id: string): Promise<string> {
    if (pending.current || !enabled) return "";
    pending.current = true;
    setState(current => ({...current, pendingId: id}));
    try {
      const res = await fetch("/api/public-menu/orders", {method: "PATCH", credentials: "same-origin", headers: {"Content-Type":"application/json"}, body: JSON.stringify({menuSiteId, orderId: id})});
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(res.status === 401 ? "테이블 방문 세션이 만료되었습니다." : res.status === 409 ? "이미 접수되었거나 결제된 주문은 취소할 수 없습니다. 직원에게 문의해 주세요." : "주문을 취소하지 못했습니다.");
      if (mountedScope.current !== scope) return "";
      setState(current => current.scope !== scope ? current : ({...current, orders: current.orders.map(order => order.id === id ? {...order, status: "cancelled"} : order)}));
      return "주문이 취소되었습니다.";
    } catch(error) {return mountedScope.current === scope ? (error instanceof Error && ["테이블 방문 세션이 만료되었습니다.", "이미 접수되었거나 결제된 주문은 취소할 수 없습니다. 직원에게 문의해 주세요."].includes(error.message) ? error.message : "주문을 취소하지 못했습니다.") : "";}
    finally {pending.current = false; if (mountedScope.current === scope) {setState(current => ({...current, pendingId: null})); refresh();}}
  }
  return {...(state.scope === scope ? state : {...empty, scope, loading: enabled}), refresh, cancel};
}
