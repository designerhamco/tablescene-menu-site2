"use client";
import { useEffect, useRef, useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/app/components/ui/alert-dialog";
import { registerUnsavedChangesPrompt } from "@/lib/unsaved-changes";

export default function UnsavedChangesDialog() {
  const [mode, setMode] = useState<"dirty" | "pending" | null>(null);
  const resolve = useRef<((accepted: boolean) => void) | null>(null);
  useEffect(() => {
    const unregister = registerUnsavedChangesPrompt(pending => new Promise<boolean>(done => { resolve.current = done; setMode(pending ? "pending" : "dirty"); }));
    return () => { unregister(); resolve.current?.(false); };
  }, []);
  function finish(accepted: boolean) { const done = resolve.current; resolve.current = null; setMode(null); done?.(accepted); }
  return <AlertDialog open={mode !== null} onOpenChange={open => { if (!open) finish(false); }}>
    <AlertDialogContent><AlertDialogHeader>
      <AlertDialogTitle>{mode === "pending" ? "변경사항을 저장하고 있어요" : "저장하지 않고 이동할까요?"}</AlertDialogTitle>
      <AlertDialogDescription>{mode === "pending" ? "저장이 끝난 뒤 다시 이동해 주세요. 저장이 실패하면 입력한 내용은 그대로 유지됩니다." : "저장하지 않은 배치와 입력 내용은 사라집니다. 계속 편집하려면 ‘계속 편집’을 눌러 주세요."}</AlertDialogDescription>
    </AlertDialogHeader><AlertDialogFooter>
      <AlertDialogCancel onClick={() => finish(false)}>{mode === "pending" ? "확인" : "계속 편집"}</AlertDialogCancel>
      {mode === "dirty" ? <AlertDialogAction onClick={() => finish(true)}>저장하지 않고 이동</AlertDialogAction> : null}
    </AlertDialogFooter></AlertDialogContent>
  </AlertDialog>;
}
