import { SiteArrow, ArrowTurnRightDown, ArrowTurnUpRight, ArrowTurnDownLeft, ArrowTurnLeftUp, ArrowTurnDownRight, ArrowTurnRightUp, ArrowTurnUpLeft, ArrowTurnLeftDown, ArrowUTurnLeft, ArrowUTurnRight, ArrowUTurnUp, ArrowUTurnDown, ArrowUpDown, ArrowLeftRight, RefreshCcw, RefreshCw, RotateCcw, RotateCw } from "@/app/components/ui/site-arrow";
import { ContentPanel } from "@/app/components/ui/content-panel";
import type { SiteArrowDirection } from "@/lib/site-arrow";
import styles from "./SiteComponentGallery.module.css";

const directions: readonly [SiteArrowDirection, string][] = [
  ["up", "위"], ["up-right", "오른쪽 위"], ["right", "오른쪽"], ["down-right", "오른쪽 아래"],
  ["down", "아래"], ["down-left", "왼쪽 아래"], ["left", "왼쪽"], ["up-left", "왼쪽 위"],
];

const turns = [
  [ArrowTurnRightDown, "오른쪽에서 아래"], [ArrowTurnUpRight, "위에서 오른쪽"], [ArrowTurnDownLeft, "아래에서 왼쪽"], [ArrowTurnLeftUp, "왼쪽에서 위"],
  [ArrowTurnDownRight, "아래에서 오른쪽"], [ArrowTurnRightUp, "오른쪽에서 위"], [ArrowTurnUpLeft, "위에서 왼쪽"], [ArrowTurnLeftDown, "왼쪽에서 아래"],
] as const;

export default function ArrowIconExamples() {
  return <section id="site-arrows" className={styles.section} aria-labelledby="site-arrows-title">
    <div className={styles.heading}><h2 id="site-arrows-title" className="type-section-title">화살표</h2>
      <p className="type-body-sm text-zinc-600">24px SVG 그리드. 곡선 머리와 곧은 꼬리, 안쪽이 파인 채움형 꺾쇠를 사용합니다. 메뉴판 디자인은 별도 아이콘을 유지합니다.</p></div>
    <ContentPanel surface="muted">
      <div className="site-stack-block"><h3 className="type-content-title">이동·새 창 · 꼬리형</h3>
        <div className="site-action-row">{directions.map(([direction, label]) => <span key={direction} className="site-stack-copy"><SiteArrow direction={direction} /><span className="type-caption">{label}</span></span>)}</div>
      </div>
      <div className="site-stack-block"><h3 className="type-content-title">펼침·이전·다음 · 꺾쇠형</h3>
        <div className="site-action-row">{directions.filter(([direction]) => !direction.includes("-")).map(([direction, label]) => <span key={direction} className="site-stack-copy"><SiteArrow direction={direction} kind="chevron" /><span className="type-caption">{label}</span></span>)}</div>
      </div>
      <div className="site-stack-block"><h3 className="type-content-title">처음·마지막 · 두 겹 꺾쇠</h3>
        <div className="site-action-row"><SiteArrow direction="left" kind="double-chevron" /><SiteArrow direction="right" kind="double-chevron" /></div>
      </div>
      <div className="site-stack-block" data-arrow-family="compound"><h3 className="type-content-title">방향 전환 · 꺾임</h3>
        <div className="site-action-row">{turns.map(([Glyph, label]) => <span key={label} className="site-stack-copy"><Glyph /><span className="type-caption">{label}</span></span>)}</div>
      </div>
      <div className="site-stack-block" data-arrow-family="compound"><h3 className="type-content-title">되돌리기 · U턴</h3>
        <div className="site-action-row"><ArrowUTurnLeft /><ArrowUTurnRight /><ArrowUTurnUp /><ArrowUTurnDown /></div>
      </div>
      <div className="site-stack-block" data-arrow-family="compound"><h3 className="type-content-title">정렬·교환 · 양방향</h3>
        <div className="site-action-row"><ArrowUpDown /><ArrowLeftRight /></div>
      </div>
      <div className="site-stack-block" data-arrow-family="compound"><h3 className="type-content-title">새로고침·회전 · 원형</h3>
        <p className="type-footnote text-zinc-600">새로고침은 Remix Line의 refresh-line 원본 SVG를 사용합니다.</p>
        <div className="site-stack-block" data-circular-arrow-sizes>{[16, 20, 24].map(size => <div key={size} className="site-action-row"><RefreshCcw size={size} /><RefreshCw size={size} /><RotateCcw size={size} /><RotateCw size={size} /><span className="type-caption">{size}px</span></div>)}</div>
      </div>
      <div className="site-stack-block"><h3 className="type-content-title">크기·굵기</h3>
        <div className="site-action-row">{[16, 20, 24].map(size => <span key={size} className="site-action-row"><SiteArrow size={size} /><span className="type-caption">{size}px</span></span>)}</div>
        <div className="site-action-row">{([[1.25, "얇게"], [2, "기본"], [2.75, "굵게"]] as const).map(([weight, label]) => <span key={weight} className="site-action-row"><SiteArrow direction="up-right" strokeWidth={weight} /><span className="type-caption">{label}</span></span>)}</div>
        <p className="type-footnote text-zinc-600">사이트 기본 굵기는2이며, 색은 주변 글자색을 따릅니다. 버튼의 크기·클릭 영역·포커스는 기존 공통 규격을 유지합니다.</p>
      </div>
    </ContentPanel>
  </section>;
}
