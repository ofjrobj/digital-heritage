import {createFootageFog} from './footage-fog.js?v=corner-fog-nav-1';
import {createSceneLife} from './scene-life.js?v=quiet-wind-4';
import {createSeasonAmbience} from './season-ambience.js?v=quiet-wind-4';
import {createDialogueFaceSafe} from './dialogue-face-safe.js?v=flow-cover-sound-1';
import {dialogueFrame} from './dialogue-framing.js?v=flow-cover-sound-1';
import {seasonsFrame} from './seasons-framing.js?v=all-visitors-1';
import {createStoryVoices} from './story-voices.js?v=voices-timing-3';
import {createStoryMusic} from './story-audio-mix.js?v=drag-arrival-audio-1';
import {createScrollFootsteps} from './scroll-footsteps.js?v=drag-arrival-audio-1';
import {dialogueCopy} from './dialogue-copy.js?v=dialogue-final-20261014';
import {createIntroInkSpread,introVisualTime} from './intro-ink-spread.js?v=fog-fade-travel-1';
import {createPaperColor, PAPER_CSS} from './paper-color.js?v=archive-paper-1';
import {createWalkingInput,walkingTargetDelta,walkingPlaybackRate} from './walking-input.js?v=rolling-fog-common-walk-1';
import {dialogueApproachGain,sceneArrivalDelay} from './dialogue-audio-flow.js?v=drag-arrival-audio-1';
const walkingInput=createWalkingInput();
let walkingRate=0,walkingDirection=1;
const paperColor=createPaperColor();
const introEffect=createIntroInkSpread({paper:PAPER_CSS});
let normalizedVillage=null;
const introPaintings=['./cover-reference.png','./test-render/intro-mountains.webp'].map(path=>{const im=new Image();im.src=new URL(path,import.meta.url).href;return im;});
const introVillage=new Image();introVillage.src=new URL('./test-render/aerial-bridge-v4.svg?v=flow-cover-sound-1',import.meta.url).href;
introVillage.onerror=()=>{introVillage.dataset.failed='true';};
const introAssetsReady=()=>[...introPaintings,introVillage].every(im=>im.complete&&im.naturalWidth);
const introAssetsFailed=()=>[...introPaintings,introVillage].some(im=>im.dataset.failed==='true'||im.complete&&!im.naturalWidth);
const $=id=>document.getElementById(id),stage=$('stage'),canvas=$('world'),ctx=canvas.getContext('2d',{alpha:false});
const PAPER=PAPER_CSS;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ease=t=>t*t*(3-2*t);
const manifestURL=new URL('./test-render/manifest.json?v=rolling-fog-common-walk-1',import.meta.url),url=s=>s?new URL(s,manifestURL).href:'';
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./test-render-media.css?v=archive-paper-1',import.meta.url).href;document.head.append(css);
document.body.classList.add('test-render-media');
const mist=document.createElement('div');mist.className='tr-mist';mist.setAttribute('aria-hidden','true');stage.append(mist);
const footageFog=createFootageFog({stage,world:canvas,mist});
stage.style.setProperty('--nav-paper','0');
const caption=document.createElement('p');caption.className='tr-caption';caption.hidden=true;stage.append(caption);
const endingPaper=document.createElement('div');endingPaper.className='tr-ending-paper';endingPaper.setAttribute('aria-hidden','true');stage.append(endingPaper);
const archiveCta=document.createElement('a');archiveCta.className='tr-archive-cta';const archiveCtaLabel=document.createElement('span');archiveCtaLabel.textContent='아카이브로 탐색';archiveCta.append(archiveCtaLabel);archiveCta.href=$('indexLink')?.href||'archive/index.html';archiveCta.hidden=true;stage.append(archiveCta);archiveCta.onclick=()=>remember();
let archiveFrame=null,endingElapsed=0,storyStarted=false,loadingHiddenAt=null,firstSceneShownAt=null;
function prepareArchive(){if(archiveFrame)return;archiveFrame=document.createElement('iframe');archiveFrame.className='tr-archive';archiveFrame.title='석사자 아카이브';archiveFrame.src=$('indexLink')?.href||'archive/index.html';archiveFrame.setAttribute('aria-hidden','true');archiveFrame.inert=true;archiveFrame.onload=()=>{archiveFrame.dataset.loaded='true';try{archiveFrame.contentDocument.querySelectorAll('[data-story-return]').forEach(a=>a.target='_top');}catch{}};stage.append(archiveFrame);}
const videos=[0,1].map(()=>{const v=document.createElement('video');v.muted=true;v.crossOrigin='anonymous';v.playsInline=true;v.preload='auto';v.className='tr-source';v.setAttribute('aria-hidden','true');stage.append(v);return v;});
const records=[null,null],voices=createStoryVoices(stage),music=$('music');music.volume=0;const storyMusic=createStoryMusic(music);
const foot=document.createElement('audio');foot.id='scrollFootsteps';foot.preload='auto';foot.src=new URL('./footstep-single-v2.mp3',import.meta.url).href;stage.append(foot);
const names=['장사꾼','농민','찬모','주민 삼총사','나무꾼'];
let scenes=[],lengths=[],total=0,index=-1,current=null,transition=null,local=0,target=0,sound=true,paused=false,previewAuto=false,compare=false,motion=true,last=performance.now(),width=1,height=1,lastScrollAt=-Infinity,lastSource=null,hasFrame=false,finished=false,lastVoiceEnable=null,lastStatus='',renderedKind='none',renderedSource='';
let drag=null,lastDragMoveAt=-Infinity;
const footsteps=createScrollFootsteps(foot,()=>!!drag&&performance.now()-lastDragMoveAt<200&&Math.abs(target-local)>.008&&sound&&!paused&&!compare&&!previewAuto&&!transition&&!document.hidden&&!current?.error&&scenes[index]?.mode==='scroll'&&scenes[index]?.footsteps===true&&(current.still||current.video.readyState>=2));
const seasonAmbience=createSeasonAmbience(stage),sceneLife=createSceneLife(stage);
const dialogueFit=createDialogueFaceSafe({stage,panel:$('cinemaDialogue'),tools:$('testTools'),sound:$('soundToggle')});
const duration=i=>lengths[i]||1,offset=i=>lengths.slice(0,Math.max(0,i)).reduce((a,b)=>a+b,0);
// Keep target/local/seek in source seconds; scale only incoming walking time.
// The opening becomes automatic at the mountain reveal, without changing its source.
function scrollDriven(r=current){return r?.scene.mode==='scroll'&&!r.autoStarted;}
function scrollLimit(){const from=Number(scenes[index]?.autoFrom);return from>0?Math.min(duration(index),from):duration(index);}
// Use the same untrimmed walking scale so an editorial trim stays shorter.
function walkingReference(){const s=scenes[index];return s?.mode==='scroll'&&s.footsteps?Math.max(.1,Number(s.walkingReferenceDuration)||duration(index)):30;}
function walkingInputRange(){return scenes[index]?.footsteps?walkingReference():scrollLimit();}
function status(text,retry=false){if(storyStarted&&text==='Loading...')text='';const node=$('loading');if(!node)return;const key=text+'|'+retry;if(key===lastStatus)return;lastStatus=key;node.replaceChildren(document.createTextNode(text));node.hidden=!text;if(retry){const button=document.createElement('button');button.textContent='다시 불러오기';button.onclick=()=>requestScene(transition?.to??Math.max(0,index),transition?.at??local);node.append(button);}}
function voiceEnabled(value){if(value!==lastVoiceEnable){lastVoiceEnable=value;voices.setEnabled(value);}}
function seasonUiInsets(){
 const bounds=stage.getBoundingClientRect();let top=0,bottom=0;
 for(const id of ['storyIndexBar','soundToggle','testTools']){
  const node=$(id);if(!node||node.hidden)continue;
  const r=node.getBoundingClientRect();if(!r.width||!r.height)continue;
  // Reserve only visible controls at the upper and lower edges of the stage.
  if(r.bottom<=bounds.top+height/2)top=Math.max(top,r.bottom-bounds.top+10);
  else if(r.top>=bounds.top+height/2)bottom=Math.max(bottom,bounds.bottom-r.top+10);
 }
 return {top,bottom};
}
function draw(source){
 if(!source)return false;const sw=source.videoWidth||source.naturalWidth,sh=source.videoHeight||source.naturalHeight;if(!sw||!sh)return false;
 ctx.fillStyle=PAPER;ctx.fillRect(0,0,width,height);const scale=Math.max(width/sw,height/sh);
 const sceneRecord=records.find(r=>r&&(r.video===source||r.image===source));
 const isIntro=sceneRecord?.scene.id==='intro'&&introAssetsReady();
 const graded=isIntro?source:paperColor.render(source);
 const seasonFit=null; // All scene images fill the viewport, including narrow windows.
 function paint(x,y,w,h){ctx.drawImage(graded,x,y,w,h);}
 if(isIntro){
  if(!normalizedVillage){const gradedVillage=paperColor.render(introVillage);normalizedVillage=document.createElement('canvas');normalizedVillage.width=introVillage.naturalWidth;normalizedVillage.height=introVillage.naturalHeight;normalizedVillage.getContext('2d').drawImage(gradedVillage,0,0,normalizedVillage.width,normalizedVillage.height);}
  const time=sceneRecord.video.currentTime;
  const arrival=records.find(r=>r?.scene.id==='aerial-entry');
  const movingVillage=arrival?.loaded&&arrival.video.readyState>=2&&!arrival.video.seeking?paperColor.render(arrival.video):normalizedVillage;
  introEffect.draw(ctx,width,height,clamp((time-.35)/5.65),...introPaintings,movingVillage);
 }else if(seasonFit){
  const r=seasonFit;paint(r.x,r.y,r.w,r.h);
  // Dissolve only the thin paper perimeter; do not crop or rescale subjects.
  const fade=Math.min(16,r.h*.035);
  for(const edge of ['top','bottom']){const y=edge==='top'?r.y:r.y+r.h;const g=ctx.createLinearGradient(0,y,0,y+(edge==='top'?fade:-fade));g.addColorStop(0,PAPER);g.addColorStop(1,'rgba(232,232,230,0)');ctx.fillStyle=g;ctx.fillRect(r.x,edge==='top'?y:y-fade,r.w,fade);}
 }else if(sceneRecord?.scene.id==='seasons'&&!sceneRecord.scene.motionBaked){
  const t=sceneRecord.video.currentTime,approach=ease(clamp((t-10)/8.5)),zoom=1+.12*approach;
  const x=(width-sw*scale)/2,y=(height-sh*scale)/2,fx=x+sw*scale*.52,fy=y+sh*scale*.66;
  ctx.save();ctx.translate(fx,fy);ctx.scale(zoom,zoom);ctx.translate(-fx,-fy);paint(x,y,sw*scale,sh*scale);ctx.restore();
  ctx.save();ctx.globalAlpha=ease(clamp((t-18.5)/1.5));ctx.fillStyle=PAPER;ctx.fillRect(0,0,width,height);ctx.restore();
 }else if(sceneRecord?.scene.mode==='dialogue'){
  const r=dialogueFrame(sceneRecord.scene,width,height,sw,sh,source.currentTime||0);paint(r.x,r.y,r.w,r.h);
 }else paint((width-sw*scale)/2,(height-sh*scale)/2,sw*scale,sh*scale);dialogueFit.update(sceneRecord?.scene,source);lastSource=source;hasFrame=true;
 renderedKind=source.tagName==='VIDEO'?'video':'image';renderedSource=source.currentSrc||source.src||'';return true;
}
function resize(){const d=Math.min(devicePixelRatio||1,2);width=Math.max(1,stage.clientWidth);height=Math.max(1,stage.clientHeight);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);hasFrame=false;ctx.fillStyle=PAPER;ctx.fillRect(0,0,width,height);draw(lastSource);}
addEventListener('resize',resize);new ResizeObserver(resize).observe(stage);resize();
function showText(){const s=scenes[index],panel=$('cinemaDialogue');if(!s)return;if(s.id==='seasons')prepareArchive();const dialogueScene=s.mode==='dialogue',speaking=dialogueScene&&(current?.startElapsed||0)>=sceneArrivalDelay(s);document.body.dataset.dialogue=String(dialogueScene);if(panel){panel.hidden=!speaking;if(speaking){panel.querySelector('h2').textContent=names[s.speaker]||s.label;panel.querySelector('p').textContent=dialogueCopy[s.speaker]?.testimony||'';panel.querySelector('p').scrollTop=0;}}caption.dataset.scene=s.id;caption.dataset.intro=String(s.id==='intro');caption.textContent=s.caption||'';caption.hidden=!s.caption||speaking;if($('next'))$('next').textContent=index<scenes.length-1?'다음 장면으로':'아카이브로';voices.select(speaking?s.speaker:-1);dialogueFit.invalidate();}
function prepare(i,at=0){
 const s=scenes[i],slot=current?1-current.slot:0,v=videos[slot],r={slot,scene:s,video:v,image:null,loaded:false,error:null,still:!s.src,at,clipIn:Math.max(0,Number(s.clipIn)||0),playPending:false,startElapsed:0,autoStarted:Number(s.autoFrom)>0&&at>=Number(s.autoFrom)};
 records[slot]=r;v.pause();v.onloadeddata=null;v.onloadedmetadata=null;v.onerror=null;v.removeAttribute('src');v.load();
 if(s.image){const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{r.image=img;if(r.still)r.loaded=true;};img.onerror=()=>{if(r.still)r.error='이미지를 불러오지 못했습니다.';};img.src=url(s.image);}
 if(s.src){
  v.loop=s.mode==='dialogue'?(s.loop!==false):!!s.loop;v.playbackRate=1;
  v.onloadedmetadata=()=>{if(records[slot]!==r)return;if(s.mode!=='dialogue'&&!s.loop&&Number.isFinite(v.duration)){lengths[i]=Math.max(.1,Math.min(lengths[i],v.duration-r.clipIn));total=lengths.reduce((a,b)=>a+b,0);}const seek=r.clipIn+(s.mode==='dialogue'?0:Math.min(at,duration(i)));if(seek>0)v.currentTime=Math.min(seek,Math.max(0,v.duration-.025));};
  v.onloadeddata=()=>{if(records[slot]===r)r.loaded=true;};v.onerror=()=>{if(records[slot]===r)r.error='영상을 불러오지 못했습니다.';};v.src=url(s.src);v.load();
 }else if(!s.image)r.error='장면 미디어가 없습니다.';
 return r;
}
function preparedScene(i,at=0){
 const cached=records.find(r=>r&&r!==current&&r.scene===scenes[i]&&!r.error);
 if(!cached||at>0&&cached.video.readyState<1)return prepare(i,at);
 cached.autoStarted=Number(scenes[i].autoFrom)>0&&at>=Number(scenes[i].autoFrom);cached.startElapsed=0;cached.playBlocked=false;
 const seek=cached.clipIn+(scenes[i].mode==='dialogue'?0:at);
 if(cached.video.readyState>=1&&Math.abs(cached.video.currentTime-seek)>.04)cached.video.currentTime=seek;
 return cached;
}
function preloadNext(){
 const next=scenes[index+1];if(!next||next.src&&next.src===current?.scene.src)return;
 if(!records.some(r=>r?.scene===next))prepare(index+1,scenes[index]?.id==='intro'?1.625:0);
}
function continuousAdvance(){
 const next=scenes[index+1];if(!next)return false;
 if(scenes[index]?.id==='intro'){
  const ready=records.find(r=>r?.scene===next&&r.loaded&&!r.error&&!r.video.seeking&&r.video.readyState>=2);
  if(!ready)return false;
  current.video.pause();current=ready;index++;local=current.video.currentTime-current.clipIn;target=local;
 }else if(current.scene.src===next.src&&Math.abs(current.clipIn+duration(index)-(Number(next.clipIn)||0))<.05){
  index++;current.scene=next;current.clipIn=Number(next.clipIn)||0;current.autoStarted=false;
  current.startElapsed=0;local=Math.max(0,current.video.currentTime-current.clipIn);target=local;current.video.pause();
 }else return false;
 walkingInput.reset();walkingRate=0;footsteps.stop();showText();preloadNext();return true;
}
function openingPlaybackRate(scene,time,d){
 if(scene?.id==='intro')return 1+.10*ease(clamp((time-1.1)/1.7));
 if(scene?.id!=='aerial-entry')return 1;
 const cruise=1+.12*ease(clamp((time-1.625)/1.8)),glide=cruise-.27*ease(clamp((time-4.5)/2.3));
 return Math.max(.18,glide*(1-.78*ease(clamp((time-(d-3.1))/3.1))));
}
function openingCaption(scene,time){
 let text=scene.caption||'',opacity=scene.captionUntil==null?1:1-clamp((time-scene.captionUntil)/.6),title=scene.id==='intro';
 const opening=scenes.find(s=>s.id==='aerial-entry'),welcome=scenes.find(s=>s.id==='entry-merchant');
 if(scene.id==='intro'&&time>3.9){text=opening?.caption||'';opacity=ease(clamp((time-4)/1.2));title=false;}
 if(scene.id==='aerial-entry'){
  if(time<8){text=opening?.caption||'';opacity=1-ease(clamp((time-6.4)/1.1));}
  else{text=welcome?.caption||'';opacity=ease(clamp((time-8.3)/1.2));}
 }
 if(scene.id==='entry-merchant')opacity=1-ease(clamp((time-.3)/1.2));
 caption.dataset.scene=scene.id;caption.dataset.intro=String(title);
 if(caption.textContent!==text)caption.textContent=text;
 caption.hidden=!text||scene.mode==='dialogue';caption.style.opacity=String(opacity);
}
function requestScene(i,at=0){
 if(i<0||i>=scenes.length)return;if(at>=duration(i)&&i<scenes.length-1){i++;at=0;}
 walkingInput.reset();walkingRate=0;footsteps.stop();drag=null;current?.video.pause();voices.select(-1);voiceEnabled(false);$('cinemaDialogue')?.setAttribute('hidden','');caption.hidden=true;archiveCta.hidden=true;finished=false;endingElapsed=0;endingPaper.style.opacity='0';archiveCta.inert=true;document.body.dataset.ending='false';if(archiveFrame){archiveFrame.style.opacity='0';archiveFrame.style.pointerEvents='none';archiveFrame.inert=true;archiveFrame.setAttribute('aria-hidden','true');}if($('hint'))$('hint').hidden=true;
 transition={fromDialogue:scenes[index]?.mode==='dialogue',to:i,at:clamp(at,0,duration(i)),record:preparedScene(i,at),phase:storyStarted?'in':'loading',initial:!storyStarted,elapsed:0,fade:storyStarted?(scenes[i].transition==='none'?0:scenes[i].mode==='dialogue'||scenes[index]?.mode==='dialogue'?2.4:1.6):.8};footageFog.start(!transition.initial&&transition.fade>0);status('Loading...');
}
function remember(){footageFog.stop();sceneLife.stop();seasonAmbience.stop();footsteps.stop();videos.forEach(v=>v.pause());voiceEnabled(false);music.pause();sessionStorage.setItem('test-render-resume',JSON.stringify({index,local}));sessionStorage.setItem('ink-pilot-return',location.pathname.endsWith('/test-render-clean.html')?'test-render-clean.html':'test-render.html');}
if($('indexLink'))$('indexLink').onclick=remember;
if($('storyLink'))$('storyLink').onclick=e=>{e.preventDefault();paused=false;previewAuto=false;requestScene(0);};
function syncSoundButton(){const b=$('soundToggle');if(!b)return;b.setAttribute('aria-pressed',String(sound));b.setAttribute('aria-label',sound?'소리 끄기':'소리 켜기');const img=b.querySelector('img');if(img)img.src=new URL(sound?'./icons8-voice-50.png':'./icons8-mute-50.png',import.meta.url).href;}
function retrySound(){if(!sound)return;storyMusic.retry();sceneLife.retry();if(current&&!transition&&!paused&&current.startElapsed>=sceneArrivalDelay(scenes[index])){voices.setEnabled(true);lastVoiceEnable=true;}}
if($('soundToggle'))$('soundToggle').onclick=()=>{if(sound&&(storyMusic.proof().blocked||voices.proof().failed)){retrySound();return;}sound=!sound;syncSoundButton();storyMusic.enable(sound);if(!sound)footsteps.stop();voiceEnabled(sound&&!paused&&!transition&&!current?.error&&!!current&&current.startElapsed>=sceneArrivalDelay(scenes[index]));};
for(const type of ['pointerdown','keydown','wheel'])stage.addEventListener(type,e=>{if(!e.target.closest('#soundToggle'))retrySound();},{passive:true});
syncSoundButton();storyMusic.enable(sound);
function canWalk(){return !!current&&!current.error&&!transition&&!paused&&!compare&&!finished&&scrollDriven();}
function manual(delta,fromDrag=false){
 if(!delta||!canWalk())return;
 previewAuto=false;walkingDirection=Math.sign(delta);lastScrollAt=performance.now();
 // A reversed gesture cancels the old travel queue immediately.
 if((target-local)*walkingDirection<-.008){target=local;walkingRate=0;current.video.pause();}
 const previousTarget=target;target=clamp(target+walkingTargetDelta(walkingInputRange(),delta),0,scrollLimit());
 if(fromDrag&&target!==previousTarget){lastDragMoveAt=performance.now();footsteps.pulse();}
}
stage.addEventListener('wheel',e=>{if(!canWalk()||e.ctrlKey||e.target.closest('#testTools,#cinemaDialogue,nav,button,a,input,select,textarea,[contenteditable]'))return;e.preventDefault();manual(walkingInput.wheelGestureSteps(e,performance.now()));},{passive:false});
canvas.addEventListener('pointerdown',e=>{if(!canWalk()||!e.isPrimary||e.pointerType==='mouse'&&e.button!==0)return;drag={x:e.clientX,y:e.clientY,pointerId:e.pointerId};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.pointerId)return;manual(((drag.y-e.clientY)+(e.clientX-drag.x)*.25)/90,true);drag={x:e.clientX,y:e.clientY,pointerId:e.pointerId};});
function stopDragging(){drag=null;lastDragMoveAt=-Infinity;footsteps.stop();}
['pointerup','pointercancel','lostpointercapture'].forEach(t=>canvas.addEventListener(t,stopDragging));
addEventListener('blur',stopDragging);
addEventListener('keydown',e=>{if(e.target.closest('input,select,button,textarea,a,nav,[contenteditable],#cinemaDialogue'))return;if(e.code==='Space'){e.preventDefault();paused=!paused;footsteps.stop();}else if(canWalk()&&(e.key==='ArrowDown'||e.key==='PageDown')){e.preventDefault();manual(1);}else if(canWalk()&&(e.key==='ArrowUp'||e.key==='PageUp')){e.preventDefault();manual(-1);}});
if($('run'))$('run').onclick=()=>{paused=false;previewAuto=!previewAuto;walkingDirection=1;walkingInput.reset();footsteps.stop();};
if($('chapter'))$('chapter').onchange=e=>requestScene(Number(e.target.value));
if($('progress'))$('progress').oninput=e=>{const t=clamp(Number(e.target.value))*total;let n=0;while(n<scenes.length-1&&offset(n)+duration(n)<=t)n++;requestScene(n,t-offset(n));};
if($('dialogue'))$('dialogue').onclick=()=>{const n=scenes.findIndex((s,i)=>i>=Math.max(0,index)&&s.mode==='dialogue');if(n>=0)requestScene(n);};
if($('next'))$('next').onclick=()=>{if(index<scenes.length-1)requestScene(index+1);else{remember();location.href=$('indexLink').href;}};
if($('compare'))$('compare').onclick=()=>{compare=!compare;footsteps.stop();$('compare').setAttribute('aria-pressed',String(compare));$('compare').textContent=compare?'영상 보기':'이미지 비교';};
if($('ambience'))$('ambience').onclick=()=>{motion=!motion;$('ambience').setAttribute('aria-pressed',String(motion));$('ambience').textContent=motion?'인물 움직임 켜짐':'인물 움직임 꺼짐';};
document.addEventListener('visibilitychange',()=>{if(document.hidden){sceneLife.stop();seasonAmbience.stop();videos.forEach(v=>v.pause());footsteps.stop();storyMusic.suspend();}else if(sound)storyMusic.retry();last=performance.now();});
addEventListener('pagehide',()=>{sceneLife.stop();seasonAmbience.stop();videos.forEach(v=>v.pause());footsteps.stop();voiceEnabled(false);music.pause();});
function play(r){const v=r.video;if(!v.paused||r.playPending||v.ended&&!v.loop)return;r.playPending=true;v.play().catch(()=>{r.playBlocked=true;}).finally(()=>{r.playPending=false;});}
canvas.addEventListener('click',()=>{if(sound)storyMusic.retry();if(current&&!transition&&!paused&&!finished&&!scrollDriven()&&current.startElapsed>=sceneArrivalDelay(scenes[index])){current.playBlocked=false;play(current);}});
let fogLevel=0,navOpacity=1;
function mistAmount(p){fogLevel=p;mist.style.opacity=String(p);mist.style.setProperty('--veil',String(clamp((p-.62)/.38)));mist.style.setProperty('--drift',String((1-p)*12)+'%');mist.style.setProperty('--fog-progress',String(p));footageFog.update(p);}
// Navigation is veiled by the same fog, then stays absent during dialogue.
function updateStoryNavigation(){
 const nav=$('storyIndexBar');if(!nav)return;
 const t=transition,underFog=!!t&&!t.initial&&t.fade>0&&!t.record.error;
 navOpacity=scenes[index]?.mode==='dialogue'?0:1;
 if(underFog){
  if(t.phase==='in')navOpacity=t.fromDialogue?0:1-ease(clamp((fogLevel-.10)/.75));
  else if(t.phase==='out')navOpacity=t.record.scene.mode==='dialogue'?0:1-ease(clamp((fogLevel-.02)/.85));
 }
 if(t?.record.error)navOpacity=1;
 stage.style.setProperty('--story-nav-opacity',String(navOpacity));
 document.body.dataset.navFog=String(underFog);document.body.dataset.navHidden=String(navOpacity<.005);
 nav.inert=navOpacity<.35;if(navOpacity<.005)nav.setAttribute('aria-hidden','true');else nav.removeAttribute('aria-hidden');
}
function advance(){if(continuousAdvance())return;if(scenes[index]?.id==='intro')return;if(index<scenes.length-1)requestScene(index+1);else{finished=true;endingElapsed=0;current?.video.pause();footsteps.stop();prepareArchive();}}
function frame(now){
 const dt=document.hidden?0:Math.min(.08,Math.max(0,(now-last)/1000));last=now;
 if(!hasFrame&&current?.loaded){if(current.still&&current.image)draw(current.image);else if(current.video.readyState>=2)draw(current.video);}
 if(transition){
  const t=transition;if(!paused)t.elapsed+=dt;if(t.record.scene.id==='intro'&&introAssetsFailed())t.record.error='인트로 이미지를 불러오지 못했습니다.';
  if(t.phase==='loading'){
   mistAmount(0);ctx.fillStyle=PAPER;ctx.fillRect(0,0,width,height);status('Loading...');
   if(t.record.error){status(t.record.error,true);}
   else if(t.record.loaded&&!t.record.video.seeking&&(t.record.scene.id!=='intro'||introAssetsReady())){
    status('');loadingHiddenAt=now;t.phase='gap';t.elapsed=0;document.body.dataset.startup='gap';
   }
  }else if(t.phase==='gap'){
   if(t.elapsed>=1){current=t.record;index=t.to;local=Math.min(t.at,duration(index));target=local;current.video.pause();t.phase='out';t.elapsed=0;firstSceneShownAt=now;document.body.dataset.startup='reveal';document.body.dataset.ready='true';draw(current.still?current.image:current.video);mistAmount(1);}
  }else if(t.phase==='in'){
   const p=t.fade?clamp(t.elapsed/t.fade):1;mistAmount(t.fade?ease(p):0);
   if(!hasFrame&&t.record.image){draw(t.record.image);status('Loading...');}
   if(t.record.error){mistAmount(.25);status(t.record.error+' Story를 눌러 다시 시작할 수도 있습니다.',true);}
   if(p>=1&&t.elapsed>=t.fade+(t.fade ? .3 : 0)&&t.record.loaded&&!t.record.error&&!t.record.video.seeking&&(t.record.scene.id!=='intro'||introAssetsReady())){
    footageFog.midpoint();current=t.record;index=t.to;local=Math.min(t.at,duration(index));target=local;current.video.pause();t.phase='out';t.elapsed=0;document.body.dataset.ready='true';
    draw(current.still?current.image:current.video);status(current.still?'이미지 미리보기':'');
   }
  }else{mistAmount(t.fade?1-ease(clamp(t.elapsed/t.fade)):0);draw(current.still?current.image:current.video);if(t.elapsed>=t.fade){footageFog.stop();transition=null;storyStarted=true;document.body.dataset.startup='done';showText();preloadNext();}}
 }else if(current){
  const s=scenes[index],v=current.video,d=duration(index),dialogue=s.mode==='dialogue',allowed=!paused&&!compare&&!document.hidden&&!finished;
  const drawable=current.still?!!current.image:current.loaded&&!v.seeking&&v.readyState>=2;
  const ready=current.still?!!current.image:drawable&&(v.readyState>=3||v.ended);
  const autoFrom=Number(s.autoFrom);
  if(allowed&&ready&&scrollDriven()&&autoFrom>0&&local>=autoFrom-.008){current.autoStarted=true;current.autoRate=Math.max(.15,current.video.playbackRate);previewAuto=false;drag=null;target=local;footsteps.stop();}
  const scroll=scrollDriven();
  const delay=sceneArrivalDelay(s);
  if(allowed&&ready&&current.startElapsed<delay)current.startElapsed=Math.min(delay,current.startElapsed+dt);
  const arrivalHold=current.startElapsed<delay;
  if(dialogue&&!arrivalHold&&$('cinemaDialogue')?.hidden)showText();
  document.body.dataset.interaction=finished?'finished':arrivalHold?'arrival':scroll?'walking':dialogue?'dialogue':'automatic';
  if(!allowed&&!current.still)v.pause();
  const run=allowed&&!arrivalHold&&(!scroll||previewAuto||Math.abs(target-local)>.008),active=run&&ready&&!current.error;
  if(current.error)status(current.error+' Story를 눌러 다시 시작할 수도 있습니다.',true);
  else if(current.playBlocked)status('화면을 눌러 영상을 재생해 주세요.');
  else if(!ready&&!scroll)status('Loading...');else status(compare?(current.image?'이미지 비교':'비교 이미지가 없습니다.'):current.still?'이미지 미리보기':'');
  // Paint the completed decoded frame before requesting the next scroll seek.
  if(compare&&current.image)draw(current.image);else if(drawable)draw(current.still?current.image:v);
  if(scroll&&allowed){
   if(previewAuto)target=Math.min(scrollLimit(),target+dt);
   if(current.still)local=target;
   else if(current.loaded&&!v.seeking&&v.readyState>=2){
    local=clamp(v.currentTime-current.clipIn,0,d);
    const gap=target-local;
    if(gap>.008){
     walkingRate=walkingPlaybackRate(gap,dt,walkingRate,walkingReference());
     if(walkingRate){v.playbackRate=walkingRate;play(current);}else v.pause();
    }else if(gap<-.008&&walkingDirection<0){
     v.pause();walkingRate=walkingPlaybackRate(-gap,dt,walkingRate,walkingReference());const next=Math.max(target,local-Math.max(dt,1/60)*walkingRate);
     v.currentTime=current.clipIn+next;
    }else{v.pause();walkingRate=0;footsteps.stop();}
   }
  }else if(!current.still){
   const desired=openingPlaybackRate(s,local,d);
   current.autoRate=(current.autoRate??v.playbackRate)+(desired-(current.autoRate??v.playbackRate))*(1-Math.exp(-dt/.16));v.playbackRate=current.autoRate;
   if(active&&(motion||!dialogue))play(current);else v.pause();
  }
  if(s.id==='intro'){
   const arrival=records.find(r=>r?.scene.id==='aerial-entry');
   if(allowed&&local>=3.0&&arrival?.loaded&&!arrival.video.seeking){arrival.video.playbackRate=openingPlaybackRate(arrival.scene,arrival.video.currentTime-arrival.clipIn,duration(index+1));play(arrival);}
   else if(arrival)arrival.video.pause();
  }
  if(active&&!scroll){if(dialogue||current.still||v.loop)local=Math.min(d,local+dt);else if(!v.paused||v.ended)local=clamp(v.currentTime-current.clipIn,0,d);}
  const visualTime=s.id==='intro'?introVisualTime(local):local;
  openingCaption(s,visualTime);stage.style.setProperty('--nav-paper',String(s.id==='intro'?ease(clamp((visualTime-4.2)/1.5)):1));
  voiceEnabled(sound&&allowed&&ready&&!arrivalHold&&!current.error);if(dialogue&&allowed&&ready&&!arrivalHold&&!current.error)voices.tick(dt);
  if(allowed&&local>=d-.025&&(!scroll||target>=d-.008)&&(!dialogue||voices.canFinish()&&!(sound&&voices.proof().failed)))advance();
  if(!transition&&$('hint'))$('hint').hidden=finished||!scroll||previewAuto||paused;
 }
 if(finished){
  endingElapsed+=dt;const reveal=ease(clamp(endingElapsed/6.5));
  document.body.dataset.ending='true';mistAmount(reveal);endingPaper.style.opacity=String(reveal);
  archiveCta.hidden=false;archiveCta.inert=endingElapsed<2;
  archiveCta.style.opacity=String(ease(clamp((endingElapsed-2)/4.5)));
 }

 updateStoryNavigation();
 footageFog.tick(now,paused||document.hidden);
 const musicScene=scenes[index],musicVoice=voices.proof();
 const approachGain=dialogueApproachGain(musicScene,scenes[index+1],local,duration(index));
 sceneLife.tick({src:musicScene?.ambience||'',time:current?.video.currentTime||0,active:!paused&&!compare&&!previewAuto&&!transition&&!finished&&!document.hidden&&!!current&&musicScene?.mode==='scroll'&&!!drag&&now-lastDragMoveAt<200&&Math.abs(target-local)>.008,sound,gain:approachGain,dt});
 const musicDuck=transition?.record.scene.mode==='dialogue'||musicScene?.mode==='dialogue'&&!musicVoice.ended;
 storyMusic.tick({duck:musicDuck,paused:paused||compare,hidden:document.hidden,finished,endingTime:musicScene?.id==='seasons'?local:null,endingDuration:duration(index),sceneGain:approachGain,dt});
 const musicProof=storyMusic.proof();if($('soundToggle')){const blocked=sound&&(musicProof.blocked||musicVoice.failed);$('soundToggle').dataset.blocked=String(blocked);$('soundToggle').title=blocked?'클릭하여 소리 재생':sound?'소리 끄기':'소리 켜기';$('soundToggle').setAttribute('aria-label',blocked?'소리 재생':sound?'소리 끄기':'소리 켜기');}
 const seasonPlaying=scenes[index]?.id==='seasons'&&!finished&&!compare&&!current?.error&&!current?.playBlocked&&current?.video.readyState>=3&&!current.video.paused&&!current.video.seeking;
 seasonAmbience.tick({active:seasonPlaying,time:local,sound,paused:paused||!seasonPlaying,hidden:document.hidden,transition:!!transition,dt});
 footsteps.tick();if($('run'))$('run').textContent=previewAuto?'이동 멈춤':'이동 재생';if($('chapter')&&index>=0)$('chapter').value=String(index);if($('progress'))$('progress').value=String((offset(index)+local)/Math.max(1,total));
 const deliveryVideo=current?.video,deliveryQuality=deliveryVideo?.getVideoPlaybackQuality?.();
 document.body.dataset.proof=JSON.stringify({engine:'test-render-media-v3',fit:'cover',dialogueFit:dialogueFit.proof(),fog:footageFog.proof(),navigation:{opacity:navOpacity,underFog:document.body.dataset.navFog==='true'},introRendering:scenes[index]?.id==='intro'?introEffect.proof():null,paper:PAPER,paperColor:paperColor.proof(),storyStarted,startup:document.body.dataset.startup,loadingHiddenAt,firstSceneShownAt,firstSceneGapMs:firstSceneShownAt&&loadingHiddenAt?firstSceneShownAt-loadingHiddenAt:null,endingElapsed,scene:scenes[index]?.id,index,local,duration:duration(index),mode:scenes[index]?.mode,effectiveMode:current?.autoStarted?'auto':scenes[index]?.mode,autoFrom:scenes[index]?.autoFrom??null,autoStarted:!!current?.autoStarted,transition:transition?.phase||null,waiting:!!transition||!!current&&!current.loaded,renderedKind,renderedSource,imagePreview:renderedKind==='image',source:current?.scene.src||null,sourceTime:current?.video.currentTime||0,scrollTarget:target,sourcePaused:current?.video.paused??true,startDelay:sceneArrivalDelay(scenes[index]),startElapsed:current?.startElapsed||0,interaction:document.body.dataset.interaction,scrollEnabled:canWalk(),walkingReferenceDuration:scenes[index]?.footsteps?walkingReference():null,sourceFps:current?.scene.fps??null,delivery:{width:deliveryVideo?.videoWidth||0,height:deliveryVideo?.videoHeight||0,playbackRate:deliveryVideo?.playbackRate??1,totalVideoFrames:deliveryQuality?.totalVideoFrames??null,droppedVideoFrames:deliveryQuality?.droppedVideoFrames??null},provenance:current?.scene.provenance??null,geometryVerified:false,voice:voices.proof(),seasonAmbience:seasonAmbience.proof(),musicVolume:music.volume,music:musicProof,sceneLife:sceneLife.proof(),footsteps:{active:foot.dataset.active,starts:Number(foot.dataset.starts||0),dragging:!!drag,input:'pointer-drag-only',source:foot.currentSrc||foot.src},dialogueApproachGain:approachGain,finished});requestAnimationFrame(frame);
}
status('Loading...');requestAnimationFrame(frame);
try{
 const response=await fetch(manifestURL,{cache:'no-store'});if(!response.ok)throw Error('manifest '+response.status);const manifest=await response.json();scenes=Array.isArray(manifest)?manifest:manifest.scenes;
 if(!Array.isArray(scenes)||!scenes.length)throw Error('장면 목록이 비어 있습니다.');
 for(const s of scenes){if(!['scroll','auto','dialogue'].includes(s.mode))throw Error('장면 모드 확인: '+s.id);if(s.mode==='dialogue'&&(!Number.isInteger(s.speaker)||s.speaker<0||s.speaker>4))throw Error('대사 인물 확인: '+s.id);}
 lengths=scenes.map(s=>s.mode==='dialogue'?voices.duration(s.speaker)+8:Math.max(.1,Number(s.duration)||Number(s.sourceDuration)||6));total=lengths.reduce((a,b)=>a+b,0);
 if($('chapter'))$('chapter').replaceChildren(...scenes.map((s,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=s.label||s.id;return o;}));
 let saved=null;try{saved=JSON.parse(sessionStorage.getItem('test-render-resume'));sessionStorage.removeItem('test-render-resume');}catch{}
 requestScene(saved&&Number.isInteger(saved.index)?clamp(saved.index,0,scenes.length-1):0,Number(saved?.local)||0);
}catch(error){status('장면을 불러오지 못했습니다. 새로고침해 주세요.');document.body.dataset.error=String(error);console.error(error);}

