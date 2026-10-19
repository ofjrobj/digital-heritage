// Supplied recording: live dragging only, with a short release envelope.
export function createScrollFootsteps(audio,allowed,clock=()=>performance.now(),gain=()=>1){
 let pending=false,last=clock(),starts=0;
 audio.loop=true;audio.volume=0;audio.dataset.active='false';
 function stop(){audio.pause();audio.volume=0;audio.dataset.active='false';}
 function tick(){
  const now=clock(),dt=Math.min(.08,Math.max(0,(now-last)/1000));last=now;
  const wanted=allowed(),target=wanted?.42*Math.max(0,Math.min(1,gain())):0;
  const speed=target>audio.volume?4.2:3.5;
  audio.volume=target>audio.volume?Math.min(target,audio.volume+dt*speed):Math.max(target,audio.volume-dt*speed);
  if(!wanted&&audio.volume<.001){stop();return;}
  if(wanted&&audio.paused&&!pending){
   pending=true;
   audio.play().then(()=>{if(!allowed()&&audio.volume<.001)stop();else{starts++;audio.dataset.starts=String(starts);}}).catch(stop).finally(()=>{pending=false;});
  }
  audio.dataset.active=String(!audio.paused&&audio.volume>.001);
 }
 return {pulse:tick,tick,stop,release:tick};
}
