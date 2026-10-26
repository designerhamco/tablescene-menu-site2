import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

export function ContentList({ label, children }: { label: string; children: ReactNode }) {
  return <ul className="site-content-list" aria-label={label}>{children}</ul>;
}
export function ContentListItem({ href, title, label, date, dateTime }: {
  href: string; title: string; label?: string; date?: string; dateTime?: string;
}) {
  return <li><Link href={href} className="site-content-list-row">
    <span className="site-content-list-label">{label}</span>
    <span className="site-content-list-title">{title}</span>
    {date ? <time className="site-content-list-date" dateTime={dateTime}>{date}</time> : null}
  </Link></li>;
}
export type ArticleNeighbor = { href: string; title: string; date?: string; dateTime?: string };
export function ArticleNavigation({ previous, next }: { previous?: ArticleNeighbor | null; next?: ArticleNeighbor | null }) {
  return <nav className="site-article-navigation" aria-label="이전글·다음글">
    {([{label:"이전글",item:previous,Icon:ChevronUp},{label:"다음글",item:next,Icon:ChevronDown}]).map(({label,item,Icon}) => {
      const content = <><span className="site-article-direction">{label}<Icon size={20} strokeWidth={2.25} aria-hidden="true" /></span><span className="site-content-list-title">{item?.title ?? `${label === "이전글" ? "이전" : "다음"} 글이 없습니다.`}</span>{item?.date ? <time className="site-content-list-date" dateTime={item.dateTime}>{item.date}</time> : null}</>;
      return item ? <Link key={label} href={item.href} className="site-article-row" aria-label={`${label}: ${item.title}`}>{content}</Link> : <div className="site-article-row" key={label} aria-disabled="true">{content}</div>;
    })}
  </nav>;
}
