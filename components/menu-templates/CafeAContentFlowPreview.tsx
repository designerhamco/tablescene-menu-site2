import CafeACategoryPreviewBlock from "@/components/menu-templates/CafeACategoryPreviewBlock";
import CafeAWidgetBlock from "@/components/menu-templates/CafeAWidgetBlock";
import {
  shouldShowCafeACategoryPreviewDivider,
  sortCafeAContentBlocks,
  type CafeAContentBlock,
} from "@/components/menu-templates/cafe-a-content-blocks";

import styles from "./CafeAContentFlowPreview.module.css";

type CafeAContentFlowPreviewProps = {
  blocks: readonly CafeAContentBlock[];
  notice?: string;
};

export default function CafeAContentFlowPreview({
  blocks,
  notice,
}: CafeAContentFlowPreviewProps) {
  const visibleBlocks = sortCafeAContentBlocks(blocks);

  return (
    <div className={styles.flow} data-cafe-a-content-flow-preview>
      {visibleBlocks.map((block, index) => {
        const showDividerBeforeCategory = shouldShowCafeACategoryPreviewDivider(visibleBlocks, index);

        if (block.blockType === "category") {
          return (
            <div key={block.id} className={styles.block}>
              <CafeACategoryPreviewBlock block={block} showDividerBeforeCategory={showDividerBeforeCategory} />
            </div>
          );
        }

        return (
          <div key={block.id} className={styles.block}>
            <CafeAWidgetBlock widget={block.widget} />
          </div>
        );
      })}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
    </div>
  );
}
