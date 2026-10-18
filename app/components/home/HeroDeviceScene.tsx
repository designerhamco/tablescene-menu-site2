'use client';

import { useId } from 'react';
import { HERO_SCREEN_CONTOURS } from './hero-screen-contours';
import styles from './HomeHero.module.css';

// Coordinates belong to the original 3344 × 1882 photo, never the viewport.
// Keep the photo and these replaceable screen surfaces in the same crop box.
const SCREENS = {
  monitor: { path: 'M1580 511 L2698 477 L2697 1200 L1580 1168 Z', x: 1580, y: 477, width: 1118, height: 723 },
  tablet: { path: HERO_SCREEN_CONTOURS.tablet, x: 808, y: 932, width: 694, height: 466 },
  phone: { path: HERO_SCREEN_CONTOURS.phone, x: 1540, y: 1036, width: 181, height: 410 },
} as const;

type ScreenImages = Partial<Record<keyof typeof SCREENS, string>>;

export default function HeroDeviceScene({ onLoad, screenImages = {} }: { onLoad: () => void; screenImages?: ScreenImages }) {
  const id = useId().replace(/:/g, '');
  return (
    <div className={`${styles.image} ${styles.deviceScene}`} data-hero-device-scene>
      {/* Pre-encoded responsive files preserve the original photo's quality. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/artimenu-home-hero-hq-3344.webp"
        srcSet="/assets/artimenu-home-hero-hq-640.webp 640w, /assets/artimenu-home-hero-hq-960.webp 960w, /assets/artimenu-home-hero-hq-1536.webp 1536w, /assets/artimenu-home-hero-hq-2304.webp 2304w, /assets/artimenu-home-hero-hq-3344.webp 3344w"
        alt="카운터 위 모니터, 태블릿과 스마트폰의 화면 교체 미리보기"
        width={3344}
        height={1882}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        sizes="(max-width: 639px) calc(150vw - 60px), (min-width: 1600px) 1520px, (min-width: 1334px) calc(100vw - 80px), (min-width: 667px) 94vw, calc(100vw - 40px)"
        className={styles.scenePhoto}
        onLoad={onLoad}
      />
      <svg className={styles.screenOverlay} viewBox="0 0 3344 1882" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2a2d32" />
            <stop offset="1" stopColor="#191c21" />
          </linearGradient>
          <mask id={`${id}-behind-phone`} maskUnits="userSpaceOnUse" x="0" y="0" width="3344" height="1882">
            <rect width="3344" height="1882" fill="white" />
            {/* The foreground includes the phone's metal rim, not only its screen. */}
            <path d="M1573 1031 L1690 1026 C1722 1025 1742 1047 1742 1078 L1742 1410 C1742 1443 1721 1460 1691 1459 L1573 1451 C1540 1450 1529 1436 1529 1408 L1530 1078 C1530 1049 1549 1033 1573 1031 Z" fill="black" />
          </mask>
          <mask id={`${id}-phone-screen`} maskUnits="userSpaceOnUse" x="0" y="0" width="3344" height="1882">
            <rect width="3344" height="1882" fill="white" />
            <path d={HERO_SCREEN_CONTOURS.sensor} fill="black" />
          </mask>
          {Object.entries(SCREENS).map(([name, screen]) => <clipPath key={name} id={`${id}-${name}`}><path d={screen.path} /></clipPath>)}
        </defs>
        {Object.entries(SCREENS).map(([name, screen]) => (
          <g key={name} mask={`url(#${id}-${name === 'phone' ? 'phone-screen' : 'behind-phone'})`} data-device-screen={name}>
            <path d={screen.path} fill={`url(#${id}-glass)`} />
            {screenImages[name as keyof ScreenImages] ? <image href={screenImages[name as keyof ScreenImages]} x={screen.x} y={screen.y} width={screen.width} height={screen.height} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}-${name})`} /> : null}
          </g>
        ))}
      </svg>
    </div>
  );
}
