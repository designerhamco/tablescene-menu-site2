// Versioned, allowlisted editor data shares the existing text column with legacy notices.
// Public rendering uses React nodes, never stored HTML.
export const ANNOUNCEMENT_BODY_PREFIX = "[artimenu-richtext-v1]";
export const ANNOUNCEMENT_BODY_LIMIT = 20000;
export const ANNOUNCEMENT_IMAGE_LIMIT = 10;
export const ANNOUNCEMENT_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const ANNOUNCEMENT_IMAGE_BUCKET = "menu-images";
export const ANNOUNCEMENT_FONT_SIZES = [
  { value: "0.875rem", label: "14px" },
  { value: "1rem", label: "16px · 기본" },
  { value: "1.25rem", label: "20px" },
  { value: "1.5rem", label: "24px" },
  { value: "2rem", label: "32px" },
] as const;

export function normalizeAnnouncementFontSize(value: string) {
  const match = value.trim().match(/^([\d.]+)(px|pt|rem|em)$/);
  if (!match) return "1rem";
  const pixels =
    Number(match[1]) * (match[2] === "pt" ? 4 / 3 : match[2] === "px" ? 1 : 16);
  if (!Number.isFinite(pixels) || pixels <= 0) return "1rem";
  return ANNOUNCEMENT_FONT_SIZES.reduce((closest, size) =>
    Math.abs(parseFloat(size.value) * 16 - pixels) <
    Math.abs(parseFloat(closest.value) * 16 - pixels)
      ? size
      : closest,
  ).value;
}

export type AnnouncementMark = {
  type: "bold" | "italic" | "underline" | "textStyle";
  attrs?: { fontSize: string };
};
export type AnnouncementNode = {
  type:
    | "doc"
    | "paragraph"
    | "text"
    | "hardBreak"
    | "image"
    | "bulletList"
    | "orderedList"
    | "listItem";
  text?: string;
  marks?: AnnouncementMark[];
  attrs?: { src?: string; alt?: string; start?: number };
  content?: AnnouncementNode[];
};

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const IMAGE_PATH = new RegExp(
  `^/storage/v1/object/public/menu-images/support-announcements/${UUID}/${UUID}\\.webp$`,
  "i",
);

