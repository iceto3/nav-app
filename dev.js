// v25: hidden developer mode (?dev=1). Device-local edits: shore/pier/breakwater lines, depth contours, symbol moves, image overlay.
(function(){
const qs=new URLSearchParams(location.search);
if(qs.get('dev')==='1')localStorage.setItem('navDev','1');if(qs.get('dev')==='0')localStorage.removeItem('navDev');
if(localStorage.getItem('navDev')!=='1')return;
const KEY='navDevState',$=s=>document.querySelector(s),uid=()=>Math.random().toString(36).slice(2,9);
let S=JSON.parse(localStorage.getItem(KEY)||'null')||{lines:[],moves:{},overlay:null};S.dels=S.dels||{};S.adds=S.adds||{};
let picked=false,lastDrag=0,undo=[],redo=[],mode='view',active=null,selV=null,shoreType='natural',depthVal=1,drag=null;
const snap=()=>JSON.stringify(S);
function commit(prev){undo.push(prev);if(undo.length>100)undo.shift();redo=[];save();render()}
function save(){localStorage.setItem(KEY,snap())}
const ADD_TYPES=[['marina','Marina',{leisure:'marina'}],['harbour','Harbour',{'seamark:type':'harbour'}],['anchorage','Anchorage',{'seamark:type':'anchorage'}],['fuel','Fuel',{waterway:'fuel'}],['fuel_truck','Fuel truck',{poi:'fuel_truck'}],
 ['chandlery','Chandlery',{poi:'chandlery'}],['grocery','Grocery',{poi:'grocery'}],['hardware','Hardware',{poi:'hardware'}],['gshop','Shop',{poi:'gshop'}],['pharmacy','Pharmacy',{poi:'pharmacy'}],['hospital','Hospital',{poi:'hospital'}],
 ['medical','Medical',{poi:'medical'}],['rest','Restaurant',{poi:'rest'}],['fishrest','Fish taverna',{poi:'fishrest'}],['steak','Grill',{poi:'steak'}],['service','Boat service',{poi:'service'}]];
let addType='marina',form=null;
const iconId=icon=>(isOld()?'':'D_')+icon;
function iconURL(icon){try{const im=map.style.getImage(iconId(icon));if(!im)return'';const d=im.data,c=document.createElement('canvas');c.width=d.width;c.height=d.height;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d.data),d.width,d.height),0,0);return c.toDataURL()}catch(e){return''}}
const tagsOf=a=>{const t=Object.assign({},(ADD_TYPES.find(x=>x[0]===a.type)||ADD_TYPES[0])[2]);if(a.name)t.name=a.name;if(a.desc)t.description=a.desc;return t};
function addFeat(id,a){const t=tagsOf(a),c=classify(t);if(!c)return null;markById.set(id,t);return{type:'Feature',geometry:{type:'Point',coordinates:a.coords},properties:{id,od:-1,oz:0,icon:c[0],kind:c[1],prio:-c[2],lt:''}}}
function openForm(id){const a=S.adds[id];if(!a)return;form&&form.remove();form=document.createElement('div');form.className='list';
  form.innerHTML='<b style="padding:4px 6px">'+(ADD_TYPES.find(x=>x[0]===a.type)||['',''])[1]+'</b><input placeholder="Name" style="width:100%"><textarea placeholder="Description" rows="3" style="width:100%;font:inherit;color:#fff;background:#38404a;border:0;border-radius:8px;padding:7px"></textarea><div></div>';
  const [n,d]=[form.querySelector('input'),form.querySelector('textarea')];n.value=a.name||'';d.value=a.desc||'';const row=form.querySelector('div');
  btn(row,'Save',()=>{const p=snap();a.name=n.value.trim();a.desc=d.value.trim();commit(p);refreshMarksSafe();closeForm()});
  btn(row,'Delete',()=>{const p=snap();delete S.adds[id];commit(p);refreshMarksSafe();closeForm()},false,'x');btn(row,'Cancel',closeForm);
  root.insertBefore(form,root.querySelector('.sub'));setTimeout(()=>n.focus(),50)}
