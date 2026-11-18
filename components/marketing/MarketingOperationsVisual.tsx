import { Bell, LayoutGrid, ShoppingBag, Users } from "@/app/components/ui/site-icon";
import styles from "./MarketingOperationsVisual.module.css";

export type OperationsVisualKind = "tables" | "orders" | "calls" | "staff" | "overview";

const titles = {
  tables: "테이블·키오스크",
  orders: "주문 관리",
  calls: "호출 관리",
  staff: "직원 권한",
  overview: "전체 메뉴판 운영",
};
const icons = { tables: LayoutGrid, orders: ShoppingBag, calls: Bell, staff: Users, overview: LayoutGrid };
const rows = {
  orders: [
    ["테이블 1", "메뉴 2개", "접수 대기"],
    ["테이블 3", "메뉴 1개", "진행 중"],
    ["테이블 2", "메뉴 3개", "완료"],
  ],
  calls: [
    ["테이블 2", "물 부탁드려요", "미처리"],
    ["테이블 5", "직원 호출", "미처리"],
    ["테이블 1", "냅킨 부탁드려요", "처리 완료"],
  ],
  staff: [
    ["매장 매니저", "메뉴 편집 · 주문 · 호출", "관리"],
    ["홀 담당", "주문 · 호출", "운영"],
    ["주방 담당", "주문 확인", "조회"],
  ],
  overview: [
    ["홀 메뉴판", "진행 중 주문 3건", "호출 1건"],
    ["테라스 메뉴판", "진행 중 주문 2건", "호출 0건"],
    ["다이닝 메뉴판", "진행 중 주문 1건", "호출 2건"],
  ],
};

/** Static product illustration; it never reads or changes store operations. */
export default function MarketingOperationsVisual({ kind }: { kind: OperationsVisualKind }) {
  const Icon = icons[kind];
  return <div className={styles.visual} data-operations-visual={kind} aria-hidden="true">
    <div className={styles.screen}>
      <div className={styles.header}>
        <span className={styles.title}><Icon /><span className="type-label">{titles[kind]}</span></span>
        <span className={`type-caption ${styles.muted}`}>매장 운영</span>
      </div>
      {kind === "tables" ? <>
        <div className={styles.rooms}><span className="type-caption">홀</span><span className={`type-caption ${styles.muted}`}>테라스</span></div>
        <div className={styles.floor}>
          {["테이블 1", "테이블 2", "테이블 3", "테이블 4", "테이블 5", "키오스크 1"].map((name, index) => <div key={name} className={styles.table} data-selected={index === 1 || undefined}><LayoutGrid /><span className="type-caption">{name}</span></div>)}
        </div>
      </> : <div className={styles.list}>
        {rows[kind].map(([title, detail, status], index) => <div className={styles.row} key={title}>
          <div className={styles.copy}><span className="type-label">{title}</span><span className={`type-caption ${styles.muted}`}>{detail}</span></div>
          <span className={`type-caption ${styles.status}`} data-emphasis={index === 0 || undefined}>{status}</span>
        </div>)}
      </div>}
    </div>
  </div>;
}
