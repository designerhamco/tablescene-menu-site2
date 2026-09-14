const ZERO_PRICE_PATTERN = /^(?:(?:krw|₩)\s*)?0(?:[.,]0+)?\s*(?:원)?$/i;
const GENERATED_FREE_CLAIM_PATTERN = /(?:무료|공짜|무상|서비스로\s*제공|\bfree\b|\bcomplimentary\b)/i;
const EXPLICIT_FREE_SOURCE_PATTERN = /(?:무료|공짜|무상|\bfree\b|\bcomplimentary\b)/i;
const SOURCE_FACT_SEPARATOR_PATTERN = /[·•,\/|;]+/;

function cleanValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeAiDescriptionPriceContext(value: unknown) {
  const price = cleanValue(value);
  if (!price) return null;

  const normalized = price.replace(/,/g, "").replace(/\s+/g, " ");
  return ZERO_PRICE_PATTERN.test(normalized) ? null : price;
}

export function hasExplicitFreePriceSignal(input: {
  priceLabel?: unknown;
  badgeLabel?: unknown;
  currentDescription?: unknown;
}) {
  return [input.priceLabel, input.badgeLabel, input.currentDescription]
    .map(cleanValue)
    .some((value) => EXPLICIT_FREE_SOURCE_PATTERN.test(value));
}

export function assertSupportedAiDescriptionClaims(
  description: string,
  input: {
    priceLabel?: unknown;
    badgeLabel?: unknown;
    currentDescription?: unknown;
  },
) {
  if (hasUnsupportedFreeClaim(description, input)) {
    throw new Error("AI 설명이 입력 정보에 없는 무료 제공 내용을 포함했습니다.");
  }

  if (hasMissingDescriptionSourceFacts(description, input)) {
    throw new Error("AI 설명이 기존 설명의 핵심 재료 또는 특징을 누락했습니다.");
  }
}

export function getRequiredDescriptionSourceFacts(currentDescription: unknown) {
  const source = cleanValue(currentDescription);
  if (!SOURCE_FACT_SEPARATOR_PATTERN.test(source)) return [];

  const facts = source
    .split(SOURCE_FACT_SEPARATOR_PATTERN)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return facts.length >= 2 ? facts : [];
}

export function hasMissingDescriptionSourceFacts(
  description: string,
  input: { currentDescription?: unknown },
) {
  const requiredFacts = getRequiredDescriptionSourceFacts(input.currentDescription);
  if (requiredFacts.length === 0) return false;

  const normalizedDescription = description.toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
  return requiredFacts.some(
    (fact) => !normalizedDescription.includes(fact.toLocaleLowerCase("ko-KR").replace(/\s+/g, "")),
  );
}

export function hasUnsupportedFreeClaim(
  description: string,
  input: {
    priceLabel?: unknown;
    badgeLabel?: unknown;
    currentDescription?: unknown;
  },
) {
  return GENERATED_FREE_CLAIM_PATTERN.test(description) && !hasExplicitFreePriceSignal(input);
}
