// Playwright config. Local: serves this checkout (v34) and a v33 reference copy (REF_DIR) with Range support.
// Live: BASE_URL=https://iceto3.github.io/nav-app/ npm run test:live (skips @local-only tests; the v33 reference is still served locally).
import { defineConfig } from '@playwright/test';

const LIVE = !!process.env.BASE_URL;
const REF_DIR = process.env.REF_DIR || '/workspace/v33bak/nav-app';
export const BASE_URL = process.env.BASE_URL || 'http://localhost:8799/';
export const REF_URL = process.env.REF_URL || 'http://localhost:8798/';

export default defineConfig({
  testDir: 'tests',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  workers: Number(process.env.PW_WORKERS || 3),
  retries: LIVE ? 1 : 0,
  fullyParallel: true,
  reporter: [['list']],
  outputDir: 'tests/__output__',
  use: {
    baseURL: BASE_URL,
    viewport: { width: 390, height: 760 },
    launchOptions: { args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] },
  },
  webServer: [
    ...(LIVE ? [] : [{ command: 'node tests/server.mjs . 8799', url: 'http://localhost:8799/index.html', reuseExistingServer: true }]),
    { command: `node tests/server.mjs ${REF_DIR} 8798`, url: 'http://localhost:8798/index.html', reuseExistingServer: true },
  ],
});
