/** @file Turn-by-turn guidance: Start/Stop, voice prompts, progress tracking, rerouting. */
import { NAV, LOCATION } from '../config.js?v=34';
import { state } from '../core/state.js?v=34';
import { $ } from '../core/dom.js?v=34';
import { on } from '../core/events.js?v=34';
import { haversine as hav } from '../core/geo.js?v=34';
import { toast } from '../ui/toast.js?v=34';
import { startWatch, startCompass } from '../location/boat.js?v=34';
import { rt, hooks, getRoute } from './router.js?v=34';
import { fmtDist, fmtTime } from './format.js?v=34';
import { instr } from './instructions.js?v=34';

let voice = false, lastReroute = 0;
function say(t){if(!voice||!('speechSynthesis' in window))return;const u=new SpeechSynthesisUtterance(t);u.lang='en-GB';
  const v=speechSynthesis.getVoices().find(v=>v.lang&&v.lang.toLowerCase().startsWith('en'));if(v)u.voice=v;speechSynthesis.cancel();speechSynthesis.speak(u)}
function stopNav(){state.navigating=false;$('#goBtn').textContent='▶ Start'}

function trackProgress(){const route=rt.route,me=state.me;
  if(!route)return;
  let off=Infinity;for(const p of route.pts){const d=hav(me,p);if(d<off)off=d}
  if(off>NAV.offRouteM&&Date.now()-lastReroute>NAV.rerouteMinMs){lastReroute=Date.now();toast('Rerouting…');say('Rerouting');getRoute(false);return}
  const steps=route.stepsAll;
  while(rt.curStep<steps.length-1){const nx=steps[rt.curStep+1].maneuver.location;if(hav(me,[nx[1],nx[0]])<NAV.stepReachedM){rt.curStep++;}else break}
  const curStep=rt.curStep,announced=rt.announced;
  const nx=steps[Math.min(curStep+1,steps.length-1)],loc=[nx.maneuver.location[1],nx.maneuver.location[0]],d=hav(me,loc),i=curStep+1;
  const drv=rt.mode==='driving',far=drv?NAV.announceFarM.driving:NAV.announceFarM.other,near=drv?NAV.announceNearM.driving:NAV.announceNearM.other;
  if(d<far&&d>near*2&&!announced[i]){announced[i]=1;say(`In ${fmtDist(d)}, ${instr(nx).replace(/^./,c=>c.toLowerCase())}`)}
  else if(d<near&&announced[i]!==2){announced[i]=2;say(instr(nx))}
  if(nx.maneuver.type==='arrive'&&hav(me,[rt.dest[0],rt.dest[1]])<NAV.arriveM){stopNav();}
  document.querySelectorAll('#steps li').forEach((li,k)=>li.className=k===curStep?'cur':'');
  const remaining=steps.slice(curStep+1).reduce((a,s)=>a+s.distance,0)+d,ratio=remaining/route.distance;
  $('#summary').innerHTML=`<b>${fmtDist(d)}</b> → ${instr(nx)}<small>${fmtDist(remaining)} left · ~${fmtTime(route.duration*ratio)}</small>`;
}

/** Wire voice/Start buttons and position tracking. @param {any} map */
export function initNavigation(map){
  hooks.stopNav=stopNav;
  $('#voiceBtn').onclick=()=>{voice=!voice;$('#voiceBtn').textContent=voice?'🔊':'🔇';$('#voiceBtn').classList.toggle('on',voice);
    if(voice){say('Voice guidance on');}toast(voice?'Voice guidance on':'Voice guidance off')};
  $('#goBtn').onclick=()=>{if(!rt.route)return;if(state.navigating){stopNav();return}
    state.navigating=true;state.follow=true;$('#goBtn').textContent='■ Stop';$('#steps').hidden=false;startWatch();startCompass();
    const me=state.me;if(me)map.flyTo({center:[me[1],me[0]],zoom:LOCATION.navZoom});say(instr(rt.route.stepsAll[0]));rt.announced[0]=2};
  on('position',()=>{if(state.navigating)trackProgress()});
}
