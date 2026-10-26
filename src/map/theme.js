/**
 * @file Base switching and the Old chart theme.
 * setOldTheme runs every registered feature's applyTheme hook (see core/registry.js) and emits 'themechange'.
 */
import { BASES } from './bases.js?v=35';
import { applyThemes } from '../core/registry.js?v=35';
import { state } from '../core/state.js?v=35';
import { emit } from '../core/events.js?v=35';
import { drawScale } from '../ui/scaleBar.js?v=35';
import { applyUserEditTheme } from '../layers/userEdits.js?v=35';

/**
 * Apply/remove the Old chart theme (body.oldchart, scale bar, all feature themes).
 * @param {any} map @param {boolean} on
 */
export function setOldTheme(map, on) {
  document.body.classList.toggle('oldchart', on); drawScale();
  state.oldChart = on;
  applyThemes(map, on);
  emit('themechange', { old: on });
}

/** Show only the layers of base `key` and theme accordingly. @param {any} map @param {string} key */
export function switchBase(map, key) {
  for (const [k, b] of Object.entries(BASES)) b.layers.forEach(id => map.setLayoutProperty(id, 'visibility', k === key ? 'visible' : 'none'));
  setOldTheme(map, key === 'old');
}

/**
 * Initial base from ?base=. Satellite is the style default, so only the user-edit theme is applied there
 * (exactly as v33: the other theme hooks first run on a base switch).
 * @param {any} map @param {string} base
 */
export function applyInitialBase(map, base) {
  const apply = () => {
    state.oldChart = base === 'old'; applyUserEditTheme(map, 'u', state.oldChart);
    if (base === 'sat') return;
    switchBase(map, base);
  };
  if (map.isStyleLoaded()) apply(); else map.once('load', apply);
}
