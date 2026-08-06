import {
  buildTableQrPath,
  createTableAccessToken,
  hashTableAccessToken,
} from "./table-qr-session-tokens";
export * from "./menu-table-validation";

export function createMenuTableTokenMaterial(token = createTableAccessToken()) {
  return {
    rawToken: token,
    tokenHash: hashTableAccessToken(token),
    qrPath: buildTableQrPath(token),
  };
}
