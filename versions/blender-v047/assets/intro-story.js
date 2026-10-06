const intro=document.querySelector('#intro'),video=document.querySelector('#introBackdrop'),line=document.querySelector('#introStoryLine'),sound=document.querySelector('#soundToggle');
let selected=Boolean(document.body.dataset.experience),ready=document.querySelector('#intro').dataset.lionReady==='true',started=false,timer;
intro.dataset.storyState='waiting';
const beats=[[0,'돌에 남은 선'],[5,'여름의 길을 따라'],[10,'가을을 건너'],[15,'겨울에도 남아 있는 것'],[20,'오래된 길 위에'],[25,'오늘의 풍경이 겹쳐진다'],[28,'다시, 두 석사자']];
function finish(){intro.classList.remove('story-playing','story-past','story-present');line.textContent='';video.pause();intro.dataset.storyState='ended';document.dispatchEvent(new CustomEvent('intro-weather',{detail:0}));}
function begin(){selected=selected||Boolean(document.body.dataset.experience);ready=ready||intro.dataset.lionReady==='true';if(!selected||!ready||started)return;clearTimeout(timer);timer=setTimeout(async()=>{if(started)return;try{video.muted=true;video.currentTime=0;intro.dataset.storyState='playing';intro.classList.add('story-playing');document.dispatchEvent(new CustomEvent('intro-weather',{detail:.001}));await video.play();started=true;}catch(error){intro.dataset.storyState='retry';intro.classList.remove('story-playing');}},3000);}
video.addEventListener('canplay',begin);document.addEventListener('pointerup',()=>{if(intro.dataset.storyState==='retry')begin();});
document.addEventListener('lion-ready',()=>{ready=true;begin();});
document.addEventListener('experience-selected',()=>{selected=true;ready=ready||document.querySelector('#lionStatus').textContent==='';begin();});
document.addEventListener('lion-observation',e=>{if(e.detail){started=true;clearTimeout(timer);finish();}});
video.addEventListener('timeupdate',()=>{if(!intro.classList.contains('story-playing'))return;const t=video.currentTime;document.dispatchEvent(new CustomEvent('intro-weather',{detail:t}));line.textContent=beats.filter(([at])=>at<=t).at(-1)?.[1]||'';intro.classList.toggle('story-past',t>=20&&t<25);intro.classList.toggle('story-present',t>=25&&t<28);});
video.addEventListener('ended',finish);video.addEventListener('error',finish);
sound.addEventListener('click',()=>{video.muted=sound.getAttribute('aria-pressed')!=='true';const label=video.muted?'소리 켜기':'소리 끄기';sound.setAttribute('aria-label',label);sound.title=label;});
document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else if(intro.classList.contains('story-playing'))video.play().catch(finish);});

begin();
