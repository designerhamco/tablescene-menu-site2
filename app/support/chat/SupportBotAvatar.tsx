import Image from "next/image";

export default function SupportBotAvatar({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <Image src="/images/support/artimenu-ai-bot.webp" alt="" width={size} height={size}
    sizes={`${size}px`} className={className} />;
}
