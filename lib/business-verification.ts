import "server-only";

export type BusinessVerificationInput = {
  businessRegistrationNumber: string;
  representativeName: string;
  openingDate: string;
  businessName?: string | null;
  phone?: string | null;
};

export type NormalizedBusinessVerificationInput = {
  businessRegistrationNumber: string;
  representativeName: string;
  openingDate: string;
  openingDateForApi: string;
  businessName: string | null;
  phone: string | null;
};

export type NormalizedNtsBusinessVerificationResponse = {
  verified: boolean;
  businessStatus: string | null;
  taxType: string | null;
  message: string;
  safeRaw: Record<string, unknown>;
};

type NtsBusinessStatus = {
  b_stt?: unknown;
  tax_type?: unknown;
};

type NtsBusinessVerificationItem = {
  valid?: unknown;
  valid_msg?: unknown;
  status?: NtsBusinessStatus;
};

type NtsBusinessVerificationResponse = {
  status_code?: unknown;
  data?: NtsBusinessVerificationItem[];
};

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeBusinessRegistrationNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 10) {
    throw new Error("사업자등록번호는 숫자 10자리로 입력해주세요.");
  }

  return digits;
}

export function normalizeRepresentativeName(value: string) {
  const representativeName = value.trim();

  if (!representativeName) {
    throw new Error("대표자명을 입력해주세요.");
  }

  if (representativeName.length > 30) {
    throw new Error("대표자명은 최대 30자까지 입력할 수 있습니다.");
  }

  return representativeName;
}

export function normalizeOpeningDate(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length !== 8) {
    throw new Error("개업일자는 YYYY-MM-DD 또는 YYYYMMDD 형식으로 입력해주세요.");
  }

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("개업일자가 올바르지 않습니다.");
  }

  return {
    dbDate: `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`,
    apiDate: digits,
  };
}

export function maskBusinessRegistrationNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 10) {
    return "사업자번호 확인 필요";
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-*****`;
}

export function normalizeBusinessVerificationInput(input: BusinessVerificationInput): NormalizedBusinessVerificationInput {
  const openingDate = normalizeOpeningDate(input.openingDate);

  return {
    businessRegistrationNumber: normalizeBusinessRegistrationNumber(input.businessRegistrationNumber),
    representativeName: normalizeRepresentativeName(input.representativeName),
    openingDate: openingDate.dbDate,
    openingDateForApi: openingDate.apiDate,
    businessName: input.businessName?.trim() || null,
    phone: input.phone?.trim() || null,
  };
}

function getNtsServiceKey() {
  return process.env.DATA_GO_KR_SERVICE_KEY?.trim() || process.env.NTS_BUSINESS_API_KEY?.trim() || "";
}

export async function callNtsBusinessVerificationApi(input: NormalizedBusinessVerificationInput) {
  const serviceKey = getNtsServiceKey();

  if (!serviceKey) {
    throw new Error("사업자 인증 API 키가 설정되어 있지 않습니다.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const endpoint = new URL("https://api.odcloud.kr/api/nts-businessman/v1/validate");
  endpoint.searchParams.set("serviceKey", serviceKey);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        businesses: [
          {
            b_no: input.businessRegistrationNumber,
            start_dt: input.openingDateForApi,
            p_nm: input.representativeName,
            b_nm: input.businessName ?? "",
          },
        ],
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as NtsBusinessVerificationResponse;

    if (!response.ok) {
      throw new Error(`사업자 인증 API 요청에 실패했습니다. (${response.status})`);
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeNtsBusinessVerificationResponse(
  response: NtsBusinessVerificationResponse
): NormalizedNtsBusinessVerificationResponse {
  const item = response.data?.[0];
  const status = item?.status;
  const validCode = getString(item?.valid);
  const validMessage = getString(item?.valid_msg);
  const verified = validCode === "01";
  const businessStatus = getString(status?.b_stt) || null;
  const taxType = getString(status?.tax_type) || null;

  return {
    verified,
    businessStatus,
    taxType,
    message: verified
      ? "사업자 인증이 완료되었습니다."
      : validMessage || "입력한 사업자 정보가 국세청 정보와 일치하지 않습니다.",
    safeRaw: {
      status_code: response.status_code ?? null,
      data: item
        ? [
            {
              valid: item.valid ?? null,
              valid_msg: item.valid_msg ?? null,
              status: {
                b_stt: businessStatus,
                tax_type: taxType,
              },
            },
          ]
        : [],
    },
  };
}
