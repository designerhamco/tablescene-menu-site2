"use client";

import Image from "next/image";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DETAIL_FEATURES, type DetailFeatureId } from "@/lib/template-detail-features";
import styles from "./template-feature-demo.module.css";

const subscribeMotion = (callback: () => void) => {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

export default function TemplateFeatureDemo({ feature, previewHref, image, name, steps }: { feature: DetailFeatureId; previewHref: string; image: string; name: string; steps?: readonly string[] }) {
  const featureDefinition = DETAIL_FEATURES.find(item => item.id === feature)!;
  const definition = { ...featureDefinition, steps: steps ?? featureDefinition.steps };
  const root = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(0);
  const [step, setStep] = useState(0);
  const [playRequested, setPlayRequested] = useState<boolean | null>(null);
  const reduced = useSyncExternalStore(subscribeMotion, () => matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const playing = playRequested ?? !reduced;
  const playback = useRef({ playing, step });
  useEffect(() => { playback.current = { playing, step }; }, [playing, step]);

  function send(command: Record<string, unknown>) {
    frame.current?.contentWindow?.postMessage({ type: "template-feature-command", ...command }, location.origin);
  }

  useEffect(() => {
    const element = root.current;
    const screenElement = screen.current;
    if (!element || !screenElement) return;
    const visibility = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (!entry.isIntersecting) setReady(false);
    }, { rootMargin: "80px 0px" });
    const size = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 1180));
    visibility.observe(element);
    size.observe(screenElement);
    return () => { visibility.disconnect(); size.disconnect(); };
  }, []);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== "template-feature-status") return;
      if (event.data.ready) {
        setReady(true);
        send(playback.current);
      }
      if (Number.isInteger(event.data.step) && event.data.step >= 0 && event.data.step < definition.steps.length) setStep(event.data.step);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [definition.steps.length]);

  useEffect(() => { send({ playing }); }, [playing]);

  const params = new URLSearchParams(previewHref.split("?")[1]);
  params.set("view", "actual");
  params.set("device", "tablet");
  params.set("embedded", "1");
  params.set("demoFeature", feature);
  const src = `${previewHref.split("?")[0]}?${params}`;
  return <div ref={root} className={styles.demo} data-feature-demo={feature} data-demo-ready={ready} data-demo-step={step} role="group" aria-label={`${definition.label} 기능 시연`}>
    <div className={styles.stage}>
      <div className={styles.tablet}>
        <div ref={screen} className={styles.screen} data-demo-screen="">
          <Image src={image} alt={`${name} 메뉴판에서 ${definition.label} 기능을 사용하는 예시`} width={1200} height={900} sizes="(min-width: 768px) 55vw, 90vw" className={styles.poster} />
          {visible && scale > 0 ? <iframe key={src} ref={frame} src={src} title={`${definition.label} 자동 시연 화면`} tabIndex={-1} aria-hidden="true" inert className={styles.frame} style={{ transform: `scale(${scale})`, opacity: ready ? 1 : 0 }} /> : null}
        </div>
      </div>
      <div className={styles.status}><span className={styles.statusDot} data-playing={playing && ready} /><span>{definition.steps[step]}</span><span className={styles.example}>기능 예시</span></div>
    </div>
    <div className={styles.controls}>
      <div className={styles.steps} aria-label="시연 단계 선택">{definition.steps.map((label, index) => <button key={label} type="button" aria-label={`${index + 1}단계: ${label}`} aria-pressed={step === index} onClick={() => { setStep(index); setPlayRequested(false); send({ step: index, playing: false }); }}><span>{String(index + 1).padStart(2, "0")}</span><span>{label}</span></button>)}</div>
      <div className={styles.playback}>
        <button type="button" className="site-button site-button-ghost" aria-label={`${definition.label} 시연 ${playing ? "일시정지" : "재생"}`} onClick={() => setPlayRequested(!playing)}>{playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}</button>
        <button type="button" className="site-button site-button-ghost" aria-label={`${definition.label} 시연 처음부터 보기`} onClick={() => { setStep(0); send({ step: 0, restart: true, playing }); }}><RotateCcw size={16} aria-hidden="true" /></button>
      </div>
    </div>
  </div>;
}
