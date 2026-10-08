import { judgeQuality, laplacianVariance, meanLuminance, toGray, type Gray } from '@/features/scan/quality';

function image(w: number, h: number, f: (x: number, y: number) => number): Gray {
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = Math.max(0, Math.min(255, Math.round(f(x, y))));
  return { width: w, height: h, data };
}

/** Black "text strokes" on white paper. */
const sharpText = image(120, 80, (x, y) => (y % 10 < 2 && x % 15 < 10 ? 20 : 235));

/** Same page after a heavy box blur. */
function blur(img: Gray, r: number): Gray {
  return image(img.width, img.height, (x, y) => {
    let s = 0;
    let n = 0;
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const xx = Math.min(img.width - 1, Math.max(0, x + dx));
        const yy = Math.min(img.height - 1, Math.max(0, y + dy));
        s += img.data[yy * img.width + xx] as number;
        n++;
      }
    return s / n;
  });
}

describe('photo quality', () => {
  it('accepts a sharp, well-lit page', () => {
    expect(judgeQuality(sharpText)).toEqual({ ok: true });
  });

  it('rejects a blurry page', () => {
    const blurry = blur(sharpText, 6);
    expect(laplacianVariance(blurry)).toBeLessThan(laplacianVariance(sharpText));
    expect(judgeQuality(blurry)).toEqual({ ok: false, reason: 'too_blurry' });
  });

  it('rejects a dark page even if sharp', () => {
    const dark = image(120, 80, (x, y) => (y % 10 < 2 && x % 15 < 10 ? 5 : 40));
    expect(meanLuminance(dark)).toBeLessThan(60);
    expect(judgeQuality(dark)).toEqual({ ok: false, reason: 'too_dark' });
  });

  it('a blank white page has no edges and is rejected as blurry', () => {
    expect(judgeQuality(image(50, 50, () => 240))).toEqual({ ok: false, reason: 'too_blurry' });
  });

  it('converts RGBA to luminance', () => {
    const g = toGray(2, 1, new Uint8Array([255, 255, 255, 255, 0, 0, 0, 255]));
    expect(Array.from(g.data)).toEqual([255, 0]);
  });
});
