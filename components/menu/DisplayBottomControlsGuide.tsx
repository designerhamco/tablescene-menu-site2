"use client";

import { useEffect, useRef } from "react";
import { ArrowDown } from "@/app/components/ui/site-arrow";
import styles from "./DisplayBottomControlsGuide.module.css";

/** Native top layer keeps the hint above preview tools and restores focus on close. */
export default function DisplayBottomControlsGuide({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) { node.showModal(); close.current?.focus(); }
    return () => { if (node?.open) node.close(); };
  }, []);
  return <dialog ref={dialog} className={styles.overlay} aria-label="디스플레이 하단 조작 안내" aria-describedby="display-bottom-guide-copy" data-display-bottom-guide=""
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className={styles.hint}>
      <p id="display-bottom-guide-copy" className="type-body-lg">화면 아래쪽에 마우스를 가져가면<br />페이지 이동과 언어 메뉴가 나타납니다.</p>
      <p className="type-body-sm">터치 화면에서는 아래쪽을 눌러주세요.</p>
      <ArrowDown className={styles.arrow} aria-hidden="true" />
    </div>
    <div className={styles.actions}><button ref={close} type="button" className="site-button site-button-outline" onClick={onClose}>닫기</button></div>
  </dialog>;
}
