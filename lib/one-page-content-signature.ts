/** Stable layout inputs only: deliberately excludes elapsed countdown/initial clock values. */
export function getOnePageContentSignature(inputs: Record<string, unknown>): string {
  return JSON.stringify(inputs, (_key, value: unknown) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
    }
    return value;
  });
}
