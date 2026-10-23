import assert from "node:assert/strict";
import test from "node:test";
import {
  ANNOUNCEMENT_BODY_PREFIX,
  encodeAnnouncementDocument,
  isAnnouncementImageUrl,
  normalizeAnnouncementDocument,
  normalizeAnnouncementFontSize,
  readAnnouncementDocument,
  validateAnnouncementBody,
} from "./announcement-content";

const textDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "안내 <script>alert(1)</script>",
          marks: [
            { type: "bold" },
            { type: "textStyle", attrs: { fontSize: "1.5rem" } },
          ],
        },
      ],
    },
  ],
};
const storage = "https://notice-test.supabase.co";
const imageUrl = `${storage}/storage/v1/object/public/menu-images/support-announcements/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp`;

test("붙여 넣은 글자 크기는 허용된 다섯 단계로 정리한다", () => {
  assert.equal(normalizeAnnouncementFontSize("16px"), "1rem");
  assert.equal(normalizeAnnouncementFontSize("24px"), "1.5rem");
  assert.equal(normalizeAnnouncementFontSize("18pt"), "1.5rem");
  assert.equal(normalizeAnnouncementFontSize("1.25rem"), "1.25rem");
  assert.equal(normalizeAnnouncementFontSize("9999px"), "2rem");
  assert.equal(normalizeAnnouncementFontSize("var(--untrusted)"), "1rem");
});

test("일반 텍스트 공지의 줄바꿈·빈 문단·HTML 문자열을 에디터 문서로 보존한다", () => {
  assert.deepEqual(
    readAnnouncementDocument("첫 줄\n\n<script>문자 그대로</script>"),
    {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "첫 줄" }] },
        { type: "paragraph" },
        {
          type: "paragraph",
          content: [{ type: "text", text: "<script>문자 그대로</script>" }],
        },
      ],
    },
  );
});

test("굵게·크기·목록 문서는 안전한 JSON으로 왕복하고 임의 속성은 보관하지 않는다", () => {
  assert.deepEqual(
    readAnnouncementDocument(encodeAnnouncementDocument(textDoc)),
    textDoc,
  );
  // Browsers normalize form field line endings. Also read the early newline-delimited format.
  assert.deepEqual(
    readAnnouncementDocument(
      ANNOUNCEMENT_BODY_PREFIX + "\r\n" + JSON.stringify(textDoc),
    ),
    textDoc,
  );
  const formRoundTrip = validateAnnouncementBody(
    ANNOUNCEMENT_BODY_PREFIX + "\r\n" + JSON.stringify(textDoc),
  );
  assert.equal(formRoundTrip.ok, true);
  if (formRoundTrip.ok)
    assert.equal(formRoundTrip.body, encodeAnnouncementDocument(textDoc));
  const doc = { ...textDoc, onload: "alert(1)" };
  assert.deepEqual(normalizeAnnouncementDocument(doc), textDoc);
  assert.equal(
    validateAnnouncementBody(encodeAnnouncementDocument(doc)).ok,
    true,
  );
  const lists = {
    type: "doc",
    content: [
      {
        type: "orderedList",
        attrs: { start: 3 },
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "순서" },
                  { type: "hardBreak" },
                  { type: "text", text: "다음 줄" },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  assert.deepEqual(
    readAnnouncementDocument(encodeAnnouncementDocument(lists)),
    lists,
  );
});

test("빈 서식 문서·손상된 JSON·스크립트·링크·임의 글자 크기는 거부한다", () => {
  for (const body of [
    encodeAnnouncementDocument({
      type: "doc",
      content: [{ type: "paragraph" }],
    }),
    ANNOUNCEMENT_BODY_PREFIX + "{",
    encodeAnnouncementDocument({
      type: "doc",
      content: [{ type: "script", text: "alert(1)" }],
    }),
    encodeAnnouncementDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "위험",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    }),
    encodeAnnouncementDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "크기",
              marks: [{ type: "textStyle", attrs: { fontSize: "100vh" } }],
            },
          ],
        },
      ],
    }),
    "가".repeat(20001),
  ])
    assert.equal(validateAnnouncementBody(body).ok, false);
});

test("첨부 이미지는 설정된 저장소와 공지 전용 경로의 불변 WebP URL만 허용한다", () => {
  assert.equal(isAnnouncementImageUrl(imageUrl, storage), true);
  for (const url of [
    imageUrl.replace(storage, "https://evil.test"),
    imageUrl.replace("support-announcements", "menu-sites"),
    imageUrl + "?x=1",
    imageUrl + "#x",
    imageUrl.replace(".webp", ".svg"),
    "javascript:alert(1)",
    "data:image/png;base64,a",
    "https://user:password@notice-test.supabase.co/",
  ])
    assert.equal(isAnnouncementImageUrl(url, storage), false);
});

test("이미지만 있는 공지를 허용하고 이미지 수·설명 길이·외부 주소를 제한한다", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = storage;
  try {
    const image = {
      type: "image",
      attrs: { src: imageUrl, alt: "안내 이미지" },
    };
    assert.equal(
      validateAnnouncementBody(
        encodeAnnouncementDocument({ type: "doc", content: [image] }),
      ).ok,
      true,
    );
    for (const content of [
      Array.from({ length: 11 }, () => image),
      [{ ...image, attrs: { ...image.attrs, alt: "가".repeat(201) } }],
      [{ ...image, attrs: { ...image.attrs, src: "https://evil.test/a.png" } }],
    ])
      assert.equal(
        validateAnnouncementBody(
          encodeAnnouncementDocument({ type: "doc", content }),
        ).ok,
        false,
      );
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  }
});

test("과도한 노드와 깊이·잘못된 문단 계층은 거부한다", () => {
  assert.throws(() =>
    normalizeAnnouncementDocument({
      type: "doc",
      content: Array.from({ length: 2049 }, () => ({ type: "paragraph" })),
    }),
  );
  assert.throws(() =>
    normalizeAnnouncementDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "image", attrs: { src: imageUrl, alt: "" } }],
        },
      ],
    }),
  );
  let nested: unknown = {
    type: "paragraph",
    content: [{ type: "text", text: "깊이" }],
  };
  for (let i = 0; i < 10; i++)
    nested = {
      type: "bulletList",
      content: [{ type: "listItem", content: [{ type: "paragraph" }, nested] }],
    };
  assert.throws(() =>
    normalizeAnnouncementDocument({ type: "doc", content: [nested] }),
  );
});
