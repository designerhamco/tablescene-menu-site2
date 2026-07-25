import type { CafeACategoryPreviewBlock as CafeACategoryPreviewBlockType } from "@/components/menu-templates/cafe-a-content-blocks";

import styles from "./CafeACategoryPreviewBlock.module.css";

type CafeACategoryPreviewBlockProps = {
  block: CafeACategoryPreviewBlockType;
  showDividerBeforeCategory: boolean;
  suppressDesktopColumnStartDivider?: boolean;
  allowSplit?: boolean;
};

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export default function CafeACategoryPreviewBlock({
  block,
  showDividerBeforeCategory,
  suppressDesktopColumnStartDivider = false,
  allowSplit = false,
}: CafeACategoryPreviewBlockProps) {
  return (
    <section
      className={joinClassNames(styles.category, allowSplit && styles.categorySplit)}
      data-cafe-a-content-block="category"
      data-cafe-a-category-preview-block
      data-cafe-a-category-divider-desktop-suppressed={suppressDesktopColumnStartDivider ? "true" : undefined}
    >
      {showDividerBeforeCategory ? (
        <div
          className={styles.divider}
          aria-hidden="true"
          data-cafe-a-category-divider
          data-cafe-a-category-divider-position="before"
        />
      ) : null}
      <div className={styles.heading} data-cafe-a-category-heading>
        <h3 className={styles.title}>{block.category.name}</h3>
      </div>
      {block.category.description ? <p className={styles.description}>{block.category.description}</p> : null}
      <div className={styles.items}>
        {block.category.items.map((item) => (
          <div key={item.id} className={styles.item} data-cafe-a-menu-item>
            <div className={styles.copy}>
              <p className={styles.name} data-cafe-a-menu-name>{item.name}</p>
              {item.secondaryName ? <p className={styles.secondaryName}>{item.secondaryName}</p> : null}
              {item.description ? <p className={styles.itemDescription}>{item.description}</p> : null}
            </div>
            {item.priceLabel ? <span className={styles.price} data-cafe-a-menu-price>{item.priceLabel}</span> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