function closeForm(){if(form){form.remove();form=null}}
const DEPTHS=[0.5,1,1.5,2,2.5,3,3.5,4,4.5];
// ---------- UI ----------
const css=`#dev{position:fixed;left:6px;right:6px;bottom:calc(env(safe-area-inset-bottom) + 6px);z-index:3000;font:13px -apple-system,system-ui,sans-serif;pointer-events:none}
#dev .bar,#dev .sub,#dev .list{pointer-events:auto;background:rgba(20,24,30,.88);color:#fff;border-radius:12px;padding:4px;display:flex;flex-wrap:wrap;gap:4px;box-shadow:0 2px 8px #0006;margin-top:4px}
#dev button,#dev select,#dev input{font:inherit;color:#fff;background:#38404a;border:0;border-radius:8px;padding:7px 9px;min-height:34px}
#dev button.on{background:#e65100}#dev button.x{background:#7a2020}#dev .sub:empty,#dev .list:empty{display:none}
#dev .list{max-height:34vh;overflow:auto;flex-direction:column;flex-wrap:nowrap}#dev .list div{display:flex;justify-content:space-between;align-items:center;gap:6px}
#dev input[type=range]{padding:0;min-height:0;width:110px}#dev .tag{position:absolute;top:-22px;left:4px;background:#e65100;color:#fff;border-radius:6px;padding:1px 6px;font-size:11px}
body.dev-edit #map,body.dev-edit #map *{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
body.dev-on #fabs{bottom:calc(env(safe-area-inset-bottom) + 24px + var(--devh,0px))}body.dev-on.has-panel #fabs{bottom:calc(env(safe-area-inset-bottom) + 190px + var(--devh,0px))}
body.dev-on #panel{bottom:var(--devh,0px)}body.dev-on .maplibregl-ctrl-bottom-left,body.dev-on .maplibregl-ctrl-bottom-right{bottom:var(--devh,0px)}body.dev-on #oldDecor .rose{bottom:calc(env(safe-area-inset-bottom) + 64px + var(--devh,0px))}
#devCap{position:absolute;inset:0;z-index:5;touch-action:none;display:none}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const root=document.createElement('div');root.id='dev';root.innerHTML='<span class="tag">DEV</span><div class="list"></div><div class="sub"></div><div class="bar"></div>';document.body.appendChild(root);document.body.classList.add('dev-on');
const setH=()=>document.documentElement.style.setProperty('--devh',(root.offsetHeight+10)+'px');new ResizeObserver(setH).observe(root);setH();
document.addEventListener('contextmenu',e=>{if(window.__devEdit&&e.target.closest&&e.target.closest('#map'))e.preventDefault()},{capture:true});
window.addEventListener('selectstart',e=>{if(window.__devEdit&&e.target.closest&&e.target.closest('#map'))e.preventDefault()},{capture:true});
const MODES=[['view','View'],['shore','Shore'],['depth','Depth'],['move','Move'],['add','Add'],['del','Delete'],['image','Image']];
function bar(){const b=root.querySelector('.bar');b.innerHTML='';
  for(const[m,l]of MODES)btn(b,l,()=>setMode(m),mode===m);
  btn(b,'↶',doUndo);btn(b,'↷',doRedo);btn(b,'☰',()=>{listOpen=!listOpen;list()},listOpen);btn(b,'⇩',exportAll);btn(b,'⇧',importAll);btn(b,'✕',exit,false,'x')}
let listOpen=false;
function btn(p,l,f,on,cls){const e=document.createElement('button');e.textContent=l;if(on)e.className='on';if(cls)e.classList.add(cls);e.onclick=ev=>{ev.stopPropagation();f()};p.appendChild(e);return e}
function sub(){const s=root.querySelector('.sub');s.innerHTML='';
  if(mode==='shore'&&!isOld()){const t=document.createElement('span');t.textContent='Drawing applies to Old chart – switch base to draw';t.style.padding='8px';s.appendChild(t);return}
  if(mode==='shore'||mode==='depth'){
    if(mode==='shore'){const sel=document.createElement('select');for(const t of['natural','pier','breakwater'])sel.add(new Option(t==='natural'?'Natural shore':t[0].toUpperCase()+t.slice(1),t));{const PL=picked&&cur();if(PL&&PL.type)shoreType=PL.type}sel.value=shoreType;sel.onchange=()=>{shoreType=sel.value;const L=cur();if(L&&(L.pts.length<2||picked)){const p=snap();L.type=shoreType;commit(p)}else{active=null;selV=null;render()}};s.appendChild(sel)}
    else{const PL=picked&&cur();if(PL&&PL.depth!=null)depthVal=PL.depth;const sel=document.createElement('select');for(const d of DEPTHS)sel.add(new Option(d+' m',String(d)));sel.add(new Option('other…','x'));sel.value=DEPTHS.includes(depthVal)?String(depthVal):'x';
      const inp=document.createElement('input');inp.type='number';inp.inputMode='decimal';inp.step='0.1';inp.style.width='64px';inp.value=depthVal;inp.hidden=sel.value!=='x';
      const setD=v=>{if(!(+v>0))return;depthVal=+v;const L=cur();if(L&&(L.pts.length<2||picked)){const p=snap();L.depth=depthVal;commit(p)}else{active=null;selV=null;render()}};
      sel.onchange=()=>{if(sel.value==='x'){inp.hidden=false;inp.focus()}else{inp.hidden=true;setD(sel.value)}};inp.onchange=()=>setD(inp.value);s.append(sel,inp)}
    btn(s,'New',()=>{active=null;selV=null;render()});
    btn(s,'Finish',()=>{active=null;selV=null;render()});
    btn(s,'Close',()=>{const L=cur();if(L&&L.pts.length>2){const p=snap();L.closed=true;active=null;commit(p)}});
    btn(s,'Del vertex',()=>{const L=cur();if(L&&selV!=null){const p=snap();L.pts.splice(selV,1);selV=null;if(L.pts.length<2)L.closed=false;if(!L.pts.length){S.lines=S.lines.filter(x=>x!==L);active=null}commit(p)}});
  }
  if(mode==='add'){s.style.flexWrap='nowrap';s.style.overflowX='auto';for(const[k,l]of ADD_TYPES){const b=btn(s,'',()=>{addType=k;sub()},addType===k);b.title=l;b.style.padding='3px';b.style.flex='0 0 auto';const u=iconURL(k==='chandlery'?'shop':['marina','harbour','anchorage','fuel','fuel_truck'].includes(k)?k:'p_'+k);
      if(u){const im=document.createElement('img');im.src=u;im.style.cssText='width:28px;height:28px;object-fit:contain;display:block';b.appendChild(im)}else b.textContent=l}
    const t=document.createElement('span');t.textContent='Tap map to place';t.style.cssText='padding:8px;flex:0 0 auto';s.appendChild(t)}else{s.style.flexWrap='';s.style.overflowX=''}
  if(mode==='del'){const t=document.createElement('span');t.textContent='Tap a symbol to delete it';t.style.padding='8px';s.appendChild(t)}
  if(mode==='move'){const t=document.createElement('span');t.textContent='Long-press a symbol, then drag';t.style.padding='8px';s.appendChild(t)}
  if(mode==='image'){const f=document.createElement('input');f.type='file';f.accept='image/*';f.hidden=true;f.onchange=()=>f.files[0]&&loadImg(f.files[0]);s.appendChild(f);btn(s,'Photo…',()=>f.click());
    if(S.overlay){const o=S.overlay;
      const op=document.createElement('input');op.type='range';op.min=0;op.max=1;op.step=.05;op.value=o.opacity;op.oninput=()=>{o.opacity=+op.value;ovPaint();save()};
      const ro=document.createElement('input');ro.type='range';ro.min=-180;ro.max=180;ro.step=.5;ro.value=o.rot;ro.oninput=()=>{o.rot=+ro.value;ovPlace();save()};
      const l1=document.createElement('span');l1.textContent='α';const l2=document.createElement('span');l2.textContent='⟳';[l1,l2].forEach(x=>x.style.padding='8px 2px');
      s.append(l1,op,l2,ro);btn(s,o.locked?'Locked':'Unlocked',()=>{o.locked=!o.locked;save();capture();sub()},o.locked);
      btn(s,'Remove',()=>{const p=snap();S.overlay=null;idb('del');ovRemove();commit(p);sub()},false,'x')}}
}
function list(){const l=root.querySelector('.list');l.innerHTML='';if(!listOpen)return;
  const row=(t,del)=>{const d=document.createElement('div');const sp=document.createElement('span');sp.textContent=t;d.appendChild(sp);btn(d,'Delete',del,false,'x');l.appendChild(d)};
  S.lines.forEach(L=>row(`${bundled(L.id)?'[bundled, hidden] ':''}${L.kind==='depth'?'Contour '+L.depth+' m':L.type==='natural'?'Natural shore':L.type} · ${L.pts.length} pts${L.closed?' · closed':''}`,()=>{const p=snap();S.lines=S.lines.filter(x=>x!==L);if(active===L.id)active=null;commit(p);list()}));
  for(const id in S.moves)row(`${bundled(id)?'[bundled, hidden] ':''}Moved ${id}`,()=>{const p=snap();delete S.moves[id];commit(p);refreshMarksSafe();list()});
  for(const id in S.dels)if(!(window.DELETED_IDS&&DELETED_IDS.has(id)))row(`Deleted ${S.dels[id].type} ${id}`,()=>{const p=snap();delete S.dels[id];commit(p);refreshMarksSafe();list()});
  for(const id in S.adds)if(!bundled(id))row(`Added ${S.adds[id].type}${S.adds[id].name?' “'+S.adds[id].name+'”':''}`,()=>{const p=snap();delete S.adds[id];commit(p);refreshMarksSafe();list()});
  if(S.overlay)row('Image overlay',()=>{const p=snap();S.overlay=null;idb('del');ovRemove();commit(p);list()});
  if(!l.children.length){const d=document.createElement('div');d.textContent='No edits yet';d.style.padding='6px';l.appendChild(d)}}
function setMode(m){closeForm();mode=m;window.__devEdit=m!=='view';document.body.classList.toggle('dev-edit',m!=='view');document.querySelectorAll('.maplibregl-popup').forEach(x=>x.remove());active=null;selV=null;capture();bar();sub();render()}
function exit(){localStorage.removeItem('navDev');location.href=location.pathname+'?dev=0'}
const norm=()=>{S.dels=S.dels||{};S.adds=S.adds||{}};
function doUndo(){if(!undo.length)return;redo.push(snap());S=JSON.parse(undo.pop());norm();after()}
function doRedo(){if(!redo.length)return;undo.push(snap());S=JSON.parse(redo.pop());norm();after()}
function after(){save();active=null;selV=null;render();refreshMarksSafe();ovFromState();sub();list()}
// ---------- map rendering ----------
const cur=()=>S.lines.find(l=>l.id===active);
const COL={natural:'#ff3d7f',pier:'#ffd400',breakwater:'#00e5ff',depth:'#7cff6b'};
const bundled=id=>window.BUNDLED_EDIT_IDS&&window.BUNDLED_EDIT_IDS.has(id);
const isOld=()=>typeof OLD_ON!=='undefined'&&OLD_ON;
function fc(){const F=[];for(const L of S.lines){if(bundled(L.id))continue;if(L.kind==='shore'&&!isOld())continue;const c=L.closed&&L.pts.length>2?L.pts.concat([L.pts[0]]):L.pts,col=L.kind==='depth'?COL.depth:COL[L.type];
    const poly=L.kind==='shore'&&L.closed&&L.pts.length>2,pr=L.kind==='depth'?{edit:'depth_contour',type:'contour',depth:L.depth}:{edit:'shore',type:L.type};
    if(c.length>1)F.push({type:'Feature',geometry:poly?{type:'Polygon',coordinates:[c]}:{type:'LineString',coordinates:c},properties:pr});
    if(c.length>1&&L.id===active)F.push({type:'Feature',geometry:{type:'LineString',coordinates:c},properties:{act:1,col}});
    const showV=(mode==='shore'&&L.kind==='shore')||(mode==='depth'&&L.kind==='depth');
    if(showV){L.pts.forEach((p,i)=>F.push({type:'Feature',geometry:{type:'Point',coordinates:p},properties:{v:1,lid:L.id,i,sel:L.id===active&&i===selV?1:0,col}}));
      for(let i=0;i<c.length-1;i++)F.push({type:'Feature',geometry:{type:'Point',coordinates:[(c[i][0]+c[i+1][0])/2,(c[i][1]+c[i+1][1])/2]},properties:{m:1,lid:L.id,i:i+1}})}}
  if(drag&&drag.ghost)F.push({type:'Feature',geometry:{type:'Point',coordinates:drag.ghost},properties:{g:1}});
  return{type:'FeatureCollection',features:F}}
function render(){const s=map.getSource('dev');if(s)s.setData(fc());liveMask()}
const ORIGF={};
function bufPoly(lines,r){const P=[];for(const pts of lines){if(!pts.length)continue;const la=pts[0][1],kx=r/(111320*Math.cos(la*Math.PI/180)),ky=r/110540;
  for(const p of pts){const ring=[];for(let k=0;k<=12;k++){const a=k/12*2*Math.PI;ring.push([p[0]+Math.cos(a)*kx,p[1]+Math.sin(a)*ky])}P.push([ring])}
  for(let i=0;i<pts.length-1;i++){const[a,b]=[pts[i],pts[i+1]];let dx=(b[0]-a[0])/kx,dy=(b[1]-a[1])/ky;const n=Math.hypot(dx,dy)||1;const ox=-dy/n*kx,oy=dx/n*ky;P.push([[[a[0]+ox,a[1]+oy],[b[0]+ox,b[1]+oy],[b[0]-ox,b[1]-oy],[a[0]-ox,a[1]-oy],[a[0]+ox,a[1]+oy]]])}}
  return P.length?{type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:P}}:null}
let maskKey='';
function liveMask(){const vis=S.lines.filter(L=>!bundled(L.id)&&L.pts.length>1);const key=JSON.stringify(vis.map(L=>[L.pts,L.type]));if(key===maskKey)return;maskKey=key;
  const area=bufPoly(vis.filter(L=>L.kind==='depth').map(L=>L.closed?L.pts.concat([L.pts[0]]):L.pts),150),piers=bufPoly(vis.filter(L=>L.kind==='shore'&&L.type!=='natural').map(L=>L.pts),10);
  const set=(ids,m)=>{for(const id of ids){if(!map.getLayer(id))continue;if(!(id in ORIGF))ORIGF[id]=map.getFilter(id)||null;const o=ORIGF[id];
    try{map.setFilter(id,m?(o?['all',o,['!',['within',m]]]:['!',['within',m]]):o)}catch(e){console.warn('dev mask',id,e)}}};
  set(['dcont','dcontS','dcontLbl'],area);set(['old_pier','old_pierO'],piers)}
function addLayers(){if(map.getSource('dev'))return;map.addSource('dev',{type:'geojson',data:fc()});
  for(const l of ueShoreLayers('dv','dev'))map.addLayer(l,'uland');
  for(const l of ueContLayers('dv','dev','visible'))map.addLayer(l,'ucont');ueTheme('dv');
  map.addLayer({id:'devLine',type:'line',source:'dev',filter:['==',['get','act'],1],paint:{'line-color':'#ff6d00','line-width':1,'line-opacity':.9,'line-dasharray':[2,2]}});
  map.addLayer({id:'devMid',type:'circle',source:'dev',filter:['has','m'],paint:{'circle-radius':5,'circle-color':'#ffffff','circle-opacity':.55,'circle-stroke-color':'#000','circle-stroke-width':1}});
  map.addLayer({id:'devVtx',type:'circle',source:'dev',filter:['has','v'],paint:{'circle-radius':['case',['==',['get','sel'],1],10,8],'circle-color':['get','col'],'circle-stroke-color':['case',['==',['get','sel'],1],'#fff','#000'],'circle-stroke-width':2}});
  map.addLayer({id:'devGhost',type:'circle',source:'dev',filter:['has','g'],paint:{'circle-radius':14,'circle-color':'#e65100','circle-opacity':.5,'circle-stroke-color':'#fff','circle-stroke-width':2}})}
// ---------- marks overrides ----------
function patchMarks(){const src=map.getSource('marks');if(!src||src.__devPatched)return;const orig=src.setData.bind(src);src.__devPatched=true;
  src.setData=d=>{try{if(d&&d.features){const dl=S.dels,ad=Object.keys(S.adds).filter(id=>!bundled(id));if(Object.keys(dl).length)d={type:'FeatureCollection',features:d.features.filter(f=>!dl[f.properties.id])};if(ad.length)d={type:'FeatureCollection',features:d.features.filter(f=>!S.adds[f.properties.id]).concat(ad.map(id=>addFeat(id,S.adds[id])).filter(Boolean))}}
    if(d&&d.features&&Object.keys(S.moves).length)d={type:'FeatureCollection',features:d.features.map(f=>{const id=f.properties&&f.properties.id,m=bundled(id)?null:S.moves[id];return m?Object.assign({},f,{geometry:{type:'Point',coordinates:m.to}}):f})}}catch(e){console.warn('dev moves',e)}return orig(d)};
  refreshMarksSafe()}
function refreshMarksSafe(){try{if(typeof refreshMarks==='function')refreshMarks()}catch(e){console.warn(e)}}
// ---------- drag helpers (dragPan always restored) ----------
function lockPan(){try{map.dragPan.disable()}catch(e){}}
function unlockPan(){try{if(!map.dragPan.isEnabled())map.dragPan.enable()}catch(e){}}
['touchend','touchcancel','pointercancel','pointerup','mouseup','blur'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(()=>{if(drag&&drag.kind==='lp')clearTimeout(drag.t);if(drag)drag=null;if(!g&&!md)unlockPan()},0),{passive:true}));
const pt=e=>e.lngLat?[e.lngLat.lng,e.lngLat.lat]:null;
function hit(e,layers){const r=8,p=e.point;return map.queryRenderedFeatures([[p.x-r,p.y-r],[p.x+r,p.y+r]],{layers:layers.filter(l=>map.getLayer(l))})}
function bind(){
  map.on('click',e=>{if(mode!=='add'&&mode!=='del')return;if(Date.now()-lastDrag<350)return;const f=hit(e,['marks','pois','poidots'])[0];
    if(mode==='del'){if(!f||!f.properties.id)return;const id=f.properties.id;if(!confirm('Delete this '+(f.properties.kind||f.properties.icon)+'?'))return;const p=snap();
      if(S.adds[id])delete S.adds[id];else S.dels[id]={type:f.properties.icon,coords:f.geometry.coordinates};commit(p);refreshMarksSafe();return}
    if(f&&S.adds[f.properties.id]){openForm(f.properties.id);return}
    const p=snap(),id='u'+uid();S.adds[id]={type:addType,coords:pt(e),name:'',desc:''};commit(p);refreshMarksSafe();openForm(id)});
  map.on('click',e=>{if(mode!=='shore'&&mode!=='depth')return;if(mode==='shore'&&!isOld())return;if(drag&&drag.moved||Date.now()-lastDrag<350)return;
    const v=hit(e,['devVtx'])[0];if(v){active=v.properties.lid;selV=v.properties.i;picked=true;sub();render();return}
    const m=hit(e,['devMid'])[0];if(m){const L=S.lines.find(l=>l.id===m.properties.lid);if(L){const p=snap();L.pts.splice(m.properties.i,0,pt(e));active=L.id;selV=m.properties.i;commit(p)}return}
    const p=snap();let L=cur();if(!L||(mode==='depth')!==(L.kind==='depth')){L={id:uid(),kind:mode==='depth'?'depth':'shore',type:mode==='depth'?'contour':shoreType,depth:mode==='depth'?depthVal:null,pts:[],closed:false};S.lines.push(L);active=L.id}
    L.pts.push(pt(e));selV=L.pts.length-1;picked=false;commit(p)});
  const vStart=e=>{if(mode!=='shore'&&mode!=='depth')return;const v=hit(e,['devVtx'])[0];if(!v)return;const L=S.lines.find(l=>l.id===v.properties.lid);if(!L)return;
    if(e.originalEvent&&e.originalEvent.touches&&e.originalEvent.touches.length>1)return;
    lockPan();drag={kind:'v',L,i:v.properties.i,prev:snap(),moved:false};active=L.id;selV=v.properties.i};
  map.on('mousedown',vStart);map.on('touchstart',vStart);
  const mv=e=>{if(!drag)return;if(drag.kind==='v'){drag.L.pts[drag.i]=pt(e);drag.moved=true;render()}
    else if(drag.kind==='lp'){if(!drag.armed){const dx=e.point.x-drag.p0.x,dy=e.point.y-drag.p0.y;if(dx*dx+dy*dy>100){clearTimeout(drag.t);drag=null}}else{drag.ghost=pt(e);drag.moved=true;render()}}};
  map.on('mousemove',mv);map.on('touchmove',mv);
  const end=e=>{if(!drag)return;const d=drag;drag=null;if(d.moved)lastDrag=Date.now();unlockPan();
    if(d.kind==='v'&&d.moved)commit(d.prev);
    if(d.kind==='lp'){clearTimeout(d.t);if(d.armed&&d.moved&&d.ghost&&S.adds[d.id]){const p=snap();S.adds[d.id].coords=d.ghost;commit(p);refreshMarksSafe()}else if(d.armed&&d.moved&&d.ghost){const p=snap();const o=S.moves[d.id];S.moves[d.id]={from:o?o.from:d.from,to:d.ghost,icon:d.icon};commit(p);refreshMarksSafe()}}
    render()};
  map.on('mouseup',end);map.on('touchend',end);
  const lpStart=e=>{if(mode!=='move')return;if(e.originalEvent&&e.originalEvent.touches&&e.originalEvent.touches.length>1)return;
    const f=hit(e,['marks','pois','poidots'])[0];if(!f||!f.properties.id)return;
    const id=f.properties.id;const sf=(typeof staticFeats!=='undefined'&&staticFeats||[]).find(x=>x.properties.id===id);
    drag={kind:'lp',id,icon:f.properties.icon,from:sf?sf.geometry.coordinates:f.geometry.coordinates,p0:e.point,armed:false};
    drag.t=setTimeout(()=>{if(drag&&drag.kind==='lp'){drag.armed=true;lockPan();drag.ghost=drag.from;render();if(navigator.vibrate)navigator.vibrate(20)}},450)};
  map.on('mousedown',lpStart);map.on('touchstart',lpStart)}
// ---------- image overlay ----------
let ovURL=null;const cap=document.createElement('div');cap.id='devCap';
function capture(){cap.style.display=(mode==='image'&&S.overlay&&!S.overlay.locked)?'block':'none'}
function idb(op,val){return new Promise(res=>{const r=indexedDB.open('navDev',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');
  r.onsuccess=()=>{const tx=r.result.transaction('kv',op==='get'?'readonly':'readwrite'),s=tx.objectStore('kv');const q=op==='get'?s.get('img'):op==='del'?s.delete('img'):s.put(val,'img');q.onsuccess=()=>res(q.result);q.onerror=()=>res(null)};r.onerror=()=>res(null)})}
function loadImg(file){const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const c=map.getCenter(),cv=map.getCanvas();
    const mpp=40075016.686*Math.cos(c.lat*Math.PI/180)/(512*2**map.getZoom());const w=cv.clientWidth*.8*mpp;
    const p=snap();S.overlay={name:file.name,center:[c.lng,c.lat],w,ar:im.naturalHeight/im.naturalWidth,rot:0,opacity:.6,locked:false};idb('put',file);setURL(u);commit(p);ovPlace();capture();sub()};im.src=u}
function setURL(u){if(ovURL&&ovURL!==u)URL.revokeObjectURL(ovURL);ovURL=u}
function corners(o){const[lo,la]=o.center,kx=1/(111320*Math.cos(la*Math.PI/180)),ky=1/110540,hw=o.w/2,hh=o.w*o.ar/2,a=-o.rot*Math.PI/180;
  return[[-hw,hh],[hw,hh],[hw,-hh],[-hw,-hh]].map(([x,y])=>[lo+(x*Math.cos(a)-y*Math.sin(a))*kx,la+(x*Math.sin(a)+y*Math.cos(a))*ky])}
function ovPlace(){const o=S.overlay;if(!o||!ovURL)return;const s=map.getSource('devImg'),co=corners(o);
  if(s)s.setCoordinates(co);else{map.addSource('devImg',{type:'image',url:ovURL,coordinates:co});map.addLayer({id:'devImg',type:'raster',source:'devImg',paint:{'raster-opacity':o.opacity,'raster-fade-duration':0}},map.getLayer('uland')?'uland':'devLine')}}
function ovPaint(){if(map.getLayer('devImg'))map.setPaintProperty('devImg','raster-opacity',S.overlay.opacity)}
function ovRemove(){if(map.getLayer('devImg'))map.removeLayer('devImg');if(map.getSource('devImg'))map.removeSource('devImg');setURL(null);capture()}
async function ovFromState(){if(!S.overlay){ovRemove();return}if(!ovURL){const b=await idb('get');if(!b){return}setURL(URL.createObjectURL(b))}if(map.getSource('devImg')){map.removeLayer('devImg');map.removeSource('devImg')}ovPlace();ovPaint();capture()}
// gestures on capture layer (unlocked): 1 finger move, 2 fingers pinch-scale + rotate; map does not pan
let g=null;
cap.addEventListener('touchstart',e=>{e.preventDefault();g=gs(e.touches);g.o=JSON.parse(JSON.stringify(S.overlay));g.prev=snap()},{passive:false});
cap.addEventListener('touchmove',e=>{e.preventDefault();if(!g||!S.overlay)return;const n=gs(e.touches),o=S.overlay;
  if(n.n!==g.n){g=Object.assign(n,{o:JSON.parse(JSON.stringify(o)),prev:g.prev});return}
  const c0=map.unproject(g.c),c1=map.unproject(n.c);o.center=[g.o.center[0]+c1.lng-c0.lng,g.o.center[1]+c1.lat-c0.lat];
  if(n.n>1){o.w=g.o.w*n.d/g.d;o.rot=g.o.rot+(n.a-g.a)*180/Math.PI}ovPlace()},{passive:false});
const gEnd=e=>{if(!g)return;if(!e.touches||!e.touches.length){const p=g.prev;g=null;commit(p);sub()}else{g=Object.assign(gs(e.touches),{o:JSON.parse(JSON.stringify(S.overlay)),prev:g.prev})}};
cap.addEventListener('touchend',gEnd,{passive:true});cap.addEventListener('touchcancel',gEnd,{passive:true});
let md=null;cap.addEventListener('mousedown',e=>{md={x:e.clientX,y:e.clientY,o:JSON.parse(JSON.stringify(S.overlay)),prev:snap()}});
cap.addEventListener('mousemove',e=>{if(!md)return;const r=cap.getBoundingClientRect(),a=map.unproject([md.x-r.left,md.y-r.top]),b=map.unproject([e.clientX-r.left,e.clientY-r.top]);S.overlay.center=[md.o.center[0]+b.lng-a.lng,md.o.center[1]+b.lat-a.lat];ovPlace()});
window.addEventListener('mouseup',()=>{if(md){const p=md.prev;md=null;commit(p)}},{passive:true});
cap.addEventListener('wheel',e=>{e.preventDefault();if(S.overlay){S.overlay.w*=e.deltaY<0?1.05:1/1.05;ovPlace();save()}},{passive:false});
function gs(T){const r=cap.getBoundingClientRect(),P=[...T].map(t=>[t.clientX-r.left,t.clientY-r.top]);const n=P.length;const c=[P.reduce((s,p)=>s+p[0],0)/n,P.reduce((s,p)=>s+p[1],0)/n];
  return n>1?{n,c,d:Math.hypot(P[1][0]-P[0][0],P[1][1]-P[0][1]),a:Math.atan2(P[1][1]-P[0][1],P[1][0]-P[0][0])}:{n,c}}
// ---------- export / import ----------
function exportFC(){const F=S.lines.map(L=>({type:'Feature',geometry:L.closed&&L.pts.length>2?{type:'Polygon',coordinates:[L.pts.concat([L.pts[0]])]}:{type:'LineString',coordinates:L.pts},properties:{edit:L.kind==='depth'?'depth_contour':'shore',type:L.kind==='depth'?'contour':L.type,depth:L.depth,closed:!!L.closed,id:L.id}}));
  for(const id in S.moves){const m=S.moves[id];F.push({type:'Feature',geometry:{type:'Point',coordinates:m.to},properties:{edit:'move',id,icon:m.icon,from:m.from}})}
  for(const id in S.dels){const x=S.dels[id];F.push({type:'Feature',geometry:{type:'Point',coordinates:x.coords},properties:{edit:'delete',id,icon:x.type}})}
  for(const id in S.adds){const a=S.adds[id];F.push({type:'Feature',geometry:{type:'Point',coordinates:a.coords},properties:Object.assign({edit:'add',id,type:a.type,name:a.name||'',description:a.desc||''},{tags:tagsOf(a)})})}
  return{type:'FeatureCollection',app:'nav-app',version:typeof APP_VERSION!=='undefined'?APP_VERSION:'',exported:new Date().toISOString(),overlay:S.overlay?Object.assign({},S.overlay,{corners:corners(S.overlay)}):null,features:F}}
async function exportAll(){const txt=JSON.stringify(exportFC(),null,1),name='nav-edits-'+new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')+'.geojson';
  const file=new File([txt],name,{type:'application/geo+json'});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Nav edits'});return}}catch(e){if(e&&e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
function importAll(){const f=document.createElement('input');f.type='file';f.accept='.geojson,.json,application/geo+json,application/json';
  f.onchange=async()=>{try{const d=JSON.parse(await f.files[0].text()),p=snap(),N={lines:[],moves:{},dels:{},adds:{},overlay:S.overlay};
    for(const x of d.features||[]){const q=x.properties||{};if(q.edit==='delete')N.dels[q.id]={type:q.icon,coords:x.geometry.coordinates};else if(q.edit==='add')N.adds[q.id]={type:q.type,coords:x.geometry.coordinates,name:q.name||'',desc:q.description||''};else if(q.edit==='move')N.moves[q.id]={from:q.from,to:x.geometry.coordinates,icon:q.icon};
      else if(q.edit==='shore'||q.edit==='depth_contour'){const poly=x.geometry.type==='Polygon',c=poly?x.geometry.coordinates[0].slice(0,-1):x.geometry.coordinates;
        N.lines.push({id:q.id||uid(),kind:q.edit==='shore'?'shore':'depth',type:q.edit==='shore'?(q.type||'natural'):'contour',depth:q.depth==null?null:+q.depth,pts:c,closed:poly})}}
    if(d.overlay&&S.overlay)Object.assign(N.overlay,{center:d.overlay.center,w:d.overlay.w,rot:d.overlay.rot,opacity:d.overlay.opacity});
    S=N;commit(p);refreshMarksSafe();ovFromState();list()}catch(e){alert('Import failed: '+e.message)}};f.click()}
// ---------- init ----------
function init(){map.getContainer().appendChild(cap);addLayers();patchMarks();bind();bar();sub();ovFromState();render();window.addEventListener('navtheme',()=>{sub();render()});map.on('styleimagemissing',()=>{});window.addEventListener('bundled-edits',()=>{render();refreshMarksSafe();list()});if(window.BUNDLED_EDIT_IDS){render();refreshMarksSafe()}window.__dev={get S(){return S},setMode,exportFC,undo:doUndo,redo:doRedo}}
if(map.loaded()||map.isStyleLoaded())init();else map.once('load',init);
})();
