// @local-only static checks of the source tree (no browser needed).
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const walk = d => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

test.describe('static @local-only', () => {
  test('app.js marker equals src/config.js APP_VERSION', () => {
    const cfg = /APP_VERSION = '(v\d+)'/.exec(read('src/config.js'))[1];
    expect(/APP_VERSION='(v\d+)'/.exec(read('app.js'))[1]).toBe(cfg);
  });
  test('every ?v= cache-buster equals the app version', () => {
    const v = /APP_VERSION = 'v(\d+)'/.exec(read('src/config.js'))[1];
    const files = ['app.js', 'index.html', 'editor/index.html', 'editor/editor.js', ...walk('src')];
    const bad = [];
    for (const f of files) {
      const s = read(f);
      for (const m of s.matchAll(/\bfrom\s+'([^']+)'|import\s+'([^']+)'|(?:src|href)="((?:app|style|editor\/editor)\.(?:js|css)[^"]*)"/g)) {
        const u = m[1] || m[2] || m[3];
        if (!u.startsWith('.') && !/^(app|style|editor)/.test(u)) continue;
        if (!new RegExp(`\\?v=${v}$`).test(u)) bad.push(`${f}: ${u}`);
      }
    }
    expect(bad).toEqual([]);
  });
  test('modulepreload block matches the import graph', () => {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/gen-preload.mjs'), '--check']);
  });
  test('.nojekyll present, no editor shim, no leftover globals', () => {
    expect(fs.existsSync(path.join(ROOT, '.nojekyll'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'editor/shim.js'))).toBe(false);
    for (const f of walk('src')) expect(read(f), f).not.toMatch(/window\.(__map|__marksReady|DELETED_IDS|PINNED_IDS|__devEdit)\b/);
  });
});
