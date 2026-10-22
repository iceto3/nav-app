/** @file English turn instructions from OSRM maneuvers. */
const MOD={'uturn':'make a U-turn','sharp right':'sharp right','right':'right','slight right':'slight right','straight':'straight','slight left':'slight left','left':'left','sharp left':'sharp left'};
const ORD=['','1st','2nd','3rd','4th','5th','6th','7th','8th'];
/** Instruction text for an OSRM step. @param {any} s @returns {string} */
export function instr(s){
  const m=s.maneuver,t=m.type,mod=MOD[m.modifier]||'',road=s.name||s.ref||'',on=road?` on ${road}`:'',onto=road?` onto ${road}`:'';
  const turn=m.modifier==='uturn'?'Make a U-turn':m.modifier==='straight'?'Continue straight':`Turn ${mod}`;
  switch(t){
    case 'depart':return `Head out${on}`;
    case 'arrive':return m.modifier&&m.modifier!=='straight'?`You have arrived. Your destination is on the ${m.modifier.includes('left')?'left':'right'}`:'You have arrived at your destination';
    case 'turn':case 'end of road':return turn+onto;
    case 'continue':return m.modifier&&m.modifier!=='straight'?`Continue ${mod}${on}`:`Continue straight${on}`;
    case 'new name':return `Continue${on}`;
    case 'merge':return `Merge ${mod}${onto}`.replace('  ',' ');
    case 'on ramp':return `Take the ramp ${mod}${onto}`.replace('  ',' ');
    case 'off ramp':return `Take the exit ${mod}${onto}`.replace('  ',' ');
    case 'fork':return `At the fork, keep ${mod.replace('slight ','')}${onto}`;
    case 'roundabout':case 'rotary':case 'roundabout turn':
      return m.exit?`At the roundabout, take the ${ORD[m.exit]||m.exit+'th'} exit${onto}`:`Enter the roundabout${onto}`;
    case 'exit roundabout':case 'exit rotary':return `Exit the roundabout${onto}`;
    case 'notification':return `Continue${on}`;
    default:return mod?`${turn}${onto}`:`Continue${on}`;
  }
}
