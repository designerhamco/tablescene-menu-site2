/** Hash navigation owns its destination; a route reset must never override it. */
export function shouldResetDocumentScroll(previousPathname: string | null, pathname: string, hash: string) {
  return previousPathname !== null && previousPathname !== pathname && hash === "";
}
