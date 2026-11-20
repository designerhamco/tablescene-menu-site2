import {
  ArrowRight, ArrowDownRight, ArrowDown, ArrowDownLeft, ArrowLeft, ArrowUpLeft, ArrowUp, ArrowUpRight,
  ChevronRight, ChevronDown, ChevronLeft, ChevronUp, ChevronsRight, ChevronsLeft,
  ArrowTurnRightDown, ArrowTurnUpRight, ArrowTurnDownLeft, ArrowTurnLeftUp,
  ArrowTurnDownRight, ArrowTurnRightUp, ArrowTurnUpLeft, ArrowTurnLeftDown,
  ArrowUTurnLeft, ArrowUTurnRight, ArrowUTurnUp, ArrowUTurnDown,
  ArrowUpDown, ArrowLeftRight, RefreshCcw, RefreshCw, RotateCcw, RotateCw,
} from "@/app/components/ui/site-arrow";
import { ContentPanel } from "@/app/components/ui/content-panel";
import styles from "./SiteComponentGallery.module.css";

const examples = [
  { heading: "이동·새 창", icons: [
    [ArrowUp, "위"], [ArrowUpRight, "오른쪽 위"], [ArrowRight, "오른쪽"], [ArrowDownRight, "오른쪽 아래"],
    [ArrowDown, "아래"], [ArrowDownLeft, "왼쪽 아래"], [ArrowLeft, "왼쪽"], [ArrowUpLeft, "왼쪽 위"],
  ] },
  { heading: "펼침·이전·다음", icons: [
    [ChevronUp, "위"], [ChevronRight, "오른쪽"], [ChevronDown, "아래"], [ChevronLeft, "왼쪽"],
  ] },
  { heading: "처음·마지막", icons: [[ChevronsLeft, "처음"], [ChevronsRight, "마지막"]] },
  { heading: "방향 전환", icons: [
    [ArrowTurnRightDown, "오른쪽에서 아래"], [ArrowTurnUpRight, "위에서 오른쪽"],
    [ArrowTurnDownLeft, "아래에서 왼쪽"], [ArrowTurnLeftUp, "왼쪽에서 위"],
    [ArrowTurnDownRight, "아래에서 오른쪽"], [ArrowTurnRightUp, "오른쪽에서 위"],
    [ArrowTurnUpLeft, "위에서 왼쪽"], [ArrowTurnLeftDown, "왼쪽에서 아래"],
  ] },
  { heading: "되돌리기", icons: [
    [ArrowUTurnLeft, "왼쪽"], [ArrowUTurnRight, "오른쪽"], [ArrowUTurnUp, "위"], [ArrowUTurnDown, "아래"],
  ] },
  { heading: "정렬·교환", icons: [[ArrowUpDown, "위아래"], [ArrowLeftRight, "좌우"]] },
] as const;

const sizes = [16, 20, 24] as const;

export default function ArrowIconExamples() {
  return <section id="site-arrows" className={styles.section} aria-labelledby="site-arrows-title">
    <div className={styles.heading}>
      <h2 id="site-arrows-title" className="type-section-title">Remix Line 화살표</h2>
      <p className="type-body-sm text-zinc-600">공식 사이트의 화살표는 Remix Icon 4.8.0 원본 경로를 사용하며 주변 글자색을 따릅니다.</p>
    </div>
    <ContentPanel surface="muted">
      {examples.map(({ heading, icons }) => <div className="site-stack-block" key={heading}>
        <h3 className="type-content-title">{heading}</h3>
        <div className="site-action-row">{icons.map(([Glyph, label]) => <span key={label} className="site-stack-copy">
          <Glyph /><span className="type-caption">{label}</span>
        </span>)}</div>
      </div>)}
      <div className="site-stack-block">
        <h3 className="type-content-title">새로고침·초기화</h3>
        <div className="site-stack-block" data-circular-arrow-sizes>
          {sizes.map(size => <div key={size} className="site-action-row">
            <RefreshCcw size={size} /><RefreshCw size={size} /><RotateCcw size={size} /><RotateCw size={size} />
            <span className="type-caption">{size}px</span>
          </div>)}
        </div>
      </div>
      <div className="site-stack-block">
        <h3 className="type-content-title">크기별 비교</h3>
        <div className="site-stack-block">
          {sizes.map(size => <div key={size} className="site-action-row">
            <ChevronDown size={size} /><ArrowRight size={size} /><ArrowUpRight size={size} />
            <span className="type-caption">{size}px</span>
          </div>)}
        </div>
      </div>
    </ContentPanel>
  </section>;
}
