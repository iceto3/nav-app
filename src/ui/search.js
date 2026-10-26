/** @file Place search (Nominatim: submit only, max 1 request/s, biased to the current view). */
import { URLS, SEARCH } from '../config.js?v=35';
import { $ } from '../core/dom.js?v=35';
import { setDest } from '../route/router.js?v=35';

/** @param {any} map */
export function initSearch(map) {
  let lastSearch=0;
  $('#searchForm').onsubmit=async e=>{
    e.preventDefault();const q=$('#q').value.trim();if(!q)return;
    const wait=SEARCH.minIntervalMs-(Date.now()-lastSearch);if(wait>0)await new Promise(r=>setTimeout(r,wait));lastSearch=Date.now();
    $('#q').blur();const ul=$('#results');ul.innerHTML='<li>Searching…</li>';ul.hidden=false;
    const c=map.getCenter(),V=SEARCH.viewboxDeg;
    const url=`${URLS.nominatim}?format=jsonv2&limit=${SEARCH.limit}&accept-language=en&q=${encodeURIComponent(q)}&viewbox=${c.lng-V},${c.lat+V},${c.lng+V},${c.lat-V}`;
  try{const r=await fetch(url);const d=await r.json();ul.innerHTML='';
    if(!d.length){ul.innerHTML='<li>No results found</li>';return}
    d.forEach(x=>{const li=document.createElement('li');const parts=x.display_name.split(', ');
      li.innerHTML=`<b></b><span></span>`;li.querySelector('b').textContent=x.name||parts[0];li.querySelector('span').textContent=parts.slice(1).join(', ');
      li.onclick=()=>{ul.hidden=true;setDest([+x.lat,+x.lon],x.name||parts[0])};ul.appendChild(li)});
  }catch(err){ul.innerHTML='<li>Search failed. Check your connection.</li>'}
};
  $('#q').addEventListener('focus',()=>{if($('#results').children.length)$('#results').hidden=false});
  map.on('click',()=>$('#results').hidden=true);
}
