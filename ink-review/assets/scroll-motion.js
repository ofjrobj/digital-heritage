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

// Keep each gesture's distance fixed; ease longer into people or the lions.
export function scrollTweenDuration(scene,from,to,end,drag=false){
  const gap=Math.abs(to-from);
  if(gap<.0001)return 0;
  if(drag)return Math.max(180,Math.min(650,Number(scene.dragSmoothingMs)||420));
  const step=Number(scene.secondsPerScroll)||2.67;
  const arrival=to>=end-.04||to<=.04;
  const departure=from<.04||from>=end-.04;
  const base=arrival?(Number(scene.arrivalSmoothingMs)||2100):departure?(Number(scene.departureSmoothingMs)||1500):(Number(scene.scrollSmoothingMs)||1250);
  return base*Math.max(.65,Math.min(2.8,Math.sqrt(gap/step)));
}

export function sourcePlaybackRate(curve,time){
  if(!curve?.length)return 1;
  if(time<=curve[0].time)return curve[0].rate;
  for(let i=1;i<curve.length;i++)if(time<=curve[i].time){
    const a=curve[i-1],b=curve[i],u=Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time)));
    return a.rate+(b.rate-a.rate)*u*u*(3-2*u);
  }
  return curve[curve.length-1].rate;
}
