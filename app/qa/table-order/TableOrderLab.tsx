"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
type DemoOrder = {
  id: string;
  tableLabel: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  lines: {
    name: string;
    quantity: number;
    options: string[];
    unitPrice: number;
  }[];
};
const LABELS: Record<string, string> = {
  received: "접수 대기",
  accepted: "접수",
  cooking: "준비 중",
  ready: "준비 완료",
  served: "제공 완료",
  cancelled: "취소",
};
const NEXT: Record<string, string> = {
  received: "accepted",
  accepted: "cooking",
  cooking: "ready",
  ready: "served",
};
export default function TableOrderLab() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [device, setDevice] = useState("pc");
  const [order, setOrder] = useState(true);
  const [call, setCall] = useState(true);
  const [prepay, setPrepay] = useState(true);
  const [layout, setLayout] = useState("orderedBalancedFit");
  const [scenario, setScenario] = useState("");
  const query = new URLSearchParams({
    device,
    view: "actual",
    embedded: "1",
    layoutMode: layout,
    pageTest: scenario,
    ...(order ? { orderPreview: "on" } : {}),
    ...(call ? { callPreview: "on" } : {}),
    prepayPreview: device === "mobile" && order && prepay ? "on" : "off",
  });
  const src = "/templates/cafe_real_matcha_paged_test/preview?" + query;
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== "artimenu-preview-order"
      )
        return;
      const o = event.data.order;
      if (
        !o ||
        typeof o.id !== "string" ||
        !Array.isArray(o.lines) ||
        !Number.isFinite(o.totalAmount) ||
        o.lines.length < 1 ||
        o.lines.length > 20
      )
        return;
      setOrders((current) =>
        current.some((x) => x.id === o.id) ? current : [o, ...current],
      );
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center gap-5 border-y border-zinc-200 py-5">
        <label>
          기기{" "}
          <select
            aria-label="테스트 기기"
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className="ml-2 rounded-xl border border-zinc-300 p-2"
          >
            <option value="pc">PC</option>
            <option value="tablet">태블릿</option>
            <option value="mobile">모바일</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={call}
            onChange={(e) => setCall(e.target.checked)}
          />{" "}
          호출 기능
        </label>
        <label>
          <input
            type="checkbox"
            checked={order}
            onChange={(e) => setOrder(e.target.checked)}
          />{" "}
          주문 기능
        </label>
        {device === "mobile" && order ? (
          <label>
            <input
              type="checkbox"
              checked={prepay}
              onChange={(e) => setPrepay(e.target.checked)}
            />{" "}
            선결제 표시 · 준비 중
          </label>
        ) : null}
        <div role="group" aria-label="배치 방식" className="flex rounded-full border border-zinc-300 p-1">
          {([['orderedBalancedFit', '묶음형'], ['orderedFit', '채움형']] as const).map(([mode, label]) => <button key={mode} type="button" aria-pressed={layout === mode} onClick={() => setLayout(mode)} className={`rounded-full px-4 py-2 ${layout === mode ? "bg-zinc-950 text-white" : "text-zinc-700"}`}>{label}</button>)}
        </div>
        <select
          aria-label="테스트 콘텐츠"
          className="rounded-xl border border-zinc-300 p-2"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
        >
          <option value="">기본 메뉴</option>
          <option value="options">필수 옵션</option>
          <option value="images">전체 상품 썸네일</option>
          <option value="dense">많은 메뉴</option>
          <option value="widgets">중간·마지막 위젯</option>
          <option value="long">긴 상품 설명</option>
        </select>
      </div>
      <div className="mt-6 overflow-auto bg-zinc-100 p-3">
        <iframe
          ref={frame}
          src={src}
          title="리얼맛차 스크롤 주문 테스트"
          className="mx-auto block border-0 bg-white"
          style={{
            width: device === "mobile" ? 390 : device === "tablet" ? 820 : 1440,
            height:
              device === "mobile" ? 844 : device === "tablet" ? 1180 : 900,
          }}
        />
      </div>
      <div className="mt-5 flex flex-wrap gap-4">
        <Link
          className="site-button site-button-secondary"
          target="_blank"
          href={"/templates/cafe_real_matcha_paged_test/preview?" + new URLSearchParams({...Object.fromEntries(query), view: "", embedded: ""})}
        >
          전체 미리보기
        </Link>
        <Link
          className="site-button site-button-secondary"
          target="_blank"
          href="/templates/cafe_design_a/preview"
        >
          원본 리얼맛차 비교
        </Link>
      </div>
      <section className="mt-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="type-section-title">주문 접수 테스트</h2>
          <span role="status" aria-live="polite">
            새 주문 {orders.filter((o) => o.status === "received").length}건 ·
            총 {orders.length}건
          </span>
        </div>
        <p className="site-body mt-4 text-zinc-500">
          위 메뉴판에서 상품을 담고 후불로 주문하면 이곳에 표시됩니다. 창을
          새로고침하면 테스트 주문은 초기화됩니다.
        </p>
        {!orders.length ? (
          <p className="py-12 text-zinc-500">접수된 테스트 주문이 없습니다.</p>
        ) : (
          orders.map((o) => (
            <article
              key={o.id}
              data-demo-order
              className="border-b border-zinc-200 py-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="type-content-title">
                  {o.tableLabel} · {LABELS[o.status]}
                </h3>
                <time dateTime={o.createdAt}>
                  {new Date(o.createdAt).toLocaleString("ko-KR")}
                </time>
              </div>
              <ul className="my-5 space-y-3">
                {o.lines.map((line, i) => (
                  <li key={i}>
                    {line.name} × {line.quantity}
                    {line.options.length ? " · " + line.options.join(", ") : ""}
                  </li>
                ))}
              </ul>
              <p className="font-semibold">
                {o.totalAmount.toLocaleString("ko-KR")}원 · 후불 미결제
              </p>
              <div className="mt-5 flex gap-3">
                {NEXT[o.status] ? (
                  <button
                    className="site-button site-button-primary"
                    onClick={() =>
                      setOrders((all) =>
                        all.map((x) =>
                          x.id === o.id ? { ...x, status: NEXT[x.status] } : x,
                        ),
                      )
                    }
                  >
                    {LABELS[NEXT[o.status]]} 처리
                  </button>
                ) : null}
                {!["served", "cancelled"].includes(o.status) ? (
                  <button
                    className="site-button site-button-secondary"
                    onClick={() =>
                      setOrders((all) =>
                        all.map((x) =>
                          x.id === o.id ? { ...x, status: "cancelled" } : x,
                        ),
                      )
                    }
                  >
                    테스트 주문 취소
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
