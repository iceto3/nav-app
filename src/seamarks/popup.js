/** @file Tap popups for seamarks/POIs (suppressed while the editor has an edit mode active). */
import { markById } from './store.js?v=34';
import { CAT_BG, lightText } from './classify.js?v=34';
import { esc } from '../core/dom.js?v=34';
import { state } from '../core/state.js?v=34';

/** Symbol layers that open a popup on tap. */
export const POPUP_LAYERS = ['marks', 'pois'];

/** Build popup HTML for a rendered feature. @param {any} f @returns {string} */
export function popupHtml(f){const t=markById.get(f.properties.id)||{};
  const name=t['name:en']||t['seamark:name:en']||t.name_en||t['name:latin']||t['int_name']||t.name||t['seamark:name']||'';const lt=lightText(t);
  const st=t['seamark:type'];const cat=st&&t[`seamark:${st}:category`];
  let h=`<div class="mk">${name?`<b>${esc(name)}</b>`:''}<div>${esc(f.properties.kind)}${cat&&CAT_BG[cat]?' – '+CAT_BG[cat]:''}</div>`;
  if(lt.length)h+=`<div class="lt">💡 ${lt.map(esc).join('<br>')}</div>`;
  if(t['seamark:light:range'])h+=`<div class="sm">Range: ${esc(t['seamark:light:range'])} NM</div>`;
  if(t['seamark:light:height'])h+=`<div class="sm">Height: ${esc(t['seamark:light:height'])} m</div>`;
  if(t.description)h+=`<div class="sm">${esc(t.description)}</div>`;
  if(t.website)h+=`<div class="sm"><a href="${esc(t.website)}" target="_blank" rel="noopener">Website</a></div>`;
  h+='</div>';
  return h}

/** Register click/hover handlers. @param {any} map */
export function initPopups(map){
  for(const l of POPUP_LAYERS)map.on('click',l,e=>{if(state.editing)return;const f=e.features[0];
    new maplibregl.Popup({offset:14,maxWidth:'260px'}).setLngLat(f.geometry.coordinates).setHTML(popupHtml(f)).addTo(map)});
  for(const l of POPUP_LAYERS){map.on('mouseenter',l,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',l,()=>map.getCanvas().style.cursor='')}
}
