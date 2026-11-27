"use client";

import { useEffect, useRef, type ReactNode } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { RoomLabel } from "./room-label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

export function RoomTabs({ label, rooms, value, onValueChange, action, includeAll, disabled, busyRoomId, children }: {
  label: string;
  rooms: readonly { id: string; name: string; emoji?: string }[];
  value: string;
  onValueChange: (value: string) => void;
  action?: ReactNode;
  includeAll?: boolean;
  disabled?: boolean;
  busyRoomId?: string;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const activeTab = list?.querySelector('[aria-selected="true"]')?.parentElement;
    if (!list || !activeTab) return;

    function reveal() {
      if (!list || !activeTab || list.scrollWidth <= list.clientWidth) return;
      const bounds = list.getBoundingClientRect();
      const target = activeTab.getBoundingClientRect();
      if (target.left < bounds.left || target.width > bounds.width) list.scrollLeft += target.left - bounds.left;
      else if (target.right > bounds.right) list.scrollLeft += target.right - bounds.right;
    }

    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(list);
    observer.observe(activeTab);
    return () => observer.disconnect();
  }, [value, rooms.length, includeAll]);

  if (!rooms.length && !action) return children;

  return (
    <Tabs purpose="section" appearance="document" value={value} onValueChange={onValueChange}>
      <div className="site-floor-room-tabs">
        <TabsList ref={listRef} size="sm" aria-label={label} actionPlacement="start" action={action}>
          {includeAll ? <TabsTrigger value="all" disabled={disabled}>모든 룸</TabsTrigger> : null}
          {rooms.map(room => (
            <TabsTrigger key={room.id} value={room.id} disabled={disabled} aria-busy={busyRoomId === room.id || undefined}>
              <RoomLabel name={room.name || "이름 없는 룸"} emoji={room.emoji} />
              {busyRoomId === room.id ? <LoadingSpinner /> : null}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={value}>{children}</TabsContent>
      </div>
    </Tabs>
  );
}
