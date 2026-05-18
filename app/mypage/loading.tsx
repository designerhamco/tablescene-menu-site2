import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

export default function MyPageLoading() {
  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-12 border-b border-zinc-200 pb-8">
            <div className="h-12 w-56 rounded-2xl bg-zinc-200" />
            <div className="mt-5 h-5 w-full max-w-lg rounded-full bg-zinc-100" />
          </header>
          <section className="mb-8 rounded-3xl bg-white p-8 shadow-sm">
            <div className="h-4 w-24 rounded-full bg-zinc-100" />
            <div className="mt-5 h-8 w-64 rounded-xl bg-zinc-200" />
            <div className="mt-4 h-4 w-80 max-w-full rounded-full bg-zinc-100" />
          </section>
          <section className="grid gap-5 md:grid-cols-2">
            {[0, 1].map((item) => (
              <div key={item} className="rounded-3xl bg-white p-7 shadow-sm">
                <div className="h-7 w-40 rounded-xl bg-zinc-200" />
                <div className="mt-4 h-4 w-full rounded-full bg-zinc-100" />
                <div className="mt-8 space-y-3">
                  <div className="h-4 w-full rounded-full bg-zinc-100" />
                  <div className="h-4 w-5/6 rounded-full bg-zinc-100" />
                  <div className="h-4 w-2/3 rounded-full bg-zinc-100" />
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
