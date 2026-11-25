"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { getAccountAvatarColor } from "@/lib/account-profile";

export default function ProfileAvatar({ userId, imageUrl, size = "control" }: {
  userId: string; imageUrl?: string | null; size?: "control" | "identity" | "editor";
}) {
  return <Avatar className="site-profile-avatar" data-color={getAccountAvatarColor(userId)} data-size={size} aria-hidden="true">
    {imageUrl ? <AvatarImage src={imageUrl} alt="" className="object-cover" /> : null}
    <AvatarFallback />
  </Avatar>;
}
