// Compare load timing of two app roots (default: local v34 vs local v33 reference) under emulated latency.
// usage: node scripts/measure-load.mjs [rootA] [rootB] [runs] [latencyMs]   (servers must be running, e.g. npm run serve)
import { chromium } from '@playwright/test';

const [A = 'http://localhost:8799/', B = 'http://localhost:8798/', RUNS = '5', LAT = '60'] = process.argv.slice(2);
const Q = '?lat=38.83&lon=20.71&z=12&base=old';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', ...(process.env.INSECURE ? ['--ignore-certificate-errors'] : [])] });

async function once(root) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 760 } });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: +LAT, downloadThroughput: 20e6 / 8, uploadThroughput: 5e6 / 8 });
  let jsBytes = 0, jsReqs = 0;
  page.on('response', async r => { const u = r.url(); if (u.startsWith(root) && /\.js(\?|$)/.test(u) && !u.includes('vendor/')) { jsReqs++; try { jsBytes += (await r.body()).length; } catch { /* ignore */ } } });
  const t0 = Date.now();
  await page.goto(root + Q);
  await page.waitForFunction(() => { const m = window.NavApp ? NavApp.map : window.__map; return m && m.loaded(); }, null, { timeout: 60000, polling: 50 });
  const tLoad = Date.now() - t0;
  await page.waitForFunction(() => (window.NavApp ? NavApp.debug.marksReady() : window.__marksReady) === true, null, { timeout: 60000, polling: 50 });
  const tMarks = Date.now() - t0;
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; });
  await ctx.close();
  return { tLoad, tMarks, ...nav, jsReqs, jsBytes };
}
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
for (const root of [A, B]) {
  const rs = []; for (let i = 0; i < +RUNS; i++) rs.push(await once(root));
  console.log(root, JSON.stringify({ mapLoadedMs: med(rs.map(r => r.tLoad)), marksReadyMs: med(rs.map(r => r.tMarks)), domContentLoadedMs: med(rs.map(r => r.dcl)), loadEventMs: med(rs.map(r => r.load)), appJsRequests: rs[0].jsReqs, appJsBytes: rs[0].jsBytes }));
}
await browser.close();
