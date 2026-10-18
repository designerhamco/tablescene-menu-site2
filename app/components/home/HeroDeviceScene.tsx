'use client';

import styles from './HomeHero.module.css';

// Photoshop composites the authored screen layers and device rims together.
// A single responsive image keeps those boundaries identical at every size.
export default function HeroDeviceScene({ onLoad }: { onLoad: () => void }) {
  return (
    <div className={`${styles.image} ${styles.deviceScene}`} data-hero-device-scene data-hero-composite="psd">
      {/* Native responsive exports preserve the Photoshop composite and alpha. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/artimenu-home-hero-psd-3344.webp"
        srcSet="/assets/artimenu-home-hero-psd-640.webp 640w, /assets/artimenu-home-hero-psd-960.webp 960w, /assets/artimenu-home-hero-psd-1536.webp 1536w, /assets/artimenu-home-hero-psd-2304.webp 2304w, /assets/artimenu-home-hero-psd-3344.webp 3344w"
        alt="카운터 위 모니터, 태블릿과 스마트폰의 어두운 화면"
        width={3344}
        height={1882}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        sizes="(max-width: 639px) calc(150vw - 60px), (min-width: 1600px) 1520px, (min-width: 1334px) calc(100vw - 80px), (min-width: 667px) 94vw, calc(100vw - 40px)"
        className={styles.scenePhoto}
        onLoad={onLoad}
      />
    </div>
  );
}
