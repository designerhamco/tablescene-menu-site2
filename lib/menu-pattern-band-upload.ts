import sharp from "sharp";

export async function prepareMenuPatternBandImage(bytes: ArrayBuffer) {
  try {
    const image = sharp(Buffer.from(bytes), { limitInputPixels: 16_000_000 });
    const { width, height, format, pages } = await image.metadata();
    if (!width || width !== height || (pages ?? 1) > 1 || !["jpeg", "png", "webp"].includes(format ?? "")) return null;
    return await image.resize(512, 512, { withoutEnlargement: true }).webp({ lossless: true }).toBuffer();
  } catch {
    return null;
  }
}
