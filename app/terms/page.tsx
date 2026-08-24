import type { Metadata } from "next";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { termsContent } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: "아티메뉴 이용약관 | ArtiMenu",
  description: "아티메뉴 서비스 이용약관입니다.",
};

function renderPolicyContent(content: string) {
  return content.trim().split("\n").map((line, index) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      return <div key={`space-${index}`} className="h-2" aria-hidden="true" />;
    }

    if (trimmedLine.startsWith("## ")) {
      return (
        <h2 key={trimmedLine} className="mt-8 break-keep border-t border-zinc-100 pt-8 text-xl font-black tracking-tight text-zinc-950">
          {trimmedLine.slice(3)}
        </h2>
      );
    }

    const isListItem = /^(\d+\.|- )/.test(trimmedLine);

    return (
      <p
        key={`${trimmedLine}-${index}`}
        className={`${isListItem ? "pl-3" : ""} break-keep text-sm font-medium leading-7 text-zinc-600`}
      >
        {trimmedLine}
      </p>
    );
  });
}

export default function TermsPage() {
  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
        <article className="mx-auto w-full max-w-4xl rounded-3xl bg-white p-7 shadow-sm md:p-10">
          <h1 className="break-keep text-4xl font-black tracking-tight md:text-5xl">아티메뉴 이용약관</h1>
          <div className="mt-10">{renderPolicyContent(termsContent)}</div>
        </article>
      </main>
      <Footer />
    </>
  );
}