export function isAnnouncementImageUrl(
  value: unknown,
  storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
) {
  if (typeof value !== "string" || !storageUrl) return false;
  try {
    const url = new URL(value);
    const storage = new URL(storageUrl);
    return (
      url.origin === storage.origin &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      IMAGE_PATH.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("잘못된 본문 형식입니다.");
  return value as Record<string, unknown>;
}

export function normalizeAnnouncementDocument(
  value: unknown,
): AnnouncementNode {
  let nodes = 0;
  let images = 0;
  function visit(
    value: unknown,
    parent: string,
    depth: number,
  ): AnnouncementNode {
    if (++nodes > 2048 || depth > 8)
      throw new Error(
        "본문 구성이 너무 복잡합니다. 문단이나 목록을 줄여 주세요.",
      );
    const node = object(value);
    const type = node.type;
    const allowed =
      parent === "root"
        ? ["doc"]
        : parent === "paragraph"
          ? ["text", "hardBreak"]
          : parent === "bulletList" || parent === "orderedList"
            ? ["listItem"]
            : ["paragraph", "image", "bulletList", "orderedList"];
    if (typeof type !== "string" || !allowed.includes(type))
      throw new Error("지원하지 않는 본문 서식입니다.");
    if (type === "text") {
      if (typeof node.text !== "string" || !node.text.length)
        throw new Error("잘못된 본문 형식입니다.");
      const result: AnnouncementNode = { type, text: node.text };
      if (node.marks !== undefined) {
        if (!Array.isArray(node.marks) || node.marks.length > 4)
          throw new Error("잘못된 글자 서식입니다.");
        const marks: AnnouncementMark[] = node.marks.map((value) => {
          const mark = object(value);
          if (
            mark.type === "bold" ||
            mark.type === "italic" ||
            mark.type === "underline"
          )
            return { type: mark.type };
          if (mark.type === "textStyle") {
            const attrs = object(mark.attrs);
            if (
              ANNOUNCEMENT_FONT_SIZES.some(
                (size) => size.value === attrs.fontSize,
              )
            )
              return {
                type: "textStyle",
                attrs: { fontSize: attrs.fontSize as string },
              };
          }
          throw new Error("지원하지 않는 글자 서식입니다.");
        });
        if (new Set(marks.map((mark) => mark.type)).size !== marks.length)
          throw new Error("중복된 글자 서식입니다.");
        if (marks.length) result.marks = marks;
      }
      return result;
    }
    if (type === "hardBreak") return { type };
    if (type === "image") {
      if (++images > ANNOUNCEMENT_IMAGE_LIMIT)
        throw new Error(
          `이미지는 공지당 ${ANNOUNCEMENT_IMAGE_LIMIT}장까지 넣을 수 있습니다.`,
        );
      const attrs = object(node.attrs);
      if (!isAnnouncementImageUrl(attrs.src))
        throw new Error("공지사항에 첨부한 이미지만 사용할 수 있습니다.");
      if (typeof attrs.alt !== "string" || attrs.alt.length > 200)
        throw new Error("이미지 설명은 200자 이내로 입력해 주세요.");
      return { type, attrs: { src: attrs.src as string, alt: attrs.alt } };
    }
    if (node.content !== undefined && !Array.isArray(node.content))
      throw new Error("잘못된 문단 형식입니다.");
    const content = ((node.content as unknown[] | undefined) ?? []).map(
      (child) => visit(child, type, depth + 1),
    );
    if (type !== "paragraph" && !content.length)
      throw new Error("빈 문서 또는 목록입니다.");
    if (type === "listItem" && content[0]?.type !== "paragraph")
      throw new Error("목록 항목은 문단으로 시작해야 합니다.");
    const result: AnnouncementNode = {
      type: type as AnnouncementNode["type"],
      ...(content.length ? { content } : {}),
    };
    if (type === "orderedList") {
      const start = node.attrs ? object(node.attrs).start : 1;
      if (
        !Number.isSafeInteger(start) ||
        Number(start) < 1 ||
        Number(start) > 9999
      )
        throw new Error("목록 시작 번호를 확인해 주세요.");
      result.attrs = { start: Number(start) };
    }
    return result;
  }
  return visit(value, "root", 0);
}

export function announcementDocumentStats(doc: AnnouncementNode): {
  text: string;
  images: number;
} {
  if (doc.type === "text") return { text: doc.text ?? "", images: 0 };
  if (doc.type === "image") return { text: "", images: 1 };
  if (doc.type === "hardBreak") return { text: "\n", images: 0 };
  const children = (doc.content ?? []).map(announcementDocumentStats);
  return {
    text: children
      .map((child) => child.text)
      .join(doc.type === "paragraph" ? "" : "\n"),
    images: children.reduce((sum, child) => sum + child.images, 0),
  };
}

export function encodeAnnouncementDocument(doc: unknown) {
  return ANNOUNCEMENT_BODY_PREFIX + JSON.stringify(doc);
}

export function readAnnouncementDocument(
  body: string,
): AnnouncementNode | null {
  if (!body.startsWith(ANNOUNCEMENT_BODY_PREFIX)) {
    return {
      type: "doc",
      content: body.split("\n").map((text) => ({
        type: "paragraph",
        ...(text ? { content: [{ type: "text", text }] } : {}),
      })),
    };
  }
  try {
    return normalizeAnnouncementDocument(
      JSON.parse(body.slice(ANNOUNCEMENT_BODY_PREFIX.length)),
    );
  } catch {
    return null;
  }
}

export function validateAnnouncementBody(
  body: string,
): { ok: true; body: string } | { ok: false; error: string } {
  if (!body) return { ok: false, error: "본문 내용이나 이미지를 넣어 주세요." };
  if (body.length > ANNOUNCEMENT_BODY_LIMIT)
    return {
      ok: false,
      error: "본문은 서식 정보를 포함해 20,000자 이내로 입력해 주세요.",
    };
  if (!body.startsWith(ANNOUNCEMENT_BODY_PREFIX)) return { ok: true, body };
  try {
    const doc = normalizeAnnouncementDocument(
      JSON.parse(body.slice(ANNOUNCEMENT_BODY_PREFIX.length)),
    );
    const stats = announcementDocumentStats(doc);
    if (!stats.text.trim() && !stats.images)
      return { ok: false, error: "본문 내용이나 이미지를 넣어 주세요." };
    return { ok: true, body: encodeAnnouncementDocument(doc) };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "본문 서식을 확인해 주세요.",
    };
  }
}
