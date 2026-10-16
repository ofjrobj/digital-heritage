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

export function endingMusicGain(time,duration){
 if(!(duration>0))return 1;
 const t=Math.max(0,Math.min(1,(time-duration*11/12)/(duration/12)));
 return 1-t*t*(3-2*t);
}

// Keep the dialogue envelope separate from the ending fade, so a changing
// ending gain does not restart the volume ramp on every animation frame.
export function createStoryMusic(audio){
 const envelope={volume:0},fade=createMusicFade(envelope);
 let enabled=false,pending=false,blocked=false,error=null,suspended=false,request=0;
 function ensure(){
  if(!enabled||suspended||pending||blocked||!audio.paused)return;
  const attempt=++request;pending=true;
  Promise.resolve().then(()=>{if(attempt===request&&enabled&&!suspended)return audio.play();}).then(()=>{
   if(!enabled||suspended)audio.pause();
   else if(attempt===request)error=null;
  }).catch(e=>{if(attempt===request){blocked=true;error=e?.name||'AudioError';}})
   .finally(()=>{if(attempt===request)pending=false;});
 }
 function retry(){blocked=false;error=null;ensure();}
 audio.addEventListener?.('canplay',()=>{if(error!=='NotAllowedError')retry();});
 return {
  enable(value){enabled=value;blocked=false;error=null;if(value)ensure();else{request++;pending=false;audio.pause();audio.volume=0;envelope.volume=0;}},
  retry,
  suspend(){suspended=true;request++;pending=false;audio.pause();audio.volume=0;envelope.volume=0;},
  tick({duck=false,paused=false,hidden=false,finished=false,endingTime=null,endingDuration=20,dt=0}){
   suspended=paused||hidden;
   if(suspended){audio.pause();audio.volume=0;envelope.volume=0;return;}
   fade(enabled&&!duck&&!finished ? .28 : 0,dt);
   const gain=endingTime==null?1:endingMusicGain(endingTime,endingDuration);
   audio.volume=envelope.volume*gain;
   if(!enabled||finished&&audio.volume<.00001)audio.pause();else ensure();
  },
  proof(){return {enabled,paused:audio.paused,blocked,error,volume:audio.volume};}
 };
}
