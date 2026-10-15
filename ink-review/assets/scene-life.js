// Quiet, separately mixed life ambience. Supplied dialogue recordings stay untouched.
export function createSceneLife(stage){
 const audio=document.createElement('audio');audio.id='sceneLife';audio.preload='auto';audio.volume=0;stage.append(audio);
 let source='',pending=false,blocked=false;
 return {
  tick({src='',time=0,active=false,sound=false,dt=0}){
   if(src!==source){audio.pause();source=src;audio.volume=0;blocked=false;if(src){audio.src=src;audio.load();}else{audio.removeAttribute('src');audio.load();}}
   const wanted=!!src&&active&&sound;
   const target=wanted?.28:0;
   audio.volume+=Math.sign(target-audio.volume)*Math.min(Math.abs(target-audio.volume),dt*.18);
   if(wanted&&audio.readyState>=1&&Math.abs(audio.currentTime-time)>.35)audio.currentTime=Math.max(0,Math.min(time,audio.duration-.05));
   if(wanted&&audio.paused&&!pending&&!blocked){pending=true;audio.play().catch(()=>{blocked=true;}).finally(()=>{pending=false;});}
   if(!sound||!src||audio.volume<.001&&!wanted)audio.pause();
  },
  retry(){blocked=false;},
  stop(){audio.pause();audio.volume=0;},
  proof(){return {source,volume:audio.volume,time:audio.currentTime,paused:audio.paused,blocked};}
 };
}
