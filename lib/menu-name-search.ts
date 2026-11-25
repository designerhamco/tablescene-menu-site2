/** Search only names already admitted by the caller's access/lifecycle filters. */
export function normalizeMenuName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("ko-KR");
}

export function matchesMenuName(name: string, query: string): boolean {
  return normalizeMenuName(name).includes(normalizeMenuName(query));
}
