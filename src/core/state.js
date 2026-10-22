/**
 * @file Shared mutable runtime state. Modules read/write fields of this one object
 * instead of sharing loose globals.
 */
export const state = {
  /** true while the Old chart base is active. */
  oldChart: false,
  /** true while the editor (editor/) has an edit mode active: app popups and dropped pins are suppressed. */
  editing: false,
  /** Own position [lat, lon] or null. */
  me: null,
  /** Compass/GPS heading in degrees or null. */
  heading: null,
  /** Map follows own position. */
  follow: false,
  /** Turn-by-turn navigation active. */
  navigating: false,
};
