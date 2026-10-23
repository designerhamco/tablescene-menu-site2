"use client";

import { useEffect, useId, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  ImagePlus,
  Undo2,
  Redo2,
  Eraser,
  Trash2,
} from "lucide-react";
import {
  ANNOUNCEMENT_BODY_LIMIT,
  ANNOUNCEMENT_FONT_SIZES,
  ANNOUNCEMENT_IMAGE_LIMIT,
  ANNOUNCEMENT_IMAGE_MAX_BYTES,
  announcementDocumentStats,
  encodeAnnouncementDocument,
  isAnnouncementImageUrl,
  normalizeAnnouncementFontSize,
  readAnnouncementDocument,
  type AnnouncementNode,
} from "@/lib/announcement-content";
import contentStyles from "@/components/support/announcement-content.module.css";
import styles from "./announcement-editor.module.css";

const SafeImage = Image.extend({
  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: (element) =>
          isAnnouncementImageUrl(element.getAttribute("src")) ? null : false,
      },
    ];
  },
});

const SafeFontSize = FontSize.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              normalizeAnnouncementFontSize(element.style.fontSize),
            renderHTML: (attributes: Record<string, unknown>) =>
              attributes.fontSize
                ? {
                    style: `font-size: ${normalizeAnnouncementFontSize(String(attributes.fontSize))}`,
                  }
                : {},
          },
        },
      },
    ];
  },
});

