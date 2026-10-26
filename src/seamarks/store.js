/**
 * @file Seamark/POI data store feeding the 'marks' source.
 * Inside Greece: bundled data/seamarks-gr.geojson + data/poi-gr.geojson (loaded once).
 * Outside Greece: live Overpass per 0.1° cell (cached). Bundled user edits hide deleted ids and pin moved ids.
 * Data flow: load* -> staticFeats / cellCache -> refreshMarks() -> dedupeHarbours() -> map.getSource('marks').setData().
 */
import { SEAMARKS, DATA_FILES, TIMING } from '../config.js?v=35';
import { dataUrl } from '../map/sources.js?v=35';
import { OVERLAYS } from '../map/bases.js?v=35';
import { classify, lsuf, lightLabel } from './classify.js?v=35';
import { fetchCells, backoff } from './overpass.js?v=35';
import { setStatus, statusText } from '../ui/statusPill.js?v=35';
import { emit, on } from '../core/events.js?v=35';
import { localDistance } from '../core/geo.js?v=35';

const MARK_MINZ = SEAMARKS.minZoom, CELL = SEAMARKS.cellDeg, MAX_CELLS = SEAMARKS.maxCells, GR_BB = SEAMARKS.greeceBBox;
let map = null;
/** id -> full OSM tags (for popups and dedupe names). */
export const markById = new Map();
const cellCache = new Map(), pending = new Set();
let markTimer = null, overpassBusy = false, staticFeats = null, staticState = 'idle';
/** Ids deleted / moved by bundled user edits. */
const edits = { deleted: null, pinned: null };
/** Debug counters. */
export const stats = { harbourClusters: 0 };

/** @returns {object[]|null} bundled (static) features as built from the data files. */
export const getStaticFeatures = () => staticFeats;
/** @returns {Set<string>|null} ids hidden by bundled 'delete' edits. */
export const getDeletedIds = () => edits.deleted;

const inGreece=b=>b.getEast()>GR_BB[0]&&b.getWest()<GR_BB[2]&&b.getNorth()>GR_BB[1]&&b.getSouth()<GR_BB[3];

function toFeature(e){
  const t=e.tags||{};const c=classify(t);if(!c)return null;
  const lon=e.lon!=null?e.lon:e.center&&e.center.lon,lat=e.lat!=null?e.lat:e.center&&e.center.lat;if(lon==null)return null;
  const id=e.type+e.id;markById.set(id,t);
  return{type:'Feature',id:undefined,geometry:{type:'Point',coordinates:[lon,lat]},properties:{id,icon:c[0],kind:c[1],prio:-c[2],lt:/^light/.test(c[0])?lightLabel(t):'',ls:lsuf(c[0],t)}};
}

/**
 * v19: merge duplicate marina/harbour points (same name or unnamed within 150 m; unnamed within 300 m of a named one).
 * A point pinned by a bundled 'move' edit keeps its position and wins the merge.
 * @param {object[]} feats @returns {object[]}
 */
