/**
 * @file Motion tracker (v35): course over ground (COG) and speed over ground (SOG) from GPS fixes.
 *
 * - SOG: the fix's own speed when the device reports one, else displacement/time from the last
 *   track anchor (GPS jitter below the fix accuracy counts as standing still); smoothed with
 *   a time-aware exponential average (MOTION.sogTauS).
 * - COG: the device's GPS course when speed > MOTION.movingKn, else the bearing between track
 *   fixes at least MOTION.minFixDistanceM apart; circular mean over a short window.
 * - Moving: SOG above MOTION.movingKn, stationary again below MOTION.stoppedKn (hysteresis).
 *
 * createMotionTracker() is pure (unit-tested). initMotion() wires it to the app: it listens to
 * the 'fix' event of location/boat.js, writes state.cog / state.sog / state.moving, turns the boat
 * marker by COG while moving (state.heading) and emits 'motion' with the new {@link MotionState}.
 */
import { MOTION } from '../config.js?v=35';
import { haversine } from '../core/geo.js?v=35';
import { state } from '../core/state.js?v=35';
import { emit, on } from '../core/events.js?v=35';
import { bearingDeg, circularMean, smooth, toKnots, MS_PER_KNOT } from './motionMath.js?v=35';

/**
 * @typedef {object} Fix
 * @property {number} lat
 * @property {number} lon
 * @property {number} t timestamp (ms)
 * @property {number|null} [speed] device speed (m/s)
 * @property {number|null} [heading] device course (degrees true)
 * @property {number|null} [accuracy] horizontal accuracy (m)
 */

/**
 * @typedef {object} MotionState
 * @property {boolean} moving SOG above the moving threshold
 * @property {number|null} cog smoothed COG (degrees) while moving, else null
 * @property {number|null} sog smoothed SOG (kn) while moving, else null
 * @property {number|null} lastCog last COG seen while moving (kept when stopped)
 * @property {number|null} speedKn smoothed speed (kn) even when stationary, null without data
 */

const isNum = v => typeof v === 'number' && Number.isFinite(v);

/**
 * Create a COG/SOG tracker.
 * @param {typeof MOTION} [cfg] thresholds (defaults to config MOTION)
 * @returns {{update: (fix: Fix) => MotionState, expire: () => MotionState,
 *   get: () => MotionState}}
 */
export function createMotionTracker(cfg = MOTION) {
  /** @type {Fix|null} last fix used as a track point (bearings and computed speed start here) */
  let anchor = null;
  /** @type {number|null} time of the last accepted fix / of the last speed sample (ms) */
  let lastT = null;
  let lastSpeedT = null;
  /** @type {{t: number, deg: number}[]} */
  let samples = [];
  let speedMs = null;
  let moving = false;
  let lastCog = null;

  const result = () => {
    const cog = moving ? circularMean(samples.map(s => s.deg)) : null;
    if (cog != null) lastCog = cog;
    return {
      moving,
      cog,
      sog: moving ? toKnots(speedMs) : null,
      lastCog,
      speedKn: speedMs == null ? null : toKnots(speedMs),
    };
  };

  const rawSpeed = fix => {
    if (isNum(fix.speed) && fix.speed >= 0) return fix.speed;
    if (!anchor) return null;
    const d = haversine([anchor.lat, anchor.lon], [fix.lat, fix.lon]);
    const dtS = (fix.t - anchor.t) / 1000;
    if (dtS <= 0) return null;
    if (d >= cfg.minFixDistanceM) return d / dtS;
    if (dtS < cfg.minSpeedDtS) return null;
    const noise = Math.min(isNum(fix.accuracy) ? fix.accuracy : cfg.jitterM, cfg.minFixDistanceM);
    return d >= noise ? d / dtS : 0;
  };

  const addSample = (t, deg) => {
    samples.push({ t, deg });
    samples = samples.filter(s => t - s.t <= cfg.cogWindowMs).slice(-cfg.cogWindowSize);
  };

  const updateCogSamples = fix => {
    const here = [fix.lat, fix.lon];
    const gpsCog = isNum(fix.heading) && isNum(fix.speed) && fix.speed > cfg.movingKn * MS_PER_KNOT;
    if (gpsCog) addSample(fix.t, fix.heading);
    if (!anchor) {
      anchor = fix;
      return;
    }
    const from = [anchor.lat, anchor.lon];
    if (haversine(from, here) < cfg.minFixDistanceM) return;
    if (!gpsCog) addSample(fix.t, bearingDeg(from, here));
    anchor = fix;
  };

  return {
    /** Feed one fix. @param {Fix} fix @returns {MotionState} */
    update(fix) {
      if (isNum(fix.accuracy) && fix.accuracy > cfg.maxAccuracyM) return result();
      if (lastT != null && fix.t <= lastT) return result();
      lastT = fix.t;
      const raw = rawSpeed(fix);
      if (raw != null) {
        const dtS = lastSpeedT == null ? 0 : (fix.t - lastSpeedT) / 1000;
        speedMs = smooth(speedMs, raw, dtS, cfg.sogTauS);
        lastSpeedT = fix.t;
      }
      updateCogSamples(fix);
      const kn = speedMs == null ? 0 : toKnots(speedMs);
      moving = moving ? kn >= cfg.stoppedKn : kn > cfg.movingKn;
      return result();
    },
    /** No fixes for a while: forget speed and course samples (marker keeps lastCog). */
    expire() {
      anchor = null;
      lastT = null;
      lastSpeedT = null;
      samples = [];
      speedMs = null;
      moving = false;
      return result();
    },
    /** @returns {MotionState} current state without a new fix */
    get: result,
  };
}

/** Wire the tracker to 'fix' events (call once at startup). */
export function initMotion() {
  const tracker = createMotionTracker();
  let staleTimer = 0;
  const publish = m => {
    state.cog = m.cog;
    state.sog = m.sog;
    state.moving = m.moving;
    if (m.moving && m.cog != null) state.heading = m.cog;
    emit('motion', m);
  };
  on('fix', e => {
    publish(tracker.update(e.detail));
    clearTimeout(staleTimer);
    staleTimer = setTimeout(() => publish(tracker.expire()), MOTION.staleMs);
  });
}
