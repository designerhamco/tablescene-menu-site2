import Link from "next/link";
import { Fragment } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/app/components/ui/breadcrumb";

export default function SiteBreadcrumb({ items }: { items: readonly { label: string; href?: string }[] }) {
  return <Breadcrumb aria-label="현재 위치" className="site-breadcrumb">
    <BreadcrumbList>
      {items.map((item, index) => <Fragment key={`${item.label}:${index}`}>
        {index > 0 ? <BreadcrumbSeparator /> : null}
        <BreadcrumbItem>{item.href && index < items.length - 1
          ? <BreadcrumbLink asChild><Link href={item.href}>{item.label}</Link></BreadcrumbLink>
          : <BreadcrumbPage>{item.label}</BreadcrumbPage>}</BreadcrumbItem>
      </Fragment>)}
    </BreadcrumbList>
  </Breadcrumb>;
}
