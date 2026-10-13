import ScriptAwareText from "@/components/menu-templates/shared/ScriptAwareText";
import { getMenuDescriptionSizeClassName } from "@/components/menu-templates/shared/cafe-template-content";
import type { MenuLayoutDensity } from "@/lib/template-layout-rules";

export default function MobileNoticeList({ rows, density }: { rows: string[]; density: MenuLayoutDensity }) {
  return <div className="cafe-a-mobile-notice-list">{rows.map((row, index) => <p key={`${index}-${row}`} className={`cafe-a-description-text cafe-a-menu-description whitespace-pre-line break-keep ${getMenuDescriptionSizeClassName(density)}`}><ScriptAwareText text={row} /></p>)}</div>;
}
