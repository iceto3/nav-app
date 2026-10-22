/**
 * @file The complete icon table: id -> SVG string. Old chart ids are bare ('light'), satellite ids are 'D_'-prefixed.
 * Build order matters (later entries override earlier ones) and is kept identical to v33.
 * To add an icon: add its SVG to a set (or a new module) and assign it here; the loader registers every entry.
 */
import { KEYS } from './svg.js?v=34';
import { seamarkSat } from './seamarkSat.js?v=34';
import { seamarkOld } from './seamarkOld.js?v=34';
import { POI_OLD, POI_SAT, POI_OVERRIDES } from './poiIcons.js?v=34';
import { addLightVariants } from './lightVariants.js?v=34';

/** @type {Record<string,string>} */
export const ICONS = {};
for (const k of KEYS) { ICONS[k] = seamarkOld(k); ICONS['D_' + k] = seamarkSat(k); }
for (const k in POI_OLD) { ICONS[k] = POI_OLD[k]; ICONS['D_' + k] = POI_SAT[k]; }
Object.assign(ICONS, POI_OVERRIDES);
addLightVariants(ICONS);
