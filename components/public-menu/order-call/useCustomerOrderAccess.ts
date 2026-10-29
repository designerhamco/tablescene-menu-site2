"use client";
import {useEffect,useState} from "react";
import {CUSTOMER_ORDER_WARNING_SECONDS} from "@/lib/order-session-policy";

export function useCustomerOrderAccess(menuSiteId:string,enabled:boolean,initialExpiry:string|null|undefined,previewOnly:boolean) {
  const [expiry,setExpiry]=useState(initialExpiry ?? null),[clock,setClock]=useState(0),[offset,setOffset]=useState(0);
  const [renewing,setRenewing]=useState(false),[error,setError]=useState("");
  const [dismissed,setDismissed]=useState<string|null>(null);
  useEffect(()=>{if(!enabled)return;const tick=()=>setClock(Date.now());const frame=requestAnimationFrame(tick),timer=setInterval(tick,1000);return()=>{cancelAnimationFrame(frame);clearInterval(timer);};},[enabled]);
  useEffect(()=>{
    if(!enabled||previewOnly)return;
    let disposed=false;const controller=new AbortController();
    async function sync(){if(document.visibilityState==="hidden")return;try{const response=await fetch(`/api/public-menu/order-session?menuSiteId=${encodeURIComponent(menuSiteId)}`,{cache:"no-store",signal:controller.signal});const body=await response.json();if(disposed)return;if(response.ok&&body.ok){setExpiry(body.orderExpiresAt);setOffset(Date.parse(body.serverNow)-Date.now());}else if(response.status===401){setExpiry(new Date(0).toISOString());}}catch{/* Transient failures never extend ordering permission. */}}
    void sync();const timer=setInterval(sync,30000);document.addEventListener("visibilitychange",sync);
    return()=>{disposed=true;controller.abort();clearInterval(timer);document.removeEventListener("visibilitychange",sync);};
  },[menuSiteId,enabled,previewOnly]);
  const remaining=expiry&&clock ? Date.parse(expiry)-clock-offset : Infinity;
  const expired=enabled&&remaining<=0;
  async function renew(){if(renewing||expired)return;setRenewing(true);setError("");try{
    if(previewOnly){setExpiry(new Date(Date.now()+3600000).toISOString());setDismissed(null);return;}
    const response=await fetch("/api/public-menu/order-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({menuSiteId})});
    const body=await response.json();if(!response.ok||!body.ok){if(response.status===409||response.status===401)setExpiry(new Date(0).toISOString());throw new Error(body.message||"이용 시간을 연장하지 못했습니다. 잠시 후 다시 시도해 주세요.");}
    setExpiry(body.orderExpiresAt);setOffset(Date.parse(body.serverNow)-Date.now());setDismissed(null);
  }catch(error){setError(error instanceof Error?error.message:"");}finally{setRenewing(false);}}
  return {expired,warning:enabled&&remaining>0&&remaining<=CUSTOMER_ORDER_WARNING_SECONDS*1000&&dismissed!==expiry,showExpired:expired&&dismissed!==expiry,renewing,error,renew,dismiss:()=>setDismissed(expiry),expire:()=>setExpiry(new Date(0).toISOString())};
}
