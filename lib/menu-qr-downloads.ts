export type MenuQrDownloadData = {
  menuSite: { id: string; name: string; slug: string; status: string };
  canDownloadRepresentativeQr: boolean;
  representativeQrDisabledReason: string | null;
  canManageTables: boolean;
  tableQrUnavailableReason: string | null;
  publicBaseUrl: string | null;
  tables: Array<{ id: string; label: string; status: "active" | "disabled"; qrPath: string }>;
};
