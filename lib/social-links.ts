export type SocialLinkType =
  | "instagram"
  | "youtube"
  | "facebook"
  | "blog"
  | "kakao_channel"
  | "band"
  | "x_twitter"
  | "threads";

export type SocialLinkInput = {
  type: SocialLinkType;
  label: string;
  display_name: string;
  url: string;
};

export type SocialLinkDraft = {
  type: SocialLinkType | "";
  display_name: string;
  url: string;
};

export type MenuSocialLink = {
  id: string;
  menu_site_id: string;
  type: SocialLinkType;
  label: string | null;
  display_name: string | null;
  url: string;
  visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
};

export const SOCIAL_LINK_TYPES = [
  "instagram",
  "youtube",
  "facebook",
  "blog",
  "kakao_channel",
  "band",
  "x_twitter",
  "threads",
] as const satisfies readonly SocialLinkType[];

export const SOCIAL_LINK_LABELS: Record<SocialLinkType, string> = {
  instagram: "인스타그램",
  youtube: "유튜브",
  facebook: "페이스북",
  blog: "블로그",
  kakao_channel: "카카오톡 채널",
  band: "밴드",
  x_twitter: "X / 트위터",
  threads: "스레드",
};

export function isSocialLinkType(value: string | null | undefined): value is SocialLinkType {
  return SOCIAL_LINK_TYPES.includes(value as SocialLinkType);
}

export function getSocialLinkLabel(type: string | null | undefined) {
  return isSocialLinkType(type) ? SOCIAL_LINK_LABELS[type] : "";
}

export function isValidSocialUrl(url: string) {
  return /^https?:\/\//i.test(url.trim());
}

export function normalizeSocialLinkInput(input: Partial<SocialLinkDraft>): SocialLinkInput | null {
  const type = typeof input.type === "string" ? input.type.trim() : "";
  const displayName = typeof input.display_name === "string" ? input.display_name.trim() : "";
  const url = typeof input.url === "string" ? input.url.trim() : "";

  if (!type && !displayName && !url) {
    return null;
  }

  if (!isSocialLinkType(type) || !displayName || !isValidSocialUrl(url)) {
    return null;
  }

  return {
    type,
    label: getSocialLinkLabel(type),
    display_name: displayName,
    url,
  };
}

export function validateSocialLinks(socialLinks: Partial<SocialLinkDraft>[]) {
  const normalized: SocialLinkInput[] = [];
  const usedTypes = new Set<SocialLinkType>();

  for (const link of socialLinks.slice(0, 3)) {
    const hasAnyValue = Boolean(link.type || link.display_name?.trim() || link.url?.trim());

    if (!hasAnyValue) {
      continue;
    }

    const normalizedLink = normalizeSocialLinkInput(link);

    if (!normalizedLink) {
      return { ok: false as const, socialLinks: [], message: "SNS 링크는 종류, 아이디/표시명, http:// 또는 https:// URL을 모두 입력해주세요." };
    }

    if (usedTypes.has(normalizedLink.type)) {
      return { ok: false as const, socialLinks: [], message: "같은 SNS 종류는 한 번만 입력할 수 있습니다." };
    }

    usedTypes.add(normalizedLink.type);
    normalized.push(normalizedLink);
  }

  return { ok: true as const, socialLinks: normalized, message: null };
}

export function getSocialLinkDisplayText(link: {
  type: string;
  label?: string | null;
  display_name?: string | null;
}) {
  return link.display_name?.trim() || link.label?.trim() || getSocialLinkLabel(link.type);
}
