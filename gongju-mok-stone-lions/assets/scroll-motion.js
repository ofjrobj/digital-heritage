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

// Fixed short gestures; start slowing three steps before the destination.
// A linear minimum duration also bounds speed when several gestures are queued.
export function scrollTweenDuration(scene,from,to,end,drag=false){
  const gap=Math.abs(to-from);
  if(gap<.0001)return 0;
  const step=Number(scene.secondsPerScroll)||2;
  const remaining=to>=from?end-to:to;
  const zone=Math.min(end*.45,step*(Number(scene.arrivalSlowdownSteps)||3));
  const u=Math.max(0,Math.min(1,1-remaining/Math.max(.01,zone)));
  const approach=u*u*(3-2*u);
  const cruise=Number(scene.scrollSmoothingMs)||1900;
  const arrival=Number(scene.arrivalSmoothingMs)||3400;
  const departure=from<.04||from>=end-.04;
  let base=cruise+(arrival-cruise)*approach;
  if(departure)base=Math.max(base,Number(scene.departureSmoothingMs)||2200);
  if(drag)base=Math.max(220,Math.min(900,(Number(scene.dragSmoothingMs)||520)*(1+.6*approach)));
  const cruiseRate=Number(scene.scrollMaxRate)||2.4;
  const arrivalRate=Number(scene.arrivalMaxRate)||1.35;
  const rateLimit=cruiseRate+(arrivalRate-cruiseRate)*approach;
  // 2.5 bounds the Hermite derivative, including a carried starting velocity.
  const boundedDuration=gap*2500/Math.max(.1,rateLimit);
  return Math.max(drag?base:base*Math.max(.55,Math.sqrt(gap/step)),boundedDuration);
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

// Walking gestures land on reviewed frames rather than arbitrary equal timestamps.
export function nextScrollStop(scene,time,direction,end){
  if(scene.uniformInputDistance)return Math.max(0,Math.min(end,time+direction*(Number(scene.secondsPerScroll)||1.8)));
  const stops=[0,...(scene.scrollStops||[])].filter(t=>Number.isFinite(t)&&t>=0&&t<=end);
  if(stops.length<2)return Math.max(0,Math.min(end,time+direction*(Number(scene.secondsPerScroll)||2)));
  return direction>0?(stops.find(t=>t>time+.025)??end):([...stops].reverse().find(t=>t<time-.025)??0);
}

// Dragging keeps its continuous movement; release makes only a small local correction.
export function nearestSharpStop(scene,time,end){
  // Keep drag distance; only round to the nearest decodable source frame.
  if(scene.uniformInputDistance){const fps=Number(scene.fps)||30;return Math.max(0,Math.min(end,Math.round(time*fps)/fps));}
  const stops=[0,...(scene.dragStopTimes||scene.scrollStops||[]),end];
  return stops.reduce((best,t)=>Math.abs(t-time)<Math.abs(best-time)?t:best,stops[0]);
}

// Manual input owns movement. Release holds the frame already reached, never
// the queued walking destination; authored turns and autoplay are independent.
export function manualScrollHoldTime({scene={},currentTime=0,clipIn=0,duration=Infinity,lastInputAt=-Infinity,now,released=false,automatic=false,idleMs=120}){
 if(automatic||!released&&now-lastInputAt<idleMs)return null;
 const fps=Number(scene.fps)>0?Number(scene.fps):30;
 const source=Math.max(clipIn,Number(currentTime)||0);
 const frame=Math.floor(source*fps+1e-6)/fps;
 return Math.max(0,Math.min(duration,frame-clipIn));
}

// Direct input needs only a short runway, not a queue spanning the whole film.
// Tiny drag packets must clear the one-frame stop tolerance so the decoder can
// show a frame before stopping again. Pointer release still holds immediately.
export function boundedManualTarget(target,local,end,scene={},drag=false){
 const direction=Math.sign(target-local);
 if(!direction)return Math.max(0,Math.min(end,target));
 const frame=1/(Number(scene.fps)||30);
 const maximum=Math.max(frame*2,Number(scene.secondsPerScroll)||1.8);
 const distance=Math.max(drag?frame*2:0,Math.min(maximum,Math.abs(target-local)));
 return Math.max(0,Math.min(end,local+direction*distance));
}

// Native forward decoding, with a bounded acceleration and braking envelope.
// All distances are source seconds; the target remains the authored sharp stop.
export function continuousScrollRate(gap,dt,previous,scene={},remaining=Infinity){
 if(!Number.isFinite(gap)||gap<=1/(Number(scene.fps)||30)+.004||!Number.isFinite(dt)||dt<=0)return 0;
 const step=Math.min(dt,.25),floor=.25;
 const cruise=Number(scene.scrollCruiseRate)||.95;
 const arrival=Number(scene.scrollArrivalRate)||.48;
 const zone=Number(scene.scrollArrivalZone)||2.4;
 const u=Math.max(0,Math.min(1,1-remaining/zone));
 const cap=cruise+(arrival-cruise)*u*u*(3-2*u);
 const braking=Number(scene.scrollBraking)||.65;
 const desired=Math.min(cap,Math.sqrt(2*braking*Math.max(0,gap-.012)),gap/.24);
 const response=desired<previous?.16:(Number(scene.scrollRateResponse)||.24);
 const rate=Math.max(0,Number(previous)||0)+(desired-Math.max(0,Number(previous)||0))*(1-Math.exp(-step/response));
 // Keep the next frame within the target even after a delayed animation frame.
 const ceiling=Math.min(cap,(gap-.006)/step);
 return ceiling<floor?0:Math.max(floor,Math.min(ceiling,rate));
}
