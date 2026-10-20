// Source-time markers keep the arrival consistent even when decoding stalls.
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>{const u=clamp(n);return u*u*(3-2*u);};
export function shouldStartApproach(scene,next,time,moving,direction){
 const a=scene?.dialogueApproach;
 return !!a&&scene.mode==='scroll'&&next?.mode==='dialogue'&&moving&&direction>0&&time>=a.start;
}
export function approachState(scene,time){
 const a=scene.dialogueApproach;
 const progress=ease((time-a.start)/(a.end-a.start));
 return {rate:a.cruiseRate+(a.arrivalRate-a.cruiseRate)*progress,
  cover:ease((time-a.fadeFrom)/(a.end-a.fadeFrom)),done:time>=a.end};
}
