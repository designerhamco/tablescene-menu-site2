import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicPickupQueue } from "@/lib/server/pickup-queue-service";

import PublicPickupBoard from "./PublicPickupBoard";

export const metadata: Metadata = {
  title: "픽업 대기번호 | 아티메뉴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicPickupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicPickupQueue(slug);
  if (!data) notFound();
  return <PublicPickupBoard initialData={data} />;
}
