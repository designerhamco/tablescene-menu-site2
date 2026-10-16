import { notFound } from "next/navigation";
import OrderedLayoutReview from "./review";

export const metadata = { title: "채움형 배치 검수 | ArtiMenu", robots: { index: false, follow: false } };

export default function OrderedLayoutQaPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <OrderedLayoutReview />;
}
