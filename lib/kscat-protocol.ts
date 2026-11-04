/** KSCAT 20260803 workbook: 보조기능 §2.17 and 카드번호 암호화_신규통합전문.
 * These codecs never send a request or authenticate a payment result.
 */
export const KSCAT_WEB_DEFAULT_PORT = "27098";
export const KSCAT_VERSION_REQUEST = "AP\x020004VR\x03\r";

export class KscatProtocolError extends Error {
  constructor(message = "KSCAT 응답 형식을 확인하지 못했습니다.") { super(message); this.name = "KscatProtocolError"; }
}

export function kscatLoopbackUrl(port: string): URL {
  if (typeof port !== "string" || !/^[0-9]{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535)
    throw new KscatProtocolError("KSCAT의 WEB 포트를 1부터 65535 사이의 숫자로 입력해 주세요.");
  return new URL(`http://127.0.0.1:${Number(port)}/`);
}

/** Only flat quoted-string maps are accepted. Legacy single quotes/bare uppercase keys
 * are parsed as data, never evaluated as JavaScript. Duplicate keys are rejected.
 */
export function parseKscatWebReply(raw: string, callback: string): Record<string, string> {
  if (typeof raw !== "string" || raw.length > 32768 || !/^artimenu_[a-f0-9]{32}$/.test(callback)) throw new KscatProtocolError();
  const wrapped = raw.trim();
  if (!wrapped.startsWith(`${callback}(`) || !/\);?$/.test(wrapped)) throw new KscatProtocolError();
  const text = wrapped.slice(callback.length + 1, wrapped.endsWith(";") ? -2 : -1).trim();
  let offset = 0;
  const whitespace = () => { while (/\s/.test(text[offset] ?? "") && offset < text.length) offset++; };
  const quoted = (): string => {
    const quote = text[offset++];
    if (quote !== '"' && quote !== "'") throw new KscatProtocolError();
    let value = "";
    while (offset < text.length) {
      let char = text[offset++];
      if (char === quote) return value;
      if (char === "\\") {
        const escaped = text[offset++];
        if (escaped === "u") {
          const hex = text.slice(offset, offset + 4);
          if (!/^[a-f0-9]{4}$/i.test(hex)) throw new KscatProtocolError();
          char = String.fromCharCode(parseInt(hex, 16)); offset += 4;
        } else {
          const escapes: Record<string, string> = { '"': '"', "'": "'", "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
          if (!Object.hasOwn(escapes, escaped)) throw new KscatProtocolError();
          char = escapes[escaped];
        }
      }
      if (/[\u0000-\u001f\u007f]/.test(char)) throw new KscatProtocolError();
      value += char;
      if (value.length > 4096) throw new KscatProtocolError();
    }
    throw new KscatProtocolError();
  };
  whitespace();
  if (text[offset++] !== "{") throw new KscatProtocolError();
  const result: Record<string, string> = Object.create(null);
  whitespace();
  while (text[offset] !== "}") {
    if (Object.keys(result).length >= 96) throw new KscatProtocolError();
    let key: string;
    if (text[offset] === '"' || text[offset] === "'") key = quoted();
    else {
      const match = text.slice(offset).match(/^[A-Z][A-Z0-9_]*/);
      if (!match) throw new KscatProtocolError();
      key = match[0]; offset += key.length;
    }
    if (!/^[A-Z][A-Z0-9_]{0,31}$/.test(key) || Object.hasOwn(result, key)) throw new KscatProtocolError();
    whitespace(); if (text[offset++] !== ":") throw new KscatProtocolError(); whitespace();
    result[key] = quoted(); whitespace();
    if (text[offset] === "}") break;
    if (text[offset++] !== ",") throw new KscatProtocolError();
    whitespace(); if (text[offset] === "}") throw new KscatProtocolError();
  }
  offset++; whitespace();
  if (offset !== text.length || !Object.keys(result).length) throw new KscatProtocolError();
  return result;
}

function dateValid(value: string, yearDigits: 2 | 4): boolean {
  if (!(yearDigits === 4 ? /^\d{8}$/ : /^\d{6}$/).test(value)) return false;
  const year = Number(value.slice(0, yearDigits)) + (yearDigits === 2 ? 2000 : 0);
  const month = Number(value.slice(yearDigits, yearDigits + 2)), day = Number(value.slice(yearDigits + 2));
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function inspectKscatVersionReply(row: Record<string, string>): { versionDate: string; resultCode: "0000" } {
  if (row.REQ !== "AP" || row.TRADEFLAG !== "VR" || !/^\d{4}$/.test(row.RES ?? "") || !/^\d{4}$/.test(row.RESPCODE ?? "")) throw new KscatProtocolError();
  if (row.RES !== "0000" || row.RESPCODE !== "0000") throw new KscatProtocolError("KSCAT이 버전 조회에 응답하지 못했습니다. 프로그램을 확인해 주세요.");
  if (!dateValid(row.VERSION ?? "", 4)) throw new KscatProtocolError("프로그램 응답을 받았지만 KSCAT 버전 정보를 확인하지 못했습니다.");
  return { versionDate: `${row.VERSION.slice(0, 4)}-${row.VERSION.slice(4, 6)}-${row.VERSION.slice(6)}`, resultCode: "0000" };
}

export type KscatCreditLabRequest = {
  terminalId: string; telegramNumber: string; amount: number; vat: number; taxFree: number; service: number;
};
export type KscatCreditLabCancel = KscatCreditLabRequest & { originalApprovalNumber: string; originalApprovalDate: string };

/** IC reader, KRW, single payment only. Amount/tax inputs must later come from a
 * durable server-side payment intent. This is an offline lab builder, not transport.
 */
export function buildKscatCreditLabRequest(input: KscatCreditLabRequest, cancel?: Pick<KscatCreditLabCancel, "originalApprovalNumber" | "originalApprovalDate">): string {
  if (typeof input.terminalId !== "string" || typeof input.telegramNumber !== "string"
    || !/^[A-Za-z0-9]{10}$/.test(input.terminalId) || !/^\d{12}$/.test(input.telegramNumber) || /^0+$/.test(input.telegramNumber)
    || ![input.amount, input.vat, input.taxFree, input.service].every(value => Number.isSafeInteger(value) && value >= 0)
    || input.amount < 1 || input.amount >= 100_000_000 || input.vat + input.taxFree + input.service > input.amount)
    throw new KscatProtocolError("개발용 결제 요청의 단말기·일련번호·금액을 확인해 주세요.");
  if (cancel && (typeof cancel.originalApprovalNumber !== "string" || typeof cancel.originalApprovalDate !== "string"
    || !/^[A-Za-z0-9]{1,12}$/.test(cancel.originalApprovalNumber) || !dateValid(cancel.originalApprovalDate, 2)))
    throw new KscatProtocolError("원래 거래의 승인번호와 승인일자를 확인해 주세요.");
  const money = (n: number) => String(n).padStart(12, "0");
  const body = ["\x02", "IC01", cancel ? "0420" : "0200", "N", input.terminalId, " ".repeat(4), input.telegramNumber,
    " ".repeat(1 + 20 + 20 + 1 + 16 + 16 + 40 + 37), "\x1c", "00", money(input.amount), money(input.service), money(input.vat),
    "0".repeat(12), money(input.taxFree), " ".repeat(2 + 16), cancel?.originalApprovalNumber.padEnd(12) ?? " ".repeat(12),
    cancel?.originalApprovalDate ?? " ".repeat(6), " ".repeat(13 + 2 + 30 + 4 + 20), "N", " ".repeat(1 + 1 + 1 + 30 + 60),
    " ", "\x03\r"].join("");
  return `AP${String(body.length).padStart(4, "0")}${body}`;
}

/** No local reply proves a server-authenticated approval, even with matching IDs.
 * Never return working keys, card data, merchant data or raw provider messages.
 */
export function inspectKscatCreditLabReply(row: Record<string, string>, expected: KscatCreditLabRequest, cancelled = false) {
  buildKscatCreditLabRequest(expected);
  if (row.REQ !== "AP" || row.TRADEFLAG !== "IC" || row.CLASSFLAG !== "01" || row.TERMID !== expected.terminalId
    || row.TELEGRAMNO !== expected.telegramNumber || row.TELEGRAMFLAG !== (cancelled ? "0430" : "0210"))
    throw new KscatProtocolError("개발용 요청과 KSCAT 응답의 거래 정보가 다릅니다.");
  const success = row.RES === "0000" && row.ERRCODE === "00" && row.STATUS === "O" && row.RESPCODE === "0000" && row.CORPRESPCODE === "0000";
  if (success && (!/^[A-Za-z0-9]{1,12} *$/.test(row.APPROVALNO ?? "") || !/^\d{12} *$/.test(row.TRADEUNIQUENO ?? "")
    || !/^\d{12}$/.test(row.TRADETIME ?? "") || !dateValid(row.TRADETIME.slice(0, 6), 2)
    || Number(row.TRADETIME.slice(6, 8)) > 23 || Number(row.TRADETIME.slice(8, 10)) > 59 || Number(row.TRADETIME.slice(10)) > 59)) throw new KscatProtocolError();
  return { status: "verification_required" as const, reportedOutcome: success ? (cancelled ? "cancelled" as const : "approved" as const) : "unknown" as const,
    approvalNumber: success ? row.APPROVALNO.trim() : null, providerTransactionId: success ? row.TRADEUNIQUENO.trim() : null };
}
