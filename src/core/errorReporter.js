/**
 * @file On-screen error reporter: makes iPhone JS errors visible as a red toast (tap to dismiss).
 */
import { TIMING } from '../config.js?v=34';

let timer = 0;
/**
 * Show an error message toast.
 * @param {string} m
 */
export function showError(m) {
  try {
    let e = document.getElementById('errToast');
    if (!e) {
      e = document.createElement('div'); e.id = 'errToast';
      e.style.cssText = 'position:fixed;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom) + 90px);z-index:3000;background:#b71c1c;color:#fff;font:12px system-ui;padding:8px 10px;border-radius:8px;white-space:pre-wrap;word-break:break-word';
      e.onclick = () => e.remove(); document.body.appendChild(e);
    }
    e.textContent = '⚠ ' + m; clearTimeout(timer); timer = setTimeout(() => e.remove(), TIMING.errorToastMs);
  } catch (_) { /* never throw from the reporter */ }
}

/** Install window.onerror / unhandledrejection handlers. */
export function installErrorReporter() {
  window.onerror = (msg, src, l, c) => { showError(msg + ' (' + String(src || '').split('/').pop() + ':' + l + ':' + c + ')'); };
  window.addEventListener('unhandledrejection', e => showError('Promise: ' + (e.reason && (e.reason.message || e.reason))));
}
