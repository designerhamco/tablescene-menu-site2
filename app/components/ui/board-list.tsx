import type { ReactNode } from "react";
import Link from "next/link";

export type BoardListEntry = { id: string; number: number | string; title: string; href: string; date: string; dateTime?: string };

/** A compact board uses the same site type, divider, hover and focus tokens as other lists. */
export function BoardList({ label, entries, status }: { label: string; entries: BoardListEntry[]; status?: ReactNode }) {
  return <table className="site-board-list">
    <caption className="sr-only">{label}</caption>
    <thead><tr><th scope="col">번호</th><th scope="col">제목</th><th scope="col">등록일</th></tr></thead>
    <tbody>{status ? <tr><td colSpan={3} className="site-board-status">{status}</td></tr> : entries.map(entry => <tr key={entry.id}>
      <td>{entry.number}</td>
      <td><Link href={entry.href} className="site-board-title">{entry.title}</Link></td>
      <td><time dateTime={entry.dateTime}>{entry.date}</time></td>
    </tr>)}</tbody>
  </table>;
}
