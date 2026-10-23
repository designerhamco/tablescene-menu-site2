import sharp from "sharp";
import { ANNOUNCEMENT_IMAGE_MAX_BYTES } from "./announcement-content";

export async function prepareAnnouncementImage(
  bytes: Uint8Array,
  mime: string,
) {
  const formats: Record<string, string> = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (
    !formats[mime] ||
    !bytes.length ||
    bytes.length > ANNOUNCEMENT_IMAGE_MAX_BYTES
  )
    throw new Error("JPG, PNG, WebP 이미지를 3MB 이하로 첨부해 주세요.");
  try {
    const image = sharp(bytes, {
      limitInputPixels: 40_000_000,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (metadata.format !== formats[mime] || (metadata.pages ?? 1) > 1)
      throw new Error("unsupported image");
    // Decode and re-encode instead of trusting a MIME header; strip metadata.
    return await image
      .rotate()
      .resize({
        width: 2560,
        height: 2560,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new Error(
      "이미지를 읽을 수 없습니다. 정지 이미지 JPG, PNG, WebP 파일을 확인해 주세요.",
    );
  }
}
