'use client';

import { useId } from 'react';
import styles from './HomeHero.module.css';

// Coordinates belong to the original 3344 × 1882 photo, never the viewport.
// Keep the photo and these replaceable screen surfaces in the same crop box.
// Overlap the screen/bezel seam by 1–2 source pixels so resampling cannot
// expose the original white screen along the antialiased boundary.
const SCREENS = {
  monitor: { path: 'M1580 511 L2698 477 L2697 1200 L1580 1168 Z', x: 1580, y: 477, width: 1118, height: 723 },
  tablet: { path: 'M829 932 L1482 937 Q1502 937 1502 959 L1502 1378 Q1502 1398 1480 1398 L829 1371 Q808 1370 808 1349 L808 953 Q808 932 829 932 Z', x: 808, y: 932, width: 694, height: 466 },
  phone: { path: 'M1570 1040 L1694 1036 C1711 1035 1721 1048 1721 1070 L1721 1416 C1721 1434 1714 1446 1694 1445 L1573 1440 C1553 1440 1540 1431 1540 1410 L1540 1072 C1540 1052 1551 1041 1570 1040 Z', x: 1540, y: 1036, width: 181, height: 410 },
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
            <path d="M1572 1036 L1688 1033 Q1734 1032 1734 1078 L1732 1410 Q1732 1452 1691 1451 L1575 1444 Q1534 1443 1534 1404 L1535 1077 Q1535 1038 1572 1036 Z" fill="black" />
          </mask>
          <mask id={`${id}-phone-screen`} maskUnits="userSpaceOnUse" x="0" y="0" width="3344" height="1882">
            <rect width="3344" height="1882" fill="white" />
            <rect x="1604" y="1050" width="59" height="14" rx="7" fill="black" />
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
