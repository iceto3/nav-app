const C='nav-shell-v9';
const SHELL=['./','index.html','style.css','app.js','manifest.webmanifest','vendor/maplibre-gl.js','vendor/maplibre-gl.css','apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png','fonts/inter-400.woff2','fonts/inter-600.woff2','fonts/inter-700.woff2','data/seamarks-gr.geojson'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return; // tiles/API go to network
  const p=u.pathname,fresh=e.request.mode==='navigate'||/\/$|index\.html$|app\.js$|style\.css$|sw\.js$/.test(p);
  if(fresh){ // network-first so updates arrive
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(p.endsWith('/')?'./':e.request,cp))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})));return}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)));
});
