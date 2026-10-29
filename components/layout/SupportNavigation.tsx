"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { SITE_SUPPORT_LINKS, isSupportLinkActive } from "@/lib/site-support-navigation";
import styles from "@/app/components/layout/Navbar.module.css";

export default function SupportNavigation({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const openTimer = useRef<number | undefined>(undefined);
  const pointerOpened = useRef(false);
  const firstLink = useRef<HTMLAnchorElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const active = pathname.startsWith("/support/chat") ||
    SITE_SUPPORT_LINKS.some(item => isSupportLinkActive(item.href, pathname));

  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const cancelOpen = () => window.clearTimeout(openTimer.current);
  const scheduleClose = () => {
    cancelOpen();
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      if (!content.current?.contains(document.activeElement)) setOpen(false);
    }, 180);
  };

  useEffect(() => () => {
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(openTimer.current);
  }, []);

  return (
    <div
      className={styles.supportMenu}
      onMouseEnter={() => {
        cancelClose();
        cancelOpen();
        // Let an immediate click open the trigger before hover can toggle it.
        openTimer.current = window.setTimeout(() => {
          pointerOpened.current = true;
          setOpen(true);
        }, 120);
      }}
      onMouseLeave={scheduleClose}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={styles.supportTrigger}
            aria-label="고객센터 메뉴"
            data-active={active || undefined}
            onKeyDown={event => {
              if (event.key !== "ArrowDown") return;
              event.preventDefault();
              cancelOpen();
              pointerOpened.current = false;
              setOpen(true);
              requestAnimationFrame(() => firstLink.current?.focus());
            }}
            onPointerDown={() => {
              cancelOpen();
              pointerOpened.current = false;
            }}
          >
            고객센터 <ChevronDown size={14} aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          ref={content}
          align="center"
          sideOffset={8}
          className={styles.supportDropdown}
          aria-label="고객센터 바로가기"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onOpenAutoFocus={event => { if (pointerOpened.current) event.preventDefault(); }}
          onCloseAutoFocus={event => { if (pointerOpened.current) event.preventDefault(); }}
          onEscapeKeyDown={() => { pointerOpened.current = false; }}
        >
          <nav aria-label="고객센터 하위 메뉴">
            {SITE_SUPPORT_LINKS.map((item, index) => (
              <Link
                key={item.href}
                ref={index === 0 ? firstLink : undefined}
                href={item.href}
                aria-current={isSupportLinkActive(item.href, pathname) ? "page" : undefined}
                className={styles.supportLink}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </PopoverContent>
      </Popover>
    </div>
  );
}
