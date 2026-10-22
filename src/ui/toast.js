/** @file Bottom toast (#toast). */
import { $ } from '../core/dom.js?v=34';
import { TIMING } from '../config.js?v=34';

let timer = 0;
/** Show a short message. @param {string} t @param {number} [ms] */
export function toast(t, ms = TIMING.toastMs) { const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(timer); timer = setTimeout(() => e.hidden = true, ms); }
