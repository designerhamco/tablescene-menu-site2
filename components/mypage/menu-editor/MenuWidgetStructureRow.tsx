import {
  getMenuWidgetEditorDisplayName,
  getMenuWidgetEditorTypeLabel,
  type MenuWidgetContentBlockDraft,
} from "@/lib/menu-widget-editor-draft";
import type { MenuWidgetDraft } from "@/lib/menu-widgets";
import { Menu } from "@/app/components/ui/site-icon";

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
  const rowLabel = `위젯 (${typeLabel.replace(/ 위젯$/, "").replace(/\s*\+\s*/g, "+")})`;

  return (
    <div
      data-widget-structure-row={block.id}
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
      className={`site-editor-tree-row w-full min-w-0 rounded-md text-left transition ${
        selected ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          draggable={!dragDisabled}
          disabled={dragDisabled}
          data-icon-size="compact"
          onDragStart={(event) => {
            event.stopPropagation();
            if (dragDisabled) {
              event.preventDefault();
              return;
            }
            onDragStart?.();
          }}
          onClick={(event) => event.stopPropagation()}
          className={`site-icon-control inline-flex shrink-0 select-none items-center justify-center ${
            dragDisabled
              ? "cursor-not-allowed text-zinc-200"
              : selected
                ? "cursor-grab text-zinc-300 hover:text-white active:cursor-grabbing"
                : "cursor-grab text-zinc-300 hover:text-zinc-600 active:cursor-grabbing"
          } `}
          aria-label="위젯 순서 이동"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={onSelect} aria-label={`${rowLabel} · ${displayName}`} title={displayName} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          <span className={`min-w-0 truncate text-support font-medium ${selected ? "text-white" : "text-zinc-700"}`}>{rowLabel}</span>
          {hidden && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-support font-medium ${selected ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-600"}`}>
              숨김
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
