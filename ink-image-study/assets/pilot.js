import {dialogueCopy} from './dialogue-copy.js';
import {clamp,advanceGesture} from './scroll-progress.js';
import {travelCommand} from './video-travel.js';
import {opening,storyClips,openingPhase,openingRate} from './story-media.js?v=1';
import './media-tone.js?v=1';
const $=id=>document.getElementById(id);
const stage=$('stage'),still=$('still'),picture=$('picture'),panel=$('cinemaDialogue'),sound=$('soundToggle'),music=$('music');
const review=document.body.dataset.mode==='review';
const candidate720=review&&new URLSearchParams(location.search).get('candidate')==='720p';
const clips=storyClips();
let state='cover',progress=0,target=0,gestureUsed=0,lastWheel=0,preview=false,visibleVideo=null,lastFrame=performance.now(),dialogueTime=0,reviewFrozen=false,portraitTimer=0,drag=null,soundOn=false,volumeTarget=0,travelRate=.22,pendingSeek=null;
const videos={};$('film').remove();
for(const [key,c] of Object.entries(clips)){
 const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';video.disablePictureInPicture=true;video.src=new URL(c.file+'?v=4',import.meta.url).href;video.dataset.clip=key;video.style.opacity='0';picture.append(video);videos[key]=video;
 video.addEventListener('loadedmetadata',()=>{if(key==='intro')video.playbackRate=openingRate(video.duration);});
 video.addEventListener('error',()=>{if(state===key)showError();});
 video.addEventListener('loadeddata',()=>{if(state===key){$('loading').hidden=true;seekVideo();}});
 video.addEventListener('seeked',()=>{if(state===key){video.style.opacity='1';still.style.opacity='0';}});
 video.addEventListener('ended',()=>{if(state===key){if(key==='intro')enter('travel1');else if(target>.9999||preview)enter(key==='travel1'?'dialogue1':'dialogue2');}});
}
$('review').hidden=!review;
$('chapter').querySelector('[value="aerial"]').hidden=false;
if(candidate720){document.title='720p 검토본 · '+document.title;const badge=document.createElement('span');badge.textContent='720p 검토본 · 건물·인물 일관성 미확정';badge.style.cssText='position:absolute;right:0;bottom:calc(100% + 4px);font-size:11px;background:#f1f1e5e8;padding:3px 7px;white-space:nowrap';$('review').append(badge);$('review').setAttribute('aria-label','720p 검토본 — 인물·건축물 일관성 미확정');$('stop').title='720p 검토본: 이동 중 건물·화풍 변형이 남아 있습니다';}
function showError(){
 $('loading').hidden=false;$('loading').replaceChildren(document.createTextNode('영상을 불러오지 못했습니다. 연결을 확인해 주세요.'));
 const b=document.createElement('button');b.textContent='다시 불러오기';b.onclick=()=>{videos[state]?.load();$('loading').textContent='풍경을 불러오는 중입니다…';};$('loading').append(b);
}
function updateReview(){if(!review)return;$('chapter').value=state==='intro'&&openingPhase(progress)==='aerial'?'aerial':state;$('seek').value=progress;$('seek').disabled=!clips[state];$('preview').disabled=state==='cover';$('preview').textContent=(preview||state.startsWith('dialogue')&&!reviewFrozen)?'일시 정지':'이어서 재생';}
function enter(next,at=0,autoIntro=true,frozen=false){
 state=next;progress=target=clamp(at);gestureUsed=0;dialogueTime=0;preview=false;reviewFrozen=frozen;travelRate=.22;
 for(const v of Object.values(videos)){v.pause();v.style.opacity='0';}
 visibleVideo=videos[next]||null;pendingSeek=visibleVideo?progress:null;still.style.opacity='1';$('loading').hidden=true;
 $('title').hidden=next!=='cover';$('openingCopy').hidden=true;panel.hidden=!next.startsWith('dialogue');$('cue').hidden=!next.startsWith('travel');sound.hidden=next==='cover';
 stage.append(sound);delete document.body.dataset.dialogue;stage.dataset.scene=next;delete stage.dataset.opening;
 stage.setAttribute('aria-label',{'cover':'석사자 먹빛 시작 화면','intro':'먹 번짐으로 공주목에 들어가기','travel1':'길을 따라 장사꾼에게 이동','dialogue1':'장사꾼의 이야기','travel2':'길을 따라 농민에게 이동','dialogue2':'농민의 이야기'}[next]);
 if(next==='cover')still.src='assets/cover.png';
 else if(next.startsWith('dialogue')){
  const index=next==='dialogue1'?0:1;still.src='assets/'+(index?'farmer':'merchant')+'.png';document.body.dataset.dialogue='true';
  panel.querySelector('h2').textContent=index?'농민':'장사꾼';$('testimony').textContent=dialogueCopy[index].testimony;panel.querySelector('.dialogue-footer').append(sound);
 }else{
  still.src='assets/'+clips[next].start;
  if(visibleVideo.readyState<2)$('loading').hidden=false;
  seekVideo();
  if(next==='intro'&&autoIntro){preview=true;visibleVideo.playbackRate=openingRate(visibleVideo.duration);visibleVideo.play().catch(()=>{preview=false;$('loading').hidden=false;$('loading').textContent='화면을 눌러 이야기를 시작해 주세요.';});}
 }
 updateReview();syncAudio();
}
function seekVideo(){
 if(!visibleVideo||!Number.isFinite(visibleVideo.duration))return;
 const end=Math.max(0,visibleVideo.duration-.04);
 const t=Math.min(end,clamp(pendingSeek??progress)*(state==='intro'?visibleVideo.duration:end));
 if(!visibleVideo.seeking&&Math.abs(visibleVideo.currentTime-t)>.022){visibleVideo.currentTime=t;pendingSeek=null;}
 else if(visibleVideo.readyState>=2&&Math.abs(visibleVideo.currentTime-t)<.05){pendingSeek=null;visibleVideo.style.opacity='1';still.style.opacity='0';}
}
function begin(){if(state==='cover'){enter('intro');stage.focus({preventScroll:true});}else if(state==='intro'&&!preview){preview=true;visibleVideo.playbackRate=openingRate(visibleVideo.duration);visibleVideo.play().catch(showError);$('loading').hidden=true;}}
function inputTravel(pixels,isNew){
 if(!$('rotate').hidden)return;
 if(state==='cover'){if(pixels>0)begin();return;}
 if(!state.startsWith('travel'))return;
 if(isNew)gestureUsed=0;
 const changed=advanceGesture(target,gestureUsed,pixels);target=changed.target;gestureUsed=changed.used;
 if(target>.9999)target=1;
 preview=false;reviewFrozen=false;updateReview();
}
stage.addEventListener('wheel',e=>{if(e.target.closest('button,select,input,a'))return;e.preventDefault();const now=performance.now(),fresh=now-lastWheel>220;lastWheel=now;inputTravel(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1),fresh);},{passive:false});
stage.addEventListener('pointerdown',e=>{if(e.target.closest('button,select,input,a'))return;drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};gestureUsed=0;stage.setPointerCapture(e.pointerId);});
stage.addEventListener('pointermove',e=>{if(!drag)return;const dx=drag.lastX-e.clientX,dy=drag.lastY-e.clientY;drag.lastX=e.clientX;drag.lastY=e.clientY;inputTravel((Math.abs(e.clientX-drag.x)>Math.abs(e.clientY-drag.y)?dx:dy)*1.2,false);});
for(const event of ['pointerup','pointercancel'])stage.addEventListener(event,()=>{drag=null;});
stage.addEventListener('keydown',e=>{if(e.target.closest('select,input,button,a'))return;if(['ArrowDown','ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();if(!e.repeat)inputTravel(120,true);}if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();if(!e.repeat)inputTravel(-120,true);}});
$('begin').onclick=begin;$('story').onclick=()=>stage.focus({preventScroll:true});$('stop').onclick=()=>enter('cover');
$('index').onclick=()=>{
 sessionStorage.setItem('ink-pilot-resume',JSON.stringify({state,progress,soundOn,dialogueTime}));sessionStorage.setItem('ink-pilot-return',review?(candidate720?'review.html?candidate=720p':'review.html'):'play.html');
 for(const v of Object.values(videos))v.pause();music.pause();location.assign('archive/index.html');
};
function syncAudio(){volumeTarget=soundOn&&!document.hidden&&state!=='cover'&&state!=='dialogue2'?.09:0;if(volumeTarget>0&&music.paused)music.play().catch(()=>{});}
function soundState(){sound.setAttribute('aria-pressed',String(soundOn));sound.setAttribute('aria-label',soundOn?'소리 끄기':'소리 켜기');$('soundState').textContent=soundOn?'켜짐':'꺼짐';$('soundMark').setAttribute('d',soundOn?'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14':'m16 9 5 6m0-6-5 6');}
music.volume=0;sound.onclick=()=>{soundOn=!soundOn;soundState();syncAudio();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){for(const v of Object.values(videos))v.pause();music.pause();}else if(state==='intro'&&preview)visibleVideo.play().catch(()=>{});syncAudio();});
$('chapter').onchange=e=>e.target.value==='aerial'?enter('intro',opening.aerialStart+.005,false,true):enter(e.target.value,0,false,true);
$('seek').oninput=e=>{if(visibleVideo)visibleVideo.pause();preview=false;progress=target=Number(e.target.value);pendingSeek=progress;seekVideo();updateReview();};
$('preview').onclick=()=>{if(state.startsWith('dialogue')){reviewFrozen=!reviewFrozen;}else if(clips[state]){preview=!preview;target=progress;if(state==='intro'){if(preview){visibleVideo.playbackRate=openingRate(visibleVideo.duration);visibleVideo.play().catch(showError);}else visibleVideo.pause();}}updateReview();};
let rotationShown=false;
function orientation(){const portrait=innerHeight>innerWidth&&innerWidth<700;if(portrait&&!rotationShown){rotationShown=true;$('rotate').hidden=false;portraitTimer=setTimeout(()=>{$('rotate').hidden=true;},3000);}if(!portrait){clearTimeout(portraitTimer);$('rotate').hidden=true;}}
addEventListener('resize',orientation);orientation();
function frame(now){
 const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;
 if(!document.hidden){
  if(state==='intro'&&visibleVideo&&pendingSeek===null){progress=Number.isFinite(visibleVideo.duration)?clamp(visibleVideo.currentTime/visibleVideo.duration):0;target=progress;const phase=openingPhase(progress);if(stage.dataset.opening!==phase){stage.dataset.opening=phase;updateReview();}$('openingCopy').hidden=phase!=='aerial';}
  else if(state.startsWith('travel')){
   const v=visibleVideo;
   if(v&&Number.isFinite(v.duration)&&v.readyState>=2){
    const end=Math.max(0,v.duration-.04);
    const command=travelCommand(v.currentTime,target*end,travelRate,dt,preview);
    travelRate=command.rate;
    if(command.mode==='play'){
     v.playbackRate=travelRate;
     if(v.paused&&!v.seeking&&!v.dataset.playPending){v.dataset.playPending='true';v.play().catch(()=>{}).finally(()=>{delete v.dataset.playPending;});}
    }else{
     v.pause();
     if(command.mode==='reverse'&&!v.seeking)v.currentTime=command.time;
    }
    progress=clamp(v.currentTime/end);
    if(preview)target=progress;
    if(target>.9999&&v.currentTime>=end-.023)enter(state==='travel1'?'dialogue1':'dialogue2');
   }
  }else if(state==='dialogue1'&&!reviewFrozen){
   dialogueTime+=dt;
   if(dialogueTime>=Math.max(10,dialogueCopy[0].testimony.length/5))enter('travel2');
  }
  music.volume+=(volumeTarget-music.volume)*(1-Math.exp(-dt/.8));if(volumeTarget===0&&music.volume<.001){music.volume=0;music.pause();}
  if(review&&!$('seek').matches(':active'))$('seek').value=progress;
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
let resume=null;try{resume=JSON.parse(sessionStorage.getItem('ink-pilot-resume'));sessionStorage.removeItem('ink-pilot-resume');}catch{}
if(resume&&['cover','intro','travel1','dialogue1','travel2','dialogue2'].includes(resume.state)){soundOn=!!resume.soundOn;enter(resume.state,resume.progress,false,review);dialogueTime=resume.dialogueTime||0;soundState();}else enter('cover');
