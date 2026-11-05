"use client";
import { QrCode } from "lucide-react";
import { ContentPanel } from "@/app/components/ui/content-panel";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { EmptyState } from "@/app/components/ui/empty-state";
import QrAddressActions from "@/components/mypage/QrAddressActions";
import RotateTableQrButton from "@/components/mypage/RotateTableQrButton";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import type { MenuTableListItem } from "@/lib/menu-table-management";
import Link from "next/link";
export default function MenuTableQrManager({
  menuSiteId,
  menuSlug,
  publicBaseUrl,
  tables,
  canConnectDevices = false,
  published,
}: {
  menuSiteId: string;
  menuSlug: string;
  publicBaseUrl: string | null;
  tables: MenuTableListItem[];
  canConnectDevices?: boolean;
  published: boolean;
}) {
  return (
    <section className="site-stack-group">
      <div className="site-stack-title">
        <h3 className="type-subsection-title">테이블별 QR</h3>
        <p className="type-body-sm site-copy-muted">
          테이블 관리와 같은 등록 정보를 사용합니다. QR 주소 변경은 메뉴판
          비공개 또는 해당 항목 일시정지 상태에서만 가능합니다.
        </p>
      </div>
      {!tables.length ? (
        <EmptyState
          headingLevel={4}
          icon={<QrCode />}
          title="등록된 테이블이 없습니다."
          description="테이블 관리에서 테이블을 먼저 등록해 주세요."
        />
      ) : (
        <ContentPanel>
          <Table
            variant="management"
            label="테이블별 QR 관리"
            columns={["text", "control", "detail", "text", "actions"]}
          >
            <TableHeader>
              <TableRow>
                {[
                  "이름",
                  "상태",
                  "QR 주소·다운로드",
                  "마지막 주소 변경",
                  "관리",
                ].map((label) => (
                  <TableHead key={label}>{label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => (
                <TableRow key={table.id} id={`table-${table.id}`}>
                  <TableCell primary>{table.label}</TableCell>
                  <TableCell>
                    <Badge>
                      {table.status === "active" ? "사용 중" : "일시정지"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <QrAddressActions
                      copyKey={table.id}
                      feedbackLabel={table.label}
                      fileName={`arti-menu-${menuSlug}-${table.label.replace(/[^0-9A-Za-z가-힣_-]+/g, "-")}-qr.png`}
                      path={table.qrPath}
                      publicBaseUrl={publicBaseUrl}
                      disabled={table.status !== "active"}
                      disabledReason="테이블 관리에서 활성화한 뒤 QR을 사용할 수 있습니다."
                    />
                  </TableCell>
                  <TableCell>
                    {formatKoreanDateTime(table.tokenRotatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="site-stack-block">
                      <RotateTableQrButton
                        menuSiteId={menuSiteId}
                        point={table}
                        published={published}
                      />
                      {canConnectDevices && table.status === "active" ? (
                        <Link
                          className="site-button site-button-outline site-button-compact"
                          href={`/mypage/menus/${menuSiteId}/orders/settings?tab=devices#point-${table.id}`}
                        >
                          연결 설정
                        </Link>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ContentPanel>
      )}
    </section>
  );
}
