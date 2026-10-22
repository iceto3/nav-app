/**
 * @file v23: range rings (NM) around own position. Added at runtime after icons load (below 'dots').
 * NB: metres/pixel uses 40075016.686/(512·2^z) exactly as v33 did (see ARCHITECTURE.md caveats).
 */
import { registerFeature } from '../core/registry.js?v=34';
import { state } from '../core/state.js?v=34';
import { FONTS, RINGS } from '../config.js?v=34';
import { metersPerPixel } from '../core/geo.js?v=34';

let map = null;
const FONT_I = FONTS.italic, FONT_OLD = FONTS.old;

/** Ring spacing (NM) so that at most RINGS.maxPerHalf rings fit in half the screen. @param {number} halfNm */
export function ringStep(halfNm){for(const s of RINGS.stepsNm)if(halfNm/s<=RINGS.maxPerHalf)return s;return RINGS.fallbackNm}

/** Recompute rings for the current position and zoom. */
export function updateRings(){const me=state.me;if(!me||!map||!map.getSource('meRings'))return;const c=map.getCanvas(),half=Math.min(c.clientWidth,c.clientHeight)/2;
  const mpp=metersPerPixel(me[0],map.getZoom()),halfNm=half*mpp/1852*RINGS.reach,st=ringStep(halfNm),F=[];
  for(let k=1;k<=RINGS.max&&k*st<=halfNm;k++){const r=k*st*1852,co=[];for(let i=0;i<=RINGS.segments;i++){const a=i/RINGS.segments*2*Math.PI;co.push([me[1]+r*Math.sin(a)/(111320*Math.cos(me[0]*Math.PI/180)),me[0]+r*Math.cos(a)/110540])}
    const v=+(k*st).toFixed(2);F.push({type:'Feature',geometry:{type:'LineString',coordinates:co},properties:{}},{type:'Feature',geometry:{type:'Point',coordinates:[me[1],me[0]+r/110540]},properties:{l:v+' NM'}})}
  map.getSource('meRings').setData({type:'FeatureCollection',features:F})}

/** Add the rings source/layers (idempotent). @param {any} m */
export function initRings(m){map=m;if(map.getSource('meRings'))return;map.addSource('meRings',{type:'geojson',data:{type:'FeatureCollection',features:[]}});const before=map.getLayer('dots')?'dots':undefined;
  map.addLayer({id:'meRing',type:'line',source:'meRings',filter:['==',['geometry-type'],'LineString'],paint:{'line-color':'#ffffff','line-width':1.1,'line-opacity':.8,'line-dasharray':[4,3]}},before);
  map.addLayer({id:'meRingLbl',type:'symbol',source:'meRings',filter:['==',['geometry-type'],'Point'],layout:{'text-field':['get','l'],'text-font':FONT_I,'text-size':11,'text-allow-overlap':true,'text-ignore-placement':true},paint:{'text-color':'#ffffff','text-halo-color':'rgba(0,0,0,.75)','text-halo-width':1.6}},before)}

/** Hook zoom/resize redraws (call once at startup). @param {any} m */
export function watchRings(m){map=m;map.on('zoomend',updateRings);map.on('resize',updateRings)}

registerFeature({
  id: 'rangeRings',
  applyTheme(map, on) {
    if(map.getLayer('meRing')){map.setPaintProperty('meRing','line-color',on?'#7a3b2a':'#ffffff');map.setLayoutProperty('meRingLbl','text-font',on?FONT_OLD:FONT_I);map.setPaintProperty('meRingLbl','text-color',on?'#5a2d1e':'#ffffff');map.setPaintProperty('meRingLbl','text-halo-color',on?'#e9dcc0':'rgba(0,0,0,.75)')}
  },
});
