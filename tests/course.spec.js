// v35 browser test: simulated GPS movement (mocked navigator.geolocation) turns the boat marker by
// COG, draws the course line past the screen edge, fills the COG/SOG panel and adds ETAs to the
// range ring labels; stopping clears line, panel values and ETAs but keeps the marker heading.
import { test, expect } from '@playwright/test';
import { BASE_URL, collectErrors, openApp, settle } from './helpers.js';

const START = { lat: 38.745, lon: 20.79 };
const COG = 237;
const KN = 5.4;
const MS_PER_KN = 1852 / 3600;

/** Replace navigator.geolocation by a mock; window.__fix(fix) delivers a position. */
const mockGeolocation = () => {
  const watchers = [];
  const geo = {
    watchPosition(ok) {
      watchers.push(ok);
      return watchers.length;
    },
    clearWatch() {},
    getCurrentPosition() {},
  };
  Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true });
  window.__fix = f => {
    const coords = {
      latitude: f.lat, longitude: f.lon, accuracy: 5,
      speed: f.speed ?? null, heading: f.heading ?? null,
    };
    watchers.forEach(cb => cb({ coords, timestamp: f.t }));
  };
};

/** Fixes every second along COG at KN (speed not reported: SOG is computed from the track). */
function track(n, t0 = 1e12) {
  const out = [];
  const a = COG * Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const d = KN * MS_PER_KN * i;
    const lat = START.lat + d * Math.cos(a) / 111195;
    const lon = START.lon + d * Math.sin(a) / (111195 * Math.cos(START.lat * Math.PI / 180));
    out.push({ lat, lon, t: t0 + i * 1000 });
  }
  return out;
}

/** Feed fixes one by one (one task each, like real GPS callbacks). */
async function feed(page, fixes) {
  for (const f of fixes) await page.evaluate(x => window.__fix(x), f);
}

/** Snapshot of everything the test checks. */
const snapshot = page => page.evaluate(() => {
  const m = NavApp.map;
  const canvas = m.getCanvas();
  const me = document.querySelector('.me');
  const rot = /rotateZ\(([-\d.]+)deg\)/.exec(me.style.transform);
  const line = m.getSource('courseLine');
  const lineData = line ? line.serialize().data : null;
  const coords = lineData && lineData.geometry ? lineData.geometry.coordinates : [];
  const rings = m.getSource('meRings').serialize().data.features;
  const panel = document.querySelector('#motionPanel');
  return {
    rotation: rot ? +rot[1] : null,
    boatShown: getComputedStyle(me.querySelector('.boat')).display !== 'none',
    meXY: (() => {
      const r = me.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    })(),
    linePx: coords.map(c => {
      const p = m.project(c);
      return [p.x, p.y];
    }),
    lineRendered: m.getLayer('courseLine')
      ? m.queryRenderedFeatures({ layers: ['courseLine'] }).length : 0,
    size: [canvas.clientWidth, canvas.clientHeight],
    labels: rings.filter(f => f.geometry.type === 'Point').map(f => f.properties.l),
    panelHidden: panel.hidden,
    panelText: panel.textContent,
  };
});

/** Rectangles of the controls the panel must not overlap. */
const overlaps = page => page.evaluate(() => {
  const sel = ['#searchForm', '#layersBtn', '#zoomBox', '#fabs', '#appVer', '#scaleBar',
    '.maplibregl-ctrl-top-right .maplibregl-ctrl', '.maplibregl-ctrl-attrib', '#nfn'];
  const p = document.querySelector('#motionPanel').getBoundingClientRect();
  const hit = r => r.width > 0 && r.left < p.right && r.right > p.left
    && r.top < p.bottom && r.bottom > p.top;
  const out = [];
  for (const s of sel) {
    for (const el of document.querySelectorAll(s)) {
      if (el.offsetParent !== null && hit(el.getBoundingClientRect())) out.push(s);
    }
  }
  return { out, inView: p.left >= 0 && p.top >= 0 && p.right <= innerWidth };
});

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  test(`COG/SOG: marker, course line, panel, ring ETAs ${viewport.width}x${viewport.height}`,
    async ({ browser }) => {
      const page = await browser.newPage({ viewport });
      const errs = collectErrors(page);
      await page.addInitScript(mockGeolocation);
      await openApp(page, BASE_URL, { ...START, z: 14, base: 'sat' });
      expect(await page.locator('#motionPanel').isHidden()).toBe(true);
      expect(await page.evaluate(() => !!NavApp.map.getSource('courseLine'))).toBe(false);

      await page.locator('#locBtn').click();
      await expect(page.locator('#motionPanel')).toBeVisible();
      await expect(page.locator('#motionPanel')).toHaveText(/COG —\s*SOG —/);
      const fixes = track(25);
      await feed(page, fixes);
      await settle(page, 500);

      const s = await snapshot(page);
      expect(s.boatShown).toBe(true);
      expect(Math.abs(s.rotation - COG)).toBeLessThan(1);
      expect(s.panelText).toContain(`COG ${COG}°`);
      expect(s.panelText).toMatch(/SOG 5\.[345] kn/);
      expect(s.lineRendered).toBeGreaterThan(0);
      expect(s.linePx.length).toBe(2);
      const [a, b] = s.linePx;
      expect(Math.hypot(a[0] - s.meXY[0], a[1] - s.meXY[1])).toBeLessThan(20);
      const [w, h] = s.size;
      expect(b[0] < 0 || b[1] < 0 || b[0] > w || b[1] > h, 'line runs past the edge').toBe(true);
      const screenBrg = (Math.atan2(b[0] - a[0], a[1] - b[1]) * 180 / Math.PI + 360) % 360;
      expect(Math.abs(screenBrg - COG)).toBeLessThan(1);
      expect(s.labels.length).toBeGreaterThan(0);
      for (const l of s.labels) expect(l).toMatch(/^[\d.]+ NM · (\d+ h \d\d min|\d+ min|< 1 min)$/);

      const o = await overlaps(page);
      expect(o.out).toEqual([]);
      expect(o.inView).toBe(true);

      // zoom out: line is recomputed and still reaches past the edge; 1 NM ring shows 11 min
      await page.evaluate(() => NavApp.map.jumpTo({ zoom: 12.5 }));
      await settle(page, 300);
      const z = await snapshot(page);
      const e = z.linePx[1];
      expect(e[0] < 0 || e[1] < 0 || e[0] > w || e[1] > h).toBe(true);
      expect(z.labels).toContain('1 NM · 11 min');

      // stop: 30 s at the last position with speed 0
      const last = fixes.at(-1);
      const stop = Array.from({ length: 30 }, (_, i) => ({ ...last, t: last.t + (i + 1) * 1000,
        speed: 0 }));
      await feed(page, stop);
      await settle(page, 300);
      const st = await snapshot(page);
      expect(st.panelText).toMatch(/COG —\s*SOG —/);
      expect(st.linePx).toEqual([]);
      expect(st.lineRendered).toBe(0);
      for (const l of st.labels) expect(l).toMatch(/^[\d.]+ NM$/);
      expect(Math.abs(st.rotation - COG)).toBeLessThan(1);
      expect(errs).toEqual([]);
      await page.close();
    });
}
