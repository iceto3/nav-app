'use strict';
const APP_VERSION='v21';
// v19: zoomed-out category dots, palette 3 "High-contrast white/ink" (fill, stroke) – satellite/modern and Old chart
const DOT_COLS={sat:{anchorage:['#6a2c9e','#FFFFFF'],harb:['#0D47A1','#FFFFFF'],fuel:['#E65100','#FFFFFF'],shop:['#9E9E9E','#FFFFFF']},
  old:{anchorage:['#7a3b5a','#F3E9D2'],harb:['#22324F','#F3E9D2'],fuel:['#D2691E','#F3E9D2'],shop:['#9A9286','#F3E9D2']}};
function DOTPAL(old,i){const p=DOT_COLS[old?'old':'sat'];return['match',['get','icon'],'anchorage',p.anchorage[i],['marina','harbour'],p.harb[i],'fuel',p.fuel[i],p.shop[i]]}
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
// own vector depth contours (EMODnet DTM 2024, CC-BY 4.0) served as PMTiles via HTTP range requests
const PMT=new pmtiles.Protocol();maplibregl.addProtocol('pmtiles',PMT.tile);
const DEPTH_ATT='Bathymetry: <a href="https://emodnet.ec.europa.eu/en/bathymetry">EMODnet</a> (CC-BY 4.0)';
const pmUrl=f=>'pmtiles://'+new URL('data/'+f+'?v=14',location.href).href;
const wms=l=>[`${EMOD}?service=WMS&request=GetMap&version=1.1.1&layers=${l}&styles=&format=image/png&transparent=true&srs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}`];
const raster=(tiles,att,extra={})=>Object.assign({type:'raster',tiles,tileSize:256,attribution:att},extra);
const FONT_R=['Noto Sans Regular'],FONT_B=['Noto Sans Bold'],FONT_I=['Noto Sans Italic'];
// English-first names everywhere; local name only as last resort
const NAME_EN=['coalesce',['get','name:en'],['get','name_en'],['get','name:latin'],['get','name_int'],['get','name']];
const OLD_INK='#6b4a2b',FONT_OLD=['Libre Caslon Italic'];
const HALO={'text-halo-color':'rgba(0,0,0,.75)','text-halo-width':1.6,'text-halo-blur':.4};
const style={version:8,glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources:{
    sat:raster([ESRI+'World_Imagery/MapServer/tile/{z}/{y}/{x}'],'Imagery © Esri, Maxar, Earthstar Geographics & GIS User Community',{maxzoom:18}),
    omt:{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'Labels © <a href="https://openfreemap.org">OpenFreeMap</a> '+OSM_ATT},
    topo:raster([ESRI+'World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],'© Esri & data providers',{maxzoom:19}),
    osm:raster(['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],OSM_ATT,{maxzoom:19}),
    depth:raster(wms('emodnet:mean_multicolour'),EMOD_ATT),
    contours:raster(wms('emodnet:contours'),EMOD_ATT),
    dcont:{type:'vector',url:pmUrl('contours.pmtiles'),attribution:DEPTH_ATT},
    dbands:{type:'vector',url:pmUrl('bands.pmtiles'),attribution:DEPTH_ATT},
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
    {id:'dband',type:'fill',source:'dbands','source-layer':'bands',filter:['>',['get','dmax'],0],layout:{visibility:'none'},
      paint:{'fill-color':'#9fe8ff','fill-antialias':false,'fill-opacity':['match',['get','dmin'],0,.32,2,.22,5,.13,10,.07,20,.03,0]}},
    {id:'dcont',type:'line',source:'dcont','source-layer':'contours',filter:['>',['get','depth'],5],layout:{visibility:'none','line-join':'round'},
      paint:{'line-color':'#bff4ff','line-opacity':.85,'line-width':['interpolate',['linear'],['zoom'],6,['match',['get','depth'],10,.6,.4],13,['match',['get','depth'],10,1.4,1]]}},
    {id:'dcontS',type:'line',source:'dcont','source-layer':'contours',filter:['<=',['get','depth'],5],layout:{visibility:'none','line-join':'round'},
      paint:{'line-color':'#bff4ff','line-opacity':.85,'line-width':['interpolate',['linear'],['zoom'],10,.8,13,1.6],'line-dasharray':[3,2]}},
    {id:'dcontLbl',type:'symbol',source:'dcont','source-layer':'contours',minzoom:10,layout:{visibility:'none','symbol-placement':'line','symbol-spacing':260,
      'text-field':['concat',['to-string',['get','depth']],' m'],'text-font':FONT_I,'text-size':11,'text-keep-upright':true,'text-max-angle':30},
      paint:{'text-color':'#e6fbff','text-halo-color':'rgba(0,40,60,.8)','text-halo-width':1.3}},
    {id:'osmSea',type:'raster',source:'osmSea',layout:{visibility:'none'}},
    {id:'routeCasing',type:'line',source:'route',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fff','line-width':['interpolate',['linear'],['zoom'],10,6,18,14],'line-opacity':.9}},
    {id:'route',type:'line',source:'route',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#1a73e8','line-width':['interpolate',['linear'],['zoom'],10,4,18,10]}},
    {id:'dots',type:'circle',source:'marks',minzoom:5,filter:['any',['all',['in',['get','icon'],['literal',['anchorage','marina','harbour','fuel']]],['<',['zoom'],11.2]],['all',['==',['get','icon'],'shop'],['any',['<',['zoom'],14],['!',['has','hasIcon']]]]],layout:{'circle-sort-key':['match',['get','icon'],'shop',0,'fuel',1,2]},paint:{'circle-color':DOTPAL(false,0),'circle-stroke-color':DOTPAL(false,1),'circle-radius':['interpolate',['linear'],['zoom'],8,['match',['get','icon'],'anchorage',4.5,'fuel',3.5,'shop',2.6,5],11,['match',['get','icon'],'anchorage',6,'fuel',4.5,'shop',3.2,6.5]],'circle-stroke-width':['match',['get','icon'],'fuel',1.5,'shop',1,2],'circle-opacity':['match',['get','icon'],'shop',.85,1]}},
    {id:'marks',type:'symbol',source:'marks',minzoom:11,
      filter:['case',['in',['get','icon'],['literal',['anchorage','marina','harbour','fuel']]],['>=',['zoom'],11.2],['==',['get','icon'],'shop'],['>=',['zoom'],14],['>=',['zoom'],13]],
      paint:{'icon-opacity':['interpolate',['linear'],['zoom'],13,['match',['get','icon'],['anchorage','marina','harbour','fuel','shop'],1,.7],14,1]},layout:{'icon-image':['concat','D_',['get','icon']],'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-anchor':'center',
      'symbol-sort-key':['get','prio'],
      'icon-size':['interpolate',['linear'],['zoom'],11,['match',['get','icon'],'light_major',.7,['harbour','marina','anchorage'],.675,.5],14,['match',['get','icon'],'light_major',.95,['harbour','marina','anchorage'],1.0125,.75],17,['match',['get','icon'],['harbour','marina','anchorage'],1.4175,1.05]]} /* v21: harbour/marina/anchorage x1.35 */},
    {id:'ltLbl',type:'symbol',source:'marks',minzoom:13,filter:['!=',['coalesce',['get','lt'],''],''],layout:{'text-field':['get','lt'],'text-font':FONT_I,
      'text-size':['interpolate',['linear'],['zoom'],11,11,15,13],'text-optional':true,'text-max-width':16,
      'symbol-sort-key':['get','prio'],'text-variable-anchor':['left','right','top','bottom'],'text-radial-offset':1.1},
      paint:{'text-opacity':['interpolate',['linear'],['zoom'],13,.7,14,1],'text-color':'#fff4d6','text-halo-color':'rgba(22,14,4,.92)','text-halo-width':2.2,'text-halo-blur':.3}},
    {id:'lblWater',type:'symbol',source:'omt','source-layer':'water_name',layout:{'text-field':NAME_EN,'text-font':FONT_I,'text-size':['interpolate',['linear'],['zoom'],5,11,12,14],'text-max-width':8,'symbol-placement':'point'},paint:Object.assign({'text-color':'#bfe6ff'},HALO)},
    {id:'lblIsland',type:'symbol',source:'omt','source-layer':'place',filter:['in',['get','class'],['literal',['island','islet']]],minzoom:8,layout:{'text-field':NAME_EN,'text-font':FONT_I,'text-size':12},paint:Object.assign({'text-color':'#fff5d6'},HALO)},
    {id:'lblPlace',type:'symbol',source:'omt','source-layer':'place',filter:['in',['get','class'],['literal',['city','town','village','hamlet','suburb','neighbourhood']]],
      layout:{'text-field':NAME_EN,'text-font':['match',['get','class'],['city','town'],['literal',FONT_B],['literal',FONT_R]],
        'text-size':['match',['get','class'],'city',16,'town',14,'village',12.5,11],'text-max-width':8,'symbol-sort-key':['match',['get','class'],'city',0,'town',1,'village',2,3]},
      paint:Object.assign({'text-color':'#ffffff'},HALO)}
  ]};
const BASES={sat:{label:'Satellite (Esri)',layers:['sat']},topo:{label:'Topo map (Esri)',layers:['topo']},osm:{label:'OpenStreetMap (streets)',layers:['osm']},old:{label:'Old chart',layers:['old_bg','old_land','old_water','old_rip0','old_rip1','old_rip2','old_coast','old_bld','old_roads','old_ferry']}};
const INIT_BASE=BASES[qs.get('base')]?qs.get('base'):'sat';
const OVERLAYS={marks:{label:'Seamarks',on:true,layers:['marks','ltLbl']},labels:{label:'Place & water labels',on:true,layers:['lblWater','lblIsland','lblPlace']},depth:{label:'Depth (EMODnet)'},contours:{label:'Contours (EMODnet WMS)'},dcont:{label:'Depth contours',layers:['dband','dcont','dcontS','dcontLbl']},osmSea:{label:'OpenSeaMap (legacy raster)'}};

const map=new maplibregl.Map({container:'map',style,
  center:[+(qs.get('lon')||20.71),+(qs.get('lat')||38.83)],zoom:+(qs.get('z')||12), // TEMP v21: default start Lefkada (was 23.3219,42.6977 z13)
  maxZoom:20,dragRotate:true,pitchWithRotate:false,touchPitch:false,fadeDuration:150,
  attributionControl:false,maxTileCacheSize:400,
  transformRequest:u=>{const m=/\/fonts\/(Libre%20Caslon%20Italic|Libre Caslon Italic)\/(\d+)-(\d+)\.pbf/.exec(u);if(!m)return{url:u};
    // local Libre Caslon Italic (lining figures) covers Latin (0-767); Greek, Cyrillic etc. fall back to OpenFreeMap Noto Sans Italic
    return +m[2]<768?{url:new URL('glyphs/Libre%20Caslon%20Italic/'+m[2]+'-'+m[3]+'.pbf?v=16',location.href).href}:{url:'https://tiles.openfreemap.org/fonts/Noto%20Sans%20Italic/'+m[2]+'-'+m[3]+'.pbf'}},refreshExpiredTiles:false});
map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-left');
map.addControl(new maplibregl.NavigationControl({showZoom:false,visualizePitch:false}),'top-right'); // compass: tap to reset north
map.touchZoomRotate.enableRotation();

// ---------- old chart theme ----------
const LBL_ORIG={};
function setOldTheme(on){
  document.body.classList.toggle('oldchart',on);if(typeof drawScale==='function')drawScale();
  for(const id of ['lblWater','lblIsland','lblPlace']){
    if(!LBL_ORIG[id])LBL_ORIG[id]={font:map.getLayoutProperty(id,'text-font'),color:map.getPaintProperty(id,'text-color'),hc:map.getPaintProperty(id,'text-halo-color'),hw:map.getPaintProperty(id,'text-halo-width'),hb:map.getPaintProperty(id,'text-halo-blur')};
    const o=LBL_ORIG[id],w=id==='lblWater';
    map.setLayoutProperty(id,'text-font',on?FONT_OLD:o.font);
    map.setPaintProperty(id,'text-color',on?(w?'#3f5f5c':'#4a3018'):o.color);
    map.setPaintProperty(id,'text-halo-color',on?(w?'#b9cfc9':'#e9dcc0'):o.hc);
    map.setPaintProperty(id,'text-halo-width',on?1.5:o.hw);map.setPaintProperty(id,'text-halo-blur',on?0:o.hb);}
  map.setPaintProperty('ltLbl','text-halo-color',on?'#e9dcc0':'rgba(22,14,4,.92)');map.setPaintProperty('ltLbl','text-halo-width',on?1.4:2.2);
  map.setPaintProperty('ltLbl','text-color',on?'#3d2612':'#fff4d6');map.setLayoutProperty('ltLbl','text-font',on?FONT_OLD:FONT_I);
  map.setLayoutProperty('marks','icon-image',['concat',on?'':'D_',['get','icon']]);
  map.setPaintProperty('dots','circle-color',DOTPAL(on,0));map.setPaintProperty('dots','circle-stroke-color',DOTPAL(on,1));
  // depth contours: light cyan on satellite, sepia/teal on old chart
  map.setPaintProperty('dcont','line-color',on?['case',['<=',['get','depth'],10],'#2f6f6a','#6b4a2b']:'#bff4ff');
  map.setPaintProperty('dcontS','line-color',on?'#2f6f6a':'#bff4ff');
  map.setPaintProperty('dcont','line-opacity',on?.75:.85);
  map.setPaintProperty('dband','fill-color',on?'#5f9c95':'#9fe8ff');
  map.setLayoutProperty('dcontLbl','text-font',on?FONT_OLD:FONT_I);
  map.setPaintProperty('dcontLbl','text-color',on?'#2f5652':'#e6fbff');
  map.setPaintProperty('dcontLbl','text-halo-color',on?'#b9cfc9':'rgba(0,40,60,.8)');
}
(function(){const d=document.createElement('div');d.id='oldDecor';d.innerHTML=`<svg class="paper" width="100%" height="100%"><filter id="opn"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .45 0 0 0 0 .33 0 0 0 0 .18 0 0 0 .55 0"/></filter><filter id="opb"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .35 0 0 0 0 .15 0 0 0 .5 -.1"/></filter><rect width="100%" height="100%" filter="url(#opn)"/><rect width="100%" height="100%" filter="url(#opb)"/></svg><div class="vig"></div>
<svg class="rose" viewBox="-110 -115 220 225" fill="none" stroke="#5a3d1e"><circle r="92" stroke-width="1.2"/><circle r="86" stroke-width=".6"/><circle r="60" stroke-width=".5" stroke-dasharray="2 3"/><g stroke-width=".4" opacity=".6"><path d="M0-86V86M-86 0H86M-61-61L61 61M61-61L-61 61"/></g><g stroke-width=".8"><path d="M0-50L9-9 50 0 9 9 0 50-9 9-50 0-9-9Z" fill="#e9dcc0" transform="rotate(45) scale(.7)"/><path d="M0-80L12-12 80 0 12 12 0 80-12 12-80 0-12-12Z" fill="#efe4cb"/><path d="M0-80L12-12 0 0ZM80 0L12 12 0 0ZM0 80L-12 12 0 0ZM-80 0L-12-12 0 0Z" fill="#7a5530"/></g><circle r="4" fill="#9b3b26" stroke="none"/><path d="M-6-90L0-100 6-90" fill="#9b3b26" stroke="none"/><text y="-102" fill="#5a3d1e" stroke="none" font-family="Georgia,serif" font-style="italic" font-size="16" text-anchor="middle">N</text></svg>`;
  document.getElementById('map').after(d);
  const r=d.querySelector('.rose');map.on('rotate',()=>r.style.transform=`rotate(${-map.getBearing()}deg)`);})();
function nfnNote(on){let n=document.getElementById('nfn');if(!n){n=document.createElement('div');n.id='nfn';n.textContent='Depths ≈115 m grid · Not for navigation';
  n.style.cssText='position:fixed;right:8px;bottom:calc(env(safe-area-inset-bottom) + 30px);z-index:2400;background:rgba(255,255,255,.8);color:#7a1f1f;font:600 10px system-ui,sans-serif;padding:2px 6px;border-radius:6px;pointer-events:none';document.body.appendChild(n)}n.hidden=!on}
// ---------- zoom indicator + compact vertical slider ----------
{const z=document.createElement('div');z.id='zoomBox';z.style.cssText='position:fixed;right:12px;top:calc(env(safe-area-inset-top) + 172px);z-index:2400;display:flex;flex-direction:column;align-items:center;gap:4px;background:rgba(255,255,255,.85);border-radius:8px;padding:4px 3px;box-shadow:0 1px 4px rgba(0,0,0,.25);font:600 10px system-ui,sans-serif;color:#333';
 z.innerHTML='<span id="zoomTxt"></span><input id="zoomSl" type="range" min="2" max="20" step="0.1" aria-label="Zoom" style="writing-mode:vertical-lr;direction:rtl;width:18px;height:110px;margin:0">';
 document.body.appendChild(z);const t=z.querySelector('#zoomTxt'),sl=z.querySelector('#zoomSl');
 const upd=()=>{const v=map.getZoom();t.textContent='Z '+v.toFixed(1);if(document.activeElement!==sl)sl.value=v};
 sl.oninput=()=>map.jumpTo({zoom:+sl.value});map.on('zoom',upd);upd()}
// ---------- scale bar: metric + NM (modern) / checkered (Old chart) ----------
const drawScale=(()=>{const b=document.createElement('div');b.id='scaleBar';document.body.appendChild(b);
  const NICE=(lo,hi)=>{const o=[];for(let e=lo;e<=hi;e++)for(const f of [1,1.5,2,2.5,3,4,5])o.push(+(f*Math.pow(10,e)).toPrecision(3));return o},M=NICE(0,5),NM=NICE(-2,2);
  const pick=(a,u,mx)=>{const p=156543.03392*Math.cos(map.getCenter().lat*Math.PI/180)/Math.pow(2,map.getZoom());let v=a[0];for(const x of a)if(x*u/p<=mx)v=x;return[v,v*u/p]};
  const fm=m=>m>=1000?(m/1000)+' km':m+' m',pos='position:fixed;z-index:2300;left:10px;bottom:calc(env(safe-area-inset-bottom) + 92px);pointer-events:none;';
  const lift=()=>{const a=document.querySelector('.maplibregl-ctrl-attrib');if(a)b.style.bottom=(innerHeight-a.getBoundingClientRect().top+8)+'px'};
  return()=>{const old=document.body.classList.contains('oldchart'),[m,w]=pick(M,1,old?130:110),[n,wn]=pick(NM,1852,old?130:110);
    if(old){const seg=W=>Array.from({length:5},(_,i)=>`<div style="width:${W/5}px;height:5px;background:${i%2?'#efe4cb':'#2b1a0c'};border:.8px solid #4a3018;box-sizing:border-box"></div>`).join('');
      b.style.cssText=pos+'background:rgba(233,220,192,.9);border:1px solid #6b4a2b;padding:3px 7px 5px;font:italic 11px Georgia,serif;color:#4a3018';
      b.innerHTML=`<div style="text-align:center">Scale of Metres · ${fm(m)}</div><div style="display:flex">${seg(w)}</div><div style="display:flex;margin-top:2px">${seg(wn)}</div><div style="text-align:center">${n} Nautical Miles</div>`}
    else{b.style.cssText=pos+'background:rgba(255,255,255,.82);border-radius:6px;padding:3px 6px 4px;font:600 10px system-ui,sans-serif;color:#222';
      b.innerHTML=`<div>${fm(m)}</div><div style="width:${w}px;height:4px;border:1.5px solid #222;border-top:none"></div><div style="width:${wn}px;height:4px;border:1.5px solid #1a4f8a;border-bottom:none;margin-top:1px"></div><div style="color:#1a4f8a">${n} NM</div>`}lift()}})();
map.on('move',drawScale);map.on('zoom',drawScale);map.on('moveend',drawScale);drawScale();
// ---------- layer switcher ----------
(function(){
  const box=document.createElement('div');box.id='layers';
  box.innerHTML='<button id="layersBtn" title="Layers">🗺</button><div id="layersMenu" hidden><b>Base map</b></div>';
  document.body.appendChild(box);const menu=box.querySelector('#layersMenu');
  for(const[k,b]of Object.entries(BASES)){const l=document.createElement('label');l.innerHTML=`<input type="radio" name="base" value="${k}"${k===INIT_BASE?' checked':''}> ${b.label}`;
    l.querySelector('input').onchange=()=>{for(const[k2,b2]of Object.entries(BASES))b2.layers.forEach(id=>map.setLayoutProperty(id,'visibility',k2===k?'visible':'none'));setOldTheme(k==='old')};menu.appendChild(l)}
  menu.insertAdjacentHTML('beforeend','<b>Overlays</b>');
  for(const[k,o]of Object.entries(OVERLAYS)){const l=document.createElement('label');l.innerHTML=`<input type="checkbox"${o.on?' checked':''}> ${o.label}`;
    l.querySelector('input').onchange=e=>{o.on=e.target.checked;(o.layers||[k]).forEach(id=>map.setLayoutProperty(id,'visibility',o.on?'visible':'none'));if(k==='dcont')nfnNote(o.on);if(k==='marks'){if(o.on){setStatus(map.getZoom()<MARK_MINZ?'Zoom in to see seamarks':'Loading seamarks…',map.getZoom()<MARK_MINZ?4000:0);loadMarks()}else setStatus('')}};menu.appendChild(l)}
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
// ---------- seamark icon set E (antique engraved) + light labels + lateral classifier ----------
const SE=(()=>{
// Icon set proposals A–E. Each set: keys -> SVG string (with width/height attrs)
const W=(w,h,b,defs='')=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs?'<defs>'+defs+'</defs>':''}${b}</svg>`;
const R='#e3262b',G='#16a34a',Y='#f5c400',K='#151515',Wh='#ffffff';
const KEYS=['light_major','light','beacon','lat_red','lat_green','lat_redgreen','lat_greenred','card_north','card_east','card_south','card_west','isolated','safe','special','rock','rock_awash','wreck','danger'];
const LABELS={light_major:'Major lighthouse',light:'Minor light',beacon:'Beacon (generic)',lat_red:'Port lateral (red, IALA A)',lat_green:'Starboard lateral (green)',lat_redgreen:'Preferred channel to stbd',lat_greenred:'Preferred channel to port',card_north:'North cardinal',card_east:'East cardinal',card_south:'South cardinal',card_west:'West cardinal',isolated:'Isolated danger',safe:'Safe water',special:'Special (yellow)',rock:'Rock (submerged)',rock_awash:'Rock (awash / dries)',wreck:'Wreck',danger:'Obstruction'};
// cardinal bands top->bottom and topmark (cone directions top->bottom: 1 up, 0 down)
const CB={north:[[K,Y],[1,1]],south:[[Y,K],[0,0]],east:[[K,Y,K],[1,0]],west:[[Y,K,Y],[0,1]]};
const bandsOf=k=>({lat_red:[R],lat_green:[G],lat_redgreen:[R,G,R],lat_greenred:[G,R,G],isolated:[K,R,K],safe:[R,Wh,R,Wh],special:[Y],card_north:CB.north[0],card_east:CB.east[0],card_south:CB.south[0],card_west:CB.west[0]})[k];
const cones=(cx,y,dirs,c,s,stroke)=>dirs.map((d,i)=>{const yy=y+i*(s+1);return d?`<path d="M${cx} ${yy}l${s*.7} ${s}h${-s*1.4}z" fill="${c}" ${stroke}/>`:`<path d="M${cx} ${yy+s}l${s*.7} ${-s}h${-s*1.4}z" fill="${c}" ${stroke}/>`}).join('');
const topmarkFor=(k,cx,y,s,st,col)=>{col=col||{};const sk=`stroke="${st||'#fff'}" stroke-width="1"`;
  if(k==='lat_red'||k==='lat_redgreen')return `<rect x="${cx-s*.55}" y="${y}" width="${s*1.1}" height="${s}" fill="${col.r||R}" ${sk}/>`;
  if(k==='lat_green'||k==='lat_greenred')return `<path d="M${cx} ${y}l${s*.7} ${s}h${-s*1.4}z" fill="${col.g||G}" ${sk}/>`;
  if(k.startsWith('card_'))return cones(cx,y-s*.9,CB[k.slice(5)][1],col.k||K,s*.9,sk);
  if(k==='isolated')return `<circle cx="${cx}" cy="${y-s*.4}" r="${s*.45}" fill="${col.k||K}" ${sk}/><circle cx="${cx}" cy="${y+s*.6}" r="${s*.45}" fill="${col.k||K}" ${sk}/>`;
  if(k==='safe')return `<circle cx="${cx}" cy="${y+s*.4}" r="${s*.5}" fill="${col.r||R}" ${sk}/>`;
  if(k==='special')return `<path d="M${cx-s*.5} ${y}l${s} ${s}M${cx+s*.5} ${y}l${-s} ${s}" stroke="${col.y||Y}" stroke-width="${s*.35}"/>`;
  return ''};
const SHAPE={lat_red:'can',lat_redgreen:'can',lat_green:'cone',lat_greenred:'cone',safe:'sphere',special:'pillar'};
// ---------------- A: modern flat badges ----------------
function A(k){const bd=(fill,inner,r=14)=>W(36,36,`<circle cx="18" cy="18" r="${r}" fill="${fill}" stroke="#fff" stroke-width="2.5"/>${inner}`);
  const tower='<path d="M15.5 27l1.3-13h2.4l1.3 13z" fill="#fff"/><rect x="15.6" y="10.5" width="4.8" height="3" rx="1" fill="#fff"/><path d="M11 9.5l4 1.8M25 9.5l-4 1.8M18 6v2.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>';
  if(k==='light_major')return W(40,40,`<circle cx="20" cy="20" r="17" fill="#f59e0b" stroke="#fff" stroke-width="2.5"/><g transform="translate(2 3)">${tower}</g>`);
  if(k==='light')return W(26,26,'<circle cx="13" cy="13" r="9" fill="#fbbf24" stroke="#fff" stroke-width="2"/><circle cx="13" cy="13" r="3" fill="#fff"/>');
  if(k==='beacon')return W(26,26,'<circle cx="13" cy="13" r="8" fill="#64748b" stroke="#fff" stroke-width="2"/><rect x="11.5" y="7.5" width="3" height="11" rx="1" fill="#fff"/>');
  if(k==='rock')return W(26,26,'<circle cx="13" cy="13" r="9" fill="#334155" stroke="#fff" stroke-width="2"/><path d="M8.5 13h9M13 8.5v9" stroke="#fff" stroke-width="2.2"/>');
  if(k==='rock_awash')return W(26,26,'<circle cx="13" cy="13" r="9" fill="#b45309" stroke="#fff" stroke-width="2"/><path d="M9 9l8 8M17 9l-8 8M8 13h10M13 8v10" stroke="#fff" stroke-width="1.6"/>');
  if(k==='wreck')return W(30,26,'<rect x="2" y="3" width="26" height="20" rx="10" fill="#334155" stroke="#fff" stroke-width="2"/><path d="M8 15h14M11 11v8M15 9v10M19 11v8" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>');
  if(k==='danger')return W(30,28,'<path d="M15 3l12 21H3z" fill="#ea580c" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M15 10v7" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="15" cy="20.5" r="1.4" fill="#fff"/>');
  const b=bandsOf(k),n=b.length,h=28/n;const strips=b.map((c,i)=>`<rect x="4" y="${4+i*h}" width="28" height="${h+.2}" fill="${c}"/>`).join('');
  let glyph='';
  if(k==='lat_red')glyph='<rect x="13" y="13" width="10" height="10" rx="1.5" fill="#fff"/>';
  else if(k==='lat_green')glyph='<path d="M18 11l6.5 11h-13z" fill="#fff"/>';
  else if(k.startsWith('card_'))glyph=cones(18,9,CB[k.slice(5)][1],'#fff',8,'stroke="#000" stroke-opacity=".35" stroke-width=".8"');
  else if(k==='isolated')glyph='<circle cx="18" cy="13.5" r="3" fill="#fff"/><circle cx="18" cy="22.5" r="3" fill="#fff"/>';
  else if(k==='safe'){return W(36,36,`<clipPath id="c"><circle cx="18" cy="18" r="14"/></clipPath><g clip-path="url(#c)"><rect width="36" height="36" fill="${R}"/>${[8,16,24].map(x=>`<rect x="${x}" y="0" width="4" height="36" fill="#fff"/>`).join('')}</g><circle cx="18" cy="18" r="14" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="18" cy="18" r="4.5" fill="${R}" stroke="#fff" stroke-width="1.5"/>`)}
  else if(k==='special')glyph='<path d="M13 13l10 10M23 13l-10 10" stroke="#151515" stroke-width="2.8" stroke-linecap="round"/>';
  else if(k==='lat_redgreen'||k==='lat_greenred')glyph=k==='lat_redgreen'?'<rect x="14" y="14" width="8" height="8" rx="1" fill="#fff"/>':'<path d="M18 13l5 9h-10z" fill="#fff"/>';
  return W(36,36,`<clipPath id="c"><circle cx="18" cy="18" r="14"/></clipPath><g clip-path="url(#c)">${strips}</g><circle cx="18" cy="18" r="14" fill="none" stroke="#fff" stroke-width="2.5"/>${glyph}`)}
// ---------------- B: IALA / INT-1 paper chart ----------------
const MAG='#c0219a';
const flare=(x,y,a=-45,l=16)=>`<path d="M${x} ${y}q${-3.5} ${-l*.55} 0 ${-l}q3.5 ${l*.45} 0 ${l}z" fill="${MAG}" opacity=".9" transform="rotate(${a+90} ${x} ${y})"/>`;
function buoyShape(shape,cx,base,bands,stroke){ // INT-1 shapes, upright with slight style
  const o=`stroke="${stroke}" stroke-width="1.2"`;let clip,outline;
  if(shape==='can'){clip=`M${cx-6} ${base}v-13h12v13z`}
  else if(shape==='cone'){clip=`M${cx-7} ${base}l7-15 7 15z`}
  else if(shape==='sphere'){clip=`M${cx-7} ${base-1}a7 7 0 1 1 14 0z`}
  else if(shape==='spar'){clip=`M${cx-2.2} ${base}v-20h4.4v20z`}
  else {clip=`M${cx-6} ${base}l2.5-18h7l2.5 18z`} // pillar
  const top=base-22,hh=22,bh=hh/bands.length;
  const strips=bands.map((c,i)=>`<rect x="${cx-9}" y="${top+i*bh}" width="18" height="${bh+.2}" fill="${c}"/>`).join('');
  const id='c'+shape+Math.round(cx);
  return `<clipPath id="${id}"><path d="${clip}"/></clipPath><g clip-path="url(#${id})">${strips}</g><path d="${clip}" fill="none" ${o}/>`}
function B(k){
  if(k==='light_major')return W(44,44,`${flare(22,26,-60,20)}<path d="M22 14l2.9 8.5 8.9.1-7.2 5.3 2.7 8.6-7.3-5.2-7.3 5.2 2.7-8.6-7.2-5.3 8.9-.1z" fill="#111" stroke="#fff" stroke-width="1"/><circle cx="22" cy="26" r="2" fill="#fff"/>`);
  if(k==='light')return W(30,30,`${flare(13,20,-50,15)}<circle cx="13" cy="20" r="2.6" fill="#111" stroke="#fff" stroke-width="1"/>`);
  if(k==='beacon')return W(30,34,`${flare(13,26,-50,13)}<path d="M13 28V10" stroke="#111" stroke-width="2.4"/><path d="M8 28h10" stroke="#111" stroke-width="2"/><circle cx="13" cy="9" r="3" fill="#111"/>`);
  if(k==='rock')return W(24,24,'<path d="M5 12h14M12 5v14" stroke="#fff" stroke-width="4"/><path d="M5 12h14M12 5v14" stroke="#111" stroke-width="1.8"/>');
  if(k==='rock_awash')return W(24,24,'<g stroke="#fff" stroke-width="4"><path d="M5 12h14M12 5v14M7 7l10 10M17 7L7 17"/></g><g stroke="#111" stroke-width="1.6"><path d="M5 12h14M12 5v14M7 7l10 10M17 7L7 17"/></g><circle cx="12" cy="12" r="1.8" fill="#111"/>');
  if(k==='wreck')return W(34,22,'<g stroke="#fff" stroke-width="4" stroke-linecap="round"><path d="M4 11h26M11 6v10M17 4v14M23 6v10"/></g><g stroke="#111" stroke-width="1.7" stroke-linecap="round"><path d="M4 11h26M11 6v10M17 4v14M23 6v10"/></g>');
  if(k==='danger')return W(30,30,'<circle cx="15" cy="15" r="11" fill="rgba(120,180,255,.35)" stroke="#111" stroke-width="1.6" stroke-dasharray="2 2"/><text x="15" y="18" font-family="Georgia,serif" font-style="italic" font-size="7.5" text-anchor="middle" fill="#111">Obstn</text>');
  const sh=k.startsWith('card_')||k==='isolated'?'pillar':SHAPE[k]||'pillar';const base=36;
  const tm=topmarkFor(k,20,k.startsWith('card_')?9:6,6,'#fff');
  return W(40,44,`${flare(20,base,-40,14)}<path d="M20 ${base-22}V${base-24}" stroke="#111" stroke-width="1.5"/>${buoyShape(sh,20,base,bandsOf(k),'#111')}<path d="M12 ${base}h16" stroke="#111" stroke-width="1.5"/><circle cx="20" cy="${base+2}" r="2" fill="#fff" stroke="#111" stroke-width="1.2"/>${tm}`)}
// ---------------- C: minimal outline ----------------
function C(k){const halo=(d,c,sw=2)=>`<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" stroke="rgba(255,255,255,.95)" stroke-width="${sw+2.6}"/><path d="${d}" stroke="${c}" stroke-width="${sw}"/></g>`;
  if(k==='light_major')return W(36,36,halo('M14 30l2-16h4l2 16zM13 30h10M15 14h6M16.5 10h3v4h-3zM9 9l4 2M27 9l-4 2M18 4v3','#f59e0b',2));
  if(k==='light')return W(24,24,halo('M12 7v3M12 14v3M7 12h3M14 12h3','#f59e0b',2)+'<circle cx="12" cy="12" r="2.4" fill="#f59e0b" stroke="#fff"/>');
  if(k==='beacon')return W(24,30,halo('M12 26V8M8 26h8M12 8l-3 -3M12 8l3 -3','#e2e8f0',2));
  if(k==='rock')return W(22,22,halo('M5 11h12M11 5v12','#f8fafc',2));
  if(k==='rock_awash')return W(22,22,halo('M5 11h12M11 5v12M7 7l8 8M15 7l-8 8','#fbbf24',1.8));
  if(k==='wreck')return W(30,22,halo('M4 11h22M10 7v8M15 5v12M20 7v8','#f8fafc',2));
  if(k==='danger')return W(26,24,halo('M13 4l10 17H3zM13 10v5M13 18v.5','#fb923c',2));
  const sh=k.startsWith('card_')||k==='isolated'?'pillar':SHAPE[k]||'pillar';
  const col=k==='lat_red'||k==='lat_redgreen'?R:k==='lat_green'||k==='lat_greenred'?'#22c55e':k==='special'?Y:k==='safe'?'#f87171':k==='isolated'?'#f87171':Y;
  const d={can:'M12 30V17h12v13z',cone:'M11 30l7-15 7 15z',sphere:'M11 29a7 7 0 1 1 14 0z',pillar:'M12 30l2.5-16h7L24 30z'}[sh];
  let tm='';if(k.startsWith('card_')){tm=cones(18,4,CB[k.slice(5)][1],'none',5,`stroke="${col}" stroke-width="1.8"`);tm=`<g stroke-linejoin="round">${tm.replace(/fill="none"/g,'fill="none" stroke-opacity="1"')}</g>`}
  else if(k==='isolated')tm=`<circle cx="18" cy="6" r="2.6" fill="none" stroke="${col}" stroke-width="1.8"/><circle cx="18" cy="12" r="2.6" fill="none" stroke="${col}" stroke-width="1.8"/>`;
  const band=(k==='lat_redgreen'||k==='lat_greenred')?`<path d="M12 23h12" stroke="${k==='lat_redgreen'?'#22c55e':R}" stroke-width="2.4"/>`:'';
  const inner=k.startsWith('card_')?`<path d="M14 22h8" stroke="${col}" stroke-width="1.5"/>`:'';
  return W(36,36,halo(d,col,2.2)+band+inner+tm+'<path d="M10 32h16" stroke="#fff" stroke-width="1.5" opacity=".8"/>')}
// ---------------- D: illustrated 3D ----------------
function D(k){const g=(id,c1,c2)=>`<linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${c2}"/><stop offset=".45" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
  const sea='<ellipse cx="20" cy="41" rx="12" ry="3" fill="#0b4a6e" opacity=".55"/><path d="M9 41q3-2 6 0t6 0 6 0 5 0" stroke="#bfe9ff" stroke-width="1.2" fill="none"/>';
  if(k==='light_major')return W(44,52,`<radialGradient id="gl"><stop offset="0" stop-color="#fff7b0" stop-opacity=".95"/><stop offset="1" stop-color="#ffd54f" stop-opacity="0"/></radialGradient>${g('tw','#ffffff','#c9ced6')}`+
    `<circle cx="22" cy="11" r="11" fill="url(#gl)"/><path d="M15 46l3.2-28h7.6L29 46z" fill="url(#tw)" stroke="#334155" stroke-width=".8"/>`+
    `<clipPath id="tc"><path d="M15 46l3.2-28h7.6L29 46z"/></clipPath><g clip-path="url(#tc)" fill="#d32f2f"><rect x="10" y="22" width="24" height="5"/><rect x="10" y="32" width="24" height="5"/><rect x="10" y="42" width="24" height="5"/></g>`+
    `<rect x="17" y="15.5" width="10" height="3" rx="1" fill="#263238"/><rect x="18.5" y="9.5" width="7" height="6" rx="1" fill="#fff59d" stroke="#263238" stroke-width=".8"/><path d="M17.5 9.5L22 5.5l4.5 4z" fill="#b71c1c"/><path d="M11 49h22" stroke="#5d4037" stroke-width="3" stroke-linecap="round"/>`);
  if(k==='light')return W(30,36,`<radialGradient id="gl"><stop offset="0" stop-color="#fff59d"/><stop offset="1" stop-color="#ffd54f" stop-opacity="0"/></radialGradient><circle cx="15" cy="10" r="9" fill="url(#gl)"/><path d="M12 32l1.5-18h3L18 32z" fill="#eceff1" stroke="#455a64" stroke-width=".8"/><rect x="12.5" y="9" width="5" height="5" rx="1" fill="#ffeb3b" stroke="#455a64" stroke-width=".8"/><path d="M9 33h12" stroke="#5d4037" stroke-width="2.4" stroke-linecap="round"/>`);
  if(k==='beacon')return W(26,36,`${g('bg','#90a4ae','#546e7a')}<rect x="11" y="8" width="4" height="24" fill="url(#bg)"/><circle cx="13" cy="8" r="4" fill="#78909c" stroke="#37474f" stroke-width=".8"/><path d="M7 33h12" stroke="#5d4037" stroke-width="2.4" stroke-linecap="round"/>`);
  if(k==='rock'||k==='rock_awash')return W(32,24,`<path d="M4 18q4-11 10-12t9 5 5 7z" fill="#6d4c41" stroke="#3e2723" stroke-width=".8"/><path d="M10 12q3-3 6-3" stroke="#a1887f" stroke-width="1.4" fill="none"/>`+(k==='rock_awash'?'<path d="M2 18q4-3 7 0t7 0 7 0 7 0" stroke="#e3f2fd" stroke-width="2" fill="none"/>':'<path d="M2 15q4-3 7 0t7 0 7 0 7 0v6H2z" fill="#0277bd" opacity=".55"/>'));
  if(k==='wreck')return W(36,26,'<path d="M4 15l4 6h18l5-9-8 3z" fill="#6d4c41" stroke="#3e2723" stroke-width=".8" transform="rotate(-12 18 15)"/><path d="M15 14V4" stroke="#4e342e" stroke-width="1.6" transform="rotate(-25 15 14)"/><path d="M2 20q4-3 8 0t8 0 8 0 8 0v5H2z" fill="#0277bd" opacity=".6"/>');
  if(k==='danger')return W(30,30,'<path d="M15 3l12 21H3z" fill="#ffb300" stroke="#e65100" stroke-width="1.4" stroke-linejoin="round"/><path d="M15 10v7" stroke="#3e2723" stroke-width="2.4" stroke-linecap="round"/><circle cx="15" cy="20.5" r="1.4" fill="#3e2723"/>');
  const sh=k.startsWith('card_')||k==='isolated'?'pillar':SHAPE[k]||'pillar';const b=bandsOf(k);
  const clip={can:'M13 38V21h14v17z',cone:'M12 38l8-18 8 18z',sphere:'M12 37a8 8 0 1 1 16 0z',pillar:'M13 38l3-19h8l3 19z'}[sh];
  const hh=19,top=19,bh=hh/b.length;const strips=b.map((c,i)=>`<rect x="8" y="${top+i*bh}" width="24" height="${bh+.2}" fill="${c}"/>`).join('');
  const tm=topmarkFor(k,20,k.startsWith('card_')?6:9,6,'#263238');
  return W(40,46,`<linearGradient id="sh" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".4" stop-color="#fff" stop-opacity=".35"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>`+
    `<path d="M20 19v-4" stroke="#37474f" stroke-width="1.6"/><clipPath id="bc"><path d="${clip}"/></clipPath><g clip-path="url(#bc)">${strips}<rect x="8" y="15" width="24" height="25" fill="url(#sh)"/></g><path d="${clip}" fill="none" stroke="#263238" stroke-width=".8"/>${sea}${tm}`)}
// ---------------- E: antique engraved (Old chart) ----------------
const INK='#4a3018',VER='#9b3b26',VERD='#3f6f5f',OCH='#b8862b';
function E(k){const hatch=(id,c)=>`<pattern id="${id}" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.4" height="2.4" fill="${c}" opacity=".35"/><path d="M0 0v2.4" stroke="${c}" stroke-width="1"/></pattern>`;
  if(k==='light_major')return W(44,48,`${hatch('h','#6b4a2b')}<g stroke="${OCH}" stroke-width="1" opacity=".9">${[...Array(12)].map((_,i)=>{const a=i*30*Math.PI/180;return `<path d="M${22+Math.cos(a)*7} ${12+Math.sin(a)*7}L${22+Math.cos(a)*(i%2?11:15)} ${12+Math.sin(a)*(i%2?11:15)}"/>`}).join('')}</g>`+
    `<path d="M16 44l3-26h6l3 26z" fill="url(#h)" stroke="${INK}" stroke-width="1.1"/><path d="M18 9h8v7h-8z" fill="#efe4cb" stroke="${INK}"/><path d="M17 9l5-4 5 4z" fill="${VER}" stroke="${INK}" stroke-width=".8"/><path d="M16.5 18h11" stroke="${INK}" stroke-width="1.6"/><path d="M11 45h22" stroke="${INK}" stroke-width="1.4"/>`);
  if(k==='light')return W(28,30,`<g stroke="${OCH}" stroke-width=".9">${[...Array(8)].map((_,i)=>{const a=i*45*Math.PI/180;return `<path d="M${14+Math.cos(a)*4} ${12+Math.sin(a)*4}L${14+Math.cos(a)*9} ${12+Math.sin(a)*9}"/>`}).join('')}</g><circle cx="14" cy="12" r="2.6" fill="${OCH}" stroke="${INK}"/><path d="M14 15v11M10 26h8" stroke="${INK}" stroke-width="1.2"/>`);
  if(k==='beacon')return W(22,30,`<path d="M11 27V8M7 27h8" stroke="${INK}" stroke-width="1.4"/><path d="M8 6h6l-3 4z" fill="${INK}"/>`);
  if(k==='rock')return W(22,22,`<path d="M5 11h12M11 5v12" stroke="${INK}" stroke-width="1.5"/><circle cx="11" cy="11" r="1.4" fill="${INK}"/>`);
  if(k==='rock_awash')return W(22,22,`<path d="M5 11h12M11 5v12M7 7l8 8M15 7l-8 8" stroke="${INK}" stroke-width="1.2"/>`);
  if(k==='wreck')return W(32,22,`<path d="M4 11h24M10 6v10M16 4v14M22 6v10" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`);
  if(k==='danger')return W(30,30,`<circle cx="15" cy="15" r="11" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="1.5 2"/><text x="15" y="18" font-family="Georgia,serif" font-style="italic" font-size="7.5" text-anchor="middle" fill="${INK}">Obstn</text>`);
  const map={[R]:VER,[G]:VERD,[Y]:OCH,[K]:INK,[Wh]:'#efe4cb'};const b=bandsOf(k).map(c=>map[c]);
  const sh=k.startsWith('card_')||k==='isolated'?'pillar':SHAPE[k]||'pillar';const base=34;
  const pats=b.map((c,i)=>hatch('p'+i,c)).join('');
  const clip={can:`M14 ${base}v-13h12v13z`,cone:`M13 ${base}l7-15 7 15z`,sphere:`M13 ${base-1}a7 7 0 1 1 14 0z`,pillar:`M14 ${base}l2.5-18h7l2.5 18z`}[sh];
  const top=base-20,bh=20/b.length;const strips=b.map((c,i)=>`<rect x="10" y="${top+i*bh}" width="20" height="${bh+.2}" fill="${c==='#efe4cb'?'#efe4cb':'url(#p'+i+')'}"/>`).join('');
  const tm=topmarkFor(k,20,k.startsWith('card_')?8:6,6,INK,{r:VER,g:VERD,k:INK,y:OCH});
  return W(40,42,`${pats}<clipPath id="ec"><path d="${clip}"/></clipPath><g clip-path="url(#ec)">${strips}</g><path d="${clip}" fill="none" stroke="${INK}" stroke-width="1.1"/><path d="M11 ${base+1}q3-2 6 0t6 0 6 0" stroke="${INK}" stroke-width=".9" fill="none"/>${tm}`)}
const SETS={A,B,C,D,E};
const SET_INFO={A:'Modern flat — round badges (Navily/Apple-like)',B:'IALA / INT-1 paper chart — magenta light flares, true buoy shapes & topmarks',C:'Minimal outline — thin coloured line icons with white halo',D:'Illustrated — 3D-ish mini lighthouses and buoys with shading',E:'Antique engraved — sepia ink, hatching, for the Old chart'};
// light label styles per set
const LBL={A:{f:['Noto Sans Bold'],c:'#fff7e0',h:'rgba(20,20,20,.85)',s:11},B:{f:['Noto Sans Italic'],c:'#ff7ad9',h:'rgba(0,0,0,.85)',s:11},C:{f:['Noto Sans Regular'],c:'#ffffff',h:'rgba(0,0,0,.8)',s:10.5},D:{f:['Noto Sans Bold'],c:'#ffe082',h:'rgba(30,20,0,.85)',s:11},E:{f:['IM Fell Italic'],c:'#4a3018',h:'#e9dcc0',s:12}};
// chart-notation light label from OSM tags (expanded seamark:*)
function lightLabel(t){const CL={white:'W',red:'R',green:'G',yellow:'Y',blue:'Bu',orange:'Or',violet:'Vi',amber:'Am'};
  const P=[...new Set(Object.keys(t).map(k=>(k.match(/^seamark:light(:\d+)?:/)||[])[0]).filter(Boolean))];
  const groups=new Map();
  for(const p of P){const ch=t[p+'character'];if(!ch)continue;const gr=t[p+'group'],pe=t[p+'period'];
    const key=ch+'|'+(gr||'')+'|'+(pe||'');const g=groups.get(key)||{ch,gr,pe,col:new Set(),rng:[],h:[]};
    (t[p+'colour']||'').split(';').forEach(c=>c&&g.col.add(CL[c]||c));if(t[p+'range'])g.rng.push(+t[p+'range']);if(t[p+'height'])g.h.push(+t[p+'height']);groups.set(key,g)}
  const order=['W','R','G','Y','Bu','Or','Vi','Am'];
  return [...groups.values()].map(g=>{const cols=[...g.col].sort((a,b)=>order.indexOf(a)-order.indexOf(b)).join('');
    const rs=[...new Set(g.rng.sort((a,b)=>b-a))];
    return [g.ch+(g.gr?`(${g.gr})`:''),cols,g.pe?g.pe+'s':'',g.h.length?Math.max(...g.h)+'m':'',rs.length?rs.join('/')+'M':''].filter(Boolean).join(' ')}).join(' · ')}
// fixed classifier (category first, multi-colour aware)
function classify2(t){const st=t['seamark:type']||'';
  if(st==='light_major')return'light_major';if(st==='light_minor')return'light';if(st==='wreck')return'wreck';
  if(st==='rock'){const wl=t['seamark:rock:water_level']||'';return /awash|covers|dry/.test(wl)?'rock_awash':'rock'}
  if(st==='obstruction')return'danger';
  const m=st.match(/^(buoy|beacon)_(.*)$/);if(!m)return null;const kind=m[2],cat=t[`seamark:${st}:category`]||'',col=(t[`seamark:${st}:colour`]||'').split(';').filter(c=>c!=='white'||kind!=='lateral');
  if(kind==='lateral'){const both=col.includes('red')&&col.includes('green');if(both&&/preferred_channel_port/.test(cat))return'lat_greenred';if(both&&/preferred_channel_starboard/.test(cat))return'lat_redgreen';
    if(/starboard|right/.test(cat))return'lat_green';if(/port|left/.test(cat))return'lat_red';
    if(col.includes('green')&&!col.includes('red'))return'lat_green';if(col.includes('red')&&!col.includes('green'))return'lat_red';return'beacon'}
  if(kind==='cardinal')return['north','south','east','west'].includes(cat)?'card_'+cat:'beacon';
  if(kind==='isolated_danger')return'isolated';if(kind==='safe_water')return'safe';if(kind==='special_purpose')return'special';return'beacon'}


return{D,E,KEYS,lightLabel,classify2}})();
for(const k of SE.KEYS){ICONS[k]=SE.E(k);ICONS['D_'+k]=SE.D(k)}
// secondary POIs in matching styles: E (antique ink) and D (illustrated)
{const I='#4a3018',w=(a,b,c)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${a}" height="${b}" viewBox="0 0 ${a} ${b}">${c}</svg>`;
 const anc=(c,sw)=>`<g fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"><circle cx="18" cy="9.5" r="2.4"/><path d="M18 12v15M13.5 15.5h9M10.5 21.5c1 4.5 4 6.5 7.5 6.5s6.5-2 7.5-6.5"/></g>`;
 const POI_E={
  harbour:w(36,36,`<circle cx="18" cy="18" r="15" fill="#efe4cb" stroke="${I}" stroke-width="1.2"/><circle cx="18" cy="18" r="12.5" fill="none" stroke="${I}" stroke-width=".6"/><g transform="translate(3.6 3.4) scale(.8)">${anc(I,1.8)}</g>`),
  anchorage:`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="36" height="36" viewBox="0 0 36 36"><path d="M0.61 31.71C0.63 31.69 0.66 31.67 0.68 31.67C0.81 31.67 1.66 31.35 1.99 31.17C2.54 30.88 2.98 30.61 3.60 30.16C3.93 29.93 4.55 29.46 4.58 29.43C4.62 29.39 5.74 28.56 6.05 28.35C7.33 27.48 8.46 26.97 9.38 26.87C10.30 26.77 10.97 26.94 12.54 27.67C14.28 28.48 15.02 28.59 16.15 28.22C17.19 27.87 18.02 27.35 19.72 25.99C22.07 24.11 23.25 23.53 24.73 23.52C25.88 23.52 26.59 23.87 28.41 25.36C29.89 26.57 30.59 27.02 31.42 27.29C31.60 27.34 31.74 27.40 31.74 27.41C31.74 27.45 31.02 27.38 30.71 27.31C29.98 27.16 29.50 26.97 28.12 26.28C26.37 25.42 25.60 25.21 24.50 25.33C23.20 25.47 22.08 26.06 20.07 27.65C18.26 29.08 17.39 29.60 16.33 29.89C15.86 30.02 14.96 30.03 14.43 29.91C13.96 29.81 13.28 29.57 12.62 29.29C11.24 28.70 10.63 28.49 9.90 28.35C9.52 28.28 8.52 28.30 8.12 28.38C7.08 28.61 6.39 28.95 4.20 30.31C3.33 30.85 2.46 31.30 1.94 31.47C1.39 31.65 0.56 31.80 0.61 31.71ZM15.98 30.95C15.98 30.93 16.00 30.92 16.03 30.92C16.24 30.92 17.36 30.44 17.78 30.17C17.85 30.13 17.91 30.09 17.92 30.09C17.97 30.09 19.17 29.31 19.96 28.76C20.40 28.44 20.57 28.32 20.66 28.26C20.70 28.24 20.98 28.05 21.27 27.86C21.56 27.66 21.86 27.47 21.93 27.44C22.00 27.40 22.08 27.35 22.11 27.33C22.17 27.28 22.82 26.94 23.08 26.83C24.32 26.29 25.58 26.30 26.87 26.85C27.04 26.92 27.66 27.22 28.26 27.52C29.82 28.30 30.38 28.53 31.18 28.69C31.72 28.80 32.42 28.80 32.86 28.69C33.66 28.48 34.52 27.90 35.16 27.13C35.61 26.59 35.32 27.16 34.81 27.81C33.91 28.96 32.87 29.48 31.58 29.42C30.72 29.38 30.00 29.18 28.00 28.41C26.62 27.87 26.04 27.72 25.20 27.68C24.35 27.63 23.47 27.83 22.48 28.29C21.88 28.57 21.68 28.67 20.95 29.05C18.93 30.12 18.28 30.42 17.37 30.70C16.72 30.89 15.98 31.03 15.98 30.95ZM14.76 27.38C14.29 27.32 13.77 27.14 12.93 26.73C12.66 26.60 12.44 26.49 12.43 26.49C12.42 26.49 12.34 26.46 12.25 26.42C11.83 26.23 11.47 26.11 11.05 26.02C10.96 26.00 10.84 25.97 10.79 25.95C10.74 25.94 10.64 25.93 10.58 25.93C10.51 25.93 10.45 25.91 10.43 25.89C10.42 25.86 10.45 25.86 10.57 25.87C10.88 25.91 11.01 25.93 11.12 25.96C11.18 25.97 11.30 26.00 11.38 26.02C11.63 26.08 12.27 26.30 12.49 26.40C12.60 26.45 12.70 26.49 12.71 26.49C12.72 26.49 12.80 26.53 12.89 26.57C12.98 26.61 13.14 26.68 13.23 26.72C13.33 26.75 13.45 26.80 13.50 26.83C14.06 27.08 15.14 27.26 15.43 27.14L15.50 27.11L15.41 26.91C15.18 26.43 14.68 25.79 13.82 24.92C12.83 23.91 12.51 23.54 12.13 22.96C11.05 21.35 10.93 19.51 11.73 17.13C11.84 16.80 11.89 16.62 11.87 16.60C11.85 16.58 11.60 16.56 11.26 16.56C10.94 16.56 10.67 16.55 10.67 16.54C10.67 16.44 11.39 15.70 11.85 15.34C12.27 15.00 13.12 14.48 13.22 14.50C13.28 14.51 13.31 14.63 13.43 15.30C13.54 15.96 13.51 17.62 13.38 17.67C13.36 17.68 13.17 17.51 12.95 17.30C12.74 17.09 12.55 16.93 12.53 16.93C12.38 16.98 12.30 18.39 12.40 19.11C12.64 20.89 13.78 22.28 15.19 22.53C15.83 22.64 16.37 22.40 16.78 21.82C16.97 21.56 17.67 20.40 18.02 19.77C18.06 19.71 18.19 19.47 18.32 19.25C18.45 19.02 18.64 18.70 18.73 18.54C18.82 18.37 18.93 18.18 18.97 18.10C19.14 17.79 19.20 17.68 19.41 17.31C19.52 17.09 19.63 16.90 19.64 16.88C19.65 16.86 19.74 16.71 19.83 16.53C19.92 16.36 20.01 16.20 20.02 16.18C20.03 16.17 20.13 15.98 20.24 15.77C20.35 15.57 20.50 15.29 20.57 15.16C21.04 14.26 21.82 12.73 21.83 12.67C21.85 12.63 21.84 12.60 21.80 12.59C21.62 12.52 20.26 11.66 19.83 11.35C19.66 11.23 19.59 11.22 19.43 11.31C18.97 11.55 18.75 10.99 19.05 10.38C19.39 9.69 19.90 9.57 20.00 10.14C20.03 10.28 20.00 10.26 20.67 10.44C21.23 10.58 21.60 10.70 22.17 10.92C22.52 11.05 22.63 11.08 22.65 11.05C22.72 10.95 23.49 9.33 23.49 9.29C23.49 9.28 23.44 9.22 23.38 9.16C22.93 8.72 22.71 8.18 22.71 7.54C22.71 7.10 22.74 6.97 23.05 6.30C23.11 6.18 23.21 5.95 23.28 5.80C23.70 4.86 24.44 4.33 25.36 4.33C26.19 4.33 27.27 4.92 27.67 5.60C27.89 5.96 27.96 6.23 27.96 6.71C27.96 7.16 27.93 7.32 27.72 7.77C27.67 7.88 27.53 8.19 27.41 8.45C27.16 9.02 27.08 9.14 26.79 9.41C26.38 9.80 25.99 9.95 25.36 9.96L24.93 9.97L24.86 10.14C24.60 10.76 24.19 11.78 24.19 11.80C24.19 11.82 24.24 11.86 24.31 11.89C24.54 12.00 25.35 12.49 25.89 12.85C26.58 13.31 26.52 13.28 26.60 13.22C27.24 12.80 27.43 13.83 26.83 14.48C26.52 14.82 26.24 14.79 26.13 14.41C26.07 14.21 26.07 14.21 25.56 14.07C24.98 13.92 24.49 13.76 24.00 13.58C23.63 13.44 23.57 13.43 23.54 13.47C23.43 13.62 22.18 16.98 21.44 19.12C20.92 20.62 20.15 23.06 20.08 23.44C20.05 23.65 20.06 24.11 20.10 24.15C20.11 24.16 20.24 24.08 20.38 23.98C21.56 23.17 22.60 22.64 23.42 22.44C24.24 22.24 25.31 22.27 25.97 22.49L26.10 22.54L26.37 22.30C26.85 21.89 27.84 21.27 27.89 21.35C27.92 21.41 28.07 22.03 28.11 22.31C28.13 22.43 28.15 22.80 28.16 23.13C28.16 23.46 28.17 23.73 28.18 23.73C28.30 23.80 28.82 24.23 29.56 24.90C30.13 25.41 30.17 25.45 30.15 25.48C30.14 25.49 30.10 25.47 30.07 25.43C30.04 25.40 29.97 25.34 29.91 25.29C29.84 25.25 29.50 24.98 29.15 24.70C27.03 22.99 26.25 22.59 24.91 22.53C23.27 22.45 21.76 23.14 19.39 25.04C17.60 26.47 16.74 27.01 15.87 27.27C15.62 27.34 15.15 27.42 15.03 27.41C15.01 27.40 14.88 27.39 14.76 27.38ZM15.54 26.33C15.19 25.34 14.66 24.46 13.78 23.38C12.91 22.32 12.70 22.04 12.42 21.53C11.84 20.49 11.71 19.06 12.03 17.43C12.07 17.27 12.09 17.13 12.08 17.12C12.06 17.10 11.85 17.79 11.76 18.14C11.29 20.11 11.57 21.71 12.64 23.12C12.91 23.49 13.15 23.75 13.93 24.57C14.91 25.60 15.17 25.90 15.47 26.39C15.55 26.51 15.62 26.61 15.62 26.61C15.63 26.60 15.59 26.48 15.54 26.33ZM16.89 22.84C17.57 22.70 18.15 22.30 18.55 21.68C18.82 21.28 19.26 20.40 19.89 19.04C19.93 18.95 20.06 18.68 20.16 18.44C20.67 17.35 21.20 16.15 21.59 15.25C21.74 14.90 21.92 14.46 22.00 14.29C22.07 14.12 22.20 13.80 22.29 13.59C22.38 13.39 22.47 13.19 22.48 13.15C22.50 13.12 22.73 12.56 23.01 11.92C23.28 11.28 23.57 10.60 23.65 10.41C24.07 9.44 24.19 9.15 24.23 8.96C24.30 8.69 24.35 8.58 24.46 8.53C24.57 8.47 24.56 8.43 24.42 8.43C24.11 8.43 24.00 8.59 23.54 9.64C23.31 10.19 23.21 10.40 22.82 11.23C22.58 11.75 21.15 14.61 20.81 15.25C20.67 15.52 20.44 15.96 20.31 16.22C19.96 16.89 19.50 17.73 18.66 19.23C17.59 21.16 17.18 21.85 16.90 22.20C16.66 22.48 16.20 22.77 15.82 22.85C15.66 22.89 15.67 22.89 16.15 22.89C16.49 22.89 16.72 22.88 16.89 22.84ZM27.44 22.14C27.62 22.13 27.66 22.14 27.72 22.20C27.80 22.28 27.80 22.27 27.76 22.02C27.71 21.77 27.70 21.76 27.45 21.90C27.27 22.01 26.78 22.34 26.78 22.37C26.78 22.37 26.88 22.33 27.00 22.27C27.18 22.18 27.28 22.15 27.44 22.14ZM11.92 16.16C11.87 15.96 12.12 15.63 12.56 15.28C12.84 15.07 12.86 15.04 12.71 15.13C12.35 15.33 11.73 15.82 11.49 16.09L11.37 16.22L11.65 16.23L11.94 16.23L11.92 16.16ZM26.65 14.32C26.72 14.25 26.72 14.24 26.66 14.24C26.63 14.24 26.54 14.19 26.46 14.12C26.36 14.04 26.33 14.02 26.35 14.07C26.37 14.13 26.42 14.26 26.45 14.36C26.47 14.43 26.57 14.41 26.65 14.32ZM21.46 12.00C21.44 11.99 21.26 11.86 21.05 11.72C20.84 11.58 20.50 11.33 20.29 11.17C20.06 10.98 19.84 10.84 19.74 10.80C19.41 10.67 19.35 10.56 19.47 10.32C19.50 10.26 19.51 10.23 19.48 10.25C19.43 10.28 19.27 10.63 19.24 10.76C19.20 10.99 19.23 11.01 19.57 11.01L19.88 11.01L20.27 11.27C20.82 11.64 21.58 12.11 21.46 12.00ZM26.11 9.12C26.44 9.01 26.67 8.82 26.82 8.54C27.02 8.17 27.44 7.15 27.48 6.96C27.57 6.45 27.33 5.88 26.89 5.58C26.81 5.52 26.82 5.54 26.93 5.66C27.26 6.02 27.37 6.54 27.22 7.01C27.16 7.21 26.98 7.64 26.65 8.32C26.45 8.75 26.15 9.03 25.74 9.16L25.56 9.22L25.75 9.20C25.85 9.19 26.01 9.16 26.11 9.12ZM25.64 8.86C26.01 8.75 26.20 8.55 26.43 8.05C26.51 7.87 26.60 7.67 26.63 7.61C26.92 6.98 26.96 6.82 26.90 6.54C26.80 6.04 26.43 5.71 25.71 5.46C25.30 5.33 24.87 5.42 24.57 5.72C24.43 5.86 24.27 6.16 23.94 6.95C23.71 7.48 23.71 7.80 23.94 8.17L24.00 8.27L24.13 8.22C24.57 8.07 25.17 8.35 25.33 8.79C25.38 8.92 25.40 8.93 25.64 8.86ZM23.34 8.52C23.11 7.97 23.15 7.46 23.49 6.71C23.55 6.59 23.68 6.30 23.78 6.07C24.01 5.55 24.13 5.37 24.40 5.12C24.62 4.91 24.82 4.79 25.08 4.72C25.23 4.68 25.24 4.68 25.14 4.68C24.61 4.67 23.94 5.13 23.68 5.70C23.61 5.85 23.50 6.09 23.43 6.23C23.06 7.03 23.01 7.21 23.03 7.66C23.05 8.01 23.11 8.23 23.28 8.51C23.40 8.71 23.43 8.72 23.34 8.52Z" fill="#7a3b5a" fill-rule="evenodd"/></svg>`,
  marina:`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><defs></defs><g transform="translate(18 15.5) scale(0.9) translate(-18 -18)"><path d="M3.6 14.2C3.6 12.9 4.8 12.4 6.1 12.8C9.8 14 13.4 14.6 18 14.6S26.2 14 29.9 12.8C31.2 12.4 32.4 12.9 32.4 14.2C32.4 15.7 31 16.6 28.8 17.2C25.6 18 23.6 18.7 22.9 20.4L23.3 23H12.7L13.1 20.4C12.4 18.7 10.4 18 7.2 17.2C5 16.6 3.6 15.7 3.6 14.2Z M15.7 23C15.8 21.3 16.7 20.3 18 20.3S20.2 21.3 20.3 23Z" fill-rule="evenodd" fill="#f1e6cc" stroke="#f1e6cc" stroke-width="2.4" paint-order="stroke"/><clipPath id="cc"><path d="M3.6 14.2C3.6 12.9 4.8 12.4 6.1 12.8C9.8 14 13.4 14.6 18 14.6S26.2 14 29.9 12.8C31.2 12.4 32.4 12.9 32.4 14.2C32.4 15.7 31 16.6 28.8 17.2C25.6 18 23.6 18.7 22.9 20.4L23.3 23H12.7L13.1 20.4C12.4 18.7 10.4 18 7.2 17.2C5 16.6 3.6 15.7 3.6 14.2Z M15.7 23C15.8 21.3 16.7 20.3 18 20.3S20.2 21.3 20.3 23Z" fill-rule="evenodd"/></clipPath><g clip-path="url(#cc)" stroke="#3d2914" stroke-width="0.6" opacity=".75"><path d="M6 24L11 15.8"/><path d="M8.8 24L13.8 15.8"/><path d="M11.6 24L16.6 15.8"/><path d="M14.399999999999999 24L19.4 15.8"/><path d="M17.2 24L22.2 15.8"/><path d="M20 24L25 15.8"/><path d="M22.799999999999997 24L27.799999999999997 15.8"/><path d="M25.599999999999998 24L30.599999999999998 15.8"/><path d="M28.4 24L33.4 15.8"/></g><path d="M3.6 14.2C3.6 12.9 4.8 12.4 6.1 12.8C9.8 14 13.4 14.6 18 14.6S26.2 14 29.9 12.8C31.2 12.4 32.4 12.9 32.4 14.2C32.4 15.7 31 16.6 28.8 17.2C25.6 18 23.6 18.7 22.9 20.4L23.3 23H12.7L13.1 20.4C12.4 18.7 10.4 18 7.2 17.2C5 16.6 3.6 15.7 3.6 14.2Z M15.7 23C15.8 21.3 16.7 20.3 18 20.3S20.2 21.3 20.3 23Z" fill-rule="evenodd" fill="none" stroke="#3d2914" stroke-width="1.1" stroke-linejoin="round"/><path d="M10.5 23H25.5A1 1 0 0126.5 24V25.4H9.5V24A1 1 0 0110.5 23Z" fill="#f1e6cc" stroke="#3d2914" stroke-width="1.1" stroke-linejoin="round"/><path d="M7 13.9C11 15.1 14 15.6 18 15.6S25 15.1 29 13.9" stroke="#3d2914" stroke-width=".4" fill="none"/></g><rect x="4.5" y="21.6" width="27" height="7.4" rx="0" fill="#e6d7b5" stroke="#3d2914" stroke-width="1.1" paint-order="stroke"/><path d="M4.5 23.8H31.5M14.76 23.8V29M24.75 23.8V29" stroke="#3d2914" stroke-width="0.7" fill="none"/><g stroke="#3d2914" stroke-width=".4"><path d="M5.5 28.7l1.6 -3.4"/><path d="M9.666666666666668 28.7l1.6 -3.4"/><path d="M13.833333333333334 28.7l1.6 -3.4"/><path d="M18 28.7l1.6 -3.4"/><path d="M22.166666666666668 28.7l1.6 -3.4"/><path d="M26.333333333333332 28.7l1.6 -3.4"/></g><path d="M5 32.6q1 -1 2 0t2 0q1 -1 2 0t2 0q1 -1 2 0t2 0q1 -1 2 0t2 0q1 -1 2 0t2 0q1 -1 2 0t2 0q1 -1 2 0t2 0" stroke="#3d2914" stroke-width="0.8" fill="none" stroke-linecap="round"/></svg>`,
  mooring:w(30,30,`<circle cx="15" cy="17" r="7" fill="#efe4cb" stroke="${I}" stroke-width="1.3"/><circle cx="15" cy="8" r="3" fill="none" stroke="${I}" stroke-width="1.3"/><path d="M8 17h14" stroke="${I}" stroke-width=".8"/>`),
  fuel:w(32,36,`<rect x="8" y="8" width="12" height="22" rx="1.5" fill="#D2691E" stroke="${I}" stroke-width="1.3"/><rect x="10.5" y="11" width="7" height="6" fill="#efe4cb" stroke="${I}"/><path d="M20 13h3.5v12a2 2 0 004 0V15l-3-4" fill="none" stroke="${I}" stroke-width="1.6"/><path d="M6 30h16" stroke="${I}" stroke-width="1.6"/><text x="14" y="27" font-family="Georgia,serif" font-style="italic" font-weight="bold" font-size="6.5" text-anchor="middle" fill="#efe4cb">F</text>`)};
 const gr=(id,a,b)=>`<radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
 const ball=(id,a,b,inner)=>w(36,36,`<defs>${gr(id,a,b)}</defs><circle cx="18" cy="18" r="14.5" fill="url(#${id})" stroke="#fff" stroke-width="2"/>${inner}`);
 const POI_D={
  harbour:ball('h','#4f8fe0','#123f86',`<g transform="translate(3.6 3.6) scale(.8)">${anc('#fff',2.6)}</g>`),
  anchorage:`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="36" height="36" viewBox="0 0 36 36"><defs><radialGradient id="a" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#a46ad1"/><stop offset="1" stop-color="#4a1d73"/></radialGradient><clipPath id="cb"><circle cx="18" cy="18" r="13.7"/></clipPath></defs><circle cx="18" cy="18" r="14.5" fill="url(#a)" stroke="#fff" stroke-width="2"/><g clip-path="url(#cb)"><g transform="translate(5.2 4.4) scale(.72)"><path d="M0.61 31.71C0.63 31.69 0.66 31.67 0.68 31.67C0.81 31.67 1.66 31.35 1.99 31.17C2.54 30.88 2.98 30.61 3.60 30.16C3.93 29.93 4.55 29.46 4.58 29.43C4.62 29.39 5.74 28.56 6.05 28.35C7.33 27.48 8.46 26.97 9.38 26.87C10.30 26.77 10.97 26.94 12.54 27.67C14.28 28.48 15.02 28.59 16.15 28.22C17.19 27.87 18.02 27.35 19.72 25.99C22.07 24.11 23.25 23.53 24.73 23.52C25.88 23.52 26.59 23.87 28.41 25.36C29.89 26.57 30.59 27.02 31.42 27.29C31.60 27.34 31.74 27.40 31.74 27.41C31.74 27.45 31.02 27.38 30.71 27.31C29.98 27.16 29.50 26.97 28.12 26.28C26.37 25.42 25.60 25.21 24.50 25.33C23.20 25.47 22.08 26.06 20.07 27.65C18.26 29.08 17.39 29.60 16.33 29.89C15.86 30.02 14.96 30.03 14.43 29.91C13.96 29.81 13.28 29.57 12.62 29.29C11.24 28.70 10.63 28.49 9.90 28.35C9.52 28.28 8.52 28.30 8.12 28.38C7.08 28.61 6.39 28.95 4.20 30.31C3.33 30.85 2.46 31.30 1.94 31.47C1.39 31.65 0.56 31.80 0.61 31.71ZM15.98 30.95C15.98 30.93 16.00 30.92 16.03 30.92C16.24 30.92 17.36 30.44 17.78 30.17C17.85 30.13 17.91 30.09 17.92 30.09C17.97 30.09 19.17 29.31 19.96 28.76C20.40 28.44 20.57 28.32 20.66 28.26C20.70 28.24 20.98 28.05 21.27 27.86C21.56 27.66 21.86 27.47 21.93 27.44C22.00 27.40 22.08 27.35 22.11 27.33C22.17 27.28 22.82 26.94 23.08 26.83C24.32 26.29 25.58 26.30 26.87 26.85C27.04 26.92 27.66 27.22 28.26 27.52C29.82 28.30 30.38 28.53 31.18 28.69C31.72 28.80 32.42 28.80 32.86 28.69C33.66 28.48 34.52 27.90 35.16 27.13C35.61 26.59 35.32 27.16 34.81 27.81C33.91 28.96 32.87 29.48 31.58 29.42C30.72 29.38 30.00 29.18 28.00 28.41C26.62 27.87 26.04 27.72 25.20 27.68C24.35 27.63 23.47 27.83 22.48 28.29C21.88 28.57 21.68 28.67 20.95 29.05C18.93 30.12 18.28 30.42 17.37 30.70C16.72 30.89 15.98 31.03 15.98 30.95ZM14.76 27.38C14.29 27.32 13.77 27.14 12.93 26.73C12.66 26.60 12.44 26.49 12.43 26.49C12.42 26.49 12.34 26.46 12.25 26.42C11.83 26.23 11.47 26.11 11.05 26.02C10.96 26.00 10.84 25.97 10.79 25.95C10.74 25.94 10.64 25.93 10.58 25.93C10.51 25.93 10.45 25.91 10.43 25.89C10.42 25.86 10.45 25.86 10.57 25.87C10.88 25.91 11.01 25.93 11.12 25.96C11.18 25.97 11.30 26.00 11.38 26.02C11.63 26.08 12.27 26.30 12.49 26.40C12.60 26.45 12.70 26.49 12.71 26.49C12.72 26.49 12.80 26.53 12.89 26.57C12.98 26.61 13.14 26.68 13.23 26.72C13.33 26.75 13.45 26.80 13.50 26.83C14.06 27.08 15.14 27.26 15.43 27.14L15.50 27.11L15.41 26.91C15.18 26.43 14.68 25.79 13.82 24.92C12.83 23.91 12.51 23.54 12.13 22.96C11.05 21.35 10.93 19.51 11.73 17.13C11.84 16.80 11.89 16.62 11.87 16.60C11.85 16.58 11.60 16.56 11.26 16.56C10.94 16.56 10.67 16.55 10.67 16.54C10.67 16.44 11.39 15.70 11.85 15.34C12.27 15.00 13.12 14.48 13.22 14.50C13.28 14.51 13.31 14.63 13.43 15.30C13.54 15.96 13.51 17.62 13.38 17.67C13.36 17.68 13.17 17.51 12.95 17.30C12.74 17.09 12.55 16.93 12.53 16.93C12.38 16.98 12.30 18.39 12.40 19.11C12.64 20.89 13.78 22.28 15.19 22.53C15.83 22.64 16.37 22.40 16.78 21.82C16.97 21.56 17.67 20.40 18.02 19.77C18.06 19.71 18.19 19.47 18.32 19.25C18.45 19.02 18.64 18.70 18.73 18.54C18.82 18.37 18.93 18.18 18.97 18.10C19.14 17.79 19.20 17.68 19.41 17.31C19.52 17.09 19.63 16.90 19.64 16.88C19.65 16.86 19.74 16.71 19.83 16.53C19.92 16.36 20.01 16.20 20.02 16.18C20.03 16.17 20.13 15.98 20.24 15.77C20.35 15.57 20.50 15.29 20.57 15.16C21.04 14.26 21.82 12.73 21.83 12.67C21.85 12.63 21.84 12.60 21.80 12.59C21.62 12.52 20.26 11.66 19.83 11.35C19.66 11.23 19.59 11.22 19.43 11.31C18.97 11.55 18.75 10.99 19.05 10.38C19.39 9.69 19.90 9.57 20.00 10.14C20.03 10.28 20.00 10.26 20.67 10.44C21.23 10.58 21.60 10.70 22.17 10.92C22.52 11.05 22.63 11.08 22.65 11.05C22.72 10.95 23.49 9.33 23.49 9.29C23.49 9.28 23.44 9.22 23.38 9.16C22.93 8.72 22.71 8.18 22.71 7.54C22.71 7.10 22.74 6.97 23.05 6.30C23.11 6.18 23.21 5.95 23.28 5.80C23.70 4.86 24.44 4.33 25.36 4.33C26.19 4.33 27.27 4.92 27.67 5.60C27.89 5.96 27.96 6.23 27.96 6.71C27.96 7.16 27.93 7.32 27.72 7.77C27.67 7.88 27.53 8.19 27.41 8.45C27.16 9.02 27.08 9.14 26.79 9.41C26.38 9.80 25.99 9.95 25.36 9.96L24.93 9.97L24.86 10.14C24.60 10.76 24.19 11.78 24.19 11.80C24.19 11.82 24.24 11.86 24.31 11.89C24.54 12.00 25.35 12.49 25.89 12.85C26.58 13.31 26.52 13.28 26.60 13.22C27.24 12.80 27.43 13.83 26.83 14.48C26.52 14.82 26.24 14.79 26.13 14.41C26.07 14.21 26.07 14.21 25.56 14.07C24.98 13.92 24.49 13.76 24.00 13.58C23.63 13.44 23.57 13.43 23.54 13.47C23.43 13.62 22.18 16.98 21.44 19.12C20.92 20.62 20.15 23.06 20.08 23.44C20.05 23.65 20.06 24.11 20.10 24.15C20.11 24.16 20.24 24.08 20.38 23.98C21.56 23.17 22.60 22.64 23.42 22.44C24.24 22.24 25.31 22.27 25.97 22.49L26.10 22.54L26.37 22.30C26.85 21.89 27.84 21.27 27.89 21.35C27.92 21.41 28.07 22.03 28.11 22.31C28.13 22.43 28.15 22.80 28.16 23.13C28.16 23.46 28.17 23.73 28.18 23.73C28.30 23.80 28.82 24.23 29.56 24.90C30.13 25.41 30.17 25.45 30.15 25.48C30.14 25.49 30.10 25.47 30.07 25.43C30.04 25.40 29.97 25.34 29.91 25.29C29.84 25.25 29.50 24.98 29.15 24.70C27.03 22.99 26.25 22.59 24.91 22.53C23.27 22.45 21.76 23.14 19.39 25.04C17.60 26.47 16.74 27.01 15.87 27.27C15.62 27.34 15.15 27.42 15.03 27.41C15.01 27.40 14.88 27.39 14.76 27.38ZM15.54 26.33C15.19 25.34 14.66 24.46 13.78 23.38C12.91 22.32 12.70 22.04 12.42 21.53C11.84 20.49 11.71 19.06 12.03 17.43C12.07 17.27 12.09 17.13 12.08 17.12C12.06 17.10 11.85 17.79 11.76 18.14C11.29 20.11 11.57 21.71 12.64 23.12C12.91 23.49 13.15 23.75 13.93 24.57C14.91 25.60 15.17 25.90 15.47 26.39C15.55 26.51 15.62 26.61 15.62 26.61C15.63 26.60 15.59 26.48 15.54 26.33ZM16.89 22.84C17.57 22.70 18.15 22.30 18.55 21.68C18.82 21.28 19.26 20.40 19.89 19.04C19.93 18.95 20.06 18.68 20.16 18.44C20.67 17.35 21.20 16.15 21.59 15.25C21.74 14.90 21.92 14.46 22.00 14.29C22.07 14.12 22.20 13.80 22.29 13.59C22.38 13.39 22.47 13.19 22.48 13.15C22.50 13.12 22.73 12.56 23.01 11.92C23.28 11.28 23.57 10.60 23.65 10.41C24.07 9.44 24.19 9.15 24.23 8.96C24.30 8.69 24.35 8.58 24.46 8.53C24.57 8.47 24.56 8.43 24.42 8.43C24.11 8.43 24.00 8.59 23.54 9.64C23.31 10.19 23.21 10.40 22.82 11.23C22.58 11.75 21.15 14.61 20.81 15.25C20.67 15.52 20.44 15.96 20.31 16.22C19.96 16.89 19.50 17.73 18.66 19.23C17.59 21.16 17.18 21.85 16.90 22.20C16.66 22.48 16.20 22.77 15.82 22.85C15.66 22.89 15.67 22.89 16.15 22.89C16.49 22.89 16.72 22.88 16.89 22.84ZM27.44 22.14C27.62 22.13 27.66 22.14 27.72 22.20C27.80 22.28 27.80 22.27 27.76 22.02C27.71 21.77 27.70 21.76 27.45 21.90C27.27 22.01 26.78 22.34 26.78 22.37C26.78 22.37 26.88 22.33 27.00 22.27C27.18 22.18 27.28 22.15 27.44 22.14ZM11.92 16.16C11.87 15.96 12.12 15.63 12.56 15.28C12.84 15.07 12.86 15.04 12.71 15.13C12.35 15.33 11.73 15.82 11.49 16.09L11.37 16.22L11.65 16.23L11.94 16.23L11.92 16.16ZM26.65 14.32C26.72 14.25 26.72 14.24 26.66 14.24C26.63 14.24 26.54 14.19 26.46 14.12C26.36 14.04 26.33 14.02 26.35 14.07C26.37 14.13 26.42 14.26 26.45 14.36C26.47 14.43 26.57 14.41 26.65 14.32ZM21.46 12.00C21.44 11.99 21.26 11.86 21.05 11.72C20.84 11.58 20.50 11.33 20.29 11.17C20.06 10.98 19.84 10.84 19.74 10.80C19.41 10.67 19.35 10.56 19.47 10.32C19.50 10.26 19.51 10.23 19.48 10.25C19.43 10.28 19.27 10.63 19.24 10.76C19.20 10.99 19.23 11.01 19.57 11.01L19.88 11.01L20.27 11.27C20.82 11.64 21.58 12.11 21.46 12.00ZM26.11 9.12C26.44 9.01 26.67 8.82 26.82 8.54C27.02 8.17 27.44 7.15 27.48 6.96C27.57 6.45 27.33 5.88 26.89 5.58C26.81 5.52 26.82 5.54 26.93 5.66C27.26 6.02 27.37 6.54 27.22 7.01C27.16 7.21 26.98 7.64 26.65 8.32C26.45 8.75 26.15 9.03 25.74 9.16L25.56 9.22L25.75 9.20C25.85 9.19 26.01 9.16 26.11 9.12ZM25.64 8.86C26.01 8.75 26.20 8.55 26.43 8.05C26.51 7.87 26.60 7.67 26.63 7.61C26.92 6.98 26.96 6.82 26.90 6.54C26.80 6.04 26.43 5.71 25.71 5.46C25.30 5.33 24.87 5.42 24.57 5.72C24.43 5.86 24.27 6.16 23.94 6.95C23.71 7.48 23.71 7.80 23.94 8.17L24.00 8.27L24.13 8.22C24.57 8.07 25.17 8.35 25.33 8.79C25.38 8.92 25.40 8.93 25.64 8.86ZM23.34 8.52C23.11 7.97 23.15 7.46 23.49 6.71C23.55 6.59 23.68 6.30 23.78 6.07C24.01 5.55 24.13 5.37 24.40 5.12C24.62 4.91 24.82 4.79 25.08 4.72C25.23 4.68 25.24 4.68 25.14 4.68C24.61 4.67 23.94 5.13 23.68 5.70C23.61 5.85 23.50 6.09 23.43 6.23C23.06 7.03 23.01 7.21 23.03 7.66C23.05 8.01 23.11 8.23 23.28 8.51C23.40 8.71 23.43 8.72 23.34 8.52Z" fill="#fff" fill-rule="evenodd"/></g></g></svg>`,
  marina:`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><defs></defs><g transform="translate(18 15.5) scale(0.9) translate(-18 -18)"><path d="M3.6 14.2C3.6 12.9 4.8 12.4 6.1 12.8C9.8 14 13.4 14.6 18 14.6S26.2 14 29.9 12.8C31.2 12.4 32.4 12.9 32.4 14.2C32.4 15.7 31 16.6 28.8 17.2C25.6 18 23.6 18.7 22.9 20.4L23.3 23H12.7L13.1 20.4C12.4 18.7 10.4 18 7.2 17.2C5 16.6 3.6 15.7 3.6 14.2Z M15.7 23C15.8 21.3 16.7 20.3 18 20.3S20.2 21.3 20.3 23Z" fill-rule="evenodd" fill="#1e7fc4" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"/><path d="M10.5 23H25.5A1 1 0 0126.5 24V25.4H9.5V24A1 1 0 0110.5 23Z" fill="#1e7fc4" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"/></g><rect x="4.5" y="21.6" width="27" height="5.6" rx="1" fill="#c9874a" stroke="#fff" stroke-width="1.6" paint-order="stroke"/><path d="M4.5 24.400000000000002H31.5" stroke="#5a3415" stroke-width=".7"/><rect x="5.3" y="24.400000000000002" width="25.4" height="2.8" fill="#a86a33" opacity=".6"/><path d="M7.5 27.200000000000003v3.2M28.5 27.200000000000003v3.2" stroke="#5a3415" stroke-width="1.4"/><path d="M5 32.5q1 -1 2 0t2 0q1 -1 2 0t2 0q1 -1 2 0t2 0q1 -1 2 0t2 0q1 -1 2 0t2 0q1 -1 2 0t2 0q1 -1 2 0t2 0" stroke="#e1f5fe" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`,
  mooring:w(30,32,`<defs>${gr('o','#ffb74d','#e65100')}</defs><circle cx="15" cy="19" r="8" fill="url(#o)" stroke="#fff" stroke-width="1.5"/><circle cx="15" cy="8.5" r="3.2" fill="none" stroke="#eceff1" stroke-width="2"/><path d="M6 27q3-2 6 0t6 0 6 0" stroke="#bfe9ff" stroke-width="1.3" fill="none"/>`),
  fuel:ball('f','#FF9800','#E65100','<rect x="12" y="10" width="10" height="17" rx="1.5" fill="#fff"/><rect x="14" y="12.5" width="6" height="4.5" fill="#E65100"/><path d="M22 14h2.5v8.5a1.6 1.6 0 003.2 0V15.5l-2.5-3" stroke="#fff" stroke-width="1.8" fill="none"/>')};
 for(const k in POI_E){ICONS[k]=POI_E[k];ICONS['D_'+k]=POI_D[k]}}
// iOS Safari: SVG data-URL images with <filter> rendered to canvas silently fail/taint (getImageData throws) and the
// old code swallowed the error, so no icon was ever registered. Now: filter-free SVG with explicit size, decode(),
// shadow drawn by canvas, HTMLImageElement fallback, and a 'styleimagemissing' safety net.
function addIcon(k,img){const r=2,w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
  try{const c=document.createElement('canvas');c.width=w*r;c.height=h*r;const x=c.getContext('2d');
    if(k.startsWith('D_')){x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=3*r;x.shadowOffsetY=1.2*r;x.drawImage(img,0,0,c.width,c.height)}else{x.shadowColor='rgba(239,228,203,.95)';x.shadowBlur=4*r;x.shadowOffsetY=0;for(let i=0;i<6;i++)x.drawImage(img,0,0,c.width,c.height)}
    x.shadowColor='transparent';x.drawImage(img,0,0,c.width,c.height);
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
  if(/^(boat|chandler|ship_chandler|marine|fishing)$/.test(t.shop||'')||/chandler/.test(t['seamark:small_craft_facility:category']||''))return['shop','Boat shop',2];
  if(t.waterway==='fuel'||/fuel/.test(t['seamark:small_craft_facility:category']||''))return['fuel',TYPE_BG.fuel,5];
  if(st==='harbour')return['harbour',TYPE_BG.harbour,4];
  if(st==='anchorage')return['anchorage',TYPE_BG.anchorage,4];
  if(st==='mooring')return['mooring',TYPE_BG.mooring,1];
  {const ic=SE.classify2(t);if(ic){const pr={light_major:9,light:6,isolated:8,card_north:8,card_south:8,card_east:8,card_west:8,lat_red:7,lat_green:7,lat_redgreen:7,lat_greenred:7,safe:7,special:5,beacon:4,rock:3,rock_awash:3,wreck:3,danger:3}[ic]||4;
    return[ic,TYPE_BG[st]||'Seamark',pr]}}
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
  return{type:'Feature',id:undefined,geometry:{type:'Point',coordinates:[lon,lat]},properties:{id,icon:c[0],kind:c[1],prio:-c[2],lt:/^light/.test(c[0])?SE.lightLabel(t):''}};
}
// v19: merge duplicate marina/harbour points (same name or unnamed within 150 m; unnamed within 300 m of a named one)
function dedupeHarbours(feats){const H=[],out=[];for(const f of feats)(f.properties.icon==='marina'||f.properties.icon==='harbour'?H:out).push(f);
  const nm=f=>{const t=markById.get(f.properties.id)||{};return(t.name||t['seamark:name']||t['name:en']||'').trim().toLowerCase()};
  const par=H.map((_,i)=>i),names=H.map(nm),find=i=>par[i]===i?i:(par[i]=find(par[i]));
  const d=(a,b)=>{const[x1,y1]=a.geometry.coordinates,[x2,y2]=b.geometry.coordinates;return Math.hypot((x2-x1)*111320*Math.cos(y1*Math.PI/180),(y2-y1)*110540)};
  const cn=H.map((_,i)=>names[i]);const idx=H.map((_,i)=>i).sort((a,b)=>H[a].geometry.coordinates[0]-H[b].geometry.coordinates[0]);
  for(let a=0;a<idx.length;a++){const i=idx[a];for(let b=a+1;b<idx.length;b++){const j=idx[b];if((H[j].geometry.coordinates[0]-H[i].geometry.coordinates[0])*80000>300)break;
    const ri=find(i),rj=find(j);if(ri===rj)continue;const ni=cn[ri],nj=cn[rj];if(ni&&nj&&ni!==nj)continue;
    const lim=(ni===nj)?150:300;if(d(H[i],H[j])>lim)continue;par[rj]=ri;cn[ri]=ni||nj}}
  const G=new Map();H.forEach((f,i)=>{const r=find(i);if(!G.has(r))G.set(r,[]);G.get(r).push(f)});let merged=0;
  for(const g of G.values()){if(g.length===1){out.push(g[0]);continue}merged++;
    const area=g.filter(f=>/^[wr]/.test(f.properties.id)),src=area.length?area:g;
    const c=[src.reduce((s,f)=>s+f.geometry.coordinates[0],0)/src.length,src.reduce((s,f)=>s+f.geometry.coordinates[1],0)/src.length];
    const best=g.slice().sort((a,b)=>(nm(b)?1:0)-(nm(a)?1:0)||(b.properties.icon==='marina')-(a.properties.icon==='marina')||a.properties.prio-b.properties.prio)[0];
    out.push({type:'Feature',geometry:{type:'Point',coordinates:c},properties:Object.assign({},best.properties,{merged:g.length})})}
  window.__harbourClusters=merged;return out}
function refreshMarks(){let feats=staticFeats?staticFeats.slice():[];const seen=new Set();for(const fs of cellCache.values())for(const f of fs){if(!seen.has(f.properties.id)){seen.add(f.properties.id);feats.push(f)}}
  feats=dedupeHarbours(feats);map.getSource('marks').setData({type:'FeatureCollection',features:feats})}
// One Overpass request for the bounding box of all missing cells (was: one heavy regex query per cell, serially).
async function fetchCells(keys){
  const ij=keys.map(k=>k.split('_').map(Number));const i0=Math.min(...ij.map(a=>a[0])),i1=Math.max(...ij.map(a=>a[0]))+1,j0=Math.min(...ij.map(a=>a[1])),j1=Math.max(...ij.map(a=>a[1]))+1;
  const bb=`(${(i0*CELL).toFixed(2)},${(j0*CELL).toFixed(2)},${(i1*CELL).toFixed(2)},${(j1*CELL).toFixed(2)})`;
  const q=`[out:json][timeout:90];(nwr["seamark:type"]${bb};nwr["leisure"="marina"]${bb};nwr["waterway"="fuel"]${bb};nwr["shop"~"^(boat|chandler|ship_chandler|marine)$"]${bb};);out center tags;`;
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
  for(let a=0;a<3;a++){try{const r=await fetch('data/seamarks-gr.geojson?v=21',{credentials:'same-origin',cache:'no-cache'});
      if(r.redirected&&!new URL(r.url).pathname.endsWith('.geojson'))throw new Error('redirected to '+new URL(r.url).host+new URL(r.url).pathname);
      if(!r.ok)throw new Error('HTTP '+r.status+(r.status===401||r.status===403?' (site login/access)':''));
      const txt=await r.text();let d;try{d=JSON.parse(txt)}catch(_){throw new Error('bad data ('+(r.headers.get('content-type')||'?')+'): '+txt.slice(0,40))}
      staticFeats=[];for(const f of d.features){const p=f.properties,t={};for(const k in p)if(k!=='id'&&k!=='_od'&&k!=='_oz')t[k[0]==='~'?'seamark:'+k.slice(1):k]=p[k];
        const c=classify(t);if(!c)continue;markById.set(p.id,t);staticFeats.push({type:'Feature',geometry:f.geometry,properties:{id:p.id,od:p._od==null?-1:p._od,oz:p._oz||0,icon:c[0],kind:c[1],prio:-c[2],lt:/^light/.test(c[0])?SE.lightLabel(t):''}})}
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

// auto-update: if the server has a newer APP_VERSION, reload with a cache-busting URL (guarded against loops)
(function(){const num=v=>+String(v).replace(/\D/g,'')||0;
  async function check(){try{const r=await fetch('app.js?cb='+Date.now(),{cache:'no-store'});if(!r.ok)return;
    const m=/APP_VERSION='(v\d+)'/.exec(await r.text());if(!m||num(m[1])<=num(APP_VERSION))return;
    const k='navReload_'+m[1];if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1');
    if(window.caches)try{for(const n of await caches.keys())await caches.delete(n)}catch(_){}
    const u=new URL(location.href);u.searchParams.set('_v',m[1]);location.replace(u.href)}catch(_){}}
  setTimeout(check,3000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
  window.addEventListener('pageshow',e=>{if(e.persisted)check()});})();
