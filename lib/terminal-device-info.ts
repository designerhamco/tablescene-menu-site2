export type TerminalDeviceInfo = { kind: "태블릿" | "모바일" | "PC" | "기기"; os: string; model: string; browser: string };
export type TableTerminalConnection = { id: string; tableId: string; device: TerminalDeviceInfo | null; current: boolean; createdAt: string };
export type OrderPointDeviceSettings = {
  currentDevice: TerminalDeviceInfo; currentTableId: string | null; connectionStatusAvailable: boolean;
  connectionsAvailable: boolean; connections: TableTerminalConnection[];
};

const clean = (value: unknown) => typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 100) : "";
export function readTerminalDeviceInfo(value: unknown): TerminalDeviceInfo | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const kind = ["태블릿", "모바일", "PC", "기기"].includes(String(record.kind)) ? record.kind as TerminalDeviceInfo["kind"] : "기기";
  const os = clean(record.os), model = clean(record.model), browser = clean(record.browser);
  return os || model || browser ? { kind, os, model, browser } : null;
}

/** Display data only. Never use submitted device details for authorization. */
export function detectTerminalDevice(userAgent: string, hints: { model?: string; platformVersion?: string; maxTouchPoints?: number } = {}): TerminalDeviceInfo {
  const ua = userAgent.slice(0, 1024);
  const ipad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && (hints.maxTouchPoints ?? 0) > 1);
  const ios = ua.match(/(?:CPU(?: iPhone)? OS|iPhone OS) ([\d_]+)/i)?.[1]?.replaceAll("_", ".");
  const android = ua.match(/Android ([\d.]+)/i)?.[1];
  const mac = ua.match(/Mac OS X ([\d_]+)/i)?.[1]?.replaceAll("_", ".");
  const kind = ipad || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? "태블릿" : /iPhone|Android|Mobile/i.test(ua) ? "모바일" : /Windows|Macintosh|Linux|CrOS/i.test(ua) ? "PC" : "기기";
  let os = ipad ? `iPadOS${ios ? ` ${ios}` : ""}` : ios ? `iOS ${ios}` : android ? `Android ${clean(hints.platformVersion) || android}` : /Windows NT/i.test(ua) ? "Windows" : mac ? `macOS ${mac}` : /CrOS/i.test(ua) ? "ChromeOS" : /Linux/i.test(ua) ? "Linux" : "OS 확인 불가";
  if (os === "Windows" && hints.platformVersion) os = Number(hints.platformVersion.split(".")[0]) >= 13 ? "Windows 11" : "Windows 10";
  // iOS and desktop browsers do not expose the exact hardware model. Do not invent one.
  const androidModel = ua.match(/Android[^;)]*;\s*(?:[a-z]{2}(?:[-_][A-Z]{2})?;\s*)?([^;)]+?)(?:\s+Build\/[^;)]+)?[;)]/i)?.[1];
  const model = clean(hints.model) || (ipad ? "iPad · 상세 모델 미확인" : /iPhone/i.test(ua) ? "iPhone · 상세 모델 미확인" : androidModel && androidModel !== "K" ? clean(androidModel) : "모델 확인 불가");
  const browserMatch = ua.match(/(Edg|EdgiOS|EdgA|OPR|SamsungBrowser)\/([\d.]+)/i) ?? ua.match(/(CriOS|FxiOS|Firefox|Chrome)\/([\d.]+)/i);
  const browserName: Record<string, string> = { edg: "Edge", edgios: "Edge", edga: "Edge", opr: "Opera", samsungbrowser: "Samsung Internet", crios: "Chrome", fxios: "Firefox", firefox: "Firefox", chrome: "Chrome" };
  const browser = browserMatch ? `${browserName[browserMatch[1].toLowerCase()]} ${browserMatch[2]}` : /Safari/i.test(ua) ? `Safari${ua.match(/Version\/([\d.]+)/)?.[1] ? ` ${ua.match(/Version\/([\d.]+)/)![1]}` : ""}` : "브라우저 확인 불가";
  return { kind, os, model, browser };
}

export function formatTerminalDevice(device: TerminalDeviceInfo) {
  return `[${device.kind}] ${[device.os, device.model, device.browser].filter(Boolean).join(" · ")}`;
}
