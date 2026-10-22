/**
 * @file Scale bar: metric + NM (modern) / checkered "Scale of Metres" (Old chart). Redraws on move/zoom and theme change.
 * NB: uses 156543.03392 m/px at z0 (256-px convention) exactly as v33 did, for pixel parity.
 */
/** @type {() => void} */
export let drawScale = () => {};

/** @param {any} map */
export function initScaleBar(map) {
  drawScale=(()=>{const b=document.createElement('div');b.id='scaleBar';document.body.appendChild(b);
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
}
