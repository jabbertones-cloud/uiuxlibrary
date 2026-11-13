/** Conservative visible-content gate using the already-decoded pngjs RGBA buffer. */
export function nativeVisibleContent(png) {
  const { width: w, height: h, data } = png, buckets = new Map();
  let dark = 0, light = 0, samples = 0;
  for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
    const py = Math.floor(h * (0.15 + 0.70 * (y + 0.5) / 96));
    const px = Math.floor(w * (0.12 + 0.76 * (x + 0.5) / 96));
    const i = (py * w + px) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    const bucket = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    dark += Math.max(r, g, b) < 48 ? 1 : 0;
    light += Math.min(r, g, b) > 245 ? 1 : 0;
    samples++;
  }
  const dominant = Math.max(...buckets.values()) / samples;
  const black = dark / samples, white = light / samples;
  return { ok: Math.max(dominant, black, white) < 0.985,
    dominantFraction: Number(dominant.toFixed(4)), blackFraction: Number(black.toFixed(4)),
    whiteFraction: Number(white.toFixed(4)), inspectedPixels: samples };
}
