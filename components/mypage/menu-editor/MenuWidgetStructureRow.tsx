import {
  getMenuWidgetEditorDisplayName,
  getMenuWidgetEditorTypeLabel,
  type MenuWidgetContentBlockDraft,
} from "@/lib/menu-widget-editor-draft";
import type { MenuWidgetDraft } from "@/lib/menu-widgets";

type MenuWidgetStructureRowProps = {
  block: MenuWidgetContentBlockDraft;
  widget: MenuWidgetDraft | null;
  selected?: boolean;
  onSelect?: () => void;
};

export default function MenuWidgetStructureRow({ block, widget, selected = false, onSelect }: MenuWidgetStructureRowProps) {
  const hidden = block.visible === false || widget?.visible === false;
  const displayName = getMenuWidgetEditorDisplayName(widget);
  const typeLabel = getMenuWidgetEditorTypeLabel(widget?.type ?? "");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full min-w-0 rounded-md px-2 py-1.5 text-left transition ${
        selected ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-black ${
            selected ? "border-zinc-700 bg-zinc-800 text-zinc-100" : "border-zinc-200 bg-white text-zinc-500"
          }`}
        >
          위젯
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={`min-w-0 truncate text-xs font-bold ${selected ? "text-white" : "text-zinc-700"}`}>{displayName}</span>
            {hidden && (
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${selected ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-400"}`}>
                숨김
              </span>
            )}
          </div>
          <p className={`mt-0.5 truncate text-[10px] font-bold ${selected ? "text-zinc-300" : "text-zinc-400"}`}>{typeLabel}</p>
        </div>
      </div>
    </button>
  );
}
