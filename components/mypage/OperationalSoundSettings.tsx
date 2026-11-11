"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Volume2 } from "@/app/components/ui/site-icon";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Slider } from "@/app/components/ui/slider";
import { Switch } from "@/app/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import type { DashboardArrivalKind, DashboardBrowserNotificationPermission } from "@/lib/dashboard-arrival-alerts";
import { DEFAULT_OPERATIONAL_SOUND, OPERATIONAL_SOUND_CHANGED, enableOperationalAlerts, getOperationalBrowserPermission, readOperationalSound, saveOperationalSound, playOperationalSound, stopOperationalSound, type OperationalSoundPreference } from "@/lib/operational-sound";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";

export default function OperationalSoundSettings({ menuSiteId, kind }: { menuSiteId: string; kind: DashboardArrivalKind }) {
  const [saved, setSaved] = useState(DEFAULT_OPERATIONAL_SOUND), [draft, setDraft] = useState(DEFAULT_OPERATIONAL_SOUND);
  const [ready, setReady] = useState(false), [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [pending, setPending] = useState(false), [permission, setPermission] = useState<DashboardBrowserNotificationPermission>("unsupported");
  const dirty = useRef(false), id = useId(), noun = kind === "orders" ? "주문" : "호출";
  useEffect(() => {
    let active = true; dirty.current = false;
    const sync = () => { if (!active) return; const next = readOperationalSound(menuSiteId, kind); setSaved(next); setPermission(getOperationalBrowserPermission()); if (!dirty.current) setDraft(next); setReady(true); };
    window.queueMicrotask(sync); window.addEventListener("focus", sync); window.addEventListener("storage", sync); window.addEventListener(OPERATIONAL_SOUND_CHANGED, sync);
    return () => { active = false; window.removeEventListener("focus", sync); window.removeEventListener("storage", sync); window.removeEventListener(OPERATIONAL_SOUND_CHANGED, sync); stopOperationalSound(); };
  }, [menuSiteId, kind]);
  function change(value: Partial<OperationalSoundPreference>) { dirty.current = true; setDraft(old => ({ ...old, ...value })); }
  async function save() {
    if (pending) return;
    setPending(true);
    try {
      const enabled = draft.receiveEnabled ? await enableOperationalAlerts(draft) : null;
      if (enabled) setPermission(enabled.permission);
      else stopOperationalSound();
      saveOperationalSound(menuSiteId, kind, draft); dirty.current = false; setSaved(draft);
      setFeedback({ message: `${noun} 알림·소리 설정을 이 브라우저에 저장했습니다.${enabled && !enabled.soundReady ? " 소리를 재생하려면 브라우저의 소리 허용과 기기 음량을 확인해 주세요." : ""}`, tone: "success" });
    } catch { setFeedback({ message: "알림 설정을 저장하지 못했습니다. 브라우저의 저장 공간 설정을 확인해 주세요.", tone: "error" }); }
    finally { setPending(false); }
  }
  return <ContentPanel aria-label={`${noun} 알림·소리 설정`} aria-busy={pending}>
    <ActionFeedbackToast message={feedback?.message} tone={feedback?.tone} eventKey={feedback} />
    <div className="site-content-heading-row"><div className="site-stack-title"><h3 className="type-content-title">{noun} 알림·소리</h3><p className="type-body-sm site-copy-muted">새 {noun}은 {noun} 내역 화면에 항상 표시합니다. 이 브라우저에서 받을 알림과 소리를 설정해 주세요.</p></div><button type="button" className="site-button site-button-primary" disabled={!ready || pending} onClick={save}>{pending ? "저장 중" : "알림 설정 저장"}</button></div>
    <fieldset className="site-stack-group" disabled={!ready || pending}>
      <div className="site-stack-copy"><label className="site-action-row" data-distribution="between"><span className="type-label">새 {noun} 알림·소리 받기</span><Switch checked={draft.receiveEnabled} onCheckedChange={receiveEnabled => change({ receiveEnabled })} disabled={!ready || pending} /></label><p className="type-body-sm site-copy-muted">켜고 저장하면 {noun} 내역 화면을 열어 둔 동안 브라우저 알림과 아래에서 설정한 안내음을 받습니다.</p>
      {permission === "denied" ? <p className="type-body-sm site-copy-muted" role="status">브라우저 알림이 차단되어 있습니다. 화면의 새 접수 안내와 소리는 사용할 수 있습니다. 시스템 알림을 받으려면 브라우저의 사이트 알림을 허용해 주세요.</p> : permission === "unsupported" && ready ? <p className="type-body-sm site-copy-muted" role="status">이 브라우저는 시스템 알림을 지원하지 않습니다. 화면의 새 접수 안내와 소리는 사용할 수 있습니다.</p> : null}</div>
      <label className="site-action-row" data-distribution="between"><span className="type-label">{noun} 알림음 사용</span><Switch checked={draft.enabled} onCheckedChange={enabled => change({ enabled })} disabled={!ready || pending} /></label>
      <div className="site-form-row"><label className="site-field-stack type-label">알림음<select className="site-field w-full" value={draft.tone} disabled={!ready || pending} onChange={event => change({ tone: event.target.value as OperationalSoundPreference["tone"] })}><option value="chime">효과음 1 · 맑은 안내음</option><option value="bell">효과음 2 · 종소리</option><option value="beep">효과음 3 · 짧은 알림</option></select></label><button type="button" className="site-button site-button-outline" disabled={!ready || !draft.enabled || draft.volume === 0} onClick={async () => { if (!await playOperationalSound(draft)) setFeedback({ message: "소리를 재생하지 못했습니다. 브라우저의 소리 허용과 기기 음량을 확인해 주세요.", tone: "error" }); }}><Volume2 aria-hidden="true" />미리 듣기</button></div>
      <div className="site-field-stack"><label id={`${id}-volume`} className="type-label">음량 조절 · {draft.volume}%</label><Slider value={[draft.volume]} min={0} max={100} step={25} aria-labelledby={`${id}-volume`} disabled={!ready || pending} onValueChange={value => change({ volume: value[0] })} /><div className="site-action-row" data-distribution="between" aria-hidden="true">{[0,25,50,75,100].map(volume => <span key={volume} className="type-caption site-copy-muted">{volume}</span>)}</div></div>
      <div className="site-field-stack"><p id={`${id}-repeat`} className="type-label">반복</p><RadioGroup orientation="horizontal" className="site-action-row" aria-labelledby={`${id}-repeat`} value={String(draft.repeat)} onValueChange={value => change({ repeat: Number(value) as 1 | 3 | 5 })} disabled={!ready || pending}>{([1,3,5] as const).map(count => <label className="site-action-row type-label" key={count}><RadioGroupItem value={String(count)} />{count}번 반복</label>)}</RadioGroup></div>
      <p className="type-footnote site-copy-muted">다른 기기와 다른 종류의 알림 설정은 바뀌지 않습니다. {JSON.stringify(draft) !== JSON.stringify(saved) ? "변경한 내용은 저장 후 적용됩니다." : "이 브라우저에 저장된 설정입니다."}</p>
    </fieldset>
  </ContentPanel>;
}
