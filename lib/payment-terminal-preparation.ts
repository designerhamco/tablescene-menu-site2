export const PAYMENT_TERMINAL_PROVIDERS = ["nice_apppos_ios", "ksnet_kscat_windows"] as const;
export type PaymentTerminalProvider = (typeof PAYMENT_TERMINAL_PROVIDERS)[number];
export class PaymentTerminalPreparationError extends Error {
  constructor(message: string) { super(message); this.name = "PaymentTerminalPreparationError"; }
}

export const PAYMENT_TERMINAL_PROVIDER_INFO = {
  nice_apppos_ios: {
    label: "NICE AppPOS · iPhone·iPad", program: "APPPOS for NICE", platform: "iOS·iPadOS",
    documentation: "https://apppos.nicevan.co.kr/dev/",
    download: "https://apps.apple.com/kr/app/apppos-for-nice/id1214201566",
    readiness: "앱·테스트 계정 준비 중", chargeEnabled: false,
  },
  ksnet_kscat_windows: {
    label: "KSNET KSCAT · Windows", program: "KSCAT", platform: "Windows",
    documentation: "https://www.ksnet.co.kr/support/resource/7482e95f-45b2-42ca-b057-cc12e88114e1",
    download: "https://www.ksnet.co.kr/support/resource/7482e95f-45b2-42ca-b057-cc12e88114e1",
    readiness: "웹 연동 규격 확인 중", chargeEnabled: false,
  },
} as const;

/** Preparation values only. Credentials and operational activation are never accepted here. */
export type PaymentTerminalDraft = {
  provider: PaymentTerminalProvider;
  terminalModel: string;
  businessNumber: string;
  terminalId: string;
  localPort: string;
};
export type PaymentTerminalPreparation = {
  draft: PaymentTerminalDraft;
  revision: number;
  updatedAt: string;
};

export function isPaymentTerminalProvider(value: unknown): value is PaymentTerminalProvider {
  return typeof value === "string" && (PAYMENT_TERMINAL_PROVIDERS as readonly string[]).includes(value);
}

export function emptyPaymentTerminalDraft(provider: PaymentTerminalProvider): PaymentTerminalDraft {
  return { provider, terminalModel: "", businessNumber: "", terminalId: "", localPort: "" };
}

export function parsePaymentTerminalDraft(input: unknown): PaymentTerminalDraft {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new PaymentTerminalPreparationError("연결 준비 정보를 확인해 주세요.");
  const raw = input as Record<string, unknown>;
  const keys = ["provider", "terminalModel", "businessNumber", "terminalId", "localPort"];
  if (Object.keys(raw).some(key => !keys.includes(key)) || !isPaymentTerminalProvider(raw.provider))
    throw new PaymentTerminalPreparationError("지원하는 업체와 연결 준비 항목을 확인해 주세요.");
  const field = (key: string, max: number) => {
    if (typeof raw[key] !== "string" || raw[key].length > max || /[\u0000-\u001f\u007f]/.test(raw[key]))
      throw new PaymentTerminalPreparationError("입력한 연결 정보의 형식을 확인해 주세요.");
    return raw[key].trim();
  };
  const draft: PaymentTerminalDraft = {
    provider: raw.provider, terminalModel: field("terminalModel", 100),
    businessNumber: field("businessNumber", 20).replace(/[- ]/g, ""),
    terminalId: field("terminalId", 32), localPort: field("localPort", 5),
  };
  if (draft.businessNumber && !/^\d{10}$/.test(draft.businessNumber)) throw new PaymentTerminalPreparationError("사업자등록번호는 숫자 10자리로 입력해 주세요.");
  if (draft.terminalId && !/^[A-Za-z0-9-]{1,32}$/.test(draft.terminalId)) throw new PaymentTerminalPreparationError("업체에서 발급한 단말기 번호를 확인해 주세요.");
  if (draft.localPort && (!/^\d+$/.test(draft.localPort) || Number(draft.localPort) < 1 || Number(draft.localPort) > 65535))
    throw new PaymentTerminalPreparationError("프로그램 포트는 1부터 65535 사이의 숫자로 입력해 주세요.");
  if (draft.provider === "nice_apppos_ios" && draft.localPort) throw new PaymentTerminalPreparationError("NICE 앱 연결에는 PC 프로그램 포트를 입력하지 않습니다.");
  return draft;
}

export function paymentTerminalMissingFields(draft: PaymentTerminalDraft): string[] {
  return [!draft.terminalModel && "단말기 모델", !draft.businessNumber && "사업자등록번호",
    !draft.terminalId && "업체에서 발급한 단말기 번호",
    draft.provider === "ksnet_kscat_windows" && !draft.localPort && "업체에서 안내받은 프로그램 포트"].filter((item): item is string => Boolean(item));
}

export function paymentTerminalSupportInfo(menuSiteId: string, draft: PaymentTerminalDraft): string {
  const mask = (value: string) => value ? `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}` : "미입력";
  return ["아티메뉴 결제 단말기 연결 준비", `매장 식별 번호: ${menuSiteId}`,
    `연결 방식: ${PAYMENT_TERMINAL_PROVIDER_INFO[draft.provider].label}`,
    `사용 예정 단말기 모델: ${draft.terminalModel || "미입력"}`,
    `사업자등록번호: ${mask(draft.businessNumber)}`, `단말기 번호: ${mask(draft.terminalId)}`,
    ...(draft.provider === "ksnet_kscat_windows" ? [`프로그램 포트: ${draft.localPort || "미입력"}`] : []),
    "상태: 준비 정보이며, 연결·카드 승인 검증 전입니다.",
    `공식 안내: ${PAYMENT_TERMINAL_PROVIDER_INFO[draft.provider].documentation}`].join("\n");
}
