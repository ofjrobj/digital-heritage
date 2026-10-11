// User-supplied Index soundtrack, isolated from story music.
const toggle=document.querySelector('#soundToggle');
const music=document.createElement('audio');music.id='indexMusic';music.src=new URL('./voices/index-soft-ambient.mp3',import.meta.url).href;music.loop=true;music.preload='metadata';music.volume=0;document.body.append(music);
let active=false,fade=0;
function sync(){
 const on=active&&!document.hidden&&toggle?.getAttribute('aria-pressed')==='true';
 cancelAnimationFrame(fade);
 if(!on){music.pause();music.volume=0;return;}
 music.play().then(()=>{delete music.dataset.blocked;const start=performance.now(),from=music.volume;function step(now){const t=Math.min(1,(now-start)/1400);music.volume=from+(.16-from)*t;if(t<1)fade=requestAnimationFrame(step);}fade=requestAnimationFrame(step);}).catch(()=>{music.dataset.blocked='true';});
}
document.addEventListener('archive-open',()=>{active=true;sync();});
for(const event of ['archive-story','story-home','story-restart'])document.addEventListener(event,()=>{active=false;sync();});
if(toggle)new MutationObserver(sync).observe(toggle,{attributes:true,attributeFilter:['aria-pressed']});
document.addEventListener('visibilitychange',sync);
for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{if(active&&music.paused)queueMicrotask(sync);});
