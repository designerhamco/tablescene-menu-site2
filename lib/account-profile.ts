export const ACCOUNT_AVATAR_BUCKET = "menu-images";
export const ACCOUNT_AVATAR_MAX_BYTES = 3 * 1024 * 1024;
export const ACCOUNT_PROFILE_UPDATED_EVENT = "artimenu:account-profile-updated";
export const ACCOUNT_AVATAR_COLORS = ["sage", "clay", "lavender", "ocean", "rose", "amber"] as const;

/** Appearance only. Account authorization never reads user-editable metadata. */
export function getAccountAvatarColor(userId: string) {
  let hash = 2166136261;
  for (const char of userId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return ACCOUNT_AVATAR_COLORS[(hash >>> 0) % ACCOUNT_AVATAR_COLORS.length];
}

export function getAccountAvatarPath(userId: string, metadata: Record<string, unknown> | null | undefined): string | null {
  const path = metadata?.profile_avatar_path;
  if (typeof path !== "string") return null;
  const prefix = `account-avatars/${userId}/`;
  return path.startsWith(prefix) && /^[0-9a-f-]{36}\.webp$/i.test(path.slice(prefix.length)) ? path : null;
}

export function getAccountAvatarUrl(userId: string, metadata: Record<string, unknown> | null | undefined, origin = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const path = getAccountAvatarPath(userId, metadata);
  return path && origin ? `${origin.replace(/\/$/, "")}/storage/v1/object/public/${ACCOUNT_AVATAR_BUCKET}/${path}` : null;
}

export function validateAccountAvatarFile(file: { type: string; size: number }) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "PNG, JPG, WebP 이미지를 선택해 주세요.";
  if (file.size <= 0 || file.size > ACCOUNT_AVATAR_MAX_BYTES) return "프로필 사진은 3MB 이하로 선택해 주세요.";
  return null;
}
