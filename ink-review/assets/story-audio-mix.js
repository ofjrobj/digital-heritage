// Quiet music; resume smoothly after mute or tab visibility resets.
export function createMusicFade(audio){
 const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
 let target=clamp(audio.volume),start=target,lastApplied=target,elapsed=0,duration=1;
 return (next,dt)=>{
  next=clamp(next);
  if(next!==target||Math.abs(audio.volume-lastApplied)>.000001){
   start=clamp(audio.volume);target=next;elapsed=0;duration=next<start?.9:1.8;
  }
  elapsed=Math.min(duration,elapsed+Math.max(0,Number.isFinite(dt)?dt:0));
  const t=elapsed/duration,ease=t*t*(3-2*t);
  lastApplied=clamp(start+(target-start)*ease);
  audio.volume=lastApplied;
 };
}
