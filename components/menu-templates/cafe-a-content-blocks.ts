import type { CafeAWidgetPreview } from "@/components/menu-templates/CafeAWidgetBlock";
import {
  getTemplateContentSeparatorRules,
  shouldShowCategoryContentDivider,
} from "@/lib/template-content-separator-rules";

export type CafeAContentBlockBase = {
  id: string;
  sortOrder: number;
  visible: boolean;
};

export type CafeACategoryPreviewBlock = CafeAContentBlockBase & {
  blockType: "category";
  category: {
    id: string;
    name: string;
    description?: string | null;
    items: Array<{
      id: string;
      name: string;
      secondaryName?: string | null;
      description?: string | null;
      priceLabel?: string | null;
    }>;
  };
};

export type CafeAWidgetPreviewBlock = CafeAContentBlockBase & {
  blockType: "widget";
  widget: CafeAWidgetPreview;
};

export type CafeAContentBlock = CafeACategoryPreviewBlock | CafeAWidgetPreviewBlock;

const CAFE_A_SEPARATOR_RULES = getTemplateContentSeparatorRules("cafe_design_a");

export function isVisibleCafeAContentBlock(block: CafeAContentBlock) {
  if (!block.visible) return false;
  if (block.blockType === "widget") return block.widget.visible;
  return true;
}

export function sortCafeAContentBlocks(blocks: readonly CafeAContentBlock[]) {
  return blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => isVisibleCafeAContentBlock(block))
    .sort((left, right) => left.block.sortOrder - right.block.sortOrder || left.index - right.index)
    .map(({ block }) => block);
}

export function shouldShowCafeACategoryPreviewDivider(
  visibleBlocks: readonly CafeAContentBlock[],
  currentIndex: number,
) {
  const currentBlock = visibleBlocks[currentIndex];
  if (currentBlock?.blockType !== "category") return false;

  return shouldShowCategoryContentDivider(CAFE_A_SEPARATOR_RULES, currentIndex > 0);
}
