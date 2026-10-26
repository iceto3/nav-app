// Runtime checks of the app on both bases: no errors, same style/icons as v33, popups, search, layer switcher.
import { test, expect } from '@playwright/test';
import { APP_VERSION, BASE_URL, REF_URL, MAP, collectErrors, openApp, normStyle, settle } from './helpers.js';

const LEFKADA = { lat: 38.7608, lon: 20.7195, z: 16.4 };
const BASES = ['sat', 'old'];

for (const base of BASES) {
  test.describe(`base ${base}`, () => {
    test('loads without console/page errors and exposes NavApp', async ({ page }) => {
      const errs = collectErrors(page);
      await openApp(page, BASE_URL, { ...LEFKADA, base });
      const info = await page.evaluate(() => ({ v: NavApp.version, badge: document.querySelector('#appVer').textContent, old: document.body.classList.contains('oldchart'), frozen: Object.isFrozen(NavApp) }));
      expect(info.v).toBe(APP_VERSION); expect(info.badge).toBe(APP_VERSION); expect(info.old).toBe(base === 'old'); expect(info.frozen).toBe(true);
      expect(errs).toEqual([]);
    });

    test('style (layers, sources, paint/layout incl. theme) identical to v33', async ({ browser }) => {
      const get = async root => { const p = await browser.newPage(); await openApp(p, root, { ...LEFKADA, base }); const s = await p.evaluate(`(() => { const s = ${MAP}.getStyle(); return { layers: s.layers, sources: s.sources, glyphs: s.glyphs }; })()`); await p.close(); return normStyle(s); };
      const [a, b] = await Promise.all([get(BASE_URL), get(REF_URL)]);
      expect(a.layers.map(l => l.id)).toEqual(b.layers.map(l => l.id));
      for (let i = 0; i < a.layers.length; i++) expect(a.layers[i], a.layers[i].id).toEqual(b.layers[i]);
      expect(Object.keys(a.sources)).toEqual(Object.keys(b.sources));
      for (const k of Object.keys(a.sources)) if (k !== 'marks') expect(a.sources[k], k).toEqual(b.sources[k]);
      expect(a.glyphs).toBe(b.glyphs);
    });

    test('marks, layers and icons present', async ({ page }) => {
      await openApp(page, BASE_URL, { ...LEFKADA, base });
      const r = await page.evaluate(() => {
        const m = NavApp.map, ids = Object.keys(NavApp.debug.icons());
        return {
          layers: ['marks', 'pois', 'poidots', 'dots', 'ltLbl', 'lblPlace', 'dcont', 'uland', 'meRing'].filter(l => !m.getLayer(l)),
          missingImages: ids.filter(i => !m.hasImage(i)),
          png: ['shop', 'D_shop', 'p_pharmacy', 'D_p_rest'].filter(i => !m.hasImage(i)),
          dots: ['pdot_shop', 'opdot_p_hospital'].filter(i => !m.hasImage(i)),
          rendered: m.queryRenderedFeatures({ layers: ['marks'] }).length,
          features: m.querySourceFeatures('marks').length,
          nIcons: ids.length,
        };
      });
      expect(r.layers).toEqual([]); expect(r.missingImages).toEqual([]); expect(r.png).toEqual([]); expect(r.dots).toEqual([]);
      expect(r.nIcons).toBeGreaterThan(60); expect(r.features).toBeGreaterThan(10); expect(r.rendered).toBeGreaterThan(0);
    });
  });
}

test('icon table identical to v33 (every SVG string)', async ({ browser }) => {
  const p1 = await browser.newPage(), p2 = await browser.newPage();
  await Promise.all([openApp(p1, BASE_URL, { ...LEFKADA, base: 'sat' }), openApp(p2, REF_URL, { ...LEFKADA, base: 'sat' })]);
  const a = await p1.evaluate(() => NavApp.debug.icons()), b = await p2.evaluate('ICONS');
  expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
  for (const k of Object.keys(b)) expect(a[k], k).toBe(b[k]);
});

