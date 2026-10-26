'use client';
import {useEffect,useState} from 'react';
import type {MenuPlanChangeQuote} from '@/lib/menu-plan-change-policy';
type Pending={id:string;state:'pending'|'processing';canCancel:boolean;access:'standard'|'all';designId:string;amount:number;effectiveAt:string};
type Detail={eligible:boolean;reason:string|null;service:'basic'|'dining'|null;currentAmount:number;currentBillingCycle:string;effectiveAt:string|null;options:{id:string;name:string;kind:'standard'|'designer';previewHref:string}[];quotes:MenuPlanChangeQuote[];pending:Pending|null};
const money=(amount:number)=>new Intl.NumberFormat('ko-KR').format(amount)+'원';
const date=(value:string)=>new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Seoul'}).format(new Date(value));
export default function MenuPlanChangePanel({subscriptionId}:{subscriptionId:string}) {
  const [detail,setDetail]=useState<Detail|null>(null),[access,setAccess]=useState<'standard'|'all'>('standard'),[design,setDesign]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const endpoint=`/api/business-subscriptions/${encodeURIComponent(subscriptionId)}/plan-change`;
  useEffect(()=>{const controller=new AbortController();fetch(endpoint,{cache:'no-store',signal:controller.signal}).then(async response=>{const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.message||'이용권 정보를 불러오지 못했습니다.');if(!result.enabled)return;setDetail(result.detail);setAccess(result.detail.pending?.access??'standard');setDesign(result.detail.pending?.designId??result.detail.options.find((d:Detail['options'][number])=>d.kind==='standard')?.id??'');}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[endpoint]);
  const choices=detail?.options.filter(d=>access==='all'||d.kind==='standard')??[],quote=detail?.quotes.find(q=>q.access===access);
  async function save(cancel=false){
    if(!detail||!quote&&!cancel)return;setBusy(true);setError('');setNotice('');
    try{
      const body=cancel?{changeId:detail.pending?.id}:{access,designId:design,consent:{...quote,designId:design}};
      const response=await fetch(endpoint,{method:cancel?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();
      if(!response.ok||!result.ok||!result.detail){
        if(response.status===409){
          setConfirmed(false);
          const latest=await fetch(endpoint,{cache:'no-store'}).then(r=>r.json()).catch(()=>null);
          if(latest?.ok&&latest?.detail)setDetail(latest.detail);
        }
        throw new Error(result.message||'변경을 저장하지 못했습니다.');
      }
      setDetail(result.detail);setConfirmed(false);setNotice(cancel?'변경 예약을 취소했습니다. 현재 계약이 유지됩니다.':'변경을 예약했습니다. 지금은 결제되지 않습니다.');
    }catch(e){setError(e instanceof Error?e.message:'변경을 저장하지 못했습니다.');}finally{setBusy(false);}
  }
  if(!detail&&!error)return null;
  if(!detail)return <p role="alert" className="mt-4 text-copy text-red-700">{error}</p>;
  const pending=detail.pending,processing=pending?.state==='processing';
  return <section className="site-section mt-5 space-y-4 p-4" aria-label="이용권 변경">
    <div><h3 className="type-content-title text-zinc-950">이용권 변경</h3><p className="mt-2 text-copy leading-relaxed text-zinc-600">변경은 다음 결제일부터 적용됩니다. 그전까지 현재 요금과 디자인을 이용하며, 중간 차액은 결제하지 않습니다.</p></div>
    {pending?<div className="rounded-lg bg-zinc-50 p-4 text-copy leading-relaxed" role="status"><p className="font-bold">{processing?'변경 결제 처리 중':'변경 예약됨'}</p><p className="mt-1">{date(pending.effectiveAt)}부터 {pending.access==='all'?'디자인 템플릿 포함':'기본 디자인'} · 월 {money(pending.amount)}</p><p>{detail.options.find(d=>d.id===pending.designId)?.name}</p>{pending.canCancel&&!processing?<button type="button" className="site-button site-button-outline site-button-rounded mt-3" disabled={busy} onClick={()=>save(true)}>변경 예약 취소</button>:null}</div>:null}
    {!detail.eligible?<p className="text-copy leading-relaxed text-zinc-600">{detail.reason}</p>:null}
    {detail.eligible&&!processing&&quote?<>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-copy font-semibold">이용권<select className="site-field block w-full border-zinc-200 p-3" value={access} disabled={busy} onChange={e=>{const next=e.target.value as typeof access;setAccess(next);if(next==='standard'&&detail.options.find(d=>d.id===design)?.kind!=='standard')setDesign(detail.options.find(d=>d.kind==='standard')?.id??'');setConfirmed(false);}}><option value="standard">기본 디자인</option><option value="all">디자인 템플릿 포함</option></select></label>
        <label className="space-y-2 text-copy font-semibold">적용할 디자인<select className="site-field block w-full border-zinc-200 p-3" value={design} disabled={busy} onChange={e=>{setDesign(e.target.value);setConfirmed(false);}}>{choices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      </div>
      {choices.find(d=>d.id===design)?<a href={choices.find(d=>d.id===design)!.previewHref} target="_blank" rel="noreferrer" className="inline-block text-copy font-semibold underline underline-offset-4">선택 디자인 미리보기</a>:null}
      <p className="text-copy leading-relaxed text-zinc-700"><strong>{date(quote.effectiveAt)}부터 월 {money(quote.amount)}</strong> (부가세 포함){quote.offer==='earlyBird'?' · 얼리버드 요금':''}<br/>{detail.currentBillingCycle==='yearly'?'현재 연결제 기간이 끝난 뒤 월결제로 전환됩니다. ':''}새 이용권과 선택 디자인은 해당 결제가 완료되면 함께 적용됩니다. 메뉴·사진·공개 주소는 유지됩니다.</p>
      <label className="flex items-start gap-2 text-copy leading-relaxed"><input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/><span>적용일·월요금·디자인을 확인했으며 다음 결제일부터 변경하는 데 동의합니다.</span></label>
      <button type="button" disabled={busy||!confirmed||!design} onClick={()=>save()} className="site-button site-button-primary site-button-rounded">{busy?'저장 중…':pending?'변경 예약 수정':'다음 결제일부터 변경 예약'}</button>
    </>:null}
    {notice?<p role="status" className="text-copy text-emerald-800">{notice}</p>:null}{error?<p role="alert" className="text-copy text-red-700">{error}</p>:null}
  </section>;
}
