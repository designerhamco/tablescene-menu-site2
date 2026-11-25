import sharp from "sharp";
import { ACCOUNT_AVATAR_MAX_BYTES, getAccountAvatarPath, validateAccountAvatarFile } from "./account-profile";

export async function prepareAccountAvatarImage(bytes: Uint8Array, type: string) {
  const error = validateAccountAvatarFile({ size: bytes.length, type });
  if (error) throw new Error(error);
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "warning" });
    const metadata = await image.metadata();
    const formats: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
    if (metadata.format !== formats[type] || (metadata.pages ?? 1) > 1) throw new Error("invalid image");
    return await image.rotate().resize(512, 512, { fit: "cover", position: "centre" }).webp({ quality: 88 }).toBuffer();
  } catch {
    throw new Error("이미지를 읽을 수 없습니다. 정지 이미지 PNG, JPG, WebP 파일을 확인해 주세요.");
  }
}

export async function readAccountAvatarFile(request: Request) {
  const limit = ACCOUNT_AVATAR_MAX_BYTES + 64 * 1024;
  if (Number(request.headers.get("content-length")) > limit) throw new Error("프로필 사진은 3MB 이하로 선택해 주세요.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("프로필 사진을 선택해 주세요.");
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > limit) {
      await reader.cancel();
      throw new Error("프로필 사진은 3MB 이하로 선택해 주세요.");
    }
    chunks.push(value);
  }
  const form = await new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
  const files = form.getAll("file");
  if (files.length !== 1 || !(files[0] instanceof File)) throw new Error("프로필 사진 한 장을 선택해 주세요.");
  return files[0];
}

type AvatarStorage = {
  upload: (path: string, bytes: Uint8Array) => Promise<void>;
  update: (path: string | null) => Promise<void>;
  remove: (path: string) => Promise<void>;
};

/** Publish metadata only after upload; a failed save never removes the prior photo. */
export async function saveAccountAvatar(userId: string, previousPath: string | null, image: Uint8Array | null, storage: AvatarStorage) {
  const nextPath = image ? `account-avatars/${userId}/${crypto.randomUUID()}.webp` : null;
  if (image && nextPath) await storage.upload(nextPath, image);
  try {
    await storage.update(nextPath);
  } catch (error) {
    if (nextPath) await storage.remove(nextPath).catch(() => console.warn("[account-avatar] failed-upload cleanup pending"));
    throw error;
  }
  const safePreviousPath = getAccountAvatarPath(userId, { profile_avatar_path: previousPath });
  if (safePreviousPath) await storage.remove(safePreviousPath).catch(() => console.warn("[account-avatar] replaced-image cleanup pending"));
  return nextPath;
}
