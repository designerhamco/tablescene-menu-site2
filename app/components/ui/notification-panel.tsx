"use client";

import { LoadingState } from "@/app/components/ui/loading-state";
import { useRef, useState, type ReactNode } from "react";
import { Bell } from "@/app/components/ui/site-icon";
import { Button } from "./button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { EmptyState } from "./empty-state";
import { formatNotificationDateTime } from "@/lib/notification-display-policy";

export type NotificationRow = {
  id: string; title: string; message: string; createdAt: string | null;
  unread: boolean; href: string; detail?: string;
};

function dateLabel(value: string | null) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "날짜 없음";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date(value));
}

export function NotificationPanel({ items, loading = false, footer, compact = false, layout, onActivate, onReadAll, unreadCount }: {
  items: NotificationRow[]; loading?: boolean; footer?: ReactNode; compact?: boolean; layout?: "sheet";
  onActivate?: (item: NotificationRow) => void;
  onReadAll?: () => Promise<void> | void; unreadCount?: number;
}) {
  const unread=items.filter(item=>item.unread);
  const totalUnread = unreadCount ?? unread.length;
  const [readingAll, setReadingAll] = useState(false);
  const [readError, setReadError] = useState(false);
  const [readDone, setReadDone] = useState(false);
  const readPending = useRef(false);
  const handleReadAll = async () => {
    if (!onReadAll || loading || readPending.current || totalUnread === 0) return;
    readPending.current = true;
    setReadingAll(true); setReadError(false); setReadDone(false);
    try { await onReadAll(); setReadDone(true); }
    catch { setReadError(true); }
    finally { readPending.current = false; setReadingAll(false); }
  };
  return <div className="site-notification-panel" aria-busy={loading} data-compact={compact || undefined} data-layout={layout}>
    <Tabs purpose="category" defaultValue="all" className="gap-0">
      <TabsList size="md" distribution="equal" className="site-notification-tabs" aria-label="알림 분류">
        <TabsTrigger value="all">전체 알림</TabsTrigger><TabsTrigger value="unread" count={totalUnread}>읽지 않음</TabsTrigger>
      </TabsList>
      <span className="sr-only" role="status">{readDone ? "모든 알림을 읽음으로 표시했습니다." : ""}</span>
      {readError ? <p className="site-notice site-notice-error" role="alert">알림을 읽음 처리하지 못했습니다. 다시 시도해 주세요.</p> : null}
      <div className="site-notification-body" data-read-all={Boolean(onReadAll) || undefined}>
      {[{key:"all",rows:items},{key:"unread",rows:unread}].map(({key,rows})=><TabsContent key={key} value={key} className="site-notification-feed">
        {loading ? <LoadingState label="알림을 불러오는 중입니다." /> : rows.length ? rows.map((item,index)=><div key={item.id}>
          {index === 0 || dateLabel(rows[index-1].createdAt) !== dateLabel(item.createdAt) ? <h3 className="type-label site-notification-date">{dateLabel(item.createdAt)}</h3> : null}
          <a href={item.href} className="site-notification-item" data-unread={item.unread || undefined} onClick={onActivate ? event=>{event.preventDefault();onActivate(item);} : undefined}>
            <span className="site-notification-symbol site-indicator-icon" data-icon-surface="white" aria-hidden="true"><Bell size={20} />{item.unread ? <i /> : null}</span>
            <span className="site-notification-copy"><span className="site-notification-title">{item.title}{item.unread ? <span className="sr-only"> · 읽지 않음</span> : null}</span>
              <span className="site-notification-message">{item.message}</span><span className="site-notification-meta"><time dateTime={item.createdAt ?? undefined}>{formatNotificationDateTime(item.createdAt)}</time>{item.detail ? <span>{item.detail}</span> : null}</span>
            </span>
          </a>
        </div>) : <EmptyState headingLevel={3} icon={<Bell />} title={key === "unread" ? "읽지 않은 알림이 없습니다" : "새 알림이 없습니다"} description="새로운 소식이 생기면 이곳에 표시됩니다." />}
      </TabsContent>)}
      {onReadAll ? <div className="site-notification-read-all-dock"><Button type="button" variant="outline" size="compact" className="site-button-notification-read-all" disabled={loading || readingAll || totalUnread === 0} aria-busy={readingAll} onClick={() => { void handleReadAll(); }}>{readingAll ? "처리 중…" : "모두 읽기"}</Button></div> : null}
      </div>
    </Tabs>{footer ? <div className="site-notification-footer">{footer}</div> : null}
  </div>;
}
