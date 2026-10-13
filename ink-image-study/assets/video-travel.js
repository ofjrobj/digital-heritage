// Scroll grants a finite amount of travel. Decode forward frames normally;
// currentTime is never stepped during forward motion.
export function travelCommand(time, targetTime, rate, dt, preview=false) {
  const remaining=targetTime-time;
  if (!preview && Math.abs(remaining)<1/45) return {mode:'pause',rate:0};
  if (!preview && remaining<0) {
    return {mode:'reverse',rate:0,time:Math.max(targetTime,time-Math.min(.05,dt)*1.6)};
  }
  const desired=preview ? 1 : Math.max(.22,Math.min(1.8,remaining*3.5));
  const next=rate+(desired-rate)*(1-Math.exp(-Math.min(dt,.05)/.13));
  return {mode:'play',rate:Math.max(.22,next)};
}
