// Shared test helpers: open the app (current version or the v33 reference), wait until map + seamarks are settled, collect errors.
import { BASE_URL, REF_URL } from '../playwright.config.js';
import { APP_VERSION } from '../src/config.js';

/** Version under test (src/config.js; bumped by scripts/bump-version.sh). */
export { BASE_URL, REF_URL, APP_VERSION };
/** Places used for visual parity: [name, lat, lon]. */
export const PLACES = [['Lefkada', 38.8300, 20.7100], ['Limenaria', 40.6280, 24.5770], ['Thessaloniki', 40.6330, 22.9380], ['Skiathos', 39.1620, 23.4900]];
export const ZOOMS = [10, 13, 15, 17];

/** Console noise that is not an app error (software GL driver chatter). */
const IGNORE = [/GL Driver Message/, /GPU stall due to ReadPixels/, /WebGL: too many errors/];

/**
 * Attach error collectors. @param {import('@playwright/test').Page} page
 * @returns {string[]} live array of 'pageerror'/'console.error' messages
 */
export function collectErrors(page) {
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.some(r => r.test(m.text()))) errs.push('console.error: ' + m.text()); });
  return errs;
}

/** JS expression yielding the map in either version. */
export const MAP = '(window.NavApp ? NavApp.map : window.__map)';

/**
 * Open a page and wait until icons are registered, seamarks loaded and the map is idle.
 * @param {import('@playwright/test').Page} page
 * @param {string} root BASE_URL or REF_URL
 * @param {{lat:number, lon:number, z:number, base:string}} v
 * @param {string} [path] '' or 'editor/'
 */
export async function openApp(page, root, v, path = '') {
  await page.goto(`${root}${path}?lat=${v.lat}&lon=${v.lon}&z=${v.z}&base=${v.base}`);
  await page.waitForFunction(() => (window.NavApp ? NavApp.debug.marksReady() : window.__marksReady) === true, null, { timeout: 60_000 });
  await settle(page);
}

/** Wait for map idle twice with a pause (seamark fetch → setData → re-render), max ~30 s. */
export async function settle(page, pause = 1500) {
  for (let i = 0; i < 2; i++) {
    await page.waitForTimeout(pause);
    await page.evaluate(`new Promise(r => { const m = ${MAP}; if (m.loaded() && !m.isMoving()) { setTimeout(r, 300); } else { m.once('idle', r); } setTimeout(r, 30000); })`);
  }
}

/** Elements whose content legitimately differs between versions (version badge, transient status). */
export const MASK = page => [page.locator('#appVer'), page.locator('#mkStatus')];

/** Normalise a style for comparison (cache-buster digits differ by design). */
export function normStyle(s) {
  return JSON.parse(JSON.stringify(s).replace(/([?&]v=)\d+/g, '$1N').replace(/https?:\/\/localhost:\d+\//g, 'ORIGIN/').replace(/https:\/\/iceto3\.github\.io\/nav-app\//g, 'ORIGIN/'));
}
