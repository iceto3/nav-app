/**
 * @file Housekeeping: remove old service workers/caches (v10+) and auto-update.
 * Auto-update fetches the root app.js and reads the literal APP_VERSION='vNN' marker (v33 clients rely on that
 * exact pattern, so app.js must keep it). A newer version reloads once per version with ?_v= cache-busting.
 */
import { APP_VERSION, TIMING } from '../config.js?v=35';

/** Unregister any service worker and clear Cache Storage (stale-cache issues on the old Netlify site). */
export function cleanupCaches() {
  if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).catch(e=>console.warn('sw unregister',e));
  if(window.caches)caches.keys().then(k=>Promise.all(k.map(x=>caches.delete(x)))).catch(()=>{});
}

/** Parse 'v34' -> 34. @param {string} v */
export const versionNumber = v => +String(v).replace(/\D/g,'') || 0;

/** Start the auto-update checks (after a delay, on tab show and on bfcache restore). */
export function startAutoUpdate() {
  const num=versionNumber;
  async function check(){try{const r=await fetch('app.js?cb='+Date.now(),{cache:'no-store'});if(!r.ok)return;
    const m=/APP_VERSION='(v\d+)'/.exec(await r.text());if(!m||num(m[1])<=num(APP_VERSION))return;
    const k='navReload_'+m[1];if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1');
    if(window.caches)try{for(const n of await caches.keys())await caches.delete(n)}catch(_){/* ignore */}
    const u=new URL(location.href);u.searchParams.set('_v',m[1]);location.replace(u.href)}catch(_){/* offline */}}
  setTimeout(check,TIMING.autoUpdateDelayMs);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
  window.addEventListener('pageshow',e=>{if(e.persisted)check()});
}
