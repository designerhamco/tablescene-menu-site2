"use client";
import { useEffect, useId, useState, useTransition } from "react";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { FieldMessage } from "@/app/components/ui/field-message";
import { FieldActionRow } from "@/app/components/ui/field-action-row";
import { Switch } from "@/app/components/ui/switch";
import InfoTooltip from "@/components/ui/InfoTooltip";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import { findAlimtalkCategory, type MerchantChannelAction, type MerchantChannelInput, type MerchantChannelPage, type MerchantChannelResult } from "@/lib/merchant-alimtalk-channel";

export default function OrderReadyNotificationSettings({ initial, action }: { initial: MerchantChannelPage; action?: MerchantChannelAction }) {
  const prefix = useId();
  const [connection, setConnection] = useState(initial.connection);
  const [channelId, setChannelId] = useState(initial.connection?.channelId ?? "");
  const [phone, setPhone] = useState("");
  const [categoryCode, setCategoryCode] = useState(initial.connection?.categoryCode ?? "");
  const [token, setToken] = useState("");
  const [feedback, setFeedback] = useState<MerchantChannelResult>();
  const [notice, setNotice] = useState<{ text: string; event: number }>();
  const [now, setNow] = useState<number | null>(null);
  const [busy, start] = useTransition();
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const connected = connection?.state === "connected";
  const active = connection && ["pending", "requesting", "verifying"].includes(connection.state);
  const expired = Boolean(active && now && now >= Date.parse(connection!.expiresAt));
  const waiting = Boolean(active && !expired);
  const seconds = now && connection ? Math.min(60, Math.max(0, Math.ceil((Date.parse(connection.requestedAt) + 60_000 - now) / 1_000))) : connection ? 60 : 0;
  const disabled = !initial.available || !action || busy;
  const majors = initial.categories;
  const major = majors.find(row => categoryCode.startsWith(row.code));
  const middle = major?.children.find(row => categoryCode.startsWith(row.code));
  const leaf = findAlimtalkCategory(majors, categoryCode);
  function run(input: MerchantChannelInput) {
    if (!action || busy) return;
    setFeedback(undefined);
    start(async () => {
      try {
        const result = await action(input);
        setFeedback(result);
        if (result.connection) {
          setConnection(result.connection);
          setChannelId(result.connection.channelId);
          setCategoryCode(result.connection.categoryCode);
        }
        if (input.intent === "verify") setToken("");
        if (result.connection?.state === "connected") setPhone("");
        if (result.notice) setNotice({ text: result.notice, event: Date.now() });
      } catch { setFeedback({ error: "채널 연결을 처리하지 못했습니다. 다시 시도해 주세요." }); }
    });
  }
  const fieldError = (field: MerchantChannelResult["field"]) => feedback?.field === field ? feedback?.error : undefined;
  return <ContentPanel aria-label="조리완료 알림톡 채널 설정">
    <ActionFeedbackToast message={notice?.text} eventKey={notice?.event} />
    <div className="site-content-heading-row">
      <div className="site-action-row" data-wrap="nowrap">
        <h3 className="type-content-title">매장 채널 연결</h3>
        <InfoTooltip label="채널 연결 도움말"><p>카카오 비즈니스 인증을 받은 매장 채널이 필요합니다. 검색용 ID와 카카오 채널 관리자 계정에 등록된 휴대폰 번호를 입력해 주세요. 인증번호는 해당 번호의 카카오톡으로 도착합니다.</p></InfoTooltip>
      </div>
      <span className="type-label site-copy-muted" role="status">{connected ? "연결 완료" : waiting ? "인증 대기" : "미연결"}</span>
    </div>
    {!initial.available && <p className="type-body-sm" role="status">{initial.message ?? "채널 연결을 사용할 수 없습니다."}</p>}
    {connected ? <div className="site-stack-copy">
      <p className="type-body">{connection.channelId}</p>
      {connection.verifiedAt && <p className="type-caption site-copy-muted">연결일 {formatKoreanDateTime(connection.verifiedAt)}</p>}
    </div> : <div className="site-stack-group">
      {initial.existingChannelId && <div className="site-action-row">
        <Button type="button" variant="outline" disabled={disabled || waiting} aria-busy={busy}
          onClick={() => run({ intent: "connect-existing" })}>기존 {initial.existingChannelId} 연결</Button>
        <InfoTooltip label="기존 채널 연결 안내"><p>NHN에서 이미 인증했고 이 매장에 연결하도록 승인된 채널입니다. 등록 상태를 다시 확인한 뒤 연결하며, 고객 알림톡 발송은 켜지지 않습니다.</p></InfoTooltip>
      </div>}
      <form className="site-stack-block" onSubmit={event => { event.preventDefault(); run({ intent: "request", channelId, adminPhone: phone, categoryCode }); }}>
        <div className="site-field-grid">
          <label className="site-field-stack"><span className="type-label">채널 검색용 ID</span>
            <Input value={channelId} onChange={event => setChannelId(event.target.value)} placeholder="@매장채널" autoComplete="off" maxLength={30} required
              disabled={disabled || waiting} aria-invalid={Boolean(fieldError("channelId"))} aria-describedby={fieldError("channelId") ? `${prefix}-channel-error` : undefined} />
            {fieldError("channelId") && <FieldMessage id={`${prefix}-channel-error`}>{fieldError("channelId")}</FieldMessage>}
          </label>
          <label className="site-field-stack"><span className="type-label">채널 관리자 휴대폰 번호</span>
            <Input type="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder={waiting ? connection?.maskedPhone ?? undefined : "010-0000-0000"}
              autoComplete="off" maxLength={15} required disabled={disabled}
              aria-invalid={Boolean(fieldError("adminPhone"))} aria-describedby={fieldError("adminPhone") ? `${prefix}-phone-error` : undefined} />
            {fieldError("adminPhone") && <FieldMessage id={`${prefix}-phone-error`}>{fieldError("adminPhone")}</FieldMessage>}
          </label>
        </div>
        <fieldset className="site-field-stack" disabled={disabled || waiting}>
          <legend className="type-label">사업자 업종</legend>
          <div className="site-field-grid">
            <select className="site-field w-full" aria-label="업종 대분류" required value={major?.code ?? ""} onChange={event => setCategoryCode(event.target.value)}>
              <option value="">대분류 선택</option>{majors.map(row => <option key={row.code} value={row.code}>{row.name}</option>)}
            </select>
            <select className="site-field w-full" aria-label="업종 중분류" required disabled={disabled || waiting || !major} value={middle?.code ?? ""} onChange={event => setCategoryCode(event.target.value)}>
              <option value="">중분류 선택</option>{major?.children.map(row => <option key={row.code} value={row.code}>{row.name}</option>)}
            </select>
            <select className="site-field w-full" aria-label="업종 소분류" required disabled={disabled || waiting || !middle} value={leaf?.code.length === 11 ? leaf.code : ""} onChange={event => setCategoryCode(event.target.value)}>
              <option value="">소분류 선택</option>{middle?.children.map(row => <option key={row.code} value={row.code}>{row.name}</option>)}
            </select>
          </div>
          {fieldError("categoryCode") && <FieldMessage>{fieldError("categoryCode")}</FieldMessage>}
        </fieldset>
        <div className="site-action-row">
          <Button type="submit" variant="outline" disabled={disabled || Boolean(connection && seconds > 0) || connection?.state === "verifying"} aria-busy={busy}>
            {busy ? "처리 중" : connection && seconds > 0 ? `${seconds}초 후 재요청` : waiting ? "인증번호 다시 요청" : "인증번호 요청"}
          </Button>
          {waiting && <Button type="button" variant="outline" disabled={disabled || connection?.state === "verifying"} onClick={() => run({ intent: "cancel", challengeId: connection!.challengeId })}>입력 변경</Button>}
        </div>
      </form>
      {active && <form className="site-stack-block site-content-divider" onSubmit={event => { event.preventDefault(); run({ intent: "verify", challengeId: connection!.challengeId, token }); }}>
        <p className="type-body-sm site-copy-muted">{connection!.maskedPhone} · {expired ? "인증 시간 만료" : "요청 후 10분 이내 입력"} · 남은 입력 {connection!.attemptsRemaining}회</p>
        <div className="site-field-stack">
          <label htmlFor={`${prefix}-token`} className="type-label">인증번호</label>
          <FieldActionRow field={<Input id={`${prefix}-token`} value={token} onChange={event => setToken(event.target.value.replace(/\D/g, ""))} inputMode="numeric" autoComplete="one-time-code" placeholder="6자리 숫자" maxLength={6}
            required disabled={disabled || expired || connection!.attemptsRemaining === 0} aria-invalid={Boolean(fieldError("token"))} aria-describedby={fieldError("token") ? `${prefix}-token-error` : undefined} />}
            action={<Button type="submit" disabled={disabled || expired || token.length !== 6 || connection!.attemptsRemaining === 0} aria-busy={busy}>채널 연결</Button>} />
          {fieldError("token") && <FieldMessage id={`${prefix}-token-error`}>{fieldError("token")}</FieldMessage>}
        </div>
      </form>}
      {feedback?.error && !feedback.field && <FieldMessage role="alert">{feedback.error}</FieldMessage>}
    </div>}
    <div className="site-stack-block site-content-divider">
      <label className="site-action-row type-label" data-wrap="nowrap">알림톡 사용 <Switch disabled checked={false} size="sm" aria-describedby={`${prefix}-sending-state`} /></label>
      <p id={`${prefix}-sending-state`} className="type-body-sm site-copy-muted">현재는 채널 연결만 제공하며 실제 알림톡 발송은 중지되어 있습니다.</p>
      <div className="site-stack-copy">
        <h4 className="type-item-title">메시지 미리보기</h4>
        <p className="type-body-sm">주문하신 메뉴가 준비되었습니다. 매장 직원의 안내에 따라 음식을 받아주세요.</p>
      </div>
    </div>
  </ContentPanel>;
}
