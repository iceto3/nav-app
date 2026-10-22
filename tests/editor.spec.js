// Editor smoke test: loads on NavApp, all 7 modes, draw a pier with taps + Finish, no dropped pin while editing,
// export format identical to v33's editor, and (local only) devedits/apply.py accepts the export on a throwaway copy.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { BASE_URL, REF_URL, collectErrors, openApp } from './helpers.js';

test.describe.configure({ mode: 'serial' }); // apply.py test uses the export of the editor test

const VIEW = { lat: 38.7608, lon: 20.7195, z: 16.4, base: 'old' };
const MODES = ['Depth', 'Move', 'Add', 'Delete', 'Image', 'View', 'Shore'];
// Finds a ~45 px coastline segment on screen and the sea-side normal (same picker as the v32/v33 manual tests).
const PICK = `(()=>{const map=window.NavApp?NavApp.map:window.__map;const fs=map.querySourceFeatures('coast',{sourceLayer:'coast'});const W=innerWidth,H=innerHeight;let best=null;
for(const f of fs){const gs=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.type==='MultiLineString'?f.geometry.coordinates:[];for(const g of gs){const P=g.map(c=>map.project(c)).map(p=>[p.x,p.y]);
 for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const ok=q=>q[0]>50&&q[0]<W-50&&q[1]>120&&q[1]<H-260;if(!ok(P[i])||!ok(P[j]))continue;const d=Math.hypot(P[j][0]-P[i][0],P[j][1]-P[i][1]);if(d>35&&d<60&&(!best||Math.abs(d-45)<best.e))best={e:Math.abs(d-45),A:P[i],B:P[j]}}}}
if(!best)return null;const{A,B}=best,dx=B[0]-A[0],dy=B[1]-A[1],l=Math.hypot(dx,dy);let n=[-dy/l,dx/l];
const sea=p=>map.queryRenderedFeatures(p,{layers:['old_csea']}).length>0&&map.queryRenderedFeatures(p,{layers:['old_cland']}).length===0;
const M=[(A[0]+B[0])/2,(A[1]+B[1])/2];if(!sea([M[0]+n[0]*60,M[1]+n[1]*60]))n=[-n[0],-n[1]];return{A,B,n}})()`;

/** Run the full editor flow on one root; returns export JSON, modes and checks. */
async function editorFlow(browser, root, shotPath) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true, acceptDownloads: true });
  const pg = await ctx.newPage(); const errs = collectErrors(pg);
  await openApp(pg, root, VIEW, 'editor/');
  await pg.evaluate(() => localStorage.removeItem('navDevState')); await pg.reload();
  await pg.waitForFunction(() => window.__dev && (window.NavApp ? NavApp.debug.marksReady() : window.__marksReady), null, { timeout: 60_000 });
  await pg.waitForTimeout(6000);
  const cdp = await ctx.newCDPSession(pg);
  const tch = async (type, x, y) => { await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: x == null ? [] : [{ x, y }] }); await pg.waitForTimeout(50); };
  const tap = async (x, y) => { await tch('touchStart', x, y); await tch('touchEnd'); await pg.waitForTimeout(450); };
  const B = t => pg.locator('#dev button', { hasText: t }).first();
  const info = await pg.evaluate(() => ({ title: document.title, dv: (window.NavApp ? NavApp.map : window.__map).getStyle().layers.filter(l => l.id.startsWith('dv')).length }));
  const modes = [];
  for (const m of MODES) { await B(m).click(); await pg.waitForTimeout(300); modes.push([m, await pg.evaluate(() => document.querySelector('#dev .on') && document.querySelector('#dev .on').textContent)]); }
  const g = await pg.evaluate(PICK); expect(g, 'coast segment found').not.toBeNull();
  const { A, B: Bp, n } = g, w = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]), u = [(Bp[0] - A[0]) / w, (Bp[1] - A[1]) / w];
  const Q = (b, k, s) => [b[0] + n[0] * k + u[0] * s, b[1] + n[1] * k + u[1] * s];
  for (const q of [A, Q(A, 110, 0), Q(A, 110, w + 70), Q(A, 85, w + 70), Q(Bp, 85, 0), Bp]) await tap(...q);
  await B('Finish').click(); await pg.waitForTimeout(1200);
  const lines = await pg.evaluate(() => JSON.stringify(__dev.S.lines.map(l => [l.type, l.pts.length, l.closed, l.sn, !!l.land])));
  await tch('touchStart', 200, 300); await pg.waitForTimeout(900); await tch('touchEnd');
  const panelHidden = await pg.evaluate(() => document.querySelector('#panel').hidden);
  const [dl] = await Promise.all([pg.waitForEvent('download'), B('⇩').click()]);
  const file = path.join(os.tmpdir(), `export-${Date.now()}-${Math.random().toString(36).slice(2)}.geojson`); await dl.saveAs(file);
  await B('View').click(); await pg.waitForTimeout(1500);
  if (shotPath) await pg.screenshot({ path: shotPath });
  await ctx.close();
  return { info, modes, lines, panelHidden, file, ex: JSON.parse(fs.readFileSync(file, 'utf8')), errs };
}

