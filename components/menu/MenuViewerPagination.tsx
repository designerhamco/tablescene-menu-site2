"use client";

import { Button } from "@/app/components/ui/button";
import { ArrowLeft, ArrowRight } from "@/app/components/ui/site-arrow";
import styles from "./MenuViewerControls.module.css";

/** Viewer controls belong to ArtiMenu rather than an individual menu design. */
export default function MenuViewerPagination({ page, count, onPrevious, onNext }: {
  page: number; count: number; onPrevious: () => void; onNext: () => void;
}) {
  return <nav aria-label="디스플레이 페이지 이동" className={`${styles.surface} ${styles.pagination}`} data-menu-viewer-pagination="">
    <Button type="button" variant="secondary" aria-label="이전 페이지" disabled={page <= 1} onClick={onPrevious}><ArrowLeft className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">이전</span></Button>
    <span role="status" aria-live="polite" aria-label={`전체 ${count}페이지 중 ${page}페이지`} className={styles.counter} data-display-bottom-page-count=""><span className={styles.current}>{page}</span><span className={styles.total}>/ {count}</span></span>
    <Button type="button" variant="secondary" aria-label="다음 페이지" disabled={page >= count} onClick={onNext}><span className="hidden sm:inline">다음</span><ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
  </nav>;
}
