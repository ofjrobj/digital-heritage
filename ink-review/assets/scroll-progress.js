// A wheel burst or touch drag owns at most one fifth of a route.
// Smoothing settles toward the requested position; time never adds travel.
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const GESTURE_LIMIT=.199999;
export function advanceGesture(target,used,pixels){
 const requested=pixels/600;
 const nextUsed=clamp(used+requested,-GESTURE_LIMIT,GESTURE_LIMIT);
 return {target:clamp(target+nextUsed-used),used:nextUsed};
}
export function settle(current,target,dt){
 const next=current+(target-current)*(1-Math.exp(-Math.min(dt,.05)/.09));
 return Math.abs(next-target)<.0002?target:next;
}
