/**
 * @file Live seamarks outside Greece: one Overpass request for the bounding box of all missing 0.1° cells,
 * rotating over mirror endpoints, with rate-limit backoff.
 */
import { URLS, SEAMARKS } from '../config.js?v=34';

const OVERPASS = URLS.overpass, CELL = SEAMARKS.cellDeg;
let epIdx = 0;
/** Epoch ms until which live requests are paused after a rate-limit answer. */
export const backoff = { until: 0 };

/**
 * Fetch features for grid cells.
 * @param {string[]} keys cell keys "i_j" (i = lat index, j = lon index)
 * @param {(e: object) => object|null} toFeature Overpass element -> GeoJSON feature
 * @returns {Promise<Map<string, object[]>>} features per cell
 */
export async function fetchCells(keys, toFeature) {
  const ij=keys.map(k=>k.split('_').map(Number));const i0=Math.min(...ij.map(a=>a[0])),i1=Math.max(...ij.map(a=>a[0]))+1,j0=Math.min(...ij.map(a=>a[1])),j1=Math.max(...ij.map(a=>a[1]))+1;
  const bb=`(${(i0*CELL).toFixed(2)},${(j0*CELL).toFixed(2)},${(i1*CELL).toFixed(2)},${(j1*CELL).toFixed(2)})`;
  const q=`[out:json][timeout:90];(nwr["seamark:type"]${bb};nwr["leisure"="marina"]${bb};nwr["waterway"="fuel"]${bb};nwr["shop"~"^(boat|chandler|ship_chandler|marine)$"]${bb};);out center tags;`;
  let last;
  for(let a=0;a<OVERPASS.length;a++){const ep=OVERPASS[(epIdx+a)%OVERPASS.length];
    try{const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),SEAMARKS.overpassTimeoutMs);
      const r=await fetch(ep,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},signal:ctl.signal}).finally(()=>clearTimeout(to));
      if(!r.ok){last=new Error(r.status===429||r.status===504||r.status===503?'rate':String(r.status));continue}
      const d=await r.json();epIdx=(epIdx+a)%OVERPASS.length;const out=new Map(keys.map(k=>[k,[]]));
      for(const f of d.elements.map(toFeature).filter(Boolean)){const[lo,la]=f.geometry.coordinates,k=Math.floor(la/CELL)+'_'+Math.floor(lo/CELL);if(out.has(k))out.get(k).push(f)}
      return out;
    }catch(e){last=e.name==='AbortError'||e instanceof TypeError?new Error('rate'):e}}
  if(last&&last.message==='rate')backoff.until=Date.now()+SEAMARKS.rateBackoffMs;
  throw last||new Error('fail');
}
