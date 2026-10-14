// One grounded step at most every 720ms, only while manual travel input continues.
export function createScrollFootsteps(audio,allowed,clock=()=>performance.now()) {
 let deadline=0,nextStep=0,pending=false;
 audio.loop=false;audio.volume=.28;
 function stop(){deadline=0;audio.pause();audio.dataset.active='false';}
 function tick(){
  const now=clock();
  if(!allowed()||now>=deadline){stop();return;}
  audio.volume=.28*Math.min(1,(deadline-now)/35);
  if(now<nextStep||pending||!audio.paused&&!audio.ended)return;
  nextStep=now+720;pending=true;audio.currentTime=0;
  audio.play().then(()=>{
   if(!allowed()||clock()>=deadline)stop();
   else {audio.dataset.active='true';audio.dataset.starts=String(Number(audio.dataset.starts||0)+1);}
  }).catch(stop).finally(()=>{pending=false;});
 }
 function pulse(){if(!allowed()){stop();return;}deadline=clock()+200;tick();}
 return {pulse,tick,stop};
}
