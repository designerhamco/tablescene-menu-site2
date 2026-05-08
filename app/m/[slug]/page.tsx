import { redirect } from "next/navigation";

import { getPublicMenuPath } from "@/lib/menu-url";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LegacyPublicMenuPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(getPublicMenuPath(slug));
}
