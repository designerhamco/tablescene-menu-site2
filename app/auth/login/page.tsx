import { redirect } from "next/navigation";

type SearchParams = Promise<{
  next?: string;
}>;

export default async function AuthLoginRedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next } = await searchParams;

  if (next) {
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }

  redirect("/sign-in");
}
