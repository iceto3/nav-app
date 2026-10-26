/**
 * @file Tiny app-wide event bus (a shared EventTarget).
 * Events: 'themechange' {detail:{old:boolean}}, 'marksready', 'useredits' {detail:FeatureCollection},
 * 'position', 'tracking', 'fix', 'motion' (see the table in ARCHITECTURE.md).
 */
export const bus = new EventTarget();

/**
 * Emit an app event.
 * @param {string} type
 * @param {*} [detail]
 */
export function emit(type, detail) { bus.dispatchEvent(new CustomEvent(type, { detail })); }

/**
 * Subscribe to an app event.
 * @param {string} type
 * @param {(e: CustomEvent) => void} fn
 * @returns {() => void} unsubscribe
 */
export function on(type, fn) { bus.addEventListener(type, fn); return () => bus.removeEventListener(type, fn); }
