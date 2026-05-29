type EmailSendInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type EmailSendResult =
  | { ok: true; provider: "resend"; id?: string }
  | { ok: false; provider: "resend"; error: string }
  | { ok: false; provider: "none"; skippedReason: string };

function getEmailFrom() {
  return process.env.EMAIL_FROM?.trim() || "메뉴링크 고객지원 <admin@dndcommerce.co.kr>";
}

export function isEmailProviderConfigured() {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

  return provider === "resend" && Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendNotificationEmail(input: EmailSendInput): Promise<EmailSendResult> {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (provider !== "resend") {
    return {
      ok: false,
      provider: "none",
      skippedReason: "EMAIL_PROVIDER가 resend로 설정되지 않았습니다.",
    };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return {
      ok: false,
      provider: "none",
      skippedReason: "RESEND_API_KEY가 설정되지 않았습니다.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    return {
      ok: false,
      provider: "resend",
      error: responseText || `Resend request failed with ${response.status}`,
    };
  }

  const data = await response.json().catch(() => null) as { id?: string } | null;

  return {
    ok: true,
    provider: "resend",
    id: data?.id,
  };
}
