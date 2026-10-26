/**
 * @file Destination, routing (OSRM), route panel and step list.
 * A destination is set by search, right-click or long-press ("Dropped pin"; suppressed while the editor is editing).
 */
import { URLS, NAV, LOCATION } from '../config.js?v=35';
import { state } from '../core/state.js?v=35';
import { $ } from '../core/dom.js?v=35';
import { toast } from '../ui/toast.js?v=35';
import { startWatch } from '../location/boat.js?v=35';
import { fmtDist, fmtTime } from './format.js?v=35';
import { instr } from './instructions.js?v=35';

const ROUTERS = URLS.routers;
const EMPTY = { type: 'FeatureCollection', features: [] };
const MODE_NAME = { driving: 'car', cycling: 'bike', foot: 'walking' };
/** Route state shared with navigation.js. */
export const rt = { dest: null, destMarker: null, route: null, mode: 'driving', curStep: 0, announced: {} };
let map = null;
/** Called by "Clear" (set by navigation.js to stop guidance). */
export const hooks = { stopNav: () => {} };

const setRouteData=fc=>map.getSource('route')&&map.getSource('route').setData(fc);
function showPanel(){$('#panel').hidden=false;document.body.classList.add('has-panel')}

/**
 * Set the destination and route to it from the own position (starts GPS if needed).
 * @param {[number, number]} ll [lat, lon] @param {string} name
 */
export function setDest(ll,name){const map_=map;
  const dest=rt.dest=ll;dest.name=name;
  if(rt.destMarker)rt.destMarker.remove();
  const el=document.createElement('div');el.className='dest';el.textContent='📍';
  rt.destMarker=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([ll[1],ll[0]]).setPopup(new maplibregl.Popup({offset:28}).setText(name)).addTo(map_);
  if(!state.me){toast('Getting your location…');startWatch();
    const t=setInterval(()=>{if(state.me){clearInterval(t);getRoute(true)}},500);setTimeout(()=>clearInterval(t),20000);
    map_.flyTo({center:[ll[1],ll[0]],zoom:LOCATION.destZoom});showPanel();$('#summary').textContent=name;return}
  getRoute(true);
}

/** Fetch a route for the current mode. @param {boolean} fit zoom to the route */
export async function getRoute(fit){const me=state.me,dest=rt.dest;
  showPanel();$('#summary').textContent='Calculating route…';
  const url=`${ROUTERS[rt.mode]}${me[1]},${me[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson&steps=true`;
  try{const r=await fetch(url);const d=await r.json();
    if(d.code!=='Ok'||!d.routes.length)throw new Error('no route');
    const route=rt.route=d.routes[0];
    const coords=route.geometry.coordinates;route.pts=coords.map(c=>[c[1],c[0]]);
    setRouteData({type:'Feature',geometry:route.geometry,properties:{}});
    if(fit){const b=new maplibregl.LngLatBounds(coords[0],coords[0]);coords.forEach(c=>b.extend(c));
      map.fitBounds(b,{padding:{top:80,left:30,right:30,bottom:220},duration:900})}
    route.stepsAll=route.legs[0].steps;rt.curStep=0;rt.announced={};
    renderSummary();renderSteps();
  }catch(e){$('#summary').textContent='No route found ('+MODE_NAME[rt.mode]+').'}
}
function renderSummary(){const route=rt.route;
  const eta=new Date(Date.now()+route.duration*1000);
  $('#summary').innerHTML=`<b>${fmtTime(route.duration)}</b> · ${fmtDist(route.distance)}<small>Arrive ${eta.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} · </small>`;
  $('#summary small').append(document.createTextNode(rt.dest.name));
}
function renderSteps(){const ol=$('#steps');ol.innerHTML='';
  rt.route.stepsAll.forEach((s,i)=>{const li=document.createElement('li');li.textContent=instr(s)+(s.distance>0?` (${fmtDist(s.distance)})`:'');if(i===rt.curStep)li.className='cur';
    li.onclick=()=>map.flyTo({center:s.maneuver.location,zoom:LOCATION.stepZoom});ol.appendChild(li)})}

/** Drop a pin (right-click / long-press) unless the editor is editing. @param {{lat:number,lng:number}} ll */
function dropPin(ll){if(state.editing)return;setDest([ll.lat,ll.lng],'Dropped pin')}

/** Wire destination gestures, mode buttons and panel. @param {any} m */
export function initRouter(m){map=m;
  map.on('contextmenu',e=>dropPin(e.lngLat));
  {let t=null,start=null;const cancel=()=>{clearTimeout(t);t=null};
    map.on('touchstart',e=>{if(e.originalEvent.touches.length!==1)return cancel();start=e.point;const ll=e.lngLat;
      t=setTimeout(()=>{t=null;if(state.editing)return;if(navigator.vibrate)navigator.vibrate(30);dropPin(ll)},NAV.longPressMs)});
    map.on('touchmove',e=>{if(t&&start&&(Math.abs(e.point.x-start.x)>NAV.longPressMovePx||Math.abs(e.point.y-start.y)>NAV.longPressMovePx))cancel()});
    map.on('touchend',cancel);map.on('touchcancel',cancel);map.on('movestart',e=>{if(e.originalEvent&&e.originalEvent.touches&&e.originalEvent.touches.length>1)cancel()});}
  document.querySelectorAll('#modes button').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('#modes button').forEach(x=>x.classList.remove('on'));b.classList.add('on');rt.mode=b.dataset.mode;if(rt.dest&&state.me)getRoute(true)});
  $('#stepsBtn').onclick=()=>$('#steps').hidden=!$('#steps').hidden;
  $('#clearBtn').onclick=()=>{hooks.stopNav();rt.dest=null;rt.route=null;if(rt.destMarker)rt.destMarker.remove();rt.destMarker=null;setRouteData(EMPTY);$('#panel').hidden=true;document.body.classList.remove('has-panel')};
}
