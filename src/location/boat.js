/**
 * @file Own position: GPS watch, compass heading, the dot/boat marker with accuracy circle, locate button and follow mode.
 * Emits 'tracking' {on} when the GPS watch starts, 'fix' (raw fix, before the marker moves: the
 * motion tracker sets COG/heading from it) and 'position' after every fix (navigation listens).
 * While moving (state.moving) the marker follows COG (location/motion.js), else the compass.
 */
import { state } from '../core/state.js?v=35';
import { $ } from '../core/dom.js?v=35';
import { emit } from '../core/events.js?v=35';
import { toast } from '../ui/toast.js?v=35';
import { metersPerPixel } from '../core/geo.js?v=35';
import { LOCATION } from '../config.js?v=35';

let map = null, meMarker = null, watchId = null;
const meEl=document.createElement('div');meEl.className='me';meEl.innerHTML='<div class="acc"></div><div class="dot"></div><svg class="boat" hidden viewBox="0 0 22 32" width="22" height="32"><path d="M11 1.5C15.5 6.5 17.5 12.5 17.5 18.5V27.5Q11 31 4.5 27.5V18.5C4.5 12.5 6.5 6.5 11 1.5Z" fill="#1a73e8" stroke="#fff" stroke-width="2"/><path d="M11 8v15" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".85"/></svg>';

function updateMe(acc){const heading=state.heading;
  const b=meEl.querySelector('.boat'),dt=meEl.querySelector('.dot');b.style.display=heading==null?'none':'block';dt.style.display=heading!=null?'none':'';if(heading!=null&&meMarker)meMarker.setRotation(heading);
  if(acc!=null){const mpp=metersPerPixel(state.me[0],map.getZoom());const px=Math.min(LOCATION.maxAccuracyPx,acc/mpp);meEl.querySelector('.acc').style.cssText=`width:${px*2}px;height:${px*2}px`;meEl._acc=acc}
}
function onPos(p){
  const me=state.me=[p.coords.latitude,p.coords.longitude];
  const c = p.coords;
  emit('fix', {
    lat: c.latitude, lon: c.longitude, t: p.timestamp || Date.now(),
    speed: c.speed, heading: c.heading, accuracy: c.accuracy,
  });
  if(!meMarker){meMarker=new maplibregl.Marker({element:meEl,rotationAlignment:'map'}).setLngLat([me[1],me[0]]).addTo(map);map.jumpTo({center:[me[1],me[0]],zoom:LOCATION.jumpZoom})}
  else meMarker.setLngLat([me[1],me[0]]);
  updateMe();
  updateMe(p.coords.accuracy);
  if(state.follow)map.easeTo({center:[me[1],me[0]],duration:800,easing:t=>t});
  emit('position',me);
}
/** Start the GPS watch (idempotent). */
export function startWatch(){
  if(!('geolocation' in navigator)){toast('This device does not support geolocation');return}
  if(!isSecureContext)toast('Geolocation requires HTTPS',4000);
  if(watchId!=null)return;
  watchId=navigator.geolocation.watchPosition(onPos,e=>toast(e.code===1?'Location access denied':'Location unavailable'),{enableHighAccuracy:true,maximumAge:2000,timeout:20000});
  emit('tracking', { on: true });
}
function onOrient(e){const h=e.webkitCompassHeading!=null?e.webkitCompassHeading:(e.absolute&&e.alpha!=null?360-e.alpha:null);if(h!=null&&!state.moving){state.heading=h;if(meMarker)updateMe()}}
/** Start compass heading (asks permission on iOS). */
export async function startCompass(){
  try{if(typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission){if(await DeviceOrientationEvent.requestPermission()!=='granted')return}
  window.addEventListener('deviceorientationabsolute',onOrient);window.addEventListener('deviceorientation',onOrient)}catch(e){/* no compass */}
}
/** Wire locate button, follow mode and accuracy redraw. @param {any} m */
export function initLocation(m){map=m;
  map.on('zoom',()=>{if(meMarker&&meEl._acc)updateMe(meEl._acc)});
  $('#locBtn').onclick=()=>{startWatch();startCompass();state.follow=true;$('#locBtn').classList.add('on');const me=state.me;if(me)map.easeTo({center:[me[1],me[0]],zoom:Math.max(map.getZoom(),LOCATION.followZoom)})};
  map.on('dragstart',()=>{state.follow=false;$('#locBtn').classList.remove('on')});
}
