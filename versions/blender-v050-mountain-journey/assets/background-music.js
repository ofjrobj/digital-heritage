// User-supplied music. One persistent player across Story and Index.
const music=document.createElement('audio');music.id='backgroundMusic';music.src=new URL('./voices/background-music.mp3',import.meta.url).href;music.loop=true;music.preload='none';music.volume=.24;document.body.append(music);
const toggle=document.querySelector('#soundToggle'),voice=document.querySelector('#characterVoice');
let started=false,fade=0;
function enabled(){return toggle.getAttribute('aria-pressed')==='true';}
function sync(){
 if(!started||!enabled()||document.hidden){music.pause();return;}
 if(music.paused)music.play().then(()=>{delete music.dataset.blocked;}).catch(()=>{music.dataset.blocked='true';toggle.setAttribute('aria-label','배경음악 재생을 위해 소리 버튼을 눌러주세요');});
}
function duck(){
 cancelAnimationFrame(fade);const from=music.volume,target=voice&&!voice.paused&&!voice.ended?.065:.24,start=performance.now();
 function step(now){const t=Math.min(1,(now-start)/650);music.volume=from+(target-from)*t;if(t<1)fade=requestAnimationFrame(step);}
 fade=requestAnimationFrame(step);
}
document.addEventListener('experience-selected',()=>{started=true;sync();});
new MutationObserver(sync).observe(toggle,{attributes:true,attributeFilter:['aria-pressed']});
for(const event of ['pointerdown','keydown'])window.addEventListener(event,()=>queueMicrotask(sync),{capture:true});
document.addEventListener('visibilitychange',sync);
for(const event of ['play','pause','ended'])voice?.addEventListener(event,duck);
