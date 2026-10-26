/**
 * @file Layer switcher (🗺): base map radios and overlay checkboxes.
 * Emits 'overlaychange' {key, on} so features can react (depth note, seamark loading) without coupling to the UI.
 */
import { BASES, OVERLAYS } from '../map/bases.js?v=35';
import { switchBase } from '../map/theme.js?v=35';
import { emit } from '../core/events.js?v=35';

/** @param {any} map @param {string} initBase */
export function initLayerSwitcher(map, initBase) {
  const box=document.createElement('div');box.id='layers';
  box.innerHTML='<button id="layersBtn" title="Layers">🗺</button><div id="layersMenu" hidden><b>Base map</b></div>';
  document.body.appendChild(box);const menu=box.querySelector('#layersMenu');
  for(const[k,b]of Object.entries(BASES)){const l=document.createElement('label');l.innerHTML=`<input type="radio" name="base" value="${k}"${k===initBase?' checked':''}> ${b.label}`;
    l.querySelector('input').onchange=()=>switchBase(map,k);menu.appendChild(l)}
  menu.insertAdjacentHTML('beforeend','<b>Overlays</b>');
  for(const[k,o]of Object.entries(OVERLAYS)){const l=document.createElement('label');l.innerHTML=`<input type="checkbox"${o.on?' checked':''}> ${o.label}`;
    l.querySelector('input').onchange=e=>{o.on=e.target.checked;(o.layers||[k]).forEach(id=>map.setLayoutProperty(id,'visibility',o.on?'visible':'none'));emit('overlaychange',{key:k,on:o.on})};menu.appendChild(l)}
  box.querySelector('#layersBtn').onclick=()=>menu.hidden=!menu.hidden;
  map.on('mousedown',()=>menu.hidden=true);map.on('touchstart',()=>menu.hidden=true);
}
