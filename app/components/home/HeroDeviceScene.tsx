'use client';

import { useId } from 'react';
import styles from './HomeHero.module.css';

// Coordinates belong to the original 3344 × 1882 photo, never the viewport.
// Keep the photo and these replaceable screen surfaces in the same crop box.
const SCREENS = {
  monitor: { path: 'M1584 515 L2695 482 L2694 1197 L1585 1168 Z', x: 1584, y: 482, width: 1111, height: 715 },
  tablet: { path: 'M830 935 L1481 941 Q1499 941 1499 960 L1499 1378 Q1499 1398 1480 1397 L830 1370 Q811 1369 811 1350 L811 954 Q811 935 830 935 Z', x: 811, y: 935, width: 688, height: 463 },
  phone: { path: 'M1572 1047 L1693 1043 Q1717 1043 1717 1067 L1715 1418 Q1715 1439 1694 1438 L1573 1431 Q1551 1430 1551 1409 L1552 1072 Q1552 1049 1572 1047 Z', x: 1551, y: 1043, width: 166, height: 395 },
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
            <path d={SCREENS.phone.path} fill="white" />
            <rect x="1602" y="1048" width="63" height="18" rx="9" fill="black" />
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
