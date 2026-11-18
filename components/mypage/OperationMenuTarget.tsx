"use client";

import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { FieldActionRow } from "@/app/components/ui/field-action-row";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { confirmUnsavedChanges } from "@/lib/unsaved-changes";
import type { OperationMenuTargetItem } from "@/lib/operation-menu-targets";

export default function OperationMenuTarget({ label, items, navigation = false, active = false, children }: {
  label: string;
  items: OperationMenuTargetItem[];
  navigation?: boolean;
  active?: boolean;
  children?: ReactNode;
}) {
  const id = useId(), router = useRouter();
  const [open, setOpen] = useState(false), [selected, setSelected] = useState("");
  const [pending, start] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = items.find(item => item.id === selected);
    if (!target || pending) return;
    start(async () => {
      if (!(await confirmUnsavedChanges())) return;
      setOpen(false);
      router.push(target.href);
    });
  }
  return <Dialog open={open} onOpenChange={next => { setOpen(next); if (!next) setSelected(""); }}>
    <DialogTrigger asChild>{navigation ? (
      <button type="button" className={active ? "site-nav-item site-nav-item-active" : "site-nav-item"} aria-current={active ? "page" : undefined} disabled={!items.length}>
        <span className="block truncate">{label}</span>
      </button>
    ) : <Button variant="outline" disabled={!items.length}>{children ?? label}</Button>}</DialogTrigger>
    <DialogContent aria-describedby={undefined}>
      <DialogHeader reserveCloseButton><DialogTitle>{label}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="site-field-stack" aria-busy={pending}>
        <label htmlFor={id} className="type-label">관리할 메뉴판</label>
        <FieldActionRow field={<select id={id} className="site-field w-full" value={selected} disabled={pending} onChange={event => setSelected(event.target.value)}>
          <option value="" disabled>메뉴판 선택</option>
          {items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>} action={<Button type="submit" disabled={!selected || pending}>{pending ? <LoadingSpinner/> : null}{pending ? "이동 중" : "이동"}</Button>}/>
      </form>
    </DialogContent>
  </Dialog>;
}
