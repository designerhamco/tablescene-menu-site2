"use client";

import { useId, useState, type ReactNode } from "react";
import { Copy, Link as LinkIcon, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { toast } from "sonner";

export function ShareDialog({ title, url, trigger }: { title: string; url?: string; trigger: ReactNode }) {
  const urlId=useId();
  const [shareUrl,setShareUrl]=useState(url ?? "");
  const [canShare,setCanShare]=useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(shareUrl);toast.success("링크를 복사했습니다."); }
    catch { toast.error("링크를 복사하지 못했습니다. 아래 주소를 직접 복사해 주세요."); }
  }
  async function share() {
    try { await navigator.share({title,url:shareUrl}); }
    catch(error) { if (!(error instanceof Error && error.name === "AbortError")) toast.error("공유하지 못했습니다. 링크 복사를 이용해 주세요."); }
  }
  return <Dialog onOpenChange={open=>{if(open){setShareUrl(url ?? window.location.href);setCanShare(typeof navigator.share === "function");}}}>
    <DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent className="site-share-dialog">
      <DialogHeader><DialogTitle>공유하기</DialogTitle><DialogDescription>{title}</DialogDescription></DialogHeader>
      <div className="site-share-options"><button type="button" onClick={copy} className="site-share-option"><span><LinkIcon size={28} /></span>링크 복사</button>{canShare ? <button type="button" onClick={share} className="site-share-option"><span data-tone="brand"><Share2 size={28} /></span>기기로 공유</button> : null}</div>
      <div className="site-share-url"><label className="sr-only" htmlFor={urlId}>공유 링크</label><input id={urlId} readOnly value={shareUrl} className="site-field" /><button type="button" className="site-button site-button-outline" onClick={copy}><Copy size={16} aria-hidden="true" />복사</button></div>
    </DialogContent>
  </Dialog>;
}
