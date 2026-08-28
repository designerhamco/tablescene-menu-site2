export function getTenPercentDiscountedAnnualPrice(monthlyPrice: number) {
  if (!Number.isSafeInteger(monthlyPrice) || monthlyPrice < 0) {
    throw new Error("monthlyPrice must be a non-negative safe integer");
  }

  return Math.floor((monthlyPrice * 12 * 90) / 10_000) * 100;
}
