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
  /** Marker heading in degrees or null: COG while moving, else compass (or the last COG). */
  heading: null,
  /** Smoothed course over ground (degrees) while moving, else null (location/motion.js). */
  cog: null,
  /** Smoothed speed over ground (kn) while moving, else null (location/motion.js). */
  sog: null,
  /** SOG above the MOTION.movingKn threshold (location/motion.js). */
  moving: false,
  /** Map follows own position. */
  follow: false,
  /** Turn-by-turn navigation active. */
  navigating: false,
};
