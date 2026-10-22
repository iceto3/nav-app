/** @file Distance/time formatting for route UI and voice. */
/** @param {number} m metres @returns {string} */
export function fmtDist(m){return m>=1000?(m/1000).toFixed(m>=10000?0:1)+' km':Math.round(m/10)*10+' m'}
/** @param {number} s seconds @returns {string} */
export function fmtTime(s){const h=Math.floor(s/3600),m=Math.round(s%3600/60);return h?`${h} h ${m} min`:`${Math.max(1,m)} min`}
