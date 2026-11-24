export default function OrderCookingFlag({ done }: { done: boolean }) {
  return <span className="site-order-cooking-flag" data-done={done} aria-hidden="true" />;
}
