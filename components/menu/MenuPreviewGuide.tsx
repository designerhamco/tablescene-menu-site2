import { Minus, MoreVertical, Plus } from "lucide-react";

export default function BrowserZoomGuide() {
  return (
    <div
      className="w-full overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white text-zinc-950 shadow-[0_18px_60px_rgba(0,0,0,0.2)]"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-100 px-3 py-3">
        <div className="h-8 min-w-0 flex-1 rounded-full border border-zinc-200 bg-white shadow-inner" />
        <div
          data-preview-guide-profile=""
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-300"
        >
          <svg
            data-preview-guide-profile-icon=""
            viewBox="0 0 24 24"
            className="h-5 w-5 text-zinc-100"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" fill="currentColor" />
            <path d="M5 21c.55-4.7 3.05-7 7-7s6.45 2.3 7 7H5Z" fill="currentColor" />
          </svg>
        </div>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-200">
          <MoreVertical className="h-4 w-4" />
        </div>
      </div>
      <div className="space-y-1 p-3 text-support font-semibold text-zinc-600">
        <div className="rounded-lg px-3 py-2">새 탭</div>
        <div className="rounded-lg px-3 py-2">다운로드</div>
        <div className="rounded-lg border-2 border-[#42E6C4] bg-[#42E6C4]/10 px-3 py-2 text-zinc-950 ring-2 ring-[#42E6C4]/15">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold">확대/축소</span>
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white"><Minus className="h-3.5 w-3.5" /></span>
              <span className="tabular-nums">100%</span>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white"><Plus className="h-3.5 w-3.5" /></span>
            </div>
          </div>
        </div>
        <div className="rounded-lg px-3 py-2">인쇄</div>
        <div className="rounded-lg px-3 py-2">설정</div>
      </div>
    </div>
  );
}