const shape = ex => ({ keys: Object.keys(ex).sort(), type: ex.type, app: ex.app, overlay: ex.overlay,
  features: ex.features.map(f => ({ g: f.geometry.type, n: JSON.stringify(f.geometry.coordinates).length > 0, props: Object.keys(f.properties).sort(), edit: f.properties.edit, type: f.properties.type })) });

test('editor: modes, draw + Finish, export identical in format to v33', async ({ browser }) => {
  test.setTimeout(240_000);
  const [a, b] = await Promise.all([editorFlow(browser, BASE_URL, process.env.EDITOR_SHOT), editorFlow(browser, REF_URL)]);
  expect(a.errs).toEqual([]);
  expect(a.info.title).toBe('Navigator – editor v1'); expect(a.info.dv).toBeGreaterThan(0); expect(a.info.dv).toBe(b.info.dv);
  expect(a.modes).toEqual(b.modes);
  expect(a.modes.map(m => m[1])).toEqual(expect.arrayContaining([expect.any(String)]));
  expect(a.lines).toBe(b.lines); expect(JSON.parse(a.lines).length).toBeGreaterThan(0);
  expect(a.panelHidden).toBe(true);
  expect(a.ex.version).toBe('v34'); expect(b.ex.version).toBe('v33');
  expect(shape(a.ex)).toEqual(shape(b.ex));
  // same taps on the same map -> same snapped geometry
  const coords = ex => ex.features.map(f => JSON.stringify(f.geometry.coordinates));
  expect(coords(a.ex)).toEqual(coords(b.ex));
  fs.writeFileSync(path.join(os.tmpdir(), 'v34-editor-export.geojson'), JSON.stringify(a.ex));
});

test('devedits/apply.py accepts a v34 export (throwaway copies) @local-only', async () => {
  const PY = '/workspace/.venv-geo/bin/python', DEV = '/workspace/devedits';
  const exp = path.join(os.tmpdir(), 'v34-editor-export.geojson');
  test.skip(!fs.existsSync(PY) || !fs.existsSync(DEV) || !fs.existsSync(exp), 'needs the venv, devedits and the export from the editor test');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-'));
  fs.cpSync(DEV, path.join(tmp, 'devedits'), { recursive: true, filter: s => !s.includes('__pycache__') });
  fs.cpSync(path.resolve(import.meta.dirname, '..', 'data'), path.join(tmp, 'app', 'data'), { recursive: true });
  const histBefore = fs.readdirSync(path.join(DEV, 'history')).length;
  const out = execFileSync(PY, [path.join(tmp, 'devedits', 'apply.py'), exp, '--app', path.join(tmp, 'app')], { encoding: 'utf8', timeout: 300_000 });
  const ue = JSON.parse(fs.readFileSync(path.join(tmp, 'app', 'data', 'user-edits.geojson'), 'utf8'));
  const ids = new Set(ue.features.map(f => f.properties.id));
  const pts = g => (g.type === 'Polygon' ? g.coordinates[0] : g.coordinates);
  const kept = JSON.parse(fs.readFileSync(exp, 'utf8')).features.filter(f => ['shore', 'depth_contour'].includes(f.properties.edit) && pts(f.geometry).length >= 2);
  expect(kept.length).toBeGreaterThan(0);
  for (const f of kept) expect(ids.has(f.properties.id), out).toBe(true); // single-point lines are dropped by design
  expect(fs.readdirSync(path.join(DEV, 'history')).length).toBe(histBefore); // real devedits untouched
  fs.rmSync(tmp, { recursive: true, force: true });
});
