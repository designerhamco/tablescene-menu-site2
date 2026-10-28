"use client";

import type { ReactNode } from "react";
import { Bell } from "lucide-react";
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

export function NotificationPanel({ items, loading = false, footer, compact = false, onActivate }: {
  items: NotificationRow[]; loading?: boolean; footer?: ReactNode; compact?: boolean;
  onActivate?: (item: NotificationRow) => void;
}) {
  const unread=items.filter(item=>item.unread);
  return <div className="site-notification-panel" data-compact={compact || undefined}>
    <Tabs hierarchy="secondary" defaultValue="all" className="gap-0">
      <TabsList size="md" distribution="equal" className="site-notification-tabs" aria-label="알림 분류">
        <TabsTrigger value="all">전체 알림</TabsTrigger><TabsTrigger value="unread" count={unread.length}>읽지 않음</TabsTrigger>
      </TabsList>
      {[{key:"all",rows:items},{key:"unread",rows:unread}].map(({key,rows})=><TabsContent key={key} value={key} className="site-notification-feed">
        {loading ? <p className="site-notification-empty" role="status">알림을 불러오는 중입니다.</p> : rows.length ? rows.map((item,index)=><div key={item.id}>
          {index === 0 || dateLabel(rows[index-1].createdAt) !== dateLabel(item.createdAt) ? <h3 className="type-label site-notification-date">{dateLabel(item.createdAt)}</h3> : null}
          <a href={item.href} className="site-notification-item" data-unread={item.unread || undefined} onClick={onActivate ? event=>{event.preventDefault();onActivate(item);} : undefined}>
            <span className="site-notification-symbol" aria-hidden="true"><Bell size={20} />{item.unread ? <i /> : null}</span>
            <span className="site-notification-copy"><span className="site-notification-title">{item.title}{item.unread ? <span className="sr-only"> · 읽지 않음</span> : null}</span>
              <span className="site-notification-message">{item.message}</span><span className="site-notification-meta"><time dateTime={item.createdAt ?? undefined}>{formatNotificationDateTime(item.createdAt)}</time>{item.detail ? <span>{item.detail}</span> : null}</span>
            </span>
          </a>
        </div>) : <EmptyState headingLevel={3} icon={<Bell />} title={key === "unread" ? "읽지 않은 알림이 없습니다" : "새 알림이 없습니다"} description="새로운 소식이 생기면 이곳에 표시됩니다." />}
      </TabsContent>)}
    </Tabs>{footer ? <div className="site-notification-footer">{footer}</div> : null}
  </div>;
}
