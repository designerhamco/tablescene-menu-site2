export type UnsavedChange = { dirty: boolean; pending?: boolean; discard: () => void };
export function createUnsavedChangesRegistry() {
  const entries = new Set<UnsavedChange>();
  return {
    register(entry: UnsavedChange) { entries.add(entry); return () => { entries.delete(entry); }; },
    hasChanges() { return [...entries].some(entry => entry.dirty || entry.pending); },
    async confirm(ask: () => boolean | Promise<boolean>, busy: () => void | Promise<void>) {
      if ([...entries].some(entry => entry.pending)) { await busy(); return false; }
      const dirty = [...entries].filter(entry => entry.dirty);
      if (!dirty.length) return true;
      if (!await ask()) return false;
      // Clear synchronously so the subsequent route/beforeunload does not ask twice.
      for (const entry of [...entries].filter(item => item.dirty)) { entry.dirty = false; entry.discard(); }
      return true;
    },
  };
}
export const unsavedChanges = createUnsavedChangesRegistry();
type ConfirmPrompt = (pending: boolean) => Promise<boolean>;
let prompt: ConfirmPrompt | undefined;
let confirmation: Promise<boolean> | null = null;
export function registerUnsavedChangesPrompt(handler: ConfirmPrompt) { prompt = handler; return () => { if (prompt === handler) prompt = undefined; }; }
export function isUnsavedChangesPromptOpen() { return confirmation !== null; }
export function confirmUnsavedChanges(): Promise<boolean> {
  if (confirmation) return confirmation;
  if (!unsavedChanges.hasChanges()) return Promise.resolve(true);
  confirmation = unsavedChanges.confirm(
    () => prompt ? prompt(false) : window.confirm("저장하지 않은 변경사항이 있습니다. 저장하지 않고 이동할까요?"),
    async () => { if (prompt) await prompt(true); else window.alert("변경사항을 저장하고 있습니다. 저장이 끝난 뒤 다시 이동해 주세요."); },
  ).finally(() => { confirmation = null; });
  return confirmation;
}
