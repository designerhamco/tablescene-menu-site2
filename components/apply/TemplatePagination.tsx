"use client";

import { SitePagination } from "@/app/components/ui/site-pagination";

export default function TemplatePagination(props: {
  currentPage: number;
  totalPages: number;
  onSelect: (page: number) => void;
}) {
  return <SitePagination {...props} label="템플릿 페이지" showSingle />;
}
