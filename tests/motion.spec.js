// @local-only unit tests (v35) of the pure motion modules: COG/SOG maths, smoothing, the tracker,
// ETA/label formatting and the course-line geometry. No browser needed.
import { test, expect } from '@playwright/test';
import {
  bearingDeg, circularMean, angleDiff, normDeg, emaAlpha, smooth, toKnots, MS_PER_KNOT,
} from '../src/location/motionMath.js';
import { createMotionTracker } from '../src/location/motion.js';
import { fmtCog, fmtSog, fmtEta, ringLabel, etaSeconds } from '../src/location/navFormat.js';
import { courseSegment, toMercator, fromMercator } from '../src/location/courseLine.js';
import { MOTION } from '../src/config.js';

const START = [38.76, 20.72];
const M_PER_DEG = 111195;

/** Point `dist` metres from `p` along `brg` degrees (small-distance approximation). */
function offset(p, brg, dist) {
  const a = brg * Math.PI / 180;
  const dLat = dist * Math.cos(a) / M_PER_DEG;
  const dLon = dist * Math.sin(a) / (M_PER_DEG * Math.cos(p[0] * Math.PI / 180));
  return [p[0] + dLat, p[1] + dLon];
}

/** Straight track: n fixes every dtS seconds at kn knots on course brg. */
function track({ brg, kn, n, dtS = 1, speed = false, heading = false, from = START, t0 = 0 }) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = offset(from, brg, kn * MS_PER_KNOT * dtS * i);
    out.push({
      lat: p[0], lon: p[1], t: t0 + i * dtS * 1000, accuracy: 5,
      speed: speed ? kn * MS_PER_KNOT : null, heading: heading ? brg : null,
    });
  }
  return out;
}

const feed = (tr, fixes) => fixes.map(f => tr.update(f)).at(-1);

test.describe('motion maths @local-only', () => {
  test('bearing between points (cardinal and diagonal)', () => {
    expect(bearingDeg(START, offset(START, 0, 100))).toBeCloseTo(0, 1);
    expect(bearingDeg(START, offset(START, 90, 100))).toBeCloseTo(90, 1);
    expect(bearingDeg(START, offset(START, 180, 100))).toBeCloseTo(180, 1);
    expect(bearingDeg(START, offset(START, 237, 100))).toBeCloseTo(237, 1);
    expect(bearingDeg(START, offset(START, 315, 100))).toBeCloseTo(315, 1);
  });

  test('circular mean wraps through north and handles weights / cancellation', () => {
    expect(circularMean([359, 1])).toBeCloseTo(0, 6);
    expect(circularMean([350, 10, 0])).toBeCloseTo(0, 6);
    expect(circularMean([170, 190])).toBeCloseTo(180, 6);
    expect(circularMean([0, 90], [1, 3])).toBeCloseTo(71.565, 2);
    expect(circularMean([0, 180])).toBeNull();
    expect(circularMean([])).toBeNull();
  });

  test('angle helpers and unit conversion', () => {
    expect(normDeg(-90)).toBe(270);
    expect(normDeg(720)).toBe(0);
    expect(angleDiff(350, 10)).toBe(20);
    expect(angleDiff(10, 350)).toBe(-20);
    expect(toKnots(1852 / 3600)).toBeCloseTo(1, 9);
  });

  test('time-aware exponential smoothing', () => {
    expect(emaAlpha(0, 4)).toBe(0);
    expect(emaAlpha(4, 4)).toBeCloseTo(1 - Math.exp(-1), 9);
    expect(emaAlpha(1, 0)).toBe(1);
    expect(smooth(null, 5, 1, 4)).toBe(5);
    let v = 0;
    for (let i = 0; i < 40; i++) v = smooth(v, 10, 1, 4);
    expect(v).toBeGreaterThan(9.9);
    expect(smooth(0, 10, 1, 4)).toBeLessThan(5);
  });
});

