/** @file "Not for navigation" note shown while depth contours are on. */
import { on } from '../core/events.js?v=35';
/** @param {boolean} on */
export function depthNote(on){let n=document.getElementById('nfn');if(!n){n=document.createElement('div');n.id='nfn';n.textContent='Depths ≈115 m grid · Not for navigation';
  n.style.cssText='position:fixed;right:8px;bottom:calc(env(safe-area-inset-bottom) + 30px);z-index:2400;background:rgba(255,255,255,.8);color:#7a1f1f;font:600 10px system-ui,sans-serif;padding:2px 6px;border-radius:6px;pointer-events:none';document.body.appendChild(n)}n.hidden=!on}

/** Show the note whenever the 'dcont' overlay is toggled. */
export function initDepthNote(){on('overlaychange',e=>{if(e.detail.key==='dcont')depthNote(e.detail.on)})}
