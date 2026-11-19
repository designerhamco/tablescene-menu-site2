"use client";
import { useState } from "react";
import { CircleHelp } from "@/app/components/ui/site-icon";
import DisplayBottomControlsGuide from "./DisplayBottomControlsGuide";

export default function DisplayPreviewGuide({ tabIndex }: { tabIndex?: number }) {
  const [open, setOpen] = useState(true);
  return <>
    <button type="button" className="site-icon-control site-preview-control site-preview-control-icon" data-icon-appearance="bare" aria-label="디스플레이 미리보기 안내" title="디스플레이 미리보기 안내" tabIndex={tabIndex} onClick={() => setOpen(true)}><CircleHelp className="h-4 w-4" aria-hidden="true" /></button>
    {open ? <DisplayBottomControlsGuide onClose={() => setOpen(false)} /> : null}
  </>;
}
