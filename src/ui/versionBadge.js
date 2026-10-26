/** @file Small version badge (#appVer) top-left. */
import { APP_VERSION } from '../config.js?v=35';

export function initVersionBadge() {
  const v = document.createElement('div'); v.id = 'appVer'; v.textContent = APP_VERSION;
  v.style.cssText = 'position:fixed;left:12px;top:calc(env(safe-area-inset-top) + 64px);z-index:2500;background:rgba(255,255,255,.85);color:#333;font:600 10px system-ui,sans-serif;padding:1px 5px;border-radius:6px;pointer-events:none';
  document.body.appendChild(v);
}
