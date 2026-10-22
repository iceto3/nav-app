/** @file Zoom indicator + compact vertical slider (#zoomBox). */
/** @param {any} map */
export function initZoomSlider(map) {
  const z = document.createElement('div'); z.id = 'zoomBox';
  z.style.cssText = 'position:fixed;right:12px;top:calc(env(safe-area-inset-top) + 172px);z-index:2400;display:flex;flex-direction:column;align-items:center;gap:4px;background:rgba(255,255,255,.85);border-radius:8px;padding:4px 3px;box-shadow:0 1px 4px rgba(0,0,0,.25);font:600 10px system-ui,sans-serif;color:#333';
  z.innerHTML = '<span id="zoomTxt"></span><input id="zoomSl" type="range" min="2" max="20" step="0.1" aria-label="Zoom" style="writing-mode:vertical-lr;direction:rtl;width:18px;height:110px;margin:0">';
  document.body.appendChild(z); const t = z.querySelector('#zoomTxt'), sl = z.querySelector('#zoomSl');
  const upd = () => { const v = map.getZoom(); t.textContent = 'Z ' + v.toFixed(1); if (document.activeElement !== sl) sl.value = v; };
  sl.oninput = () => map.jumpTo({ zoom: +sl.value }); map.on('zoom', upd); upd();
}
