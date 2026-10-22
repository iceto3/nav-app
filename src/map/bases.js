/**
 * @file Base maps (radio) and overlays (checkboxes) shown in the layer switcher.
 * A base lists the layer ids it shows; an overlay lists the layer ids it toggles (default: its own key).
 */
export const BASES = {
  sat: { label: 'Satellite (Esri)', layers: ['sat'] },
  topo: { label: 'Topo map (Esri)', layers: ['topo'] },
  osm: { label: 'OpenStreetMap (streets)', layers: ['osm'] },
  old: { label: 'Old chart', layers: ['old_bg', 'old_land', 'old_water', 'old_rip0', 'old_rip1', 'old_rip2', 'old_coast', 'old_csea', 'old_cland', 'old_land2', 'old_inwater', 'old_piera', 'old_pierO', 'old_pier', 'old_crip0', 'old_crip1', 'old_crip2', 'old_ccoast', 'old_bld', 'old_roads', 'old_ferry'] },
};

/** @type {Record<string, {label:string, on?:boolean, layers?:string[]}>} */
export const OVERLAYS = {
  marks: { label: 'Seamarks', on: true, layers: ['marks', 'pois', 'poidots', 'ltLbl'] },
  labels: { label: 'Place & water labels', on: true, layers: ['lblWater', 'lblIsland', 'lblPlace'] },
  depth: { label: 'Depth (EMODnet)' },
  contours: { label: 'Contours (EMODnet WMS)' },
  dcont: { label: 'Depth contours', layers: ['dband', 'dcont', 'dcontS', 'dcontLbl', 'ucont', 'ucontS', 'ucontLbl'] },
  osmSea: { label: 'OpenSeaMap (legacy raster)' },
};

/** @param {string|null} q ?base= value @returns {string} valid base key */
export const resolveBase = q => (BASES[q] ? q : 'sat');
