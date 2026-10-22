/**
 * @file OSM tags -> seamark/POI classification, priorities, light characteristic labels.
 * Pure functions (no DOM/map access) so they can be unit-tested and reused by the editor.
 */

/** Human-readable kinds. */
export const TYPE_BG={buoy_lateral:'Lateral buoy',buoy_cardinal:'Cardinal buoy',buoy_isolated_danger:'Isolated danger buoy',buoy_safe_water:'Safe water buoy',buoy_special_purpose:'Special purpose buoy',
  beacon_lateral:'Lateral beacon',beacon_cardinal:'Cardinal beacon',beacon_isolated_danger:'Isolated danger beacon',beacon_safe_water:'Safe water beacon',beacon_special_purpose:'Special purpose beacon',
  light_major:'Lighthouse',light_minor:'Navigation light',harbour:'Harbour',anchorage:'Anchorage',mooring:'Mooring',rock:'Rock',wreck:'Wreck',obstruction:'Obstruction',marina:'Marina',fuel:'Fuel station',fuel_truck:'Fuel truck'};
export const COL_BG={red:'red',green:'green',white:'white',yellow:'yellow',blue:'blue',orange:'orange',violet:'violet',black:'black'};
export const CAT_BG={north:'north',south:'south',east:'east',west:'west',port:'port',starboard:'starboard'};
const POI_LBL={chandlery:'Chandlery',grocery:'Grocery',hardware:'Hardware',gshop:'Shop',pharmacy:'Pharmacy',rest:'Restaurant',fishrest:'Fish taverna',steak:'Grill / steakhouse',service:'Boat service',hospital:'Hospital',medical:'Medical point'};

/** Priority per seamark icon (higher draws on top / wins collisions). */
const PRIO={light_major:9,light:6,isolated:8,card_north:8,card_south:8,card_east:8,card_west:8,lat_red:7,lat_green:7,lat_redgreen:7,lat_greenred:7,safe:7,special:5,beacon:4,rock:3,rock_awash:3,wreck:3,danger:3};

/**
 * v22: light colour suffix from OSM colour tags (R/G/W; yellow counts as W).
 * @param {string} ic icon id @param {Record<string,string>} t tags @returns {string} '' or '_R', '_RG', ...
 */
export function lsuf(ic,t){if(ic!=='light'&&ic!=='light_major')return'';const s=new Set();for(const k in t)if(/^seamark:light(:\d+)?:colour$/.test(k))String(t[k]).split(/[;,]/).forEach(c=>{c=c.trim();if(c)s.add(c==='red'?'R':c==='green'?'G':'W')});
  const k=['R','G','W'].filter(x=>s.has(x)).join('');return k&&k!=='W'?'_'+k:''}

/**
 * Seamark category from 'seamark:type' (category first, multi-colour aware).
 * @param {Record<string,string>} t @returns {string|null} icon id
 */
export function classifySeamark(t){const st=t['seamark:type']||'';
  if(st==='light_major')return'light_major';if(st==='light_minor')return'light';if(st==='wreck')return'wreck';
  if(st==='rock'){const wl=t['seamark:rock:water_level']||'';return /awash|covers|dry/.test(wl)?'rock_awash':'rock'}
  if(st==='obstruction')return'danger';
  const m=st.match(/^(buoy|beacon)_(.*)$/);if(!m)return null;const kind=m[2],cat=t[`seamark:${st}:category`]||'',col=(t[`seamark:${st}:colour`]||'').split(';').filter(c=>c!=='white'||kind!=='lateral');
  if(kind==='lateral'){const both=col.includes('red')&&col.includes('green');if(both&&/preferred_channel_port/.test(cat))return'lat_greenred';if(both&&/preferred_channel_starboard/.test(cat))return'lat_redgreen';
    if(/starboard|right/.test(cat))return'lat_green';if(/port|left/.test(cat))return'lat_red';
    if(col.includes('green')&&!col.includes('red'))return'lat_green';if(col.includes('red')&&!col.includes('green'))return'lat_red';return'beacon'}
  if(kind==='cardinal')return['north','south','east','west'].includes(cat)?'card_'+cat:'beacon';
  if(kind==='isolated_danger')return'isolated';if(kind==='safe_water')return'safe';if(kind==='special_purpose')return'special';return'beacon'}

