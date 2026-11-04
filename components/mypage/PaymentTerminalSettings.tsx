"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { NewWindowIndicator } from "@/app/components/ui/new-window-indicator";
import KscatConnectionCheck from "./KscatConnectionCheck";
import { savePaymentTerminalPreparationAction } from "@/app/mypage/menus/[menuId]/orders/settings/payment-terminal-actions";
import {
  PAYMENT_TERMINAL_PROVIDERS, PAYMENT_TERMINAL_PROVIDER_INFO, emptyPaymentTerminalDraft,
  parsePaymentTerminalDraft, paymentTerminalMissingFields, paymentTerminalSupportInfo,
  type PaymentTerminalDraft, type PaymentTerminalPreparation, type PaymentTerminalProvider,
} from "@/lib/payment-terminal-preparation";

export default function PaymentTerminalSettings({ menuSiteId, preparations, storageAvailable, loadError = null }: {
  menuSiteId: string; preparations: PaymentTerminalPreparation[]; storageAvailable: boolean; loadError?: string | null;
}) {
  const [provider, setProvider] = useState<PaymentTerminalProvider>("nice_apppos_ios");
  const [entries, setEntries] = useState(() => Object.fromEntries(PAYMENT_TERMINAL_PROVIDERS.map(key => [key, preparations.find(item => item.draft.provider === key) ?? null])) as Record<PaymentTerminalProvider, PaymentTerminalPreparation | null>);
  const [drafts, setDrafts] = useState(() => Object.fromEntries(PAYMENT_TERMINAL_PROVIDERS.map(key => [key, entries[key]?.draft ?? emptyPaymentTerminalDraft(key)])) as Record<PaymentTerminalProvider, PaymentTerminalDraft>);
  const [pending, startTransition] = useTransition();
  const draft = drafts[provider], info = PAYMENT_TERMINAL_PROVIDER_INFO[provider];
  const update = (key: keyof Omit<PaymentTerminalDraft, "provider">, value: string) => setDrafts(current => ({ ...current, [provider]: { ...current[provider], [key]: value } }));

  function checkPreparation() {
    try {
      const parsed = parsePaymentTerminalDraft(draft), missing = paymentTerminalMissingFields(parsed);
      if (missing.length) toast.info(`아직 준비하지 않은 정보: ${missing.join(", ")}. 업체 안내를 받은 뒤 입력해 주세요.`);
      else toast.info("입력값의 형식을 확인했습니다. 실제 단말기 연결과 카드 결제는 아직 검증하지 않았습니다.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "입력한 정보를 확인해 주세요."); }
  }

  function save() {
    let parsed: PaymentTerminalDraft;
    try { parsed = parsePaymentTerminalDraft(draft); }
    catch (error) { toast.error(error instanceof Error ? error.message : "입력한 정보를 확인해 주세요."); return; }
    startTransition(async () => {
      const result = await savePaymentTerminalPreparationAction(menuSiteId, parsed, entries[provider]?.revision ?? 0);
      if (!result.ok) { toast.error(result.message); return; }
      setEntries(current => ({ ...current, [provider]: result.preparation }));
      setDrafts(current => ({ ...current, [provider]: result.preparation.draft }));
      toast.success("연결 준비 정보를 저장했습니다. 실제 결제는 아직 활성화되지 않습니다.");
    });
  }

  async function copySupportInfo() {
    try {
      const parsed = parsePaymentTerminalDraft(draft);
      await navigator.clipboard.writeText(paymentTerminalSupportInfo(menuSiteId, parsed));
      toast.success("사업자·단말기 번호 일부를 가린 문의용 정보를 복사했습니다.");
    } catch { toast.error("정보를 확인하거나 클립보드 사용을 허용한 뒤 다시 시도해 주세요."); }
  }

  return <div className="site-stack-group">
    <ContentPanel as="aside" surface="notice" density="compact">
      <div className="site-stack-title">
        <h3 className="type-content-title">결제 단말기 연결을 준비하고 있어요</h3>
        <p className="type-body-sm">업체에서 받은 정보를 미리 정리할 수 있습니다. 현재는 아티메뉴에서 단말기로 결제 금액을 보내거나 카드 승인을 받을 수 없습니다. 기존 ‘결제 완료 기록’은 계속 사용할 수 있습니다.</p>
      </div>
    </ContentPanel>

    <ContentPanel>
      <div className="site-stack-title">
        <h3 className="type-content-title">연결 준비 정보</h3>
        <p className="type-body-sm site-copy-muted">모르는 값은 비워 두세요. 단말기 업체에서 발급·안내받은 값을 입력하면 됩니다.</p>
      </div>
      <div className="site-field-stack">
        <label className="type-label" htmlFor="payment-terminal-provider">업체·연결 방식</label>
        <select id="payment-terminal-provider" className="site-field w-full" value={provider} onChange={event => setProvider(event.target.value as PaymentTerminalProvider)} disabled={pending}>
          {PAYMENT_TERMINAL_PROVIDERS.map(key => <option key={key} value={key}>{PAYMENT_TERMINAL_PROVIDER_INFO[key].label}</option>)}
        </select>
      </div>
      <p className="type-body-sm site-copy-muted">{info.readiness}</p>
      <div className="site-form-row">
        <label className="site-field-stack"><span className="type-label">사용 예정 단말기 모델</span>
          <Input value={draft.terminalModel} maxLength={100} autoComplete="off" placeholder={provider === "nice_apppos_ios" ? "예: NICE NM-400" : "업체에서 안내받은 실제 모델명"} onChange={event => update("terminalModel", event.target.value)} disabled={pending} />
        </label>
        <label className="site-field-stack"><span className="type-label">사업자등록번호</span>
          <Input value={draft.businessNumber} maxLength={20} inputMode="numeric" autoComplete="off" placeholder="업체에 등록한 사업자번호" onChange={event => update("businessNumber", event.target.value)} disabled={pending} />
        </label>
      </div>
      <div className="site-form-row">
        <label className="site-field-stack"><span className="type-label">{provider === "nice_apppos_ios" ? "NICE CATID" : "업체 단말기 번호"}</span>
          <Input value={draft.terminalId} maxLength={32} autoComplete="off" placeholder="업체에서 발급한 번호" onChange={event => update("terminalId", event.target.value)} disabled={pending} />
        </label>
        {provider === "ksnet_kscat_windows" ? <div className="site-field-stack"><label className="type-label" htmlFor="kscat-web-port">KSCAT WEB 포트</label>
          <Input id="kscat-web-port" aria-describedby="kscat-web-port-help" value={draft.localPort} maxLength={5} inputMode="numeric" autoComplete="off" placeholder="예: 27098" onChange={event => update("localPort", event.target.value)} disabled={pending} />
          <p id="kscat-web-port-help" className="type-footnote site-copy-muted">KSCAT 설정 화면의 WEB 포트와 같은 값을 입력하세요.</p>
        </div> : null}
      </div>
      {loadError || !storageAvailable ? <p className="type-body-sm site-copy-muted" role="status">{loadError ?? "계정에 저장하는 기능은 준비 중입니다. 지금은 입력 형식 확인과 문의용 정보 복사를 사용할 수 있습니다. 입력값은 이 화면을 벗어나면 사라집니다."}</p> : <p className="type-caption site-copy-muted">{entries[provider] ? "저장된 준비 정보가 있습니다. 변경 후 다시 저장해 주세요." : "아직 저장한 준비 정보가 없습니다."}</p>}
      <div className="site-action-row">
        <Button type="button" onClick={save} disabled={pending || !storageAvailable || Boolean(loadError)}>{pending ? "저장 중…" : "준비 정보 저장"}</Button>
        <Button type="button" variant="outline" onClick={checkPreparation} disabled={pending}>입력 정보 확인</Button>
        <Button type="button" variant="outline" onClick={copySupportInfo} disabled={pending}>문의용 정보 복사</Button>
      </div>
    </ContentPanel>

    <ContentPanel>
      <div className="site-stack-title"><h3 className="type-content-title">설치·연결·결제 테스트</h3><p className="type-body-sm site-copy-muted">{info.platform} 기기에서 {info.program}을 사용합니다. 프로그램 설치와 결제 승인은 각각 확인해야 합니다.</p></div>
      {provider === "ksnet_kscat_windows" ? <ol className="site-stack-block type-body-sm">
        <li>1. 사용할 Windows 기기에 KSNET의 KSCAT을 설치합니다.</li>
        <li>2. KSCAT에서 WebServer를 켜고 서비스를 시작한 뒤, 위에 같은 WEB 포트를 입력합니다.</li>
        <li>3. 아래 ‘KSCAT 연결 확인’으로 이 기기의 프로그램 응답을 확인합니다.</li>
        <li>4. 실제 카드 결제는 지원 장비와 테스트 계정을 준비하고 연동 검증을 마친 뒤 사용할 수 있습니다.</li>
      </ol> : <ol className="site-stack-block type-body-sm">
        <li>1. 업체에 개발용 단말기와 테스트 계정 사용 조건을 확인합니다.</li>
        <li>2. 공식 프로그램·앱을 설치하고 업체 안내대로 리더기를 연결합니다.</li>
        <li>3. 아티메뉴 연동 준비가 완료되면 연결 확인, 테스트 결제, 결과 확인, 취소를 순서대로 진행합니다.</li>
      </ol>}
      <div className="site-action-row">
        <Button asChild variant="outline"><a href={info.download} target="_blank" rel="noopener noreferrer">공식 설치 안내<NewWindowIndicator /></a></Button>
        <Button asChild variant="outline"><a href={info.documentation} target="_blank" rel="noopener noreferrer">업체 연동 안내<NewWindowIndicator /></a></Button>
      </div>
      {provider === "ksnet_kscat_windows" ? <KscatConnectionCheck key={`${menuSiteId}:${provider}`} port={draft.localPort} /> : null}
      <div className="site-action-row">
        {provider !== "ksnet_kscat_windows" ? <Button type="button" variant="secondary" disabled>연결 확인 준비 중</Button> : null}
        <Button type="button" variant="secondary" disabled>결제 테스트 준비 중</Button>
      </div>
      <p className="type-footnote site-copy-muted">카드 결제 테스트는 업체 규격과 단말기 검증을 마친 뒤 제공합니다. 이 화면은 실제 결제를 실행하지 않습니다.</p>
    </ContentPanel>
  </div>;
}