export function dedupeHarbours(feats){const H=[],out=[];for(const f of feats)(f.properties.icon==='marina'||f.properties.icon==='harbour'?H:out).push(f);
  const nm=f=>{const t=markById.get(f.properties.id)||{};return(t.name||t['seamark:name']||t['name:en']||'').trim().toLowerCase()};
  const par=H.map((_,i)=>i),names=H.map(nm),find=i=>par[i]===i?i:(par[i]=find(par[i]));
  const d=(a,b)=>localDistance(a.geometry.coordinates,b.geometry.coordinates);
  const cn=H.map((_,i)=>names[i]);const idx=H.map((_,i)=>i).sort((a,b)=>H[a].geometry.coordinates[0]-H[b].geometry.coordinates[0]);
  for(let a=0;a<idx.length;a++){const i=idx[a];for(let b=a+1;b<idx.length;b++){const j=idx[b];if((H[j].geometry.coordinates[0]-H[i].geometry.coordinates[0])*80000>300)break;
    const ri=find(i),rj=find(j);if(ri===rj)continue;const ni=cn[ri],nj=cn[rj];if(ni&&nj&&ni!==nj)continue;
    const lim=(ni===nj)?150:300;if(d(H[i],H[j])>lim)continue;par[rj]=ri;cn[ri]=ni||nj}}
  const G=new Map();H.forEach((f,i)=>{const r=find(i);if(!G.has(r))G.set(r,[]);G.get(r).push(f)});let merged=0;
  for(const g of G.values()){if(g.length===1){out.push(g[0]);continue}merged++;
    const area=g.filter(f=>/^[wr]/.test(f.properties.id)),src=area.length?area:g;
    const pin=g.find(f=>edits.pinned&&edits.pinned.has(f.properties.id));
    const c=pin?pin.geometry.coordinates.slice():[src.reduce((s,f)=>s+f.geometry.coordinates[0],0)/src.length,src.reduce((s,f)=>s+f.geometry.coordinates[1],0)/src.length];
    const best=pin||g.slice().sort((a,b)=>(nm(b)?1:0)-(nm(a)?1:0)||(b.properties.icon==='marina')-(a.properties.icon==='marina')||a.properties.prio-b.properties.prio)[0];
    out.push({type:'Feature',geometry:{type:'Point',coordinates:c},properties:Object.assign({},best.properties,{merged:g.length})})}
  stats.harbourClusters=merged;return out}

/** Rebuild the 'marks' source from bundled + live features. */
export function refreshMarks(){let feats=staticFeats?staticFeats.slice():[];const seen=new Set(feats.map(f=>f.properties.id));for(const fs of cellCache.values())for(const f of fs){if(!seen.has(f.properties.id)){seen.add(f.properties.id);feats.push(f)}}
  if(edits.deleted&&edits.deleted.size)feats=feats.filter(f=>!edits.deleted.has(f.properties.id));feats=dedupeHarbours(feats);map.getSource('marks').setData({type:'FeatureCollection',features:feats})}

async function loadPoi(){try{const r=await fetch(dataUrl(DATA_FILES.pois),{credentials:'same-origin'});if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();
  for(const f of d.features){const t=f.properties,c=classify(t);if(!c)continue;markById.set(t.id,t);staticFeats.push({type:'Feature',geometry:f.geometry,properties:{id:t.id,od:-1,oz:0,icon:c[0],kind:c[1],prio:-c[2],lt:''}})}
  refreshMarks()}catch(e){console.warn('poi data',e)}}
async function loadStatic(){if(staticState!=='idle')return;staticState='loading';setStatus('Loading seamarks…');
  let lastErr='';
  for(let a=0;a<SEAMARKS.staticRetries;a++){try{const r=await fetch(dataUrl(DATA_FILES.seamarks),{credentials:'same-origin',cache:'no-cache'});
      if(r.redirected&&!new URL(r.url).pathname.endsWith('.geojson'))throw new Error('redirected to '+new URL(r.url).host+new URL(r.url).pathname);
      if(!r.ok)throw new Error('HTTP '+r.status+(r.status===401||r.status===403?' (site login/access)':''));
      const txt=await r.text();let d;try{d=JSON.parse(txt)}catch(_){throw new Error('bad data ('+(r.headers.get('content-type')||'?')+'): '+txt.slice(0,40))}
      staticFeats=[];for(const f of d.features){const p=f.properties,t={};for(const k in p)if(k!=='id'&&k!=='_od'&&k!=='_oz')t[k[0]==='~'?'seamark:'+k.slice(1):k]=p[k];
        const c=classify(t);if(!c)continue;markById.set(p.id,t);staticFeats.push({type:'Feature',geometry:f.geometry,properties:{id:p.id,od:p._od==null?-1:p._od,oz:p._oz||0,icon:c[0],kind:c[1],prio:-c[2],lt:/^light/.test(c[0])?lightLabel(t):'',ls:lsuf(c[0],t)}})}
      staticState='ready';refreshMarks();loadPoi();setTimeout(()=>loadMarks(true),300);return}
    catch(e){lastErr=e&&e.message||String(e);console.warn('static seamarks',e);setStatus('Seamarks failed: '+lastErr+' – retrying…');await new Promise(r=>setTimeout(r,SEAMARKS.staticRetryDelayMs))}}
  staticState='failed';setStatus('Seamarks failed: '+lastErr)}

