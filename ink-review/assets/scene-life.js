// A quiet village bed continues while the visitor stands or walks.
// Its own loop avoids rewinding whenever scroll-driven video pauses.
// Original supplied dialogue recordings and the music envelope are independent.
export function createSceneLife(stage){
 const audio=document.createElement('audio');audio.id='sceneLife';audio.preload='auto';audio.volume=0;audio.loop=true;stage.append(audio);
 let source='',pending=false,blocked=false,request=0,wantedNow=false;
 return {
  tick({src='',time=0,active=false,sound=false,gain=1,dt=0}){
   if(src!==source){audio.pause();source=src;audio.volume=0;blocked=false;request++;pending=false;if(src){audio.src=src;audio.load();}else{audio.removeAttribute('src');audio.load();}}
   const wanted=!!src&&active&&sound;wantedNow=wanted;
   if(!wanted){request++;pending=false;audio.pause();audio.volume=0;return;}
   // Keep the existing ambience level; approach timing fades it to zero.
   const target=.28*Math.max(0,Math.min(1,gain));
   audio.volume=target<audio.volume?target:Math.min(target,audio.volume+Math.max(0,dt)*.18);
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