/**
 * Classify a tag set.
 * @param {Record<string,string>} t OSM tags (seamark:* expanded)
 * @returns {[string,string,number]|null} [icon id, kind label, priority]
 */
export function classify(t){
  if(t.poi==='fuel_truck'||t.fuel_truck==='yes'||/fuel_truck/.test(t['seamark:small_craft_facility:category']||''))return['fuel_truck','Fuel truck',5];
  if(t.poi)return[t.poi==='chandlery'?'shop':'p_'+t.poi,POI_LBL[t.poi]||'POI',1];
  const st=t['seamark:type']||'';
  if(t.leisure==='marina'||st==='harbour'&&/marina/.test(t['seamark:harbour:category']||''))return['marina',TYPE_BG.marina,5];
  if(/^(boat|chandler|ship_chandler|marine|fishing)$/.test(t.shop||'')||/chandler/.test(t['seamark:small_craft_facility:category']||''))return['shop','Boat shop',2];
  if(t.waterway==='fuel'||/fuel/.test(t['seamark:small_craft_facility:category']||''))return['fuel',TYPE_BG.fuel,5];
  if(st==='harbour')return['harbour',TYPE_BG.harbour,4];
  if(st==='anchorage')return['anchorage',TYPE_BG.anchorage,4];
  if(st==='mooring')return['mooring',TYPE_BG.mooring,1];
  const ic=classifySeamark(t);if(!ic)return null;
  return[ic,TYPE_BG[st]||'Seamark',PRIO[ic]||4];
}

/**
 * Chart-notation light label from expanded seamark:light* tags, e.g. "Fl(2) WR 10s 12m 8/5M".
 * @param {Record<string,string>} t @returns {string}
 */
export function lightLabel(t){const CL={white:'W',red:'R',green:'G',yellow:'Y',blue:'Bu',orange:'Or',violet:'Vi',amber:'Am'};
  const P=[...new Set(Object.keys(t).map(k=>(k.match(/^seamark:light(:\d+)?:/)||[])[0]).filter(Boolean))];
  const groups=new Map();
  for(const p of P){const ch=t[p+'character'];if(!ch)continue;const gr=t[p+'group'],pe=t[p+'period'];
    const key=ch+'|'+(gr||'')+'|'+(pe||'');const g=groups.get(key)||{ch,gr,pe,col:new Set(),rng:[],h:[]};
    (t[p+'colour']||'').split(';').forEach(c=>c&&g.col.add(CL[c]||c));if(t[p+'range'])g.rng.push(+t[p+'range']);if(t[p+'height'])g.h.push(+t[p+'height']);groups.set(key,g)}
  const order=['W','R','G','Y','Bu','Or','Vi','Am'];
  return [...groups.values()].map(g=>{const cols=[...g.col].sort((a,b)=>order.indexOf(a)-order.indexOf(b)).join('');
    const rs=[...new Set(g.rng.sort((a,b)=>b-a))];
    return [g.ch+(g.gr?`(${g.gr})`:''),cols,g.pe?g.pe+'s':'',g.h.length?Math.max(...g.h)+'m':'',rs.length?rs.join('/')+'M':''].filter(Boolean).join(' ')}).join(' · ')}

/**
 * Popup lines describing each light ("Fl(2) · white/red · 10 s").
 * @param {Record<string,string>} t @returns {string[]}
 */
export function lightText(t){
  // seamark:light:character / seamark:light:1:character ...
  const out=[];const pref=Object.keys(t).filter(k=>/^seamark:light(:\d+)?:(character|colour|period)$/.test(k)).map(k=>k.replace(/:(character|colour|period)$/,''));
  for(const p of [...new Set(pref)].sort()){const ch=t[p+':character'],co=t[p+':colour'],pe=t[p+':period'],gr=t[p+':group'];
    const cs=co?co.split(';').map(c=>COL_BG[c]||c).join('/'):'';
    out.push([ch?ch+(gr?`(${gr})`:''):'',cs,pe?pe+' s':''].filter(Boolean).join(' · '))}
  return out.filter(Boolean)}