test('switching bases matches v33 style each time', async ({ browser }) => {
  test.setTimeout(240_000);
  const run = async root => { const p = await browser.newPage(); await openApp(p, root, { ...LEFKADA, base: 'sat' }); const out = [];
    for (const k of ['old', 'topo', 'osm', 'old', 'sat']) {
      if (await p.locator('#layersMenu').isHidden()) await p.locator('#layersBtn').click();
      await p.locator(`#layersMenu input[value="${k}"]`).check(); await settle(p, 500);
      out.push(await p.evaluate(`({ old: document.body.classList.contains('oldchart'), layers: ${MAP}.getStyle().layers, scale: document.querySelector('#scaleBar').innerHTML })`));
    }
    await p.close(); return normStyle(out); };
  const [a, b] = await Promise.all([run(BASE_URL), run(REF_URL)]);
  expect(a).toEqual(b);
});

test('overlay toggles: depth contours note and seamarks', async ({ page }) => {
  const errs = collectErrors(page);
  await openApp(page, BASE_URL, { ...LEFKADA, base: 'sat' });
  await page.locator('#layersBtn').click();
  const box = label => page.locator('#layersMenu label', { hasText: label }).locator('input');
  await box('Depth contours').check();
  await expect(page.locator('#nfn')).toBeVisible();
  expect(await page.evaluate(() => NavApp.map.getLayoutProperty('dcont', 'visibility'))).toBe('visible');
  await box('Depth contours').uncheck(); await expect(page.locator('#nfn')).toBeHidden();
  await box('Seamarks').uncheck();
  expect(await page.evaluate(() => NavApp.map.getLayoutProperty('marks', 'visibility'))).toBe('none');
  await box('Seamarks').check();
  expect(await page.evaluate(() => NavApp.map.getLayoutProperty('marks', 'visibility'))).toBe('visible');
  expect(errs).toEqual([]);
});

test('seamark popup opens on tap with name/kind', async ({ page }) => {
  await openApp(page, BASE_URL, { ...LEFKADA, z: 15, base: 'old' });
  const pt = await page.evaluate(() => { const f = NavApp.map.queryRenderedFeatures({ layers: ['marks'] }).find(f => f.geometry.type === 'Point'); if (!f) return null; const p = NavApp.map.project(f.geometry.coordinates); return { x: p.x, y: p.y, id: f.properties.id }; });
  expect(pt).not.toBeNull();
  await page.mouse.click(pt.x, pt.y);
  const pop = page.locator('.maplibregl-popup');
  await expect(pop).toBeVisible();
  await expect(pop).toContainText(/\S/);
});

test('search lists results and sets a destination (Nominatim mocked)', async ({ page }) => {
  await page.route('**/nominatim.openstreetmap.org/**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify([{ lat: '38.8327', lon: '20.7065', name: 'Lefkada Marina', display_name: 'Lefkada Marina, Lefkada, Greece' }]) }));
  await openApp(page, BASE_URL, { ...LEFKADA, base: 'sat' });
  let url = '';
  page.on('request', r => { if (r.url().includes('nominatim')) url = r.url(); });
  await page.fill('#q', 'lefkada marina'); await page.press('#q', 'Enter');
  const li = page.locator('#results li').first();
  await expect(li).toContainText('Lefkada Marina');
  expect(url).toMatch(/format=jsonv2&limit=8&accept-language=en&q=lefkada%20marina&viewbox=/);
  await li.click();
  await expect(page.locator('#panel')).toBeVisible();
  await expect(page.locator('#summary')).toContainText(/Lefkada Marina|location|route/i);
  await expect(page.locator('.dest')).toHaveCount(1);
});

test('NavApp.setEditing(true) suppresses popups and dropped pins', async ({ page }) => {
  await openApp(page, BASE_URL, { ...LEFKADA, z: 15, base: 'old' });
  const pt = await page.evaluate(() => { NavApp.setEditing(true); const f = NavApp.map.queryRenderedFeatures({ layers: ['marks'] })[0]; const p = NavApp.map.project(f.geometry.coordinates); return { x: p.x, y: p.y }; });
  await page.mouse.click(pt.x, pt.y);
  await page.mouse.click(200, 400, { button: 'right' });
  await page.waitForTimeout(800);
  await expect(page.locator('.maplibregl-popup')).toHaveCount(0);
  await expect(page.locator('.dest')).toHaveCount(0);
  await page.evaluate(() => NavApp.setEditing(false));
  await page.mouse.click(200, 400, { button: 'right' });
  await expect(page.locator('.dest')).toHaveCount(1);
});
