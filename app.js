'use strict';
const APP_VERSION='v11';
// On-screen error reporter: makes iPhone JS errors visible
(function(){const show=m=>{try{let e=document.getElementById('errToast');if(!e){e=document.createElement('div');e.id='errToast';e.style.cssText='position:fixed;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom) + 90px);z-index:3000;background:#b71c1c;color:#fff;font:12px system-ui;padding:8px 10px;border-radius:8px;white-space:pre-wrap;word-break:break-word';e.onclick=()=>e.remove();document.body.appendChild(e)}e.textContent='⚠ '+m;clearTimeout(show.t);show.t=setTimeout(()=>e.remove(),12000)}catch(_){}};
  window.onerror=(msg,src,l,c,err)=>{show(msg+' ('+String(src||'').split('/').pop()+':'+l+':'+c+')')};
  window.addEventListener('unhandledrejection',e=>show('Promise: '+(e.reason&&(e.reason.message||e.reason))));window.__showErr=show})();
const $=s=>document.querySelector(s);
const qs=new URLSearchParams(location.search);
// ---------- sources ----------
const ESRI='https://server.arcgisonline.com/ArcGIS/rest/services/';
const OSM_ATT='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const EMOD='https://ows.emodnet-bathymetry.eu/wms';
const EMOD_ATT='Bathymetry © <a href="https://emodnet.ec.europa.eu/en/bathymetry">EMODnet Bathymetry</a>';
const wms=l=>[`${EMOD}?service=WMS&request=GetMap&version=1.1.1&layers=${l}&styles=&format=image/png&transparent=true&srs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}`];
const raster=(tiles,att,extra={})=>Object.assign({type:'raster',tiles,tileSize:256,attribution:att},extra);
const FONT_R=['Noto Sans Regular'],FONT_B=['Noto Sans Bold'],FONT_I=['Noto Sans Italic'];
// English-first names everywhere; local name only as last resort
const NAME_EN=['coalesce',['get','name:en'],['get','name_en'],['get','name:latin'],['get','name_int'],['get','name']];
const OLD_INK='#6b4a2b',FONT_OLD=['IM Fell Italic'];
const HALO={'text-halo-color':'rgba(0,0,0,.75)','text-halo-width':1.6,'text-halo-blur':.4};
const style={version:8,glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources:{
    sat:raster([ESRI+'World_Imagery/MapServer/tile/{z}/{y}/{x}'],'Imagery © Esri, Maxar, Earthstar Geographics & GIS User Community',{maxzoom:18}),
    omt:{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'Labels © <a href="https://openfreemap.org">OpenFreeMap</a> '+OSM_ATT},
    topo:raster([ESRI+'World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],'© Esri & data providers',{maxzoom:19}),
    osm:raster(['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],OSM_ATT,{maxzoom:19}),
    depth:raster(wms('emodnet:mean_multicolour'),EMOD_ATT),
    contours:raster(wms('emodnet:contours'),EMOD_ATT),
    osmSea:raster(['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],'Seamarks © <a href="https://www.openseamap.org">OpenSeaMap</a>',{maxzoom:18}),
    route:{type:'geojson',data:{type:'FeatureCollection',features:[]}},
    marks:{type:'geojson',data:{type:'FeatureCollection',features:[]},attribution:'Seamarks '+OSM_ATT}
  },
  layers:[
    {id:'bg',type:'background',paint:{'background-color':'#dfe6ea'}},
    {id:'sat',type:'raster',source:'sat'},
    {id:'topo',type:'raster',source:'topo',layout:{visibility:'none'}},
    {id:'osm',type:'raster',source:'osm',layout:{visibility:'none'}},
    {id:'old_bg',type:'background',layout:{visibility:'none'},paint:{'background-color':'#e9dcc0'}},
    {id:'old_land',type:'fill',source:'omt','source-layer':'landcover',layout:{visibility:'none'},paint:{'fill-color':'#dccca5','fill-opacity':.35}},
    {id:'old_water',type:'fill',source:'omt','source-layer':'water',layout:{visibility:'none'},paint:{'fill-color':'#b9cfc9'}},
    ...[[4,.45],[9,.28],[15,.16]].map(([o,op],i)=>({id:'old_rip'+i,type:'line',source:'omt','source-layer':'water',layout:{visibility:'none'},paint:{'line-color':OLD_INK,'line-width':.6,'line-blur':.4,'line-opacity':op,'line-offset':o}})),
    {id:'old_coast',type:'line',source:'omt','source-layer':'water',layout:{visibility:'none'},paint:{'line-color':OLD_INK,'line-width':1.3}},
    {id:'old_bld',type:'fill',source:'omt','source-layer':'building',layout:{visibility:'none'},paint:{'fill-color':'#8a6a45','fill-opacity':.18}},
    {id:'old_roads',type:'line',source:'omt','source-layer':'transportation',filter:['!=',['get','class'],'ferry'],layout:{visibility:'none'},paint:{'line-color':OLD_INK,'line-opacity':.7,'line-width':['match',['get','class'],['motorway','trunk','primary'],1.2,['secondary','tertiary'],.8,.4]}},
    {id:'old_ferry',type:'line',source:'omt','source-layer':'transportation',filter:['==',['get','class'],'ferry'],layout:{visibility:'none'},paint:{'line-color':OLD_INK,'line-width':.8,'line-dasharray':[4,3],'line-opacity':.6}},
    {id:'depth',type:'raster',source:'depth',paint:{'raster-opacity':.6},layout:{visibility:'none'}},
    {id:'contours',type:'raster',source:'contours',paint:{'raster-opacity':.8},layout:{visibility:'none'}},
    {id:'osmSea',type:'raster',source:'osmSea',layout:{visibility:'none'}},
    {id:'routeCasing',type:'line',source:'route',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fff','line-width':['interpolate',['linear'],['zoom'],10,6,18,14],'line-opacity':.9}},
    {id:'route',type:'line',source:'route',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#1a73e8','line-width':['interpolate',['linear'],['zoom'],10,4,18,10]}},
    {id:'marks',type:'symbol',source:'marks',minzoom:11,layout:{'icon-image':['get','icon'],'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-anchor':'center',
      'symbol-sort-key':['get','prio'],
      'icon-size':['interpolate',['linear'],['zoom'],11,0.45,14,0.7,17,1]}},
    {id:'lblWater',type:'symbol',source:'omt','source-layer':'water_name',layout:{'text-field':NAME_EN,'text-font':FONT_I,'text-size':['interpolate',['linear'],['zoom'],5,11,12,14],'text-max-width':8,'symbol-placement':'point'},paint:Object.assign({'text-color':'#bfe6ff'},HALO)},
    {id:'lblIsland',type:'symbol',source:'omt','source-layer':'place',filter:['in',['get','class'],['literal',['island','islet']]],minzoom:8,layout:{'text-field':NAME_EN,'text-font':FONT_I,'text-size':12},paint:Object.assign({'text-color':'#fff5d6'},HALO)},
    {id:'lblPlace',type:'symbol',source:'omt','source-layer':'place',filter:['in',['get','class'],['literal',['city','town','village','hamlet','suburb','neighbourhood']]],
      layout:{'text-field':NAME_EN,'text-font':['match',['get','class'],['city','town'],['literal',FONT_B],['literal',FONT_R]],
        'text-size':['match',['get','class'],'city',16,'town',14,'village',12.5,11],'text-max-width':8,'symbol-sort-key':['match',['get','class'],'city',0,'town',1,'village',2,3]},
      paint:Object.assign({'text-color':'#ffffff'},HALO)}
  ]};
const BASES={sat:{label:'Satellite (Esri)',layers:['sat']},topo:{label:'Topo map (Esri)',layers:['topo']},osm:{label:'OpenStreetMap (streets)',layers:['osm']},old:{label:'Old chart',layers:['old_bg','old_land','old_water','old_rip0','old_rip1','old_rip2','old_coast','old_bld','old_roads','old_ferry']}};
const INIT_BASE=BASES[qs.get('base')]?qs.get('base'):'sat';
const OVERLAYS={marks:{label:'Seamarks',on:true},labels:{label:'Place & water labels',on:true,layers:['lblWater','lblIsland','lblPlace']},depth:{label:'Depth (EMODnet)'},contours:{label:'Contours (EMODnet)'},osmSea:{label:'OpenSeaMap (legacy raster)'}};

const map=new maplibregl.Map({container:'map',style,
  center:[+(qs.get('lon')||23.3219),+(qs.get('lat')||42.6977)],zoom:+(qs.get('z')||13),
  maxZoom:20,dragRotate:true,pitchWithRotate:false,touchPitch:false,fadeDuration:150,
  attributionControl:false,maxTileCacheSize:400,
  transformRequest:u=>{const m=/\/fonts\/(IM%20Fell%20Italic|IM Fell Italic)\/(\d+-\d+)\.pbf/.exec(u);return m?{url:new URL('glyphs/IM%20Fell%20Italic/'+m[2]+'.pbf?v=11',location.href).href}:{url:u}},refreshExpiredTiles:false});
map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-left');
map.addControl(new maplibregl.NavigationControl({showZoom:false,visualizePitch:false}),'top-right'); // compass: tap to reset north
map.touchZoomRotate.enableRotation();

// ---------- old chart theme ----------
const LBL_ORIG={};
function setOldTheme(on){
  document.body.classList.toggle('oldchart',on);
  for(const id of ['lblWater','lblIsland','lblPlace']){
    if(!LBL_ORIG[id])LBL_ORIG[id]={font:map.getLayoutProperty(id,'text-font'),color:map.getPaintProperty(id,'text-color'),hc:map.getPaintProperty(id,'text-halo-color'),hw:map.getPaintProperty(id,'text-halo-width'),hb:map.getPaintProperty(id,'text-halo-blur')};
    const o=LBL_ORIG[id],w=id==='lblWater';
    map.setLayoutProperty(id,'text-font',on?FONT_OLD:o.font);
    map.setPaintProperty(id,'text-color',on?(w?'#3f5f5c':'#4a3018'):o.color);
    map.setPaintProperty(id,'text-halo-color',on?(w?'#b9cfc9':'#e9dcc0'):o.hc);
    map.setPaintProperty(id,'text-halo-width',on?1.5:o.hw);map.setPaintProperty(id,'text-halo-blur',on?0:o.hb);}
}
(function(){const d=document.createElement('div');d.id='oldDecor';d.innerHTML=`<svg class="paper" width="100%" height="100%"><filter id="opn"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .45 0 0 0 0 .33 0 0 0 0 .18 0 0 0 .55 0"/></filter><filter id="opb"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .35 0 0 0 0 .15 0 0 0 .5 -.1"/></filter><rect width="100%" height="100%" filter="url(#opn)"/><rect width="100%" height="100%" filter="url(#opb)"/></svg><div class="vig"></div>
<svg class="rose" viewBox="-110 -115 220 225" fill="none" stroke="#5a3d1e"><circle r="92" stroke-width="1.2"/><circle r="86" stroke-width=".6"/><circle r="60" stroke-width=".5" stroke-dasharray="2 3"/><g stroke-width=".4" opacity=".6"><path d="M0-86V86M-86 0H86M-61-61L61 61M61-61L-61 61"/></g><g stroke-width=".8"><path d="M0-50L9-9 50 0 9 9 0 50-9 9-50 0-9-9Z" fill="#e9dcc0" transform="rotate(45) scale(.7)"/><path d="M0-80L12-12 80 0 12 12 0 80-12 12-80 0-12-12Z" fill="#efe4cb"/><path d="M0-80L12-12 0 0ZM80 0L12 12 0 0ZM0 80L-12 12 0 0ZM-80 0L-12-12 0 0Z" fill="#7a5530"/></g><circle r="4" fill="#9b3b26" stroke="none"/><path d="M-6-90L0-100 6-90" fill="#9b3b26" stroke="none"/><text y="-102" fill="#5a3d1e" stroke="none" font-family="Georgia,serif" font-style="italic" font-size="16" text-anchor="middle">N</text></svg>`;
  document.getElementById('map').after(d);
  const r=d.querySelector('.rose');map.on('rotate',()=>r.style.transform=`rotate(${-map.getBearing()}deg)`);})();
// ---------- layer switcher ----------
(function(){
  const box=document.createElement('div');box.id='layers';
  box.innerHTML='<button id="layersBtn" title="Layers">🗺</button><div id="layersMenu" hidden><b>Base map</b></div>';
  document.body.appendChild(box);const menu=box.querySelector('#layersMenu');
  for(const[k,b]of Object.entries(BASES)){const l=document.createElement('label');l.innerHTML=`<input type="radio" name="base" value="${k}"${k===INIT_BASE?' checked':''}> ${b.label}`;
    l.querySelector('input').onchange=()=>{for(const[k2,b2]of Object.entries(BASES))b2.layers.forEach(id=>map.setLayoutProperty(id,'visibility',k2===k?'visible':'none'));setOldTheme(k==='old')};menu.appendChild(l)}
  menu.insertAdjacentHTML('beforeend','<b>Overlays</b>');
  for(const[k,o]of Object.entries(OVERLAYS)){const l=document.createElement('label');l.innerHTML=`<input type="checkbox"${o.on?' checked':''}> ${o.label}`;
    l.querySelector('input').onchange=e=>{o.on=e.target.checked;(o.layers||[k]).forEach(id=>map.setLayoutProperty(id,'visibility',o.on?'visible':'none'));if(k==='marks'){if(o.on){setStatus(map.getZoom()<MARK_MINZ?'Zoom in to see seamarks':'Loading seamarks…',map.getZoom()<MARK_MINZ?4000:0);loadMarks()}else setStatus('')}};menu.appendChild(l)}
  box.querySelector('#layersBtn').onclick=()=>menu.hidden=!menu.hidden;
  map.on('mousedown',()=>menu.hidden=true);map.on('touchstart',()=>menu.hidden=true);
})();

// Routing servers: public OSRM demo (car only). Bike/foot via FOSSGIS OSRM instances.
const ROUTERS={driving:'https://router.project-osrm.org/route/v1/driving/',
  cycling:'https://routing.openstreetmap.de/routed-bike/route/v1/driving/',
  foot:'https://routing.openstreetmap.de/routed-foot/route/v1/driving/'};


let me=null,meMarker=null,heading=null,watchId=null,follow=false;
let dest=null,destMarker=null,route=null,mode='driving';
let navigating=false,voice=false,curStep=0,announced={},lastReroute=0;
const setRouteData=fc=>map.getSource('route')&&map.getSource('route').setData(fc);
const EMPTY={type:'FeatureCollection',features:[]};

function toast(t,ms=2500){const e=$('#toast');e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,ms)}
function fmtDist(m){return m>=1000?(m/1000).toFixed(m>=10000?0:1)+' km':Math.round(m/10)*10+' m'}
function fmtTime(s){const h=Math.floor(s/3600),m=Math.round(s%3600/60);return h?`${h} h ${m} min`:`${Math.max(1,m)} min`}
function hav(a,b){const R=6371e3,r=Math.PI/180,dl=(b[0]-a[0])*r,dn=(b[1]-a[1])*r;const x=Math.sin(dl/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))}


// ---------- location ----------
const meEl=document.createElement('div');meEl.className='me';meEl.innerHTML='<div class="acc"></div><div class="h" hidden></div><div class="dot"></div>';
function updateMe(acc){
  const h=meEl.querySelector('.h');h.hidden=heading==null;if(heading!=null)h.style.transform=`rotate(${heading}deg)`;
  if(acc!=null){const mpp=40075016.686*Math.cos(me[0]*Math.PI/180)/(512*2**map.getZoom());const px=Math.min(300,acc/mpp);meEl.querySelector('.acc').style.cssText=`width:${px*2}px;height:${px*2}px`;meEl._acc=acc}
}
map.on('zoom',()=>{if(meMarker&&meEl._acc)updateMe(meEl._acc)});
function onPos(p){
  me=[p.coords.latitude,p.coords.longitude];
  if(p.coords.heading!=null&&!isNaN(p.coords.heading)&&p.coords.speed>0.5)heading=p.coords.heading;
  if(!meMarker){meMarker=new maplibregl.Marker({element:meEl,rotationAlignment:'map'}).setLngLat([me[1],me[0]]).addTo(map);map.jumpTo({center:[me[1],me[0]],zoom:16})}
  else meMarker.setLngLat([me[1],me[0]]);
  updateMe(p.coords.accuracy);
  if(follow)map.easeTo({center:[me[1],me[0]],duration:800,easing:t=>t});
  if(navigating)trackProgress();
}
function startWatch(){
  if(!('geolocation' in navigator)){toast('This device does not support geolocation');return}
  if(!isSecureContext)toast('Geolocation requires HTTPS',4000);
  if(watchId==null)watchId=navigator.geolocation.watchPosition(onPos,e=>toast(e.code===1?'Location access denied':'Location unavailable'),{enableHighAccuracy:true,maximumAge:2000,timeout:20000});
}
function onOrient(e){const h=e.webkitCompassHeading!=null?e.webkitCompassHeading:(e.absolute&&e.alpha!=null?360-e.alpha:null);if(h!=null){heading=h;if(meMarker)updateMe()}}
async function startCompass(){
  try{if(typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission){if(await DeviceOrientationEvent.requestPermission()!=='granted')return}
  window.addEventListener('deviceorientationabsolute',onOrient);window.addEventListener('deviceorientation',onOrient)}catch(e){}
}
$('#locBtn').onclick=()=>{startWatch();startCompass();follow=true;$('#locBtn').classList.add('on');if(me)map.easeTo({center:[me[1],me[0]],zoom:Math.max(map.getZoom(),16)})};
map.on('dragstart',()=>{follow=false;$('#locBtn').classList.remove('on')});

// ---------- search (Nominatim: submit only, max 1 req/s) ----------
let lastSearch=0;
$('#searchForm').onsubmit=async e=>{
  e.preventDefault();const q=$('#q').value.trim();if(!q)return;
  const wait=1100-(Date.now()-lastSearch);if(wait>0)await new Promise(r=>setTimeout(r,wait));lastSearch=Date.now();
  $('#q').blur();const ul=$('#results');ul.innerHTML='<li>Searching…</li>';ul.hidden=false;
  const c=map.getCenter();
  const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&accept-language=en&q=${encodeURIComponent(q)}&viewbox=${c.lng-1},${c.lat+1},${c.lng+1},${c.lat-1}`;
  try{const r=await fetch(url);const d=await r.json();ul.innerHTML='';
    if(!d.length){ul.innerHTML='<li>No results found</li>';return}
    d.forEach(x=>{const li=document.createElement('li');const parts=x.display_name.split(', ');
      li.innerHTML=`<b></b><span></span>`;li.querySelector('b').textContent=x.name||parts[0];li.querySelector('span').textContent=parts.slice(1).join(', ');
      li.onclick=()=>{ul.hidden=true;setDest([+x.lat,+x.lon],x.name||parts[0])};ul.appendChild(li)});
  }catch(err){ul.innerHTML='<li>Search failed. Check your connection.</li>'}
};
$('#q').addEventListener('focus',()=>{if($('#results').children.length)$('#results').hidden=false});
map.on('click',()=>$('#results').hidden=true);

// ---------- destination (right-click / long-press) ----------
map.on('contextmenu',e=>setDest([e.lngLat.lat,e.lngLat.lng],'Dropped pin'));
(function longPress(){let t=null,start=null;const cancel=()=>{clearTimeout(t);t=null};
  map.on('touchstart',e=>{if(e.originalEvent.touches.length!==1)return cancel();start=e.point;const ll=e.lngLat;
    t=setTimeout(()=>{t=null;if(navigator.vibrate)navigator.vibrate(30);setDest([ll.lat,ll.lng],'Dropped pin')},600)});
  map.on('touchmove',e=>{if(t&&start&&(Math.abs(e.point.x-start.x)>10||Math.abs(e.point.y-start.y)>10))cancel()});
  map.on('touchend',cancel);map.on('touchcancel',cancel);map.on('movestart',e=>{if(e.originalEvent&&e.originalEvent.touches&&e.originalEvent.touches.length>1)cancel()});
})();
function setDest(ll,name){
  dest=ll;dest.name=name;
  if(destMarker)destMarker.remove();
  const el=document.createElement('div');el.className='dest';el.textContent='📍';
  destMarker=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([ll[1],ll[0]]).setPopup(new maplibregl.Popup({offset:28}).setText(name)).addTo(map);
  if(!me){toast('Getting your location…');startWatch();
    const t=setInterval(()=>{if(me){clearInterval(t);getRoute(true)}},500);setTimeout(()=>clearInterval(t),20000);
    map.flyTo({center:[ll[1],ll[0]],zoom:15});showPanel();$('#summary').textContent=name;return}
  getRoute(true);
}
function showPanel(){$('#panel').hidden=false;document.body.classList.add('has-panel')}
document.querySelectorAll('#modes button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#modes button').forEach(x=>x.classList.remove('on'));b.classList.add('on');mode=b.dataset.mode;if(dest&&me)getRoute(true)});

async function getRoute(fit){
  showPanel();$('#summary').textContent='Calculating route…';
  const url=`${ROUTERS[mode]}${me[1]},${me[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson&steps=true`;
  try{const r=await fetch(url);const d=await r.json();
    if(d.code!=='Ok'||!d.routes.length)throw 0;
    route=d.routes[0];
    const coords=route.geometry.coordinates;route.pts=coords.map(c=>[c[1],c[0]]);
    setRouteData({type:'Feature',geometry:route.geometry,properties:{}});
    if(fit){const b=new maplibregl.LngLatBounds(coords[0],coords[0]);coords.forEach(c=>b.extend(c));
      map.fitBounds(b,{padding:{top:80,left:30,right:30,bottom:220},duration:900})}
    route.stepsAll=route.legs[0].steps;curStep=0;announced={};
    renderSummary();renderSteps();
  }catch(e){$('#summary').textContent='No route found ('+({driving:'car',cycling:'bike',foot:'walking'}[mode])+').'}
}
function renderSummary(){
  const eta=new Date(Date.now()+route.duration*1000);
  $('#summary').innerHTML=`<b>${fmtTime(route.duration)}</b> · ${fmtDist(route.distance)}<small>Arrive ${eta.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} · </small>`;
  $('#summary small').append(document.createTextNode(dest.name));
}
function renderSteps(){const ol=$('#steps');ol.innerHTML='';
  route.stepsAll.forEach((s,i)=>{const li=document.createElement('li');li.textContent=instr(s)+(s.distance>0?` (${fmtDist(s.distance)})`:'');if(i===curStep)li.className='cur';
    li.onclick=()=>map.flyTo({center:s.maneuver.location,zoom:17});ol.appendChild(li)})}
$('#stepsBtn').onclick=()=>$('#steps').hidden=!$('#steps').hidden;
$('#clearBtn').onclick=()=>{stopNav();dest=null;route=null;if(destMarker)destMarker.remove();destMarker=null;setRouteData(EMPTY);$('#panel').hidden=true;document.body.classList.remove('has-panel')};

// ---------- English instructions (from OSRM maneuvers) ----------
const MOD={'uturn':'make a U-turn','sharp right':'sharp right','right':'right','slight right':'slight right','straight':'straight','slight left':'slight left','left':'left','sharp left':'sharp left'};
const ORD=['','1st','2nd','3rd','4th','5th','6th','7th','8th'];
function instr(s){
  const m=s.maneuver,t=m.type,mod=MOD[m.modifier]||'',road=s.name||s.ref||'',on=road?` on ${road}`:'',onto=road?` onto ${road}`:'';
  const turn=m.modifier==='uturn'?'Make a U-turn':m.modifier==='straight'?'Continue straight':`Turn ${mod}`;
  switch(t){
    case 'depart':return `Head out${on}`;
    case 'arrive':return m.modifier&&m.modifier!=='straight'?`You have arrived. Your destination is on the ${m.modifier.includes('left')?'left':'right'}`:'You have arrived at your destination';
    case 'turn':case 'end of road':return turn+onto;
    case 'continue':return m.modifier&&m.modifier!=='straight'?`Continue ${mod}${on}`:`Continue straight${on}`;
    case 'new name':return `Continue${on}`;
    case 'merge':return `Merge ${mod}${onto}`.replace('  ',' ');
    case 'on ramp':return `Take the ramp ${mod}${onto}`.replace('  ',' ');
    case 'off ramp':return `Take the exit ${mod}${onto}`.replace('  ',' ');
    case 'fork':return `At the fork, keep ${mod.replace('slight ','')}${onto}`;
    case 'roundabout':case 'rotary':case 'roundabout turn':
      return m.exit?`At the roundabout, take the ${ORD[m.exit]||m.exit+'th'} exit${onto}`:`Enter the roundabout${onto}`;
    case 'exit roundabout':case 'exit rotary':return `Exit the roundabout${onto}`;
    case 'notification':return `Continue${on}`;
    default:return mod?`${turn}${onto}`:`Continue${on}`;
  }
}


// ---------- navigation / voice ----------
function say(t){if(!voice||!('speechSynthesis' in window))return;const u=new SpeechSynthesisUtterance(t);u.lang='en-GB';
  const v=speechSynthesis.getVoices().find(v=>v.lang&&v.lang.toLowerCase().startsWith('en'));if(v)u.voice=v;speechSynthesis.cancel();speechSynthesis.speak(u)}
$('#voiceBtn').onclick=()=>{voice=!voice;$('#voiceBtn').textContent=voice?'🔊':'🔇';$('#voiceBtn').classList.toggle('on',voice);
  if(voice){say('Voice guidance on');}toast(voice?'Voice guidance on':'Voice guidance off')};
$('#goBtn').onclick=()=>{if(!route)return;if(navigating){stopNav();return}
  navigating=true;follow=true;$('#goBtn').textContent='■ Stop';$('#steps').hidden=false;startWatch();startCompass();
  if(me)map.flyTo({center:[me[1],me[0]],zoom:17});say(instr(route.stepsAll[0]));announced[0]=2};
function stopNav(){navigating=false;$('#goBtn').textContent='▶ Start'}
function trackProgress(){
  if(!route)return;
  let off=Infinity;for(const p of route.pts){const d=hav(me,p);if(d<off)off=d}
  if(off>60&&Date.now()-lastReroute>15000){lastReroute=Date.now();toast('Rerouting…');say('Rerouting');getRoute(false);return}
  const steps=route.stepsAll;
  while(curStep<steps.length-1){const nx=steps[curStep+1].maneuver.location;if(hav(me,[nx[1],nx[0]])<20){curStep++;}else break}
  const nx=steps[Math.min(curStep+1,steps.length-1)],loc=[nx.maneuver.location[1],nx.maneuver.location[0]],d=hav(me,loc),i=curStep+1;
  const far=mode==='driving'?300:100,near=mode==='driving'?50:20;
  if(d<far&&d>near*2&&!announced[i]){announced[i]=1;say(`In ${fmtDist(d)}, ${instr(nx).replace(/^./,c=>c.toLowerCase())}`)}
  else if(d<near&&announced[i]!==2){announced[i]=2;say(instr(nx))}
  if(nx.maneuver.type==='arrive'&&hav(me,[dest[0],dest[1]])<25){stopNav();}
  document.querySelectorAll('#steps li').forEach((li,k)=>li.className=k===curStep?'cur':'');
  const remaining=steps.slice(curStep+1).reduce((a,s)=>a+s.distance,0)+d,ratio=remaining/route.distance;
  $('#summary').innerHTML=`<b>${fmtDist(d)}</b> → ${instr(nx)}<small>${fmtDist(remaining)} left · ~${fmtTime(route.duration*ratio)}</small>`;
}

// ---------- seamarks (Overpass → vector GeoJSON) ----------
const OVERPASS=['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
const MARK_MINZ=11,CELL=0.1,MAX_CELLS=40; // 0.1° grid cache; nearest-to-centre cells first
const cellCache=new Map(),pending=new Set(),markById=new Map();
let markTimer=null,overpassBusy=false,backoffUntil=0,epIdx=0;
const statusEl=document.createElement('div');statusEl.id='mkStatus';statusEl.hidden=true;
// inline styles so the pill is visible even if a stale/old style.css is served
statusEl.style.cssText='position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 64px);z-index:2500;background:rgba(20,30,45,.9);color:#fff;font:600 13px system-ui,sans-serif;padding:6px 12px;border-radius:14px;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.3);max-width:90vw;text-align:center';
document.body.appendChild(statusEl);
{const v=document.createElement('div');v.id='appVer';v.textContent=APP_VERSION;v.style.cssText='position:fixed;left:12px;top:calc(env(safe-area-inset-top) + 64px);z-index:2500;background:rgba(255,255,255,.85);color:#333;font:600 10px system-ui,sans-serif;padding:1px 5px;border-radius:6px;pointer-events:none';document.body.appendChild(v)}
function setStatus(t,ms){statusEl.textContent=t;statusEl.hidden=!t;statusEl.style.display=t?'block':'none';clearTimeout(setStatus.t);if(t&&ms)setStatus.t=setTimeout(()=>{statusEl.hidden=true;statusEl.style.display='none'},ms)}
const svgUrl=s=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);
const COL={red:'#e53935',green:'#2e9d48',yellow:'#f6c400',black:'#1d1d1d',white:'#ffffff',blue:'#1e66d0',orange:'#fb8c00'};
const sh='<filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.3" flood-opacity=".55"/></filter>';
const wrap=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
// buoy: rounded pillar with optional horizontal bands + topmark
function buoySvg(bands,top=''){const W=36,H=48,x=11,y=14,w=14,h=26;const bh=h/bands.length;
  const strips=bands.map((c,i)=>`<rect x="${x}" y="${y+i*bh}" width="${w}" height="${bh+.3}" fill="${c}"/>`).join('');
  return wrap(W,H,`<clipPath id="c"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/></clipPath><g clip-path="url(#c)">${strips}</g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="none" stroke="#fff" stroke-width="2"/><ellipse cx="18" cy="${y+h+3}" rx="9" ry="2.4" fill="#fff" opacity=".85"/>${top}`)}
const tri=(up,c='#1d1d1d',cy=7)=>up?`<path d="M18 ${cy-5}l5 8h-10z" fill="${c}" stroke="#fff" stroke-width="1.2"/>`:`<path d="M18 ${cy+3}l5-8h-10z" fill="${c}" stroke="#fff" stroke-width="1.2"/>`;
const CARD={north:{b:['#1d1d1d','#f6c400'],t:tri(1,'#1d1d1d',5)+tri(1,'#1d1d1d',11)},south:{b:['#f6c400','#1d1d1d'],t:tri(0,'#1d1d1d',3)+tri(0,'#1d1d1d',9)},
  east:{b:['#1d1d1d','#f6c400','#1d1d1d'],t:tri(1,'#1d1d1d',4)+tri(0,'#1d1d1d',10)},west:{b:['#f6c400','#1d1d1d','#f6c400'],t:tri(0,'#1d1d1d',2)+tri(1,'#1d1d1d',12)}};
const badge=(fill,inner)=>wrap(40,40,`<circle cx="20" cy="20" r="15" fill="${fill}" stroke="#fff" stroke-width="2.5"/>${inner}`);
const ICONS={
  lat_red:buoySvg([COL.red],'<rect x="14" y="4" width="8" height="8" fill="#e53935" stroke="#fff" stroke-width="1.2"/>'),
  lat_green:buoySvg([COL.green],tri(1,COL.green,8)),
  lat_redgreen:buoySvg([COL.red,COL.green,COL.red]),lat_greenred:buoySvg([COL.green,COL.red,COL.green]),
  card_north:buoySvg(CARD.north.b,CARD.north.t),card_south:buoySvg(CARD.south.b,CARD.south.t),
  card_east:buoySvg(CARD.east.b,CARD.east.t),card_west:buoySvg(CARD.west.b,CARD.west.t),
  isolated:buoySvg([COL.black,COL.red,COL.black],'<circle cx="18" cy="4.5" r="3" fill="#1d1d1d" stroke="#fff"/><circle cx="18" cy="11" r="3" fill="#1d1d1d" stroke="#fff"/>'),
  safe:buoySvg([COL.red,COL.white,COL.red,COL.white],'<circle cx="18" cy="8" r="4" fill="#e53935" stroke="#fff"/>'),
  special:buoySvg([COL.yellow],'<path d="M14 5l8 8M22 5l-8 8" stroke="#f6c400" stroke-width="3"/>'),
  beacon:wrap(36,48,'<rect x="16" y="10" width="4" height="30" fill="#555" stroke="#fff"/><circle cx="18" cy="10" r="5" fill="#888" stroke="#fff" stroke-width="1.5"/>'),
  light:wrap(40,40,'<path d="M20 3l4.2 11.8L37 20l-12.8 5.2L20 37l-4.2-11.8L3 20l12.8-5.2z" fill="#ffd54f" stroke="#e65100" stroke-width="1.6"/><circle cx="20" cy="20" r="4" fill="#fff"/>'),
  light_major:wrap(48,48,'<g fill="#ff9800" opacity=".35"><circle cx="24" cy="24" r="21"/></g><path d="M24 2l5.5 16.5L46 24l-16.5 5.5L24 46l-5.5-16.5L2 24l16.5-5.5z" fill="#ffca28" stroke="#d84315" stroke-width="1.8"/><circle cx="24" cy="24" r="5" fill="#fff"/>'),
  harbour:badge('#1565c0','<path d="M20 10v19M15 14h10M12 22c1 5 4 7 8 7s7-2 8-7" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="20" cy="10" r="2.3" fill="none" stroke="#fff" stroke-width="2"/>'),
  marina:badge('#0277bd','<path d="M21 9v17h-9z" fill="#fff"/><path d="M23 12v14h6z" fill="#fff" opacity=".85"/><path d="M11 28h18l-2 3H13z" fill="#fff"/>'),
  anchorage:badge('#6a1b9a','<path d="M20 10v19M15 14h10M12 22c1 5 4 7 8 7s7-2 8-7" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="20" cy="10" r="2.3" fill="none" stroke="#fff" stroke-width="2"/>'),
  mooring:wrap(30,30,'<circle cx="15" cy="15" r="9" fill="#ffffff" stroke="#1565c0" stroke-width="3"/><circle cx="15" cy="15" r="3" fill="#1565c0"/>'),
  fuel:badge('#2e7d32','<rect x="13" y="11" width="10" height="18" rx="1.5" fill="#fff"/><rect x="15" y="13" width="6" height="5" fill="#2e7d32"/><path d="M23 15h3v10a1.6 1.6 0 003.2 0V16l-3-3" stroke="#fff" stroke-width="2" fill="none"/>'),
  danger:wrap(36,36,'<path d="M18 3l15 15-15 15L3 18z" fill="#fff" stroke="#c62828" stroke-width="2.5"/><path d="M11 18h14M18 11v14" stroke="#c62828" stroke-width="3"/>'),
  wreck:wrap(40,30,'<path d="M4 15h32M12 9v12M20 6v18M28 9v12" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M4 15h32M12 9v12M20 6v18M28 9v12" stroke="#c62828" stroke-width="2.6" stroke-linecap="round"/>'),
};
// iOS Safari: SVG data-URL images with <filter> rendered to canvas silently fail/taint (getImageData throws) and the
// old code swallowed the error, so no icon was ever registered. Now: filter-free SVG with explicit size, decode(),
// shadow drawn by canvas, HTMLImageElement fallback, and a 'styleimagemissing' safety net.
function addIcon(k,img){const r=2,w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
  try{const c=document.createElement('canvas');c.width=w*r;c.height=h*r;const x=c.getContext('2d');
    x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=3*r;x.shadowOffsetY=1.2*r;x.drawImage(img,0,0,c.width,c.height);
    const d=x.getImageData(0,0,c.width,c.height);if(!map.hasImage(k))map.addImage(k,{width:c.width,height:c.height,data:new Uint8Array(d.data.buffer)},{pixelRatio:r});return true}
  catch(e){console.warn('icon canvas failed',k,e)}
  try{if(!map.hasImage(k))map.addImage(k,img);return true}catch(e){console.warn('icon add failed',k,e);return false}}
function loadIcons(){return Promise.all(Object.entries(ICONS).map(([k,s])=>new Promise(res=>{
  const m=s.match(/width="(\d+)" height="(\d+)"/);const img=new Image(+m[1],+m[2]);
  let fin=false;const done=()=>{if(fin)return;fin=true;try{addIcon(k,img)}catch(e){console.warn(e)}res()};
  img.onerror=()=>{if(!fin){fin=true;console.warn('icon load failed',k);res()}};img.onload=done;
  img.src=svgUrl(s);if(img.decode)img.decode().then(done,()=>{});setTimeout(()=>{if(img.complete&&img.naturalWidth)done();else if(!fin){fin=true;res()}},3000);})))}
map.on('styleimagemissing',e=>{if(ICONS[e.id]||map.hasImage(e.id))return;const n=16,d=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const q=(y*n+x)*4,r=Math.hypot(x-7.5,y-7.5);if(r<7){const edge=r>5;d[q]=edge?255:30;d[q+1]=edge?255:102;d[q+2]=edge?255:208;d[q+3]=255}}
  map.addImage(e.id,{width:n,height:n,data:d})});

const TYPE_BG={buoy_lateral:'Lateral buoy',buoy_cardinal:'Cardinal buoy',buoy_isolated_danger:'Isolated danger buoy',buoy_safe_water:'Safe water buoy',buoy_special_purpose:'Special purpose buoy',
  beacon_lateral:'Lateral beacon',beacon_cardinal:'Cardinal beacon',beacon_isolated_danger:'Isolated danger beacon',beacon_safe_water:'Safe water beacon',beacon_special_purpose:'Special purpose beacon',
  light_major:'Lighthouse',light_minor:'Navigation light',harbour:'Harbour',anchorage:'Anchorage',mooring:'Mooring',rock:'Rock',wreck:'Wreck',obstruction:'Obstruction',marina:'Marina',fuel:'Fuel station'};
const COL_BG={red:'red',green:'green',white:'white',yellow:'yellow',blue:'blue',orange:'orange',violet:'violet',black:'black'};
const CAT_BG={north:'north',south:'south',east:'east',west:'west',port:'port',starboard:'starboard'};
function classify(t){
  const st=t['seamark:type']||'';
  if(t.leisure==='marina'||st==='harbour'&&/marina/.test(t['seamark:harbour:category']||''))return['marina',TYPE_BG.marina,5];
  if(t.waterway==='fuel'||/fuel/.test(t['seamark:small_craft_facility:category']||''))return['fuel',TYPE_BG.fuel,5];
  if(st==='harbour')return['harbour',TYPE_BG.harbour,4];
  if(st==='anchorage')return['anchorage',TYPE_BG.anchorage,4];
  if(st==='mooring')return['mooring',TYPE_BG.mooring,1];
  if(st==='light_major')return['light_major',TYPE_BG.light_major,9];
  if(st==='light_minor')return['light',TYPE_BG.light_minor,6];
  if(st==='wreck')return['wreck',TYPE_BG.wreck,3];
  if(st==='rock'||st==='obstruction')return['danger',TYPE_BG[st],3];
  const m=st.match(/^(buoy|beacon)_(.*)$/);if(!m)return null;
  const kind=m[2],p=t[`seamark:${st}:colour`]||'';
  const cat=t[`seamark:${st}:category`]||'';
  const name=TYPE_BG[st]||'Seamark';
  if(kind==='lateral'){const c=p.split(';');
    if(c.length>1)return[c[0]==='green'?'lat_greenred':'lat_redgreen',name,7];
    if(p==='green'||(!p&&/starboard/.test(cat)))return['lat_green',name,7];
    if(p==='red'||(!p&&/port/.test(cat)))return['lat_red',name,7];
    return['lat_red',name,7]}
  if(kind==='cardinal')return['card_'+(['north','south','east','west'].includes(cat)?cat:'north'),name,8];
  if(kind==='isolated_danger')return['isolated',name,8];
  if(kind==='safe_water')return['safe',name,7];
  if(kind==='special_purpose')return['special',name,5];
  return['beacon',name,4];
}
function lightText(t){
  // seamark:light:character / seamark:light:1:character ...
  const out=[];const pref=Object.keys(t).filter(k=>/^seamark:light(:\d+)?:(character|colour|period)$/.test(k)).map(k=>k.replace(/:(character|colour|period)$/,''));
  for(const p of [...new Set(pref)].sort()){const ch=t[p+':character'],co=t[p+':colour'],pe=t[p+':period'],gr=t[p+':group'];
    const cs=co?co.split(';').map(c=>COL_BG[c]||c).join('/'):'';
    out.push([ch?ch+(gr?`(${gr})`:''):'',cs,pe?pe+' s':''].filter(Boolean).join(' · '))}
  return out.filter(Boolean)}
function toFeature(e){
  const t=e.tags||{};const c=classify(t);if(!c)return null;
  const lon=e.lon!=null?e.lon:e.center&&e.center.lon,lat=e.lat!=null?e.lat:e.center&&e.center.lat;if(lon==null)return null;
  const id=e.type+e.id;markById.set(id,t);
  return{type:'Feature',id:undefined,geometry:{type:'Point',coordinates:[lon,lat]},properties:{id,icon:c[0],kind:c[1],prio:-c[2]}};
}
function refreshMarks(){const feats=staticFeats?staticFeats.slice():[],seen=new Set();for(const fs of cellCache.values())for(const f of fs){if(!seen.has(f.properties.id)){seen.add(f.properties.id);feats.push(f)}}
  map.getSource('marks').setData({type:'FeatureCollection',features:feats})}
// One Overpass request for the bounding box of all missing cells (was: one heavy regex query per cell, serially).
async function fetchCells(keys){
  const ij=keys.map(k=>k.split('_').map(Number));const i0=Math.min(...ij.map(a=>a[0])),i1=Math.max(...ij.map(a=>a[0]))+1,j0=Math.min(...ij.map(a=>a[1])),j1=Math.max(...ij.map(a=>a[1]))+1;
  const bb=`(${(i0*CELL).toFixed(2)},${(j0*CELL).toFixed(2)},${(i1*CELL).toFixed(2)},${(j1*CELL).toFixed(2)})`;
  const q=`[out:json][timeout:90];(nwr["seamark:type"]${bb};nwr["leisure"="marina"]${bb};nwr["waterway"="fuel"]${bb};);out center tags;`;
  let last;
  for(let a=0;a<OVERPASS.length;a++){const ep=OVERPASS[(epIdx+a)%OVERPASS.length];
    try{const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),95000);
      const r=await fetch(ep,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},signal:ctl.signal}).finally(()=>clearTimeout(to));
      if(!r.ok){last=new Error(r.status===429||r.status===504||r.status===503?'rate':String(r.status));continue}
      const d=await r.json();epIdx=(epIdx+a)%OVERPASS.length;const out=new Map(keys.map(k=>[k,[]]));
      for(const f of d.elements.map(toFeature).filter(Boolean)){const[lo,la]=f.geometry.coordinates,k=Math.floor(la/CELL)+'_'+Math.floor(lo/CELL);if(out.has(k))out.get(k).push(f)}
      return out;
    }catch(e){last=e.name==='AbortError'||e instanceof TypeError?new Error('rate'):e}}
  if(last&&last.message==='rate')backoffUntil=Date.now()+20000;
  throw last||new Error('fail');
}
// ---------- static Greek dataset (bundled, cached by SW); live Overpass only outside Greece ----------
const GR_BB=[19.3,34.5,29.7,41.8];let staticFeats=null,staticState='idle';
const inGreece=b=>b.getEast()>GR_BB[0]&&b.getWest()<GR_BB[2]&&b.getNorth()>GR_BB[1]&&b.getSouth()<GR_BB[3];
async function loadStatic(){if(staticState!=='idle')return;staticState='loading';setStatus('Loading seamarks…');
  let lastErr='';
  for(let a=0;a<3;a++){try{const r=await fetch('data/seamarks-gr.geojson?v=11',{credentials:'same-origin',cache:'no-cache'});
      if(r.redirected&&!new URL(r.url).pathname.endsWith('.geojson'))throw new Error('redirected to '+new URL(r.url).host+new URL(r.url).pathname);
      if(!r.ok)throw new Error('HTTP '+r.status+(r.status===401||r.status===403?' (site login/access)':''));
      const txt=await r.text();let d;try{d=JSON.parse(txt)}catch(_){throw new Error('bad data ('+(r.headers.get('content-type')||'?')+'): '+txt.slice(0,40))}
      staticFeats=[];for(const f of d.features){const p=f.properties,t={};for(const k in p)if(k!=='id')t[k[0]==='~'?'seamark:'+k.slice(1):k]=p[k];
        const c=classify(t);if(!c)continue;markById.set(p.id,t);staticFeats.push({type:'Feature',geometry:f.geometry,properties:{id:p.id,icon:c[0],kind:c[1],prio:-c[2]}})}
      staticState='ready';refreshMarks();setTimeout(()=>loadMarks(true),300);return}
    catch(e){lastErr=e&&e.message||String(e);console.warn('static seamarks',e);setStatus('Seamarks failed: '+lastErr+' – retrying…');await new Promise(r=>setTimeout(r,1500))}}
  staticState='failed';setStatus('Seamarks failed: '+lastErr)}
async function loadMarks(quiet){
  if(!OVERLAYS.marks.on)return;
  if(staticState==='idle'){loadStatic();return}
  if(staticState==='loading')return;
  if(map.getZoom()<MARK_MINZ){setStatus('Zoom in to see seamarks',2500);return}
  const b=map.getBounds();
  if(inGreece(b)){const n=staticFeats.filter(f=>b.contains(f.geometry.coordinates)).length;setStatus(n?n+' seamarks':'No seamarks in this area',2500);return}
  return loadLive()}
async function loadLive(){
  if(overpassBusy)return;
  if(Date.now()<backoffUntil){scheduleMarks(backoffUntil-Date.now()+100);return}
  const b=map.getBounds(),c=map.getCenter();let keys=[],total=0;
  for(let i=Math.floor(b.getSouth()/CELL);i<=Math.floor(b.getNorth()/CELL);i++)for(let j=Math.floor(b.getWest()/CELL);j<=Math.floor(b.getEast()/CELL);j++){total++;const k=i+'_'+j;if(!cellCache.has(k)&&!pending.has(k))keys.push(k)}
  if(!keys.length){const n=countVisible();setStatus(n?n+' seamarks':'No seamarks in this area',2500);return}
  keys.sort((a,b2)=>{const d=k=>{const[i,j]=k.split('_').map(Number);return((i+.5)*CELL-c.lat)**2+((j+.5)*CELL-c.lng)**2};return d(a)-d(b2)});
  keys=keys.slice(0,MAX_CELLS);
  overpassBusy=true;setStatus('Loading seamarks…');let failed=false;
  keys.forEach(k=>pending.add(k));
  try{const res=await fetchCells(keys);for(const[k,v]of res)cellCache.set(k,v);refreshMarks()}
  catch(e){failed=true;console.warn('overpass',e);setStatus(e.message==='rate'?'Server busy, retrying…':'Could not load seamarks, retrying…')}
  finally{keys.forEach(k=>pending.delete(k))}
  overpassBusy=false;
  if(failed){scheduleMarks(Math.max(3000,backoffUntil-Date.now()+100));return}
  setTimeout(()=>{if(statusEl.textContent==='Loading seamarks…'){const n=countVisible();setStatus(n?n+' seamarks':'No seamarks in this area',2500)}},600);
  scheduleMarks();
}
function countVisible(){try{return map.queryRenderedFeatures({layers:['marks']}).length}catch(e){return 0}}
function scheduleMarks(ms=700){clearTimeout(markTimer);markTimer=setTimeout(loadMarks,ms)}
map.on('moveend',scheduleMarks);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
map.on('click','marks',e=>{const f=e.features[0];const t=markById.get(f.properties.id)||{};
  const name=t['name:en']||t['seamark:name:en']||t.name_en||t['name:latin']||t['int_name']||t.name||t['seamark:name']||'';const lt=lightText(t);
  const st=t['seamark:type'];const cat=st&&t[`seamark:${st}:category`];
  let h=`<div class="mk">${name?`<b>${esc(name)}</b>`:''}<div>${esc(f.properties.kind)}${cat&&CAT_BG[cat]?' – '+CAT_BG[cat]:''}</div>`;
  if(lt.length)h+=`<div class="lt">💡 ${lt.map(esc).join('<br>')}</div>`;
  if(t['seamark:light:range'])h+=`<div class="sm">Range: ${esc(t['seamark:light:range'])} NM</div>`;
  if(t['seamark:light:height'])h+=`<div class="sm">Height: ${esc(t['seamark:light:height'])} m</div>`;
  if(t.website)h+=`<div class="sm"><a href="${esc(t.website)}" target="_blank" rel="noopener">Website</a></div>`;
  h+='</div>';
  new maplibregl.Popup({offset:14,maxWidth:'260px'}).setLngLat(f.geometry.coordinates).setHTML(h).addTo(map)});
map.on('mouseenter','marks',()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave','marks',()=>map.getCanvas().style.cursor='');

let marksStarted=false;function startMarks(){if(marksStarted)return;marksStarted=true;
  if(OVERLAYS.marks.on)setStatus(map.getZoom()<MARK_MINZ?'Zoom in to see seamarks':'Loading seamarks…',map.getZoom()<MARK_MINZ?4000:0);
  loadIcons().catch(e=>console.warn(e)).then(()=>{window.__marksReady=true;scheduleMarks(50)});}
if(map.loaded())startMarks();else{map.once('load',startMarks);map.once('idle',startMarks);setTimeout(startMarks,8000)}
map.on('error',e=>console.warn('map error',e.error&&e.error.message));window.__map=map;

// v10: no service worker for now – remove any old SW + caches (stale-cache issues on the private Netlify site)
if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).catch(e=>console.warn('sw unregister',e));
if(window.caches)caches.keys().then(k=>Promise.all(k.map(x=>caches.delete(x)))).catch(()=>{});
// initial base map from ?base= (default Satellite)
(function(){const apply=()=>{if(INIT_BASE==='sat')return;for(const[k,b]of Object.entries(BASES))b.layers.forEach(id=>map.setLayoutProperty(id,'visibility',k===INIT_BASE?'visible':'none'));setOldTheme(INIT_BASE==='old')};if(map.isStyleLoaded())apply();else map.once('load',apply)})();
