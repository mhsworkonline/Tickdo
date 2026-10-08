/**
 * Photo quality checks on a small grayscale copy of the photo. Pure and deterministic.
 * - too dark: mean luminance below DARK_MEAN
 * - too blurry: variance of the Laplacian below BLUR_VARIANCE (sharp text has strong edges)
 * Thresholds are starting values; tune them with the accuracy study photos.
 */
export const DARK_MEAN = 60;
export const BLUR_VARIANCE = 80;
/** The photo is downscaled to this width before checking, so thresholds are size-independent. */
export const CHECK_WIDTH = 480;

export type Gray = { width: number; height: number; data: Uint8Array | number[] };

/** RGBA bytes (e.g. from jpeg-js) → luminance (Rec. 601). */
export function toGray(width: number, height: number, rgba: Uint8Array): Gray {
  const data = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i++, p += 4) {
    data[i] = Math.round(0.299 * (rgba[p] ?? 0) + 0.587 * (rgba[p + 1] ?? 0) + 0.114 * (rgba[p + 2] ?? 0));
  }
  return { width, height, data };
}

export function meanLuminance(img: Gray): number {
  let sum = 0;
  for (let i = 0; i < img.data.length; i++) sum += img.data[i] as number;
  return img.data.length ? sum / img.data.length : 0;
}

/** Variance of the 4-neighbour Laplacian over interior pixels. */
export function laplacianVariance(img: Gray): number {
  const { width: w, height: h, data } = img;
  if (w < 3 || h < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v =
        (data[i - w] as number) + (data[i + w] as number) + (data[i - 1] as number) + (data[i + 1] as number) - 4 * (data[i] as number);
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

export type QualityVerdict = { ok: true } | { ok: false; reason: 'too_dark' | 'too_blurry' };

export function judgeQuality(img: Gray): QualityVerdict {
  if (meanLuminance(img) < DARK_MEAN) return { ok: false, reason: 'too_dark' };
  if (laplacianVariance(img) < BLUR_VARIANCE) return { ok: false, reason: 'too_blurry' };
  return { ok: true };
}
