/** Scale only the preview shell. The iframe keeps its selected device viewport. */
export function fitMenuPreviewFrame(available: { width: number; height: number }, frame: { width: number; height: number }, border = 10) {
  const width = frame.width + border * 2;
  const height = frame.height + border * 2;
  const scale = Math.max(0, Math.min(available.width / width, available.height / height));
  return { width, height, scale, displayWidth: width * scale, displayHeight: height * scale };
}
