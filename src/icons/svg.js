/**
 * @file Shared SVG building blocks for the seamark icon sets: wrapper, IALA colours, band layouts,
 * buoy shapes and topmarks. Every icon must carry explicit width/height attributes (the loader reads them).
 */

/** SVG wrapper with optional <defs>. @param {number} w @param {number} h @param {string} b body @param {string} [defs] */
export const W = (w, h, b, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs ? '<defs>' + defs + '</defs>' : ''}${b}</svg>`;
/** IALA colours. */
export const R = '#e3262b', G = '#16a34a', Y = '#f5c400', K = '#151515', Wh = '#ffffff';
/** All seamark icon keys drawn by the D (satellite) and E (Old chart) sets. */
export const KEYS = ['light_major', 'light', 'beacon', 'lat_red', 'lat_green', 'lat_redgreen', 'lat_greenred', 'card_north', 'card_east', 'card_south', 'card_west', 'isolated', 'safe', 'special', 'rock', 'rock_awash', 'wreck', 'danger'];
/** Cardinal bands top->bottom and topmark (cone directions top->bottom: 1 up, 0 down). */
export const CB = { north: [[K, Y], [1, 1]], south: [[Y, K], [0, 0]], east: [[K, Y, K], [1, 0]], west: [[Y, K, Y], [0, 1]] };
/** Colour bands (top->bottom) of a buoy key. @param {string} k */
export const bandsOf = k => ({ lat_red: [R], lat_green: [G], lat_redgreen: [R, G, R], lat_greenred: [G, R, G], isolated: [K, R, K], safe: [R, Wh, R, Wh], special: [Y], card_north: CB.north[0], card_east: CB.east[0], card_south: CB.south[0], card_west: CB.west[0] })[k];
const cones=(cx,y,dirs,c,s,stroke)=>dirs.map((d,i)=>{const yy=y+i*(s+1);return d?`<path d="M${cx} ${yy}l${s*.7} ${s}h${-s*1.4}z" fill="${c}" ${stroke}/>`:`<path d="M${cx} ${yy+s}l${s*.7} ${-s}h${-s*1.4}z" fill="${c}" ${stroke}/>`}).join('');
/** Topmark SVG for a buoy key. @returns {string} */
export const topmarkFor=(k,cx,y,s,st,col)=>{col=col||{};const sk=`stroke="${st||'#fff'}" stroke-width="1"`;
  if(k==='lat_red'||k==='lat_redgreen')return `<rect x="${cx-s*.55}" y="${y}" width="${s*1.1}" height="${s}" fill="${col.r||R}" ${sk}/>`;
  if(k==='lat_green'||k==='lat_greenred')return `<path d="M${cx} ${y}l${s*.7} ${s}h${-s*1.4}z" fill="${col.g||G}" ${sk}/>`;
  if(k.startsWith('card_'))return cones(cx,y-s*.9,CB[k.slice(5)][1],col.k||K,s*.9,sk);
  if(k==='isolated')return `<circle cx="${cx}" cy="${y-s*.4}" r="${s*.45}" fill="${col.k||K}" ${sk}/><circle cx="${cx}" cy="${y+s*.6}" r="${s*.45}" fill="${col.k||K}" ${sk}/>`;
  if(k==='safe')return `<circle cx="${cx}" cy="${y+s*.4}" r="${s*.5}" fill="${col.r||R}" ${sk}/>`;
  if(k==='special')return `<path d="M${cx-s*.5} ${y}l${s} ${s}M${cx+s*.5} ${y}l${-s} ${s}" stroke="${col.y||Y}" stroke-width="${s*.35}"/>`;
  return ''};
/** Buoy body shape per key (cardinals/isolated: pillar). */
export const SHAPE = { lat_red: 'can', lat_redgreen: 'can', lat_green: 'cone', lat_greenred: 'cone', safe: 'sphere', special: 'pillar' };
/** @param {string} k @returns {'can'|'cone'|'sphere'|'pillar'} */
export const shapeOf = k => (k.startsWith('card_') || k === 'isolated' ? 'pillar' : SHAPE[k] || 'pillar');
