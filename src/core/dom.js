/** @file Small DOM helpers. */

/** querySelector shorthand. @param {string} s @returns {any} */
export const $ = s => document.querySelector(s);

/**
 * Create an element, optionally with id, inline css and innerHTML.
 * @param {string} tag
 * @param {{id?:string, className?:string, css?:string, html?:string, text?:string}} [o]
 * @returns {HTMLElement}
 */
export function el(tag, o = {}) {
  const e = document.createElement(tag);
  if (o.id) e.id = o.id;
  if (o.className) e.className = o.className;
  if (o.css) e.style.cssText = o.css;
  if (o.html != null) e.innerHTML = o.html;
  if (o.text != null) e.textContent = o.text;
  return e;
}

/** Escape text for HTML. @param {*} s @returns {string} */
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** URL of a bundled file resolved against the document base (works from / and /editor/). @param {string} path */
export const assetUrl = path => new URL(path, document.baseURI).href;
