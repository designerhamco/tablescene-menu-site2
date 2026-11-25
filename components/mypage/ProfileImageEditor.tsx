"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { FieldMessage } from "@/app/components/ui/field-message";
import HelpTooltip from "@/components/ui/HelpTooltip";
import ProfileAvatar from "@/components/account/ProfileAvatar";
import { ACCOUNT_PROFILE_UPDATED_EVENT, validateAccountAvatarFile } from "@/lib/account-profile";

export default function ProfileImageEditor({ userId, imageUrl }: { userId: string; imageUrl: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const feedbackId = useId();
  const [savedUrl, setSavedUrl] = useState(imageUrl);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url); // eslint-disable-line react-hooks/set-state-in-effect -- Local file preview owns the matching object URL.
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const shownUrl = remove ? null : file ? preview : savedUrl;
  const dirty = Boolean(file || (remove && savedUrl));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || pending) return;
    setPending(true);
    setError(null);
    try {
      const body = file ? new FormData() : undefined;
      if (file) body!.append("file", file);
      const response = await fetch("/api/account/avatar", { method: file ? "POST" : "DELETE", body });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "프로필 사진을 저장하지 못했습니다.");
      setSavedUrl(result.avatarUrl ?? null);
      setFile(null);
      setPreview(null);
      setRemove(false);
      if (input.current) input.current.value = "";
      window.dispatchEvent(new Event(ACCOUNT_PROFILE_UPDATED_EVENT));
      router.refresh();
      toast.success("프로필 사진이 저장되었습니다.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "프로필 사진을 저장하지 못했습니다.");
    } finally { setPending(false); }
  }

  return <form onSubmit={save} className="site-stack-block" aria-busy={pending}>
    <div className="site-action-row"><h3 className="type-content-title">프로필 사진</h3><HelpTooltip label="프로필 사진 안내">PNG, JPG, WebP · 최대 3MB. 정사각형 사진을 권장하며 가운데를 기준으로 원형으로 표시합니다. 사진이 없으면 계정에 지정된 기본 색상으로 표시합니다.</HelpTooltip></div>
    <div className="site-profile-editor-row">
      <ProfileAvatar userId={userId} imageUrl={shownUrl} size="editor" />
      <div className="site-stack-block">
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="프로필 사진 파일" disabled={pending}
          aria-invalid={Boolean(error)} aria-describedby={error ? feedbackId : undefined} onChange={event => {
            const nextFile = event.currentTarget.files?.[0];
            if (!nextFile) return;
            const validation = validateAccountAvatarFile(nextFile);
            setError(validation);
            if (validation) { event.currentTarget.value = ""; setFile(null); setPreview(null); setRemove(false); return; }
            setFile(nextFile); setRemove(false);
          }} />
        <div className="site-action-row">
          <button type="button" className="site-button site-button-outline" disabled={pending} onClick={() => input.current?.click()}>{shownUrl ? "사진 변경" : "사진 선택"}</button>
          {shownUrl ? <button type="button" className="site-button site-button-outline" disabled={pending} onClick={() => { setFile(null); setPreview(null); setRemove(true); setError(null); if (input.current) input.current.value = ""; }}>기본 이미지로</button> : null}
          <button type="submit" className="site-button site-button-primary" disabled={!dirty || pending}>{pending ? <LoadingSpinner /> : null}저장</button>
        </div>
        {error ? <FieldMessage id={feedbackId} role="alert">{error}</FieldMessage> : null}
      </div>
    </div>
  </form>;
}