export default function AnnouncementEditor({
  initialBody,
  disabled,
  onChange,
  onUploadingChange,
}: {
  initialBody: string;
  disabled: boolean;
  onChange: (body: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [initial] = useState(() => readAnnouncementDocument(initialBody));
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
        strike: false,
      }),
      TextStyle,
      SafeFontSize,
      SafeImage.configure({ allowBase64: false }),
    ],
    content: initial ?? { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: {
        class: contentStyles.body,
        role: "textbox",
        "aria-label": "공지사항 본문",
        "aria-multiline": "true",
        "aria-describedby": `${id}-help`,
        "data-placeholder": "공지할 내용을 작성해 주세요.",
      },
    },
    onUpdate: ({ editor }) =>
      onChange(encodeAnnouncementDocument(editor.getJSON())),
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      const json = editor.getJSON() as AnnouncementNode;
      const stats = announcementDocumentStats(json);
      return {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
        fontSize: editor.getAttributes("textStyle").fontSize ?? "1rem",
        image: editor.isActive("image"),
        imageAlt: String(editor.getAttributes("image").alt ?? ""),
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
        images: stats.images,
        characters: stats.text.length,
        storedLength: encodeAnnouncementDocument(json).length,
      };
    },
  });
  useEffect(() => {
    editor?.setEditable(!disabled && !uploading, false);
  }, [editor, disabled, uploading]);

  async function upload(file: File) {
    if (!editor || uploading || disabled) return;
    setError(null);
    setMessage("");
    if ((state?.images ?? 0) >= ANNOUNCEMENT_IMAGE_LIMIT) {
      setError("이미지는 공지당 10장까지 넣을 수 있습니다.");
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size <= 0 ||
      file.size > ANNOUNCEMENT_IMAGE_MAX_BYTES
    ) {
      setError("JPG, PNG, WebP 이미지를 3MB 이하로 첨부해 주세요.");
      return;
    }
    setUploading(true);
    onUploadingChange(true);
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/admin/announcement-images", {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as {
        ok?: boolean;
        imageUrl?: string;
        message?: string;
      };
      if (
        !response.ok ||
        !result.ok ||
        !isAnnouncementImageUrl(result.imageUrl)
      )
        throw new Error(result.message ?? "이미지를 첨부하지 못했습니다.");
      if (!editor.isDestroyed) {
        editor
          .chain()
          .focus()
          .setImage({
            src: result.imageUrl!,
            alt: file.name.replace(/\.[^.]+$/, "").slice(0, 200),
          })
          .run();
        setMessage(
          "이미지를 넣었습니다. 이미지를 선택하면 설명을 수정하거나 본문에서 제거할 수 있습니다.",
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "이미지 첨부 중 오류가 발생했습니다.",
      );
    } finally {
      setUploading(false);
      onUploadingChange(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  const locked = disabled || uploading || !editor;
  const tools = [
    {
      label: "굵게",
      icon: Bold,
      active: state?.bold,
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: "기울임",
      icon: Italic,
      active: state?.italic,
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: "밑줄",
      icon: Underline,
      active: state?.underline,
      run: () => editor?.chain().focus().toggleUnderline().run(),
    },
    {
      label: "글머리 기호",
      icon: List,
      active: state?.bulletList,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: "번호 목록",
      icon: ListOrdered,
      active: state?.orderedList,
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
  ];
  return (
    <section className={styles.field} aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="type-label">
        본문
      </span>
      <div className={styles.editor}>
        <div
          className={styles.toolbar}
          role="group"
          aria-label="본문 편집 도구"
        >
          <select
            aria-label="글자 크기"
            className="site-field"
            value={state?.fontSize ?? "1rem"}
            disabled={locked}
            onChange={(event) =>
              editor?.chain().focus().setFontSize(event.target.value).run()
            }
          >
            {ANNOUNCEMENT_FONT_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
          {tools.map(({ label, icon: Icon, active, run }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={Boolean(active)}
              disabled={locked}
              onMouseDown={(event) => event.preventDefault()}
              onClick={run}
            >
              <Icon size={18} aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            aria-label="글자 서식 지우기"
            title="글자 서식 지우기"
            disabled={locked}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              editor
                ?.chain()
                .focus()
                .unsetAllMarks()
                .command(({ tr }) => {
                  tr.setStoredMarks([]);
                  return true;
                })
                .run()
            }
          >
            <Eraser size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="실행 취소"
            title="실행 취소"
            disabled={locked || !state?.canUndo}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="다시 실행"
            title="다시 실행"
            disabled={locked || !state?.canRedo}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.attach}
            disabled={
              locked || (state?.images ?? 0) >= ANNOUNCEMENT_IMAGE_LIMIT
            }
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus size={18} aria-hidden="true" />
            {uploading ? "첨부 중…" : "이미지 첨부"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="공지사항 이미지 파일"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </div>
        {!initial && (
          <p role="alert" className={styles.feedback}>
            저장된 본문을 읽지 못했습니다. 내용을 보관한 뒤 다시 작성해 주세요.
          </p>
        )}
        {!editor && (
          <p className={styles.loading}>편집기를 준비하고 있습니다…</p>
        )}
        <EditorContent editor={editor} className={styles.surface} />
        {state?.image && (
          <div className={styles.imageTools}>
            <label>
              이미지 설명
              <input
                className="site-field px-3"
                value={state.imageAlt}
                maxLength={200}
                disabled={locked}
                onChange={(event) =>
                  editor?.commands.updateAttributes("image", {
                    alt: event.target.value,
                  })
                }
              />
            </label>
            <button
              type="button"
              disabled={locked}
              onClick={() => editor?.chain().focus().deleteSelection().run()}
            >
              <Trash2 size={16} aria-hidden="true" /> 본문에서 제거
            </button>
          </div>
        )}
        <div className={styles.count}>
          {state?.characters ?? initialBody.length}자 · 이미지{" "}
          {state?.images ?? 0}/{ANNOUNCEMENT_IMAGE_LIMIT}
        </div>
      </div>
      <p id={`${id}-help`} className="type-caption text-zinc-500">
        글자를 선택해 크기와 서식을 바꿀 수 있습니다. 이미지: JPG·PNG·WebP, 장당
        3MB 이하, 최대 10장.
      </p>
      {(state?.storedLength ?? 0) > ANNOUNCEMENT_BODY_LIMIT && (
        <p role="alert" className={styles.feedback}>
          본문이 저장 한도를 넘었습니다. 글이나 서식을 조금 줄여 주세요.
        </p>
      )}
      {error && (
        <p role="alert" className={styles.feedback}>
          {error}
        </p>
      )}
      <p role="status" className="type-caption text-zinc-500">
        {uploading
          ? "이미지를 첨부하고 있습니다. 첨부가 끝나면 저장할 수 있습니다."
          : message}
      </p>
    </section>
  );
}
