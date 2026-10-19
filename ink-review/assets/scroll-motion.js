// A bounded scroll step: retain speed across renewed input, then arrive with
// zero speed and acceleration. A release never starts another walking step.
export function createScrollTween(from,to,started,duration,previous=null){
  const span=to-from,seconds=duration/1000;
  const prior=previous?sampleScrollTween(previous,started).velocity:0;
  const ratio=span&&seconds>0?Math.max(0,Math.min(2.5,prior*seconds/span)):0;
  return {from,to,started,duration,initialSlope:ratio};
}

export function sampleScrollTween(tween,now){
  const u=Math.max(0,Math.min(1,(now-tween.started)/tween.duration));
  if(u>=1)return {position:tween.to,velocity:0,done:true};
  const u2=u*u,u3=u2*u,u4=u3*u,u5=u4*u;
  const r=tween.initialSlope||0,span=tween.to-tween.from;
  // Quintic Hermite: zero endpoint acceleration, with a carried starting speed.
  // Limiting the initial slope to 2.5 keeps the complete path monotone.
  const progress=10*u3-15*u4+6*u5+r*(u-6*u3+8*u4-3*u5);
  const slope=30*u2-60*u3+30*u4+r*(1-18*u2+32*u3-15*u4);
  return {position:tween.from+span*progress,velocity:span*slope/(tween.duration/1000),done:false};
}
