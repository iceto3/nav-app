/** @file Icon set E: antique engraved (sepia ink, hatching) for the Old chart (ids without prefix). */
import { W, R, G, Y, K, Wh, bandsOf, topmarkFor, shapeOf } from './svg.js?v=35';

const INK='#4a3018',VER='#9b3b26',VERD='#3f6f5f',OCH='#b8862b';
/** @param {string} k seamark key @returns {string} SVG */
export function seamarkOld(k){const hatch=(id,c)=>`<pattern id="${id}" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.4" height="2.4" fill="${c}" opacity=".35"/><path d="M0 0v2.4" stroke="${c}" stroke-width="1"/></pattern>`;
  if(k==='light_major')return W(44,48,`${hatch('h','#6b4a2b')}<g stroke="${OCH}" stroke-width="1" opacity=".9">${[...Array(12)].map((_,i)=>{const a=i*30*Math.PI/180;return `<path d="M${22+Math.cos(a)*7} ${12+Math.sin(a)*7}L${22+Math.cos(a)*(i%2?11:15)} ${12+Math.sin(a)*(i%2?11:15)}"/>`}).join('')}</g>`+
    `<path d="M16 44l3-26h6l3 26z" fill="url(#h)" stroke="${INK}" stroke-width="1.1"/><path d="M18 9h8v7h-8z" fill="#efe4cb" stroke="${INK}"/><path d="M17 9l5-4 5 4z" fill="${VER}" stroke="${INK}" stroke-width=".8"/><path d="M16.5 18h11" stroke="${INK}" stroke-width="1.6"/><path d="M11 45h22" stroke="${INK}" stroke-width="1.4"/>`);
  if(k==='light')return W(28,30,`<g stroke="${OCH}" stroke-width=".9">${[...Array(8)].map((_,i)=>{const a=i*45*Math.PI/180;return `<path d="M${14+Math.cos(a)*4} ${12+Math.sin(a)*4}L${14+Math.cos(a)*9} ${12+Math.sin(a)*9}"/>`}).join('')}</g><circle cx="14" cy="12" r="2.6" fill="${OCH}" stroke="${INK}"/><path d="M14 15v11M10 26h8" stroke="${INK}" stroke-width="1.2"/>`);
  if(k==='beacon')return W(22,30,`<path d="M11 27V8M7 27h8" stroke="${INK}" stroke-width="1.4"/><path d="M8 6h6l-3 4z" fill="${INK}"/>`);
  if(k==='rock')return W(22,22,`<path d="M5 11h12M11 5v12" stroke="${INK}" stroke-width="1.5"/><circle cx="11" cy="11" r="1.4" fill="${INK}"/>`);
  if(k==='rock_awash')return W(22,22,`<path d="M5 11h12M11 5v12M7 7l8 8M15 7l-8 8" stroke="${INK}" stroke-width="1.2"/>`);
  if(k==='wreck')return W(32,22,`<path d="M4 11h24M10 6v10M16 4v14M22 6v10" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`);
  if(k==='danger')return W(30,30,`<circle cx="15" cy="15" r="11" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="1.5 2"/><text x="15" y="18" font-family="Georgia,serif" font-style="italic" font-size="7.5" text-anchor="middle" fill="${INK}">Obstn</text>`);
  const map={[R]:VER,[G]:VERD,[Y]:OCH,[K]:INK,[Wh]:'#efe4cb'};const b=bandsOf(k).map(c=>map[c]);
  const sh=shapeOf(k);const base=34;
  const pats=b.map((c,i)=>hatch('p'+i,c)).join('');
  const clip={can:`M14 ${base}v-13h12v13z`,cone:`M13 ${base}l7-15 7 15z`,sphere:`M13 ${base-1}a7 7 0 1 1 14 0z`,pillar:`M14 ${base}l2.5-18h7l2.5 18z`}[sh];
  const top=base-20,bh=20/b.length;const strips=b.map((c,i)=>`<rect x="10" y="${top+i*bh}" width="20" height="${bh+.2}" fill="${c==='#efe4cb'?'#efe4cb':'url(#p'+i+')'}"/>`).join('');
  const tm=topmarkFor(k,20,k.startsWith('card_')?8:6,6,INK,{r:VER,g:VERD,k:INK,y:OCH});
  return W(40,42,`${pats}<clipPath id="ec"><path d="${clip}"/></clipPath><g clip-path="url(#ec)">${strips}</g><path d="${clip}" fill="none" stroke="${INK}" stroke-width="1.1"/><path d="M11 ${base+1}q3-2 6 0t6 0 6 0" stroke="${INK}" stroke-width=".9" fill="none"/>${tm}`)}
