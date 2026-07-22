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
  dragDisabled?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
};

export default function MenuWidgetStructureRow({
  block,
  widget,
  selected = false,
  dragDisabled = false,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
}: MenuWidgetStructureRowProps) {
  const hidden = block.visible === false || widget?.visible === false;
  const displayName = getMenuWidgetEditorDisplayName(widget);
  const typeLabel = getMenuWidgetEditorTypeLabel(widget?.type ?? "");

  return (
    <div
      onDragOver={(event) => {
        if (!onDragOver && !onDrop) return;
        event.preventDefault();
        onDragOver?.();
      }}
      onDrop={(event) => {
        if (!onDrop) return;
        event.preventDefault();
        onDrop();
      }}
      className={`w-full min-w-0 rounded-md px-2 py-1.5 text-left transition ${
        selected ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          draggable={!dragDisabled}
          onDragStart={(event) => {
            event.stopPropagation();
            if (dragDisabled) {
              event.preventDefault();
              return;
            }
            onDragStart?.();
          }}
          onClick={(event) => event.stopPropagation()}
          className={`inline-flex shrink-0 select-none items-center justify-center rounded px-1 py-1 ${
            dragDisabled
              ? "cursor-not-allowed text-zinc-200"
              : selected
                ? "cursor-grab text-zinc-300 hover:text-white active:cursor-grabbing"
                : "cursor-grab text-zinc-300 hover:text-zinc-500 active:cursor-grabbing"
          }`}
          aria-label="위젯 순서 이동"
        >
          <DragHandleIcon />
        </button>
        <span
          aria-hidden="true"
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-black ${
            selected ? "border-zinc-700 bg-zinc-800 text-zinc-100" : "border-zinc-200 bg-white text-zinc-500"
          }`}
        >
          위젯
        </span>
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={`min-w-0 truncate text-xs font-bold ${selected ? "text-white" : "text-zinc-700"}`}>{displayName}</span>
            {hidden && (
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${selected ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-400"}`}>
                숨김
              </span>
            )}
          </div>
          <p className={`mt-0.5 truncate text-[10px] font-bold ${selected ? "text-zinc-300" : "text-zinc-400"}`}>{typeLabel}</p>
        </button>
      </div>
    </div>
  );
}

function DragHandleIcon() {
  return (
    <span aria-hidden="true" className="grid grid-cols-2 gap-0.5">
      <span className="h-1 w-1 rounded-full bg-current" />
      <span className="h-1 w-1 rounded-full bg-current" />
      <span className="h-1 w-1 rounded-full bg-current" />
      <span className="h-1 w-1 rounded-full bg-current" />
    </span>
  );
}