test.describe('motion tracker @local-only', () => {
  test('computed COG/SOG without device speed (5.4 kn on 237°)', () => {
    const m = feed(createMotionTracker(), track({ brg: 237, kn: 5.4, n: 30 }));
    expect(m.moving).toBe(true);
    expect(m.cog).toBeCloseTo(237, 0);
    expect(m.sog).toBeGreaterThan(5.2);
    expect(m.sog).toBeLessThan(5.6);
  });

  test('device speed and GPS course are used when above the threshold', () => {
    const fixes = track({ brg: 12, kn: 3, n: 4, speed: true, heading: true });
    const m = feed(createMotionTracker(), fixes);
    expect(m.moving).toBe(true);
    expect(m.sog).toBeCloseTo(3, 6);
    expect(m.cog).toBeCloseTo(12, 6);
  });

  test('COG smoothing averages a noisy course across north', () => {
    const tr = createMotionTracker();
    const brgs = [355, 5, 358, 2, 356, 4, 0, 359, 1, 357];
    let p = START;
    let m = null;
    brgs.forEach((b, i) => {
      p = offset(p, b, 15);
      const t = (i + 1) * 3000;
      m = tr.update({ lat: p[0], lon: p[1], t, speed: 5, heading: null, accuracy: 5 });
    });
    expect(Math.abs(angleDiff(0, m.cog))).toBeLessThan(3);
  });

  test('fixes closer than the minimum distance give no new bearing', () => {
    const tr = createMotionTracker();
    const fixes = track({ brg: 90, kn: 5, n: 12, speed: true });
    feed(tr, fixes);
    const before = tr.get().cog;
    const last = fixes.at(-1);
    const near = offset([last.lat, last.lon], 0, MOTION.minFixDistanceM / 3);
    const m = tr.update({ ...last, lat: near[0], lon: near[1], t: last.t + 1000 });
    expect(m.cog).toBeCloseTo(before, 6);
  });

  test('GPS jitter at anchor is not motion', () => {
    const tr = createMotionTracker();
    let m = null;
    for (let i = 0; i < 60; i++) {
      const p = offset(START, (i * 137) % 360, 2 + (i % 3));
      m = tr.update({ lat: p[0], lon: p[1], t: i * 1000, speed: null, heading: null, accuracy: 6 });
    }
    expect(m.moving).toBe(false);
    expect(m.cog).toBeNull();
    expect(m.sog).toBeNull();
  });

  test('stopping keeps the last COG for the marker; hysteresis around 1 kn', () => {
    const tr = createMotionTracker();
    const run = track({ brg: 200, kn: 4, n: 20, speed: true });
    feed(tr, run);
    const last = run.at(-1);
    const stop = Array.from({ length: 30 }, (_, i) => ({
      ...last, t: last.t + (i + 1) * 1000, speed: 0, heading: null,
    }));
    const m = feed(tr, stop);
    expect(m.moving).toBe(false);
    expect(m.cog).toBeNull();
    expect(m.lastCog).toBeCloseTo(200, 0);
    const slow = createMotionTracker();
    feed(slow, track({ brg: 0, kn: 1.5, n: 10, speed: true }));
    expect(slow.get().moving).toBe(true);
    const at09 = feed(slow, track({ brg: 0, kn: 0.9, n: 30, speed: true, t0: 20000 }));
    expect(at09.moving).toBe(true);
    const at05 = feed(slow, track({ brg: 0, kn: 0.5, n: 30, speed: true, t0: 60000 }));
    expect(at05.moving).toBe(false);
  });

  test('inaccurate and out-of-order fixes are ignored; expire() resets', () => {
    const tr = createMotionTracker();
    const fixes = track({ brg: 90, kn: 5, n: 10, speed: true });
    feed(tr, fixes);
    const ref = tr.get();
    const bad = { ...fixes.at(-1), t: fixes.at(-1).t + 1000, speed: 30, accuracy: 500 };
    expect(tr.update(bad).sog).toBeCloseTo(ref.sog, 6);
    expect(tr.update({ ...fixes[0], speed: 30 }).sog).toBeCloseTo(ref.sog, 6);
    const e = tr.expire();
    expect(e.moving).toBe(false);
    expect(e.speedKn).toBeNull();
    expect(e.lastCog).toBeCloseTo(90, 0);
  });
});

test.describe('formatting @local-only', () => {
  test('COG and SOG read-outs', () => {
    expect(fmtCog(237.4)).toBe('COG 237°');
    expect(fmtCog(4.6)).toBe('COG 005°');
    expect(fmtCog(359.7)).toBe('COG 000°');
    expect(fmtCog(null)).toBe('COG —');
    expect(fmtSog(5.44)).toBe('SOG 5.4 kn');
    expect(fmtSog(0)).toBe('SOG 0.0 kn');
    expect(fmtSog(null)).toBe('SOG —');
  });

  test('ETA: minutes, h + two-digit minutes, bounds', () => {
    expect(fmtEta(20)).toBe('< 1 min');
    expect(fmtEta(12 * 60)).toBe('12 min');
    expect(fmtEta(59 * 60 + 20)).toBe('59 min');
    expect(fmtEta(59 * 60 + 40)).toBe('1 h 00 min');
    expect(fmtEta(65 * 60)).toBe('1 h 05 min');
    expect(fmtEta(10 * 3600 + 42 * 60)).toBe('10 h 42 min');
    expect(fmtEta(200 * 3600)).toBe('> 99 h');
    expect(etaSeconds(1, 5)).toBe(720);
  });

  test('ring labels', () => {
    expect(ringLabel(1, 5)).toBe('1 NM · 12 min');
    expect(ringLabel(0.25, 6)).toBe('0.25 NM · 3 min');
    expect(ringLabel(10, 9.2)).toBe('10 NM · 1 h 05 min');
    expect(ringLabel(1, null)).toBe('1 NM');
    expect(ringLabel(1, 0)).toBe('1 NM');
  });
});

test.describe('course line geometry @local-only', () => {
  test('mercator round trip', () => {
    const [x, y] = toMercator(20.72, 38.76);
    const [lon, lat] = fromMercator(x, y);
    expect(lon).toBeCloseTo(20.72, 9);
    expect(lat).toBeCloseTo(38.76, 9);
  });

  test('segment starts at the bow, runs along COG and has the requested length', () => {
    const worldPx = 512 * 2 ** 14;
    const lonLat = [START[1], START[0]];
    const [a, b] = courseSegment(lonLat, 237, 15, 2000, worldPx);
    const [x0, y0] = toMercator(...lonLat);
    const pa = toMercator(...a).map((v, i) => (v - [x0, y0][i]) * worldPx);
    const pb = toMercator(...b).map((v, i) => (v - [x0, y0][i]) * worldPx);
    expect(Math.hypot(...pa)).toBeCloseTo(15, 6);
    expect(Math.hypot(...pb)).toBeCloseTo(2000, 6);
    const screenBearing = normDeg(Math.atan2(pb[0], -pb[1]) * 180 / Math.PI);
    expect(screenBearing).toBeCloseTo(237, 6);
    expect(bearingDeg([a[1], a[0]], [b[1], b[0]])).toBeCloseTo(237, 0);
  });

  test('segment is clamped before the pole at low zoom', () => {
    const [, b] = courseSegment([0, 80], 0, 15, 1e7, 512);
    expect(b[1]).toBeLessThan(86);
    expect(Number.isFinite(b[1])).toBe(true);
  });
});
