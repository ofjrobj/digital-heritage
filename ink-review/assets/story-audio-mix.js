// Quiet background music with a finite, click-free fade to complete silence.
export function createMusicFade(audio){
 let target=audio.volume,start=target,elapsed=0,duration=1;
 return (next,dt)=>{
  if(next!==target){start=audio.volume;target=next;elapsed=0;duration=next<start?.9:1.8;}
  elapsed=Math.min(duration,elapsed+dt);
  const t=elapsed/duration,ease=t*t*(3-2*t);
  audio.volume=Math.max(0,Math.min(1,start+(target-start)*ease));
 };
}
