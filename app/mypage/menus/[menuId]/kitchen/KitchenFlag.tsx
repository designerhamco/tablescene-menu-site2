import { Button } from "@/app/components/ui/button";
import OrderCookingFlag from "@/components/mypage/OrderCookingFlag";
import styles from "./KitchenDashboard.module.css";

export function KitchenItemFlag({ name, done, change, busy }: {
  name: string;
  done: boolean;
  change?: (done: boolean) => void;
  busy: boolean;
}) {
  if (!change) {
    return <span className={styles.flagDisplay} role="img" aria-label={`${name} ${done ? "조리 완료" : "조리 미완성"}`}>
      <OrderCookingFlag done={done} />
    </span>;
  }

  return (
    <Button type="button" variant="ghost" size="icon" iconSize="compact"
      aria-label={`${name} 조리 완료`} aria-pressed={done} aria-disabled={busy || undefined}
      title={done ? "조리 완료 되돌리기" : "메뉴 조리 완료"}
      onClick={() => { if (!busy) change(!done); }}>
      <OrderCookingFlag done={done} />
    </Button>
  );
}
