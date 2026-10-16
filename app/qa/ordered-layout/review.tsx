"use client";

import { useEffect, useRef, useState } from "react";
import { ONE_PAGE_QA_TEMPLATES, ONE_PAGE_QA_VIEWPORTS, getOnePageQaPreviewUrl } from "@/lib/one-page-qa";

export default function OrderedLayoutReview() {
  const [template, setTemplate] = useState<string>("restaurant_onue_a");
  const [viewportIndex, setViewportIndex] = useState(0);
  const [call, setCall] = useState(true);
  const [locale, setLocale] = useState("ko");
  const [mode, setMode] = useState("orderedFit");
  const [reload, setReload] = useState(0);
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const [status, setStatus] = useState("불러오는 중");
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const viewport = ONE_PAGE_QA_VIEWPORTS[viewportIndex];
  const src = getOnePageQaPreviewUrl(template, viewport.device, call, locale, mode);
  const scale = Math.min(1, available.width / viewport.width, available.height / viewport.height);

  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const win = frame.current?.contentWindow;
      const board = win?.document.querySelector<HTMLElement>(".cafe-a-desktop-fit-board");
      if (!win || !board) return;
      const state = viewport.device === "mobile" ? "모바일 읽기 화면" : board.dataset.fitPresentationState === "ready" ? "배치 완료" : "배치 계산 중";
      setStatus(`${win.innerWidth}×${win.innerHeight} · ${state}`);
    }, 700);
    return () => clearInterval(timer);
  }, [src, reload, viewport.device]);

  const control = "rounded-md border border-stone-300 bg-white px-3 py-2 text-sm";
  return (
    <main className="flex h-dvh min-h-0 flex-col bg-stone-100 text-stone-900">
      <header className="flex flex-wrap items-center gap-3 border-b border-stone-300 bg-white px-5 py-3">
        <div className="mr-auto"><h1 className="type-content-title">채움형 배치 검수</h1><p className="text-xs text-stone-600">스타터 미리보기 · 계정 저장 없이 확인</p></div>
        <label className="text-sm">화면 <select aria-label="화면 크기" value={viewportIndex} onChange={e => setViewportIndex(Number(e.target.value))} className={control}>{ONE_PAGE_QA_VIEWPORTS.map((v, i) => <option key={v.name} value={i}>{v.name}</option>)}</select></label>
        <select aria-label="배치 방식" value={mode} onChange={e => setMode(e.target.value)} className={control}><option value="orderedFit">채움형</option><option value="orderedBalancedFit">묶음형 비교</option></select>
        <select aria-label="언어" value={locale} onChange={e => setLocale(e.target.value)} className={control}><option value="ko">한국어</option><option value="en">English</option><option value="zh">中文</option><option value="ja">日本語</option></select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={call} onChange={e => setCall(e.target.checked)} />호출 미리보기</label>
        <button className={control} onClick={() => { setStatus("불러오는 중"); setReload(v => v + 1); }}>다시 불러오기</button>
        <a className={control} href={src} target="_blank" rel="noreferrer">새 창에서 열기 ↗</a>
      </header>
      <nav aria-label="검수 템플릿" className="flex flex-wrap gap-2 border-b border-stone-300 px-5 py-3">{ONE_PAGE_QA_TEMPLATES.map(t => <button key={t.key} aria-pressed={template === t.key} onClick={() => { setStatus("불러오는 중"); setTemplate(t.key); }} className={`rounded-full border px-3 py-2 text-sm ${template === t.key ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`}>{t.name}</button>)}</nav>
      <div className="flex items-center justify-between px-5 py-2 text-xs text-stone-600"><span>{status}</span><span>화면 맞춤 {Math.round(scale * 100)}% · 메뉴 계산은 선택한 실제 해상도 기준</span></div>
      <div ref={host} className="mx-4 mb-4 flex min-h-0 flex-1 items-start justify-center overflow-hidden">
        <div style={{ width: viewport.width * scale, height: viewport.height * scale, position: "relative" }}>
          <iframe key={`${src}-${reload}`} ref={frame} title="메뉴판 검수 미리보기" src={src} style={{ width: viewport.width, height: viewport.height, border: 0, transform: `scale(${scale})`, transformOrigin: "top left", background: "white" }} />
        </div>
      </div>
    </main>
  );
}
