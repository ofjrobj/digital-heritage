// Fade the surrounding sound over the final few source seconds of an approach.
export function dialogueApproachGain(scene,nextScene,time,duration){
 if(scene?.mode==='dialogue')return 0;
 if(nextScene?.mode!=='dialogue'||!(duration>0))return 1;
 const window=Math.min(3.2,duration*.3),remaining=Math.max(0,duration-time);
 const t=Math.max(0,Math.min(1,remaining/window));
 return t*t*(3-2*t);
}
export function sceneArrivalDelay(scene){
 return Math.max(0,Number(scene?.startDelay)||0,scene?.mode==='dialogue'?1.05:0);
}
