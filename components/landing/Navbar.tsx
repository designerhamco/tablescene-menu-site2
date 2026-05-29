"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "./Icon";

const navItems = [
  {
    title: "웹 메뉴판",
    href: "/services/pro-v1",
    eyebrow: "Web Menu",
    summary: "주문, 결제, 호출, 고객 관리까지 한 화면에서 연결합니다.",
    links: [
      { title: "PRO 1.0", desc: "매장 운영 올인원 웹 메뉴판", href: "/services/pro-v1", icon: "tablet" },
      { title: "서비스 화면", desc: "태블릿과 모바일 화면 미리보기", href: "/#portfolio", icon: "screen" },
      { title: "도입 플랜", desc: "매장 규모별 맞춤 구성", href: "/#pricing", icon: "creditCard" },
    ],
  },
  {
    title: "브랜딩 솔루션",
    href: "/services/basic",
    eyebrow: "Branding",
    summary: "QR 웰컴 카드와 다이닝 경험을 매장 톤에 맞게 설계합니다.",
    links: [
      { title: "DINING", desc: "프리미엄 QR 웰컴 카드", href: "/services/basic", icon: "palette" },
      { title: "포트폴리오", desc: "메뉴링크 적용 화면 보기", href: "/#portfolio", icon: "layout" },
      { title: "상담 문의", desc: "브랜드 맞춤 제작 상담", href: "mailto:admin@dndcommerce.co.kr?subject=메뉴링크 브랜딩 솔루션 문의", icon: "message" },
    ],
  },
  {
    title: "스토어",
    href: "/store",
    eyebrow: "Store",
    summary: "QR 스탠드, 태블릿 대여, 거치 악세서리를 함께 준비합니다.",
    links: [
      { title: "스토어 홈", desc: "관련 제품과 구성품 보기", href: "/store", icon: "cart" },
      { title: "디바이스 구성", desc: "매장별 추천 설치 방식", href: "/#devices", icon: "monitor" },
      { title: "제품 문의", desc: "필요 수량과 설치 상담", href: "mailto:admin@dndcommerce.co.kr?subject=메뉴링크 스토어 문의", icon: "package" },
    ],
  },
] satisfies {
  title: string;
  href: string;
  eyebrow: string;
  summary: string;
  links: { title: string; desc: string; href: string; icon: IconName }[];
}[];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<(typeof navItems)[number] | null>(null);

  useEffect(() => {
    const update = () => setIsScrolled(window.scrollY > 50);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const darkNav = isScrolled || isOpen || activeMenu !== null;

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 h-20 border-b transition-all duration-300 ${
        darkNav ? "border-zinc-100 bg-white/90 backdrop-blur-md" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        <a href="#hero" className="group z-50 flex shrink-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F8E731] transition-transform duration-300 group-hover:scale-105 md:h-10 md:w-10 md:rounded-xl">
            <Image
              src="/assets/tablescene-symbol.png"
              alt="MenuLink Symbol"
              width={24}
              height={24}
              className="h-5 w-5 rotate-45 object-contain md:h-6 md:w-6"
            />
          </span>
          <span className="flex flex-col leading-none">
            <span className={`text-xl font-bold tracking-tighter transition-colors duration-300 md:text-2xl ${darkNav ? "text-black" : "text-white"}`}>
              MENULINK
            </span>
            <span className={`ml-0.5 mt-0.5 text-[9px] font-medium uppercase tracking-[0.3em] opacity-60 transition-colors duration-300 md:text-[10px] ${darkNav ? "text-black" : "text-white"}`}>
              Studio
            </span>
          </span>
        </a>

        <div
          className="absolute left-1/2 top-1/2 hidden h-full -translate-x-1/2 -translate-y-1/2 items-center gap-10 lg:flex"
          onMouseLeave={() => setActiveMenu(null)}
        >
          {navItems.map((item) => (
            <a
              key={item.title}
              href={item.href}
              onMouseEnter={() => setActiveMenu(item)}
              onFocus={() => setActiveMenu(item)}
              className={`py-2 text-[15px] font-bold tracking-tight transition-colors duration-200 ${
                activeMenu?.title === item.title
                  ? "text-black"
                  : darkNav
                    ? "text-zinc-600 hover:text-black"
                    : "text-white/90 hover:text-white"
              }`}
            >
              {item.title}
            </a>
          ))}
        </div>

        <div className="z-50 flex items-center gap-6">
          <a
            href="#devices"
            aria-label="스토어"
            className={`p-1 transition-colors ${darkNav ? "text-black hover:text-zinc-600" : "text-white hover:text-white/80"}`}
          >
            <Icon name="cart" className="h-5 w-5" />
          </a>
          <button
            type="button"
            className={`p-1 transition-colors lg:hidden ${darkNav ? "text-black" : "text-white"}`}
            onClick={() => setIsOpen((value) => !value)}
            aria-label="메뉴 열기"
          >
            <Icon name={isOpen ? "x" : "menu"} className="h-6 w-6" />
          </button>
        </div>
      </div>

      {activeMenu && (
        <div
          className="absolute inset-x-0 top-20 hidden border-y border-zinc-100 bg-white/95 shadow-2xl shadow-zinc-900/10 backdrop-blur-xl lg:block"
          onMouseEnter={() => setActiveMenu(activeMenu)}
          onMouseLeave={() => setActiveMenu(null)}
        >
          <div className="mx-auto grid max-w-7xl grid-cols-[0.85fr_2fr] gap-10 px-6 py-8">
            <div className="flex flex-col justify-between rounded-2xl bg-zinc-950 p-7 text-white">
              <div>
                <h2 className="mb-4 text-3xl font-bold tracking-tight">{activeMenu.title}</h2>
                <p className="break-keep text-sm font-medium leading-relaxed text-white/70">{activeMenu.summary}</p>
              </div>
              <a href={activeMenu.href} className="mt-10 inline-flex items-center gap-2 text-sm font-bold text-white">
                자세히 보기
                <Icon name="arrowRight" className="h-4 w-4" />
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {activeMenu.links.map((link) => (
                <a
                  key={link.title}
                  href={link.href}
                  className="group flex min-h-48 flex-col justify-between rounded-2xl border border-zinc-100 bg-white p-6 transition-all hover:-translate-y-1 hover:border-zinc-200 hover:shadow-xl"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 transition-colors group-hover:bg-[#F8E731]">
                    <Icon name={link.icon} className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="mb-2 block text-lg font-bold tracking-tight text-zinc-950">{link.title}</span>
                    <span className="break-keep text-sm font-medium leading-relaxed text-zinc-500">{link.desc}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="border-t border-zinc-100 bg-white px-6 py-5 shadow-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-5">
            {navItems.map((item) => (
              <div key={item.title}>
                <a
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="mb-2 flex items-center justify-between rounded-xl px-2 py-3 text-lg font-bold text-zinc-900 hover:bg-zinc-50"
                >
                  {item.title}
                  <Icon name="chevronRight" className="h-5 w-5 text-zinc-300" />
                </a>
                <div className="grid gap-1 pl-2">
                  {item.links.map((link) => (
                    <a
                      key={link.title}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                    >
                      {link.title}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
