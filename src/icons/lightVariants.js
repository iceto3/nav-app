/**
 * @file v22: coloured light variants (R, G, RG, RW, GW, RGW) derived from the base light icons by recolouring
 * their main/tint colours; multi-colour variants use horizontal gradient sectors.
 */
const C={D:{R:['#e53935','#ff8a80'],G:['#2e9e44','#a5e8b0'],W:['#ffd54f','#fff59d']},E:{R:['#b03a2e','#b03a2e'],G:['#2e7d4f','#2e7d4f'],W:['#b8862b','#b8862b']}};
const MAIN={D:['#ffd54f','#ffeb3b'],E:['#b8862b']},TINT={D:['#fff59d','#fff7b0'],E:[]};
const recol=(s,key,st)=>{const cs=key.split(''),c=C[st];let o=s;
  if(cs.length===1){for(const m of MAIN[st])o=o.split(m).join(c[cs[0]][0]);for(const m of TINT[st])o=o.split(m).join(c[cs[0]][1]);return o}
  const stops=cs.map((x,i)=>`<stop offset="${i/cs.length}" stop-color="${c[x][0]}"/><stop offset="${(i+1)/cs.length}" stop-color="${c[x][0]}"/>`).join('');
  const tst=cs.map((x,i)=>`<stop offset="${i/cs.length}" stop-color="${c[x][1]}"/><stop offset="${(i+1)/cs.length}" stop-color="${c[x][1]}"/>`).join('');
  o=o.replace(/(<svg[^>]*>)/,`$1<defs><linearGradient id="lsp" x1="0" x2="1">${stops}</linearGradient><linearGradient id="lst" x1="0" x2="1">${tst}</linearGradient></defs>`);
  for(const m of MAIN[st])o=o.replace(new RegExp(`(fill|stroke)="${m}"`,'g'),'$1="url(#lsp)"').split(m).join(c[cs[0]][0]);
  for(const m of TINT[st])o=o.replace(new RegExp(`(fill|stroke)="${m}"`,'g'),'$1="url(#lst)"').split(m).join(c[cs[0]][1]);
  o=o.replace(/fill="url\(#gl\)"/g,'fill="url(#lst)" opacity=".8"');return o};

/**
 * Add light_<c> and D_light_<c> variants to an icon table (mutates it).
 * @param {Record<string,string>} icons
 */
export function addLightVariants(icons){
  for(const b of['light','light_major'])for(const k of['R','G','RG','RW','GW','RGW']){icons[b+'_'+k]=recol(icons[b],k,'E');icons['D_'+b+'_'+k]=recol(icons['D_'+b],k,'D')}}
