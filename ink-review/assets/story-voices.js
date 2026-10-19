import {dialogueAudio} from './dialogue-audio/manifest.js?v=mature-timbre-v17';
export function createStoryVoices(stage,{tailSeconds=5}={}) {
 const audio=document.createElement('audio');
 audio.id='storyVoice';audio.preload='auto';audio.volume=.9;stage.append(audio);
 let index=-1,enabled=false,pending=false,failed=false,token=0,leadElapsed=0,tailElapsed=0;
 function play(){
  if(leadElapsed<3||!enabled||index<0||document.hidden||pending||failed||audio.ended||!audio.paused)return;
  const request=token;pending=true;
  audio.play().then(()=>{
   if(request===token&&(!enabled||document.hidden))audio.pause();
  }).catch(()=>{if(request===token)failed=true;}).finally(()=>{if(request===token)pending=false;});
 }
 function select(next){
  if(next===index)return;
  token++;pending=false;audio.pause();index=next;failed=false;leadElapsed=0;tailElapsed=0;
  if(index<0){audio.removeAttribute('src');audio.load();return;}
  audio.src=new URL(dialogueAudio[index].url||('./dialogue-audio/'+dialogueAudio[index].file),import.meta.url).href;
  audio.load();play();
 }
 function setEnabled(value){enabled=value;if(!enabled)audio.pause();else{failed=false;play();}}
 audio.addEventListener('error',()=>{failed=true;});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.pause();else play();});
 addEventListener('pagehide',()=>audio.pause());
 function tick(dt){if(index<0||document.hidden)return;leadElapsed+=Math.max(0,dt);if(audio.ended)tailElapsed+=Math.max(0,dt);play();}
 return {select,setEnabled,tick,duration:i=>dialogueAudio[i]?.duration??0,
  sceneDuration:i=>(dialogueAudio[i]?.duration??0)+3+tailSeconds,
  canFinish:()=>!enabled||failed||index<0||(audio.ended&&tailElapsed>=tailSeconds),
  proof:()=>({leadElapsed,tailElapsed,tailSeconds,index,enabled,failed,paused:audio.paused,ended:audio.ended,time:audio.currentTime,duration:Number.isFinite(audio.duration)?audio.duration:null,source:audio.currentSrc})};
}

