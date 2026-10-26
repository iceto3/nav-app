/**
 * @file Registers icons with the map.
 * iOS Safari: SVG data-URL images with <filter> rendered to canvas silently fail/taint (getImageData throws), so:
 * filter-free SVG with explicit size, decode(), shadow drawn by canvas, HTMLImageElement fallback,
 * and a 'styleimagemissing' safety net. Raster POI icons come from icons/poi/*.png.
 */
import { ICONS } from './index.js?v=35';
import { ASSET_REV } from '../config.js?v=35';

/** Device pixel ratio used for rasterised icons. */
const ICON_RATIO = 2;
const svgUrl=s=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);
/** PNG POI icons: file stem -> registered as '<prefix>p_<stem>' ('chandlery' -> 'shop'). */
const POI_PNG=['chandlery','grocery','hardware','gshop','pharmacy','rest','fishrest','steak','service'];
/** Collision-aware POI dot colours (z13-14), registered as pdot_/opdot_ (satellite/Old chart stroke). */
const DOT_COLORS={p_pharmacy:'#2e7d32',p_hospital:'#c62828',p_medical:'#c62828',shop:'#4a5f78',p_service:'#1f5e44'};

function addIcon(map,k,img){const r=ICON_RATIO,w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
  try{const c=document.createElement('canvas');c.width=w*r;c.height=h*r;const x=c.getContext('2d');
    if(k.startsWith('D_')){x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=3*r;x.shadowOffsetY=1.2*r;x.drawImage(img,0,0,c.width,c.height)}else{x.shadowColor='rgba(239,228,203,.95)';x.shadowBlur=4*r;x.shadowOffsetY=0;for(let i=0;i<6;i++)x.drawImage(img,0,0,c.width,c.height)}
    x.shadowColor='transparent';x.drawImage(img,0,0,c.width,c.height);
    const d=x.getImageData(0,0,c.width,c.height);if(!map.hasImage(k))map.addImage(k,{width:c.width,height:c.height,data:new Uint8Array(d.data.buffer)},{pixelRatio:r});return true}
  catch(e){console.warn('icon canvas failed',k,e)}
  try{if(!map.hasImage(k))map.addImage(k,img);return true}catch(e){console.warn('icon add failed',k,e);return false}}

/** Register every SVG icon of {@link ICONS}. @param {any} map @returns {Promise<void[]>} */
export function loadIcons(map){return Promise.all(Object.entries(ICONS).map(([k,s])=>new Promise(res=>{
  const m=s.match(/width="(\d+)" height="(\d+)"/);const img=new Image(+m[1],+m[2]);
  let fin=false;const done=()=>{if(fin)return;fin=true;try{addIcon(map,k,img)}catch(e){console.warn(e)}res()};
  img.onerror=()=>{if(!fin){fin=true;console.warn('icon load failed',k);res()}};img.onload=done;
  img.src=svgUrl(s);if(img.decode)img.decode().then(done,()=>{});setTimeout(()=>{if(img.complete&&img.naturalWidth)done();else if(!fin){fin=true;res()}},3000);})))}

/** Register the raster POI icons. @param {any} map */
export function loadPoiPng(map){return Promise.all(POI_PNG.flatMap(n=>[['',  'old'],['D_','sat']].map(([pf,v])=>new Promise(res=>{const id=pf+(n==='chandlery'?'shop':'p_'+n);const img=new Image();
  img.onload=()=>{try{if(map.hasImage(id))map.removeImage(id);map.addImage(id,img,{pixelRatio:3})}catch(e){console.warn('poi icon',id,e)}res()};img.onerror=()=>{console.warn('poi icon load',id);res()};img.src=`icons/poi/${n}-${v}.png?v=${ASSET_REV.poiPng}`}))))}

/** v23: draw the POI dot images. @param {any} map */
export function addDots(map){const C=DOT_COLORS;
  for(const[k,c]of Object.entries(C))for(const[pf,st]of[['pdot_','#ffffff'],['opdot_','#F3E9D2']]){const r=2,n=12*r,cv=document.createElement('canvas');cv.width=cv.height=n;const x=cv.getContext('2d');
    x.beginPath();x.arc(n/2,n/2,n/2-1.6*r,0,7);x.fillStyle=c;x.fill();x.lineWidth=1.4*r;x.strokeStyle=st;x.stroke();
    const d=x.getImageData(0,0,n,n);if(!map.hasImage(pf+k))map.addImage(pf+k,{width:n,height:n,data:new Uint8Array(d.data.buffer)},{pixelRatio:r})}}

/** Fallback image for any missing icon id (blue dot), so symbols never vanish silently. @param {any} map */
export function installMissingImageFallback(map){
map.on('styleimagemissing',e=>{if(ICONS[e.id]||map.hasImage(e.id))return;const n=16,d=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const q=(y*n+x)*4,r=Math.hypot(x-7.5,y-7.5);if(r<7){const edge=r>5;d[q]=edge?255:30;d[q+1]=edge?255:102;d[q+2]=edge?255:208;d[q+3]=255}}
  map.addImage(e.id,{width:n,height:n,data:d})});
}
