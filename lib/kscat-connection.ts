import { inspectKscatVersionReply, kscatLoopbackUrl, KSCAT_VERSION_REQUEST, KscatProtocolError, parseKscatWebReply } from "./kscat-protocol";

export type KscatConnectionErrorCode = "unsupported" | "insecure" | "permission_denied" | "network" | "timeout" | "invalid_response" | "cancelled" | "busy";
const messages: Record<KscatConnectionErrorCode, string> = {
  unsupported: "KSCAT을 설치한 Windows 기기에서 이 화면을 열어 주세요.",
  insecure: "보안 연결된 아티메뉴 주소에서 다시 확인해 주세요.",
  permission_denied: "브라우저의 사이트 설정에서 로컬·루프백 네트워크 접근을 허용한 뒤 다시 확인해 주세요.",
  network: "KSCAT 응답을 받지 못했습니다. 프로그램 실행·WebServer·WEB 포트와 브라우저 접근 권한을 확인해 주세요.",
  timeout: "응답을 기다리는 시간이 지났습니다. KSCAT 실행 상태와 WEB 포트를 확인한 뒤 다시 시도해 주세요.",
  invalid_response: "KSCAT 버전 응답을 확인하지 못했습니다. 설치 버전과 WEB 포트를 확인해 주세요.",
  cancelled: "연결 확인을 중단했습니다.", busy: "연결 확인이 진행 중입니다.",
};
export class KscatConnectionError extends Error {
  constructor(public readonly code: KscatConnectionErrorCode) { super(messages[code]); this.name = "KscatConnectionError"; }
}

/** Fixed version query only: no TID, merchant information, card data or charge/cancel
 * command can enter this transport. CORS-readable JSONP is parsed as text, not run.
 * Do not add script/iframe/eval fallbacks when an installed KSCAT blocks CORS.
 */
export async function requestKscatVersion(port: string, signal?: AbortSignal, transport: typeof fetch = fetch) {
  const url = kscatLoopbackUrl(port);
  if (signal?.aborted) throw new KscatConnectionError("cancelled");
  const callback = `artimenu_${crypto.randomUUID().replaceAll("-", "")}`;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 8000);
  try {
    const init: RequestInit & { targetAddressSpace: "loopback" } = {
      method: "POST", mode: "cors", credentials: "omit", redirect: "error", cache: "no-store",
      referrerPolicy: "no-referrer", signal: controller.signal, targetAddressSpace: "loopback",
      body: new URLSearchParams({ REQ: KSCAT_VERSION_REQUEST, callback }),
    };
    const response = await transport(url.toString(), init);
    if (!response.ok || !response.body) throw new KscatConnectionError("network");
    const reader = response.body.getReader();
    const charset = response.headers.get("content-type")?.match(/charset\s*=\s*["']?([a-z0-9_-]+)/i)?.[1].toLowerCase() ?? "utf-8";
    const encoding = ["euc-kr", "cp949", "windows-949", "ks_c_5601-1987"].includes(charset) ? "euc-kr" : charset;
    if (!["utf-8", "utf8", "euc-kr"].includes(encoding)) throw new KscatProtocolError();
    const decoder = new TextDecoder(encoding, { fatal: true });
    let raw = "", bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 32768) throw new KscatProtocolError();
        try { raw += decoder.decode(value, { stream: true }); }
        catch { throw new KscatProtocolError(); }
      }
      try { raw += decoder.decode(); }
      catch { throw new KscatProtocolError(); }
    } finally { await reader.cancel().catch(() => undefined); }
    if (controller.signal.aborted) throw new KscatConnectionError(timedOut ? "timeout" : "cancelled");
    return inspectKscatVersionReply(parseKscatWebReply(raw, callback));
  } catch (error) {
    if (signal?.aborted) throw new KscatConnectionError("cancelled");
    if (timedOut) throw new KscatConnectionError("timeout");
    if (error instanceof KscatConnectionError) throw error;
    if (error instanceof KscatProtocolError) throw new KscatConnectionError("invalid_response");
    throw new KscatConnectionError("network");
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}

let checking = false;
/** Called by the explicit connection-check button, never on mount or a timer. */
export async function checkKscatFromBrowser(port: string, signal?: AbortSignal) {
  if (typeof window === "undefined" || !/Windows/i.test(navigator.userAgent)) throw new KscatConnectionError("unsupported");
  if (!window.isSecureContext) throw new KscatConnectionError("insecure");
  if (checking) throw new KscatConnectionError("busy");
  checking = true;
  try {
    for (const name of ["loopback-network", "local-network-access"]) {
      let permission: PermissionStatus | undefined;
      try { permission = await navigator.permissions?.query({ name: name as PermissionName }); }
      catch { continue; } // Earlier browser versions do not know these names.
      if (permission?.state === "denied") throw new KscatConnectionError("permission_denied");
      if (permission) break;
    }
    return await requestKscatVersion(port, signal);
  } finally { checking = false; }
}
