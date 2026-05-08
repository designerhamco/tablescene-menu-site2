type ImagePlaceholderProps = {
  className?: string;
  iconClassName?: string;
  label?: string;
};

export default function ImagePlaceholder({
  className = "aspect-[16/10] w-full",
  iconClassName = "h-20 w-20",
  label = "이미지 없음",
}: ImagePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-300 ${className}`}
    >
      <svg
        viewBox="0 0 96 96"
        aria-hidden="true"
        className={iconClassName}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      >
        <rect x="14" y="18" width="68" height="60" rx="10" />
        <path d="M18 66 39 45a7 7 0 0 1 10 0l33 33" />
        <circle cx="66" cy="36" r="8" />
      </svg>
    </div>
  );
}
