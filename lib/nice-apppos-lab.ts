/** Public NICE AppPOS request format. This codec does not launch an app or authorize a payment. */
export const NICE_LAB_RETURN_URI = "artimenu-terminal-lab://result";
export type NiceAppPosLabRequest = { amount: number; catid: string; businessNumber: string; oid: string; state: string };

export function buildNiceAppPosLabRequest(input: NiceAppPosLabRequest): string {
  if ([input.catid, input.businessNumber, input.oid, input.state].some(value => typeof value !== "string" || /[\s\u0000-\u001f\u007f]/.test(value))
    || !Number.isSafeInteger(input.amount) || input.amount < 1 || input.amount >= 100_000_000
    || !/^[A-Za-z0-9-]{1,32}$/.test(input.catid) || !/^\d{10}$/.test(input.businessNumber)
    || !/^[A-Za-z0-9]{10}$/.test(input.oid) || !/^[A-Za-z0-9-]{32,64}$/.test(input.state))
    throw new Error("NICE 개발용 요청 정보를 확인해 주세요.");
  const callback = new URL(NICE_LAB_RETURN_URI);
  callback.searchParams.set("state", input.state);
  const url = new URL("apppos://pay");
  for (const [key, value] of Object.entries({ gubun: "0100", price: String(input.amount), catid: input.catid,
    bizno: input.businessNumber, oid: input.oid, intMon: "00", returnURI: callback.toString() })) url.searchParams.set(key, value);
  return url.toString();
}

export function inspectNiceAppPosLabCallback(raw: string, expected: NiceAppPosLabRequest): { status: "verification_required"; resultCode: string } {
  if (raw.length > 8192) throw new Error("결과 주소가 너무 깁니다.");
  const url = new URL(raw);
  if (url.protocol !== "artimenu-terminal-lab:" || url.hostname !== "result" || url.port || url.pathname || url.username || url.password || url.hash)
    throw new Error("허용하지 않은 결과 주소입니다.");
  const keys = [...url.searchParams.keys()];
  if (new Set(keys).size !== keys.length) throw new Error("중복된 결과 항목입니다.");
  if (url.searchParams.get("state") !== expected.state || url.searchParams.get("oid") !== expected.oid || url.searchParams.get("gubun") !== "0101")
    throw new Error("진행 중인 개발용 결제 요청과 결과가 다릅니다.");
  const code = url.searchParams.get("resultCode");
  if (!code || code.length !== 4 || !/^\d{4}$/.test(code)) throw new Error("결제 결과 코드를 확인해 주세요.");
  if (code === "0000" && (url.searchParams.get("appPrice") !== String(expected.amount) || !url.searchParams.get("appNo") || !url.searchParams.get("appDt")))
    throw new Error("요청 금액과 승인 정보를 다시 확인해 주세요.");
  // Even a valid callback and NICE's unkeyed hash do not authenticate a server result.
  return { status: "verification_required", resultCode: code };
}
