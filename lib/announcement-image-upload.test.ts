import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { prepareAnnouncementImage } from "./announcement-image-upload";

test("공지 이미지는 실제 디코딩 후 크기와 메타데이터를 정리한 WebP로 저장한다", async () => {
  const source = await sharp({
    create: { width: 3000, height: 1500, channels: 3, background: "#e4c381" },
  })
    .jpeg()
    .withExif({ IFD0: { Copyright: "private metadata" } })
    .toBuffer();
  const output = await prepareAnnouncementImage(source, "image/jpeg");
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 2560);
  assert.equal(metadata.height, 1280);
  assert.equal(metadata.exif, undefined);
});

test("위장 MIME·손상된 파일·SVG·빈 파일·초과 용량을 업로드 전에 거부한다", async () => {
  const png = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  for (const [bytes, mime] of [
    [png, "image/jpeg"],
    [Buffer.from("<script>alert(1)</script>"), "image/png"],
    [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), "image/svg+xml"],
    [Buffer.alloc(0), "image/png"],
    [Buffer.alloc(3 * 1024 * 1024 + 1), "image/png"],
  ] as const)
    await assert.rejects(prepareAnnouncementImage(bytes, mime));
});
