// Pixel parity with v33 at 4 places × 4 zooms × 2 bases. Dynamic elements (version badge, status pill) are masked.
// Tolerance: a pixel differs if any channel differs by > PIX_TOL; the test fails if more than MAX_RATIO of pixels differ.
import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import { APP_VERSION, BASE_URL, REF_URL, PLACES, ZOOMS, MASK, openApp } from './helpers.js';

const PIX_TOL = 16, MAX_RATIO = 0.001;
const OUT = path.resolve(import.meta.dirname, '__output__', 'visual');

function diff(a, b) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return { ratio: 1 };
  const D = new PNG({ width: A.width, height: A.height }); let n = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
    const bad = d > PIX_TOL; if (bad) n++;
    D.data[i] = bad ? 255 : A.data[i] / 3; D.data[i + 1] = bad ? 0 : A.data[i + 1] / 3; D.data[i + 2] = bad ? 0 : A.data[i + 2] / 3; D.data[i + 3] = 255;
  }
  const colours = new Set(); for (let i = 0; i < A.data.length; i += 4 * 97) colours.add((A.data[i] << 16) | (A.data[i + 1] << 8) | A.data[i + 2]);
  return { ratio: n / (A.width * A.height), png: PNG.sync.write(D), colours: colours.size };
}

for (const base of ['old', 'sat']) for (const [name, lat, lon] of PLACES) for (const z of ZOOMS) {
  test(`visual ${name} z${z} ${base}`, async ({ browser }) => {
    const shot = async root => {
      const p = await browser.newPage({ viewport: { width: 390, height: 760 } });
      await openApp(p, root, { lat, lon, z, base });
      const img = await p.screenshot({ mask: MASK(p), animations: 'disabled' }); await p.close(); return img;
    };
    const [a, b] = await Promise.all([shot(BASE_URL), shot(REF_URL)]);
    let r = diff(a, b);
    if (r.ratio > MAX_RATIO) { // one retry: remote raster tiles occasionally arrive late
      const [a2, b2] = await Promise.all([shot(BASE_URL), shot(REF_URL)]); r = diff(a2, b2);
      if (r.ratio > MAX_RATIO) { fs.mkdirSync(OUT, { recursive: true }); const f = `${name}-z${z}-${base}`;
        fs.writeFileSync(path.join(OUT, f + `-${APP_VERSION}.png`), a2); fs.writeFileSync(path.join(OUT, f + '-v33.png'), b2); if (r.png) fs.writeFileSync(path.join(OUT, f + '-diff.png'), r.png); }
    }
    if (process.env.SAVE_SHOTS) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, `${name}-z${z}-${base}-${APP_VERSION}.png`), a); }
    expect(r.colours, 'screenshot has real map content').toBeGreaterThan(40);
    fs.mkdirSync(OUT, { recursive: true }); fs.appendFileSync(path.join(OUT, 'ratios.tsv'), `${name}\tz${z}\t${base}\t${r.ratio.toFixed(6)}\t${r.colours}\n`);
    test.info().annotations.push({ type: 'diffRatio', description: r.ratio.toFixed(6) });
    expect(r.ratio, `differing pixel ratio (${(r.ratio * 100).toFixed(3)} %)`).toBeLessThanOrEqual(MAX_RATIO);
  });
}
