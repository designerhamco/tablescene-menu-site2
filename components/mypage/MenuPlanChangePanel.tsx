'use client';
import { useEffect, useState } from 'react';
import { LoadingState } from '@/app/components/ui/loading-state';
import { ContentPanel } from '@/app/components/ui/content-panel';
type Pending = { id: string; state: 'pending' | 'processing'; canCancel: boolean; designId: string; amount: number; effectiveAt: string };
type Detail = { options: { id: string; name: string }[]; pending: Pending | null };
const money = (amount: number) => new Intl.NumberFormat('ko-KR').format(amount) + '원';
const date = (value: string) => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(value));

/** Previously consented reservations remain reviewable/cancellable. Template
 * switching now belongs to the editor and never creates a new paid reservation. */
export default function MenuPlanChangePanel({ subscriptionId }: { subscriptionId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const endpoint = `/api/business-subscriptions/${encodeURIComponent(subscriptionId)}/plan-change`;
  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || '변경 예약을 불러오지 못했습니다.');
      setDetail(result.detail ?? { options: [], pending: null });
    }).catch(error => { if (error.name !== 'AbortError') setError(error.message); });
    return () => controller.abort();
  }, [endpoint]);
  async function cancel() {
    if (!detail?.pending?.canCancel || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(endpoint, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changeId: detail.pending.id }) });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.detail) throw new Error(result.message || '변경 예약을 취소하지 못했습니다.');
      setDetail(result.detail); setNotice('변경 예약을 취소했습니다.');
    } catch (error) { setError(error instanceof Error ? error.message : '변경 예약을 취소하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  if (!detail && !error) return <LoadingState label="변경 예약을 불러오고 있습니다." />;
  const pending = detail?.pending;
  return <div className="site-stack-block">
    {pending ? <ContentPanel surface="muted" aria-label="기존 변경 예약"><div className="site-stack-copy">
      <p className="type-item-title">{pending.state === 'processing' ? '기존 예약 결제 처리 중' : '기존 변경 예약'}</p>
      <p className="type-body">{date(pending.effectiveAt)}부터 월 {money(pending.amount)}</p>
      <p className="type-body">{detail.options.find(design => design.id === pending.designId)?.name}</p>
      {pending.canCancel && pending.state !== 'processing' ? <div className="site-action-row"><button type="button" className="site-button site-button-outline" disabled={busy} onClick={() => void cancel()}>변경 예약 취소</button></div> : null}
    </div></ContentPanel> : detail && !notice ? <p className="type-body site-copy-muted">등록된 변경 예약이 없습니다.</p> : null}
    {notice && <p role="status" className="type-body">{notice}</p>}{error && <p role="alert" className="type-body text-destructive">{error}</p>}
  </div>;
}
