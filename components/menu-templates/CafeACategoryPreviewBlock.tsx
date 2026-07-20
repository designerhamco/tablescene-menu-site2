import type { CafeACategoryPreviewBlock as CafeACategoryPreviewBlockType } from "@/components/menu-templates/cafe-a-content-blocks";

import styles from "./CafeACategoryPreviewBlock.module.css";

type CafeACategoryPreviewBlockProps = {
  block: CafeACategoryPreviewBlockType;
  showDivider: boolean;
};

export default function CafeACategoryPreviewBlock({ block, showDivider }: CafeACategoryPreviewBlockProps) {
  return (
    <section
      className={styles.category}
      data-cafe-a-content-block="category"
      data-cafe-a-category-preview-block
    >
      <div className={styles.heading}>
        <h3 className={styles.title}>{block.category.name}</h3>
      </div>
      {block.category.description ? <p className={styles.description}>{block.category.description}</p> : null}
      <div className={styles.items}>
        {block.category.items.map((item) => (
          <div key={item.id} className={styles.item}>
            <div className={styles.copy}>
              <p className={styles.name}>{item.name}</p>
              {item.secondaryName ? <p className={styles.secondaryName}>{item.secondaryName}</p> : null}
              {item.description ? <p className={styles.itemDescription}>{item.description}</p> : null}
            </div>
            {item.priceLabel ? <span className={styles.price}>{item.priceLabel}</span> : null}
          </div>
        ))}
      </div>
      {showDivider ? <div className={styles.divider} aria-hidden="true" /> : null}
    </section>
  );
}
