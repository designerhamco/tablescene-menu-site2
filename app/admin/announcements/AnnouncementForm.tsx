"use client";

import { useActionState } from "react";
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
          defaultValue={announcement?.title ?? ""}
        />
      </label>
      <div>
        <label>
          공지 유형
          <select
            className="site-field px-4"
            name="category"
            defaultValue={announcement?.category ?? "service"}
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
            defaultValue={announcement?.status ?? "draft"}
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
          defaultChecked={announcement?.pinned ?? false}
        />
        목록 상단에 고정
      </label>
      <label>
        본문
        <textarea
          className="site-field w-full p-4"
          name="body"
          maxLength={20000}
          required
          defaultValue={announcement?.body ?? ""}
        />
        <span className="type-caption text-zinc-500">
          줄바꿈을 유지하는 일반 텍스트로 게시됩니다.
        </span>
      </label>
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
          disabled={pending || unavailable}
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
