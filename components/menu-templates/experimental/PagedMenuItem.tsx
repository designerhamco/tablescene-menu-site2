"use client";
import { CafeAMenuItemRow } from "../CafeDesignA";
import type { ComponentProps } from "react";

/** Same names, prices, images, chips, sale copy and order entry as the original. */
export default function PagedMenuItem(props: ComponentProps<typeof CafeAMenuItemRow>) {
  return <div data-paged-item={props.item.id}><CafeAMenuItemRow {...props} /></div>;
}
