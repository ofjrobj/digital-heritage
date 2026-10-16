// Quiet life ambience follows the delivered video clock, wrapping short beds.
// Original supplied dialogue recordings and the music envelope are independent.
export function createSceneLife(stage){
 const audio=document.createElement('audio');audio.id='sceneLife';audio.preload='auto';audio.volume=0;audio.loop=true;stage.append(audio);
 let source='',pending=false,blocked=false,request=0,wantedNow=false;
 return {
  tick({src='',time=0,active=false,sound=false,dt=0}){
   if(src!==source){audio.pause();source=src;audio.volume=0;blocked=false;request++;pending=false;if(src){audio.src=src;audio.load();}else{audio.removeAttribute('src');audio.load();}}
   const wanted=!!src&&active&&sound;wantedNow=wanted;
   if(!wanted){request++;pending=false;audio.pause();audio.volume=0;return;}
   audio.volume=Math.min(.28,audio.volume+Math.max(0,dt)*.18);
   if(audio.readyState>=1&&Number.isFinite(audio.duration)&&audio.duration>0){
    const duration=audio.duration,position=((Math.max(0,time)%duration)+duration)%duration;
    // Compare on the circular timeline: 20.03s and .01s are adjacent in a20.04s bed.
    const difference=Math.abs(audio.currentTime-position),distance=Math.min(difference,duration-difference);
    if(distance>.35&&!audio.seeking)audio.currentTime=position;
   }
   if(audio.paused&&!pending&&!blocked){
    const attempt=++request;pending=true;
    audio.play().then(()=>{if(!wantedNow)audio.pause();}).catch(()=>{if(attempt===request)blocked=true;}).finally(()=>{if(attempt===request)pending=false;});
   }
  },
  retry(){blocked=false;},
  stop(){wantedNow=false;request++;pending=false;audio.pause();audio.volume=0;},
  proof(){return {source,volume:audio.volume,time:audio.currentTime,paused:audio.paused,blocked,loop:audio.loop};}
 };
}
