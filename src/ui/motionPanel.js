/**
 * @file COG/SOG panel (v35): a small read-out below the version badge, e.g. "COG 237° SOG 5.4 kn".
 * Hidden until location tracking starts ('tracking' event of location/boat.js), then updated on
 * every 'motion' event; shows "—" while stationary or without data. Layout lives in style.css
 * (#motionPanel), clear of the search bar, layer button and zoom box, inside the safe areas.
 */
import { on } from '../core/events.js?v=35';
import { fmtCog, fmtSog } from '../location/navFormat.js?v=35';

/** Create the (hidden) panel and subscribe to tracking/motion events. */
export function initMotionPanel() {
  const el = document.createElement('div');
  el.id = 'motionPanel';
  el.hidden = true;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Course and speed over ground');
  el.innerHTML = '<span class="cog"></span><span class="sog"></span>';
  document.body.appendChild(el);
  const cog = el.querySelector('.cog');
  const sog = el.querySelector('.sog');
  const render = (c, s) => {
    cog.textContent = fmtCog(c);
    sog.textContent = fmtSog(s);
  };
  render(null, null);
  on('tracking', e => {
    el.hidden = !e.detail.on;
  });
  on('motion', e => render(e.detail.cog, e.detail.sog));
}
