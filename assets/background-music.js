// One player. Music follows story movement, never the Index or dialogue hold.
const music=document.createElement('audio');music.id='backgroundMusic';music.src=new URL('./voices/background-music.mp3',import.meta.url).href;music.loop=true;music.preload='none';music.volume=0;document.body.append(music);
let toggle=document.querySelector('#soundToggle');
const MAX_VOLUME=.10;
let endingSilent=false;
let started=false,inArchive=false,proximity=0,dialogueHold=false,lastElapsed=null,lastKind=null,fade=0,targetVolume=0;
function sync(){
 toggle ||= document.querySelector('#soundToggle');
 if(endingSilent||!started||!toggle||toggle.getAttribute('aria-pressed')!=='true'||document.hidden||inArchive){music.pause();return;}
 if(music.paused)music.play().then(()=>delete music.dataset.blocked).catch(()=>{music.dataset.blocked='true';});
}
function volumeTo(target,milliseconds=1400){
 target=Math.max(0,Math.min(MAX_VOLUME,target));
 if(Math.abs(target-targetVolume)<.0001)return;
 targetVolume=target;cancelAnimationFrame(fade);
 const from=music.volume,start=performance.now();
 const step=now=>{const t=Math.min(1,(now-start)/milliseconds),e=t*t*(3-2*t);music.volume=from+(target-from)*e;if(t<1)fade=requestAnimationFrame(step);};
 fade=requestAnimationFrame(step);
}
function reset(){endingSilent=false;cancelAnimationFrame(fade);music.volume=targetVolume=0;proximity=0;dialogueHold=false;lastElapsed=null;lastKind=null;}
document.addEventListener('experience-selected',()=>{started=true;sync();});
const toggleObserver=new MutationObserver(sync);let watchedToggle;
function watchToggle(){toggle ||= document.querySelector('#soundToggle');if(toggle&&toggle!==watchedToggle){toggleObserver.observe(toggle,{attributes:true,attributeFilter:['aria-pressed']});watchedToggle=toggle;}}
watchToggle();document.addEventListener('DOMContentLoaded',watchToggle);document.addEventListener('experience-selected',watchToggle);
for(const event of ['pointerdown','keydown'])window.addEventListener(event,()=>queueMicrotask(sync),{capture:true});
document.addEventListener('visibilitychange',sync);
document.addEventListener('blender-entry-frame',e=>{
 const t=Math.max(0,Math.min(1,(e.detail.progress-.45)/.55));proximity=t*t*(3-2*t);
 if(!inArchive&&!dialogueHold)volumeTo(MAX_VOLUME*proximity,400);
});
document.addEventListener('higgsfield-frame',({detail:q})=>{
 if(inArchive)return;
 if(['fade','explore','archive'].includes(q.kind)){volumeTo(0,1200);return;}
 if(q.kind==='dialogue'){dialogueHold=true;volumeTo(0,1000);}
 else if(['travel','transfer'].includes(q.kind)){
  // A new transfer's initial frame is stationary: wait for actual movement.
  if(lastKind===q.kind&&lastElapsed!==null&&Math.abs(q.elapsed-lastElapsed)>.00001){dialogueHold=false;proximity=1;volumeTo(MAX_VOLUME,1800);}
 }
 lastElapsed=q.elapsed;lastKind=q.kind;
});
document.addEventListener('archive-open',()=>{inArchive=true;reset();music.pause();});
document.addEventListener('archive-story',()=>{inArchive=false;reset();sync();});
document.addEventListener('story-home',reset);
document.addEventListener('story-restart',()=>{inArchive=false;reset();sync();});

// The ending envelope follows story time, including seeking and replay.
document.addEventListener('blender-ending-frame',e=>{
 if(inArchive)return;
 const seconds=(e.detail*144-70)/74*72;
 const u=Math.max(0,Math.min(1,(seconds-66)/6));
 cancelAnimationFrame(fade);music.volume=targetVolume=MAX_VOLUME*(1-u*u*(3-2*u));
 endingSilent=seconds>=72;if(endingSilent)music.pause();else sync();
});
