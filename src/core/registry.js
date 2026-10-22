/**
 * @file Feature registry: the extension point of the app.
 *
 * A *feature* is a module that contributes map layers (into named z-order slots) and optional hooks:
 *
 *   registerFeature({
 *     id: 'myFeature',
 *     layers: [{ slot: 'overlays', spec: {id:'myLayer', type:'line', source:'mySource', ...} }],
 *     applyTheme(map, old) {},   // called on every base switch (old = Old chart active)
 *     onLoad(map) {},            // called once after the style has loaded
 *   });
 *
 * Slots are listed bottom-to-top in {@link LAYER_SLOTS}; within a slot layers keep registration order.
 * Sources live in map/sources.js (one ordered catalog, which also fixes attribution order).
 */

/** Z-order slots, bottom to top. Add a new slot here if a new feature needs its own band. */
export const LAYER_SLOTS = [
  'background',     // bg + raster bases
  'oldSea',         // Old chart paper/sea + detailed sea fill
  'userEditCase',   // ink casing of user shore edits (under all land fills)
  'oldLand',        // Old chart land/piers/coastline ink
  'userEditShore',  // user land fills + shore lines
  'oldTop',         // Old chart buildings/roads/ferries
  'depth',          // EMODnet rasters, bands, contours
  'userEditDepth',  // user depth contours
  'overlays',       // legacy raster overlays
  'route',          // route line
  'marks',          // seamarks / POIs
  'labels',         // place & water labels
];

const features = [];

/**
 * Register a feature (see file header).
 * @param {{id:string, layers?:Array<{slot:string, spec:object}>, applyTheme?:(map:any, old:boolean)=>void, onLoad?:(map:any)=>void}} f
 */
export function registerFeature(f) {
  for (const l of f.layers || []) if (!LAYER_SLOTS.includes(l.slot)) throw new Error(`feature ${f.id}: unknown slot ${l.slot}`);
  features.push(f);
}

/** @returns {object[]} all registered layer specs in final z-order. */
export function collectLayers() {
  const out = [];
  for (const slot of LAYER_SLOTS) for (const f of features) for (const l of f.layers || []) if (l.slot === slot) out.push(l.spec);
  return out;
}

/**
 * Run every feature's theme hook.
 * @param {any} map
 * @param {boolean} old
 */
export function applyThemes(map, old) { for (const f of features) if (f.applyTheme) f.applyTheme(map, old); }

/** Run every feature's onLoad hook. @param {any} map */
export function runOnLoad(map) { for (const f of features) if (f.onLoad) f.onLoad(map); }

/** @returns {string[]} registered feature ids (for tests/debugging). */
export function featureIds() { return features.map(f => f.id); }
