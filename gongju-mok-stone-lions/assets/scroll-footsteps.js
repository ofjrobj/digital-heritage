// Play the supplied recording during manual camera movement, fading at every stop.
export function createScrollFootsteps(audio,allowed,clock=()=>performance.now(),gain=()=>1){
 let pending=false,blocked=false,last=clock(),starts=0;
 audio.loop=true;audio.volume=0;audio.dataset.active='false';
 function stop(){audio.pause();audio.volume=0;audio.dataset.active='false';}
 function start(){
  if(pending||blocked)return;
  pending=true;
  audio.play().then(()=>{
   if(!allowed())stop();else{starts++;audio.dataset.starts=String(starts);}
  }).catch(()=>{blocked=true;stop();}).finally(()=>{pending=false;});
 }
 function tick(){
  const now=clock(),dt=Math.min(.08,Math.max(0,(now-last)/1000));last=now;
  if(blocked){stop();return;}
  const wanted=allowed(),target=wanted?.42*Math.max(0,Math.min(1,gain())):0;
  const speed=target>audio.volume?4.2:3.5;
  audio.volume=target>audio.volume?Math.min(target,audio.volume+dt*speed):Math.max(target,audio.volume-dt*speed);
  if(!wanted&&audio.volume<.001){stop();return;}
  if(wanted&&audio.paused)start();
  audio.dataset.active=String(!audio.paused&&audio.volume>.001);
 }
 // Called only from an active user gesture: silently prime the media element,
 // or retry the current walk after an autoplay rejection. Never retry every frame.
 function retry(){blocked=false;if(allowed())tick();else if(audio.paused){audio.volume=0;start();}}
 return {pulse:tick,tick,stop,release:tick,retry,proof:()=>({blocked,starts})};
}