/**
 * Load seamarks for the current view (bundled data first; live Overpass outside Greece).
 */
export async function loadMarks(){
  if(!OVERLAYS.marks.on)return;
  if(staticState==='idle'){loadStatic();return}
  if(staticState==='loading')return;
  if(map.getZoom()<MARK_MINZ){setStatus('Zoom in to see seamarks',TIMING.statusMs);return}
  const b=map.getBounds();
  if(inGreece(b)){const n=staticFeats.filter(f=>b.contains(f.geometry.coordinates)).length;setStatus(n?n+' seamarks':'No seamarks in this area',TIMING.statusMs);return}
  return loadLive()}
async function loadLive(){
  if(overpassBusy)return;
  if(Date.now()<backoff.until){scheduleMarks(backoff.until-Date.now()+100);return}
  const b=map.getBounds(),c=map.getCenter();let keys=[];
  for(let i=Math.floor(b.getSouth()/CELL);i<=Math.floor(b.getNorth()/CELL);i++)for(let j=Math.floor(b.getWest()/CELL);j<=Math.floor(b.getEast()/CELL);j++){const k=i+'_'+j;if(!cellCache.has(k)&&!pending.has(k))keys.push(k)}
  if(!keys.length){const n=countVisible();setStatus(n?n+' seamarks':'No seamarks in this area',TIMING.statusMs);return}
  keys.sort((a,b2)=>{const d=k=>{const[i,j]=k.split('_').map(Number);return((i+.5)*CELL-c.lat)**2+((j+.5)*CELL-c.lng)**2};return d(a)-d(b2)});
  keys=keys.slice(0,MAX_CELLS);
  overpassBusy=true;setStatus('Loading seamarks…');let failed=false;
  keys.forEach(k=>pending.add(k));
  try{const res=await fetchCells(keys,toFeature);for(const[k,v]of res)cellCache.set(k,v);refreshMarks()}
  catch(e){failed=true;console.warn('overpass',e);setStatus(e.message==='rate'?'Server busy, retrying…':'Could not load seamarks, retrying…')}
  finally{keys.forEach(k=>pending.delete(k))}
  overpassBusy=false;
  if(failed){scheduleMarks(Math.max(SEAMARKS.retryMinMs,backoff.until-Date.now()+100));return}
  setTimeout(()=>{if(statusText()==='Loading seamarks…'){const n=countVisible();setStatus(n?n+' seamarks':'No seamarks in this area',TIMING.statusMs)}},600);
  scheduleMarks();
}
function countVisible(){try{return map.queryRenderedFeatures({layers:['marks']}).length}catch(e){return 0}}
/** "Zoom in" hint below the seamark zoom, else "Loading seamarks…". */
export function showZoomHint(){const lo=map.getZoom()<MARK_MINZ;setStatus(lo?'Zoom in to see seamarks':'Loading seamarks…',lo?TIMING.zoomHintMs:0)}
/** Debounced loadMarks. @param {number} [ms] */
export function scheduleMarks(ms=SEAMARKS.scheduleMs){clearTimeout(markTimer);markTimer=setTimeout(loadMarks,ms)}

/** Fetch bundled user edits: deleted ids hidden, moved ids pinned; emits 'useredits'. */
function loadUserEditIndex(){return fetch(dataUrl(DATA_FILES.userEdits)).then(r=>r.json()).then(d=>{
  edits.deleted=new Set(d.features.filter(f=>f.properties.edit==='delete').map(f=>f.properties.target));
  edits.pinned=new Set(d.features.filter(f=>f.properties.edit==='move').map(f=>f.properties.target));try{refreshMarks()}catch(e){/* source not ready */}
  emit('useredits',d)}).catch(e=>console.warn('user-edits',e))}

/**
 * Wire the store to the map (call once).
 * @param {any} m map
 */
export function initSeamarkStore(m){
  map=m;map.on('moveend',()=>scheduleMarks());
  on('overlaychange',e=>{if(e.detail.key!=='marks')return;
    if(e.detail.on){showZoomHint();loadMarks()}else setStatus('')});
  if(map.isStyleLoaded())loadUserEditIndex();else map.once('load',loadUserEditIndex);
}
