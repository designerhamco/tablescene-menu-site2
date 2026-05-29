import Link from "next/link";

export default function PublicMenuNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-24 text-zinc-950">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-black tracking-tight">메뉴판을 열 수 없습니다</h1>
        <p className="mt-4 break-keep text-sm font-medium leading-relaxed text-zinc-500">
          주소가 잘못되었거나, 아직 공개 상태가 아닌 메뉴판입니다.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
        >
          MenuLink로 이동
        </Link>
      </section>
    </main>
  );
}
