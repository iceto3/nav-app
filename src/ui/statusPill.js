/** @file Seamark status pill (#mkStatus). Inline styles so the pill is visible even if a stale style.css is served. */
let el = null, timer = 0;

/** Create the pill (call once, in DOM order). */
export function initStatusPill() {
  el = document.createElement('div'); el.id = 'mkStatus'; el.hidden = true;
  el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 64px);z-index:2500;background:rgba(20,30,45,.9);color:#fff;font:600 13px system-ui,sans-serif;padding:6px 12px;border-radius:14px;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.3);max-width:90vw;text-align:center';
  document.body.appendChild(el);
}
/** Show text (empty hides); auto-hide after ms if given. @param {string} t @param {number} [ms] */
export function setStatus(t, ms) {
  el.textContent = t; el.hidden = !t; el.style.display = t ? 'block' : 'none'; clearTimeout(timer);
  if (t && ms) timer = setTimeout(() => { el.hidden = true; el.style.display = 'none'; }, ms);
}
/** @returns {string} current pill text */
export const statusText = () => el.textContent;
