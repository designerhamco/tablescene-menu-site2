"use client";

import { useActionState, useState } from "react";
import AnnouncementEditor from "./AnnouncementEditor";
import {
  ANNOUNCEMENT_CATEGORIES,
  type Announcement,
} from "@/lib/announcements";
import { saveAnnouncementAction, type AnnouncementFormState } from "./actions";
import styles from "@/components/support/support.module.css";

export default function AnnouncementForm({
  announcement,
  unavailable = false,
}: {
  announcement: Announcement | null;
  unavailable?: boolean;
}) {
  const [state, action, pending] = useActionState<
    AnnouncementFormState,
    FormData
  >(saveAnnouncementAction, {});
  const [body, setBody] = useState(announcement?.body ?? "");
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [category, setCategory] = useState(announcement?.category ?? "service");
  const [status, setStatus] = useState(announcement?.status ?? "draft");
  const [pinned, setPinned] = useState(announcement?.pinned ?? false);
  const [uploading, setUploading] = useState(false);
  return (
    <form action={action} className={styles.adminForm}>
      <h2 className="type-subsection-title">
        {announcement ? "공지사항 수정" : "새 공지사항"}
      </h2>
      <input type="hidden" name="id" value={announcement?.id ?? ""} />
      <input
        type="hidden"
        name="updated_at"
        value={announcement?.updated_at ?? ""}
      />
      <label>
        제목
        <input
          className="site-field w-full px-4"
          name="title"
          maxLength={160}
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <div>
        <label>
          공지 유형
          <select
            className="site-field px-4"
            name="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {ANNOUNCEMENT_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          공개 상태
          <select
            className="site-field px-4"
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="draft">비공개 · 작성 중</option>
            <option value="published">게시</option>
          </select>
        </label>
      </div>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          name="pinned"
          checked={pinned}
          onChange={(event) => setPinned(event.target.checked)}
        />
        목록 상단에 고정
      </label>
      <input type="hidden" name="body" value={body} />
      <AnnouncementEditor
        initialBody={announcement?.body ?? ""}
        disabled={pending || unavailable}
        onChange={setBody}
        onUploadingChange={setUploading}
      />
      {state.error ? (
        <p role="alert" className={styles.feedback}>
          {state.error}
        </p>
      ) : null}
      {unavailable ? (
        <p className={styles.feedback}>
          공지사항 저장 기능을 연결하는 중입니다. 연결이 완료되면 작성할 수
          있습니다.
        </p>
      ) : null}
      <div>
        <button
          type="submit"
          className="site-button site-button-primary"
          disabled={pending || unavailable || uploading}
        >
          {pending ? "저장 중…" : "공지사항 저장"}
        </button>
        <p className="type-body-sm text-zinc-500">
          ‘게시’를 선택하고 저장하면 고객센터에 공개됩니다.
        </p>
      </div>
    </form>
  );
}
