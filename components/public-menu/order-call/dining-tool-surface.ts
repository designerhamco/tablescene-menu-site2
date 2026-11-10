import { compositeMenuSurface } from "@/lib/menu-interaction-theme";

// Reuse decoded display images. A CORS-readable copy is optional; never replace
// the visible image or block controls when a remote host disallows pixel reads.
const readablePhotos = new Map<string, HTMLImageElement>();
export function readDiningToolSurface(root: HTMLElement, control: HTMLElement | null, onReady: () => void) {
  const cover = root.dataset.coverActive === "true" ? root.querySelector<HTMLElement>("[data-aube-table-cover]") : null;
  const surface = getComputedStyle(cover ?? root).backgroundColor;
  if (!cover && control) {
    const sidebar = root.querySelector<HTMLElement>(".aube-table-sidebar-navigation");
    if (sidebar) {
      const panel = sidebar.getBoundingClientRect(), tool = control.getBoundingClientRect();
      const x = tool.left + tool.width / 2, y = tool.top + tool.height / 2;
      if (panel.width && panel.height && x >= panel.left && x <= panel.right && y >= panel.top && y <= panel.bottom) return getComputedStyle(sidebar).backgroundColor;
    }
  }
  const image = cover?.querySelector<HTMLImageElement>(".aube-table-cover-image");
  if (!image?.complete || !image.naturalWidth || !cover) return surface;
  const overlay = cover.querySelector<HTMLElement>(".aube-table-cover-overlay");
  const overlayStyle = overlay ? getComputedStyle(overlay) : null;
  const imageRect = image.getBoundingClientRect(), rect = control?.getBoundingClientRect() ?? imageRect;
  if (!imageRect.width || !imageRect.height || !rect.width || !rect.height) return surface;
  const sample = (source: HTMLImageElement) => {
    const scale = Math.max(imageRect.width / source.naturalWidth, imageRect.height / source.naturalHeight);
    const canvas = document.createElement("canvas"); canvas.width = 16; canvas.height = 16;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return surface;
    const x = (rect.left - imageRect.left + (source.naturalWidth * scale - imageRect.width) / 2) / scale;
    const y = (rect.top - imageRect.top + (source.naturalHeight * scale - imageRect.height) / 2) / scale;
    context.drawImage(source, x, y, rect.width / scale, rect.height / scale, 0, 0, 16, 16);
    const pixels = context.getImageData(0, 0, 16, 16).data;
    const sums = [0, 0, 0];
    for (let i = 0; i < pixels.length; i += 4) for (let channel = 0; channel < 3; channel++) sums[channel] += pixels[i + channel];
    const photo = `rgb(${sums.map(value => Math.round(value / 256)).join(",")})`;
    return compositeMenuSurface(photo, overlayStyle?.backgroundColor ?? "transparent", Number(overlayStyle?.opacity ?? 1));
  };
  try { return sample(image); } catch { /* A remote image may taint the canvas. */ }
  const src = image.currentSrc || image.src;
  let readable = readablePhotos.get(src);
  if (!readable) {
    readable = new Image(); readable.crossOrigin = "anonymous";
    readablePhotos.set(src, readable);
    if (readablePhotos.size > 16) readablePhotos.delete(readablePhotos.keys().next().value!);
    readable.addEventListener("load", onReady, { once: true });
    readable.src = src;
  }
  if (!readable.complete) readable.addEventListener("load", onReady, { once: true });
  if (readable.complete && readable.naturalWidth) try { return sample(readable); } catch { /* Use the configured cover surface. */ }
  return surface;
}
