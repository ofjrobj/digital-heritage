export function createSeasonAmbience(stage){
 const audio=document.createElement('audio');audio.preload='auto';audio.src=new URL('./test-render/seasons-ambience-v2.mp3',import.meta.url).href;audio.volume=0;audio.setAttribute('aria-hidden','true');stage.append(audio);
 let pending=false,wanted=false;
 return{
  tick({active,time,sound,paused,hidden,transition,dt}){
   wanted=active&&sound&&!paused&&!hidden&&!transition;
   audio.muted=!sound;
   if(wanted){
    if(audio.readyState>=1&&Math.abs(audio.currentTime-time)>.22)audio.currentTime=Math.min(Math.max(0,time),19.98);
    audio.volume=Math.min(.12,audio.volume+dt*1.5);
    if(audio.paused&&!pending&&!audio.ended){pending=true;audio.play().catch(()=>{}).finally(()=>{pending=false;});}
   }else{audio.volume=Math.max(0,audio.volume-dt*2);if(!sound||paused||hidden||audio.volume<.002)audio.pause();}
  },
  stop(){audio.pause();audio.volume=0;wanted=false;},
  proof(){return{wanted,time:audio.currentTime,volume:audio.volume,paused:audio.paused,muted:audio.muted,source:audio.currentSrc||audio.src};}
 };
}
