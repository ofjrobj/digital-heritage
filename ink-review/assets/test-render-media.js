import {createSceneLife} from './scene-life.js?v=quiet-life-rest-3';
import {createSeasonAmbience} from './season-ambience.js?v=quiet-seasons-3';
import {createDialogueFaceSafe} from './dialogue-face-safe.js?v=interim-v4-cover-20261017';
import {dialogueFrame} from './dialogue-framing.js?v=interim-v4-cover-20261017';
import {seasonsFrame} from './seasons-framing.js?v=all-visitors-1';
import {createStoryVoices} from './story-voices.js?v=voices-timing-3';
import {createStoryMusic} from './story-audio-mix.js?v=bgm-audible-5';
import {createScrollFootsteps} from './scroll-footsteps.js?v=quiet-steps-3';
import {dialogueCopy} from './dialogue-copy.js?v=dialogue-final-20261014';
import {createIntroInkSpread} from './intro-ink-spread.js?v=intro-forward-occlusion-1';
import {createPaperColor, PAPER_CSS} from './paper-color.js?v=archive-paper-1';
const paperColor=createPaperColor();
const introEffect=createIntroInkSpread({paper:PAPER_CSS});
let normalizedVillage=null;
const introPaintings=['./cover-reference.png','./test-render/intro-mountains.webp'].map(path=>{const im=new Image();im.src=new URL(path,import.meta.url).href;return im;});
const introVillage=new Image();introVillage.src=new URL('./test-render/aerial-bridge-v4.svg?v=interim-v4-cover-20261017',import.meta.url).href;
introVillage.onerror=()=>{introVillage.dataset.failed='true';};
const introAssetsReady=()=>[...introPaintings,introVillage].every(im=>im.complete&&im.naturalWidth);
const introAssetsFailed=()=>[...introPaintings,introVillage].some(im=>im.dataset.failed==='true'||im.complete&&!im.naturalWidth);
const $=id=>document.getElementById(id),stage=$('stage'),canvas=$('world'),ctx=canvas.getContext('2d',{alpha:false});
const PAPER=PAPER_CSS;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ease=t=>t*t*(3-2*t);
const manifestURL=new URL('./test-render/manifest.json?v=interim-v4-cover-20261017',import.meta.url),url=s=>s?new URL(s,manifestURL).href:'';
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./test-render-media.css?v=archive-paper-1',import.meta.url).href;document.head.append(css);
document.body.classList.add('test-render-media');
const mist=document.createElement('div');mist.className='tr-mist';mist.setAttribute('aria-hidden','true');stage.append(mist);
stage.style.setProperty('--nav-paper','0');
const caption=document.createElement('p');caption.className='tr-caption';caption.hidden=true;stage.append(caption);
const archiveCta=document.createElement('a');archiveCta.className='tr-archive-cta';archiveCta.textContent='아카이브로 탐색';archiveCta.href=$('indexLink')?.href||'archive/index.html';archiveCta.hidden=true;stage.append(archiveCta);archiveCta.onclick=()=>remember();
let archiveFrame=null,endingElapsed=0,storyStarted=false,loadingHiddenAt=null,firstSceneShownAt=null;
function prepareArchive(){if(archiveFrame)return;archiveFrame=document.createElement('iframe');archiveFrame.className='tr-archive';archiveFrame.title='석사자 아카이브';archiveFrame.src=$('indexLink')?.href||'archive/index.html';archiveFrame.setAttribute('aria-hidden','true');archiveFrame.inert=true;archiveFrame.onload=()=>{archiveFrame.dataset.loaded='true';try{archiveFrame.contentDocument.querySelectorAll('[data-story-return]').forEach(a=>a.target='_top');}catch{}};stage.append(archiveFrame);}
const videos=[0,1].map(()=>{const v=document.createElement('video');v.muted=true;v.crossOrigin='anonymous';v.playsInline=true;v.preload='auto';v.className='tr-source';v.setAttribute('aria-hidden','true');stage.append(v);return v;});
const records=[null,null],voices=createStoryVoices(stage),music=$('music');music.volume=0;const storyMusic=createStoryMusic(music);
const foot=document.createElement('audio');foot.id='scrollFootsteps';foot.preload='auto';foot.src=new URL('./footstep-single-v2.mp3',import.meta.url).href;stage.append(foot);
const names=['장사꾼','농민','찬모','주민 삼총사','나무꾼'];
let scenes=[],lengths=[],total=0,index=-1,current=null,transition=null,local=0,target=0,sound=false,paused=false,previewAuto=false,compare=false,motion=true,last=performance.now(),width=1,height=1,lastScrollAt=-Infinity,lastSource=null,hasFrame=false,finished=false,lastVoiceEnable=null,lastStatus='',renderedKind='none',renderedSource='';
const footsteps=createScrollFootsteps(foot,()=>sound&&!paused&&!compare&&!previewAuto&&!transition&&!document.hidden&&!current?.error&&scenes[index]?.mode==='scroll'&&scenes[index]?.footsteps===true&&(current.still||current.video.readyState>=2));
const seasonAmbience=createSeasonAmbience(stage),sceneLife=createSceneLife(stage);
const dialogueFit=createDialogueFaceSafe({stage,panel:$('cinemaDialogue'),tools:$('testTools'),sound:$('soundToggle')});
const duration=i=>lengths[i]||1,offset=i=>lengths.slice(0,Math.max(0,i)).reduce((a,b)=>a+b,0);
// Keep target/local/seek in source seconds; scale only incoming walking time.
// The opening becomes automatic at the mountain reveal, without changing its source.
function scrollDriven(r=current){return r?.scene.mode==='scroll'&&!r.autoStarted;}
function scrollLimit(){const from=Number(scenes[index]?.autoFrom);return from>0?Math.min(duration(index),from):duration(index);}
function scrollTimeMultiplier(){const value=Number(scenes[index]?.scrollTimeMultiplier);return Number.isFinite(value)&&value>0?value:1;}
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
  const time=sceneRecord.video.currentTime;introEffect.draw(ctx,width,height,clamp((time-.35)/5),...introPaintings,normalizedVillage);
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
  const r=dialogueFrame(sceneRecord.scene,width,height,sw,sh);paint(r.x,r.y,r.w,r.h);
 }else paint((width-sw*scale)/2,(height-sh*scale)/2,sw*scale,sh*scale);dialogueFit.update(sceneRecord?.scene,source);lastSource=source;hasFrame=true;
 renderedKind=source.tagName==='VIDEO'?'video':'image';renderedSource=source.currentSrc||source.src||'';return true;
}
function resize(){const d=Math.min(devicePixelRatio||1,2);width=Math.max(1,stage.clientWidth);height=Math.max(1,stage.clientHeight);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);hasFrame=false;ctx.fillStyle=PAPER;ctx.fillRect(0,0,width,height);draw(lastSource);}
addEventListener('resize',resize);new ResizeObserver(resize).observe(stage);resize();
function showText(){const s=scenes[index],panel=$('cinemaDialogue');if(!s)return;if(s.id==='seasons')prepareArchive();const speaking=s.mode==='dialogue';document.body.dataset.dialogue=String(speaking);if(panel){panel.hidden=!speaking;if(speaking){panel.querySelector('h2').textContent=names[s.speaker]||s.label;panel.querySelector('p').textContent=dialogueCopy[s.speaker]?.testimony||'';panel.querySelector('p').scrollTop=0;}}caption.dataset.scene=s.id;caption.dataset.intro=String(s.id==='intro');caption.textContent=s.caption||'';caption.hidden=!s.caption||speaking;if($('next'))$('next').textContent=index<scenes.length-1?'다음 장면으로':'아카이브로';voices.select(speaking?s.speaker:-1);dialogueFit.invalidate();}
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
function preloadNext(){if(index+1<scenes.length&&!records.some(r=>r?.scene===scenes[index+1]))prepare(index+1);}
function requestScene(i,at=0){
 if(i<0||i>=scenes.length)return;if(at>=duration(i)&&i<scenes.length-1){i++;at=0;}
 footsteps.stop();drag=null;current?.video.pause();voices.select(-1);voiceEnabled(false);$('cinemaDialogue')?.setAttribute('hidden','');caption.hidden=true;archiveCta.hidden=true;finished=false;endingElapsed=0;if(archiveFrame){archiveFrame.style.opacity='0';archiveFrame.style.pointerEvents='none';archiveFrame.inert=true;archiveFrame.setAttribute('aria-hidden','true');}if($('hint'))$('hint').hidden=true;
 transition={to:i,at:clamp(at,0,duration(i)),record:preparedScene(i,at),phase:storyStarted?'in':'loading',initial:!storyStarted,elapsed:0,fade:storyStarted?(scenes[i].transition==='none'?0:scenes[i].mode==='dialogue'||scenes[index]?.mode==='dialogue'?1.25:.95):.8};status('Loading...');
}
function remember(){sceneLife.stop();seasonAmbience.stop();footsteps.stop();videos.forEach(v=>v.pause());voiceEnabled(false);music.pause();sessionStorage.setItem('test-render-resume',JSON.stringify({index,local}));sessionStorage.setItem('ink-pilot-return',location.pathname.endsWith('/test-render-clean.html')?'test-render-clean.html':'test-render.html');}
if($('indexLink'))$('indexLink').onclick=remember;
if($('storyLink'))$('storyLink').onclick=e=>{e.preventDefault();paused=false;previewAuto=false;requestScene(0);};
if($('soundToggle'))$('soundToggle').onclick=()=>{sound=!sound;sceneLife.retry();const b=$('soundToggle');b.setAttribute('aria-pressed',String(sound));b.setAttribute('aria-label',sound?'소리 끄기':'소리 켜기');b.title=sound?'소리 끄기':'소리 켜기';const img=b.querySelector('img');if(img)img.src=new URL(sound?'./icons8-voice-50.png':'./icons8-mute-50.png',import.meta.url).href;storyMusic.enable(sound);if(!sound)footsteps.stop();voiceEnabled(sound&&!paused&&!transition&&!current?.error);};
function canWalk(){return !!current&&!current.error&&!transition&&!paused&&!compare&&!finished&&scrollDriven();}
function manual(delta){
 if(!delta||!canWalk())return;
 previewAuto=false;lastScrollAt=performance.now();
 target=clamp(target+delta*scrollTimeMultiplier(),0,scrollLimit());
 current.video.pause();footsteps.pulse();
}
stage.addEventListener('wheel',e=>{if(!canWalk()||e.ctrlKey||e.target.closest('#testTools,#cinemaDialogue,nav,button,a,input,select,textarea,[contenteditable]'))return;e.preventDefault();const unit=e.deltaMode===1?16:e.deltaMode===2?height:1;manual(clamp(e.deltaY*unit,-120,120)/120*.42);},{passive:false});
let drag=null;canvas.addEventListener('pointerdown',e=>{if(!canWalk())return;drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;manual(((drag.y-e.clientY)+(e.clientX-drag.x)*.25)/90);drag={x:e.clientX,y:e.clientY};});['pointerup','pointercancel'].forEach(t=>canvas.addEventListener(t,()=>{drag=null;footsteps.stop();}));
addEventListener('keydown',e=>{if(e.target.closest('input,select,button,textarea,a,nav,[contenteditable],#cinemaDialogue'))return;if(e.code==='Space'){e.preventDefault();paused=!paused;footsteps.stop();}else if(canWalk()&&(e.key==='ArrowDown'||e.key==='PageDown')){e.preventDefault();manual(.7);}else if(canWalk()&&(e.key==='ArrowUp'||e.key==='PageUp')){e.preventDefault();manual(-.7);}});
if($('run'))$('run').onclick=()=>{paused=false;previewAuto=!previewAuto;footsteps.stop();};
if($('chapter'))$('chapter').onchange=e=>requestScene(Number(e.target.value));
if($('progress'))$('progress').oninput=e=>{const t=clamp(Number(e.target.value))*total;let n=0;while(n<scenes.length-1&&offset(n)+duration(n)<=t)n++;requestScene(n,t-offset(n));};
if($('dialogue'))$('dialogue').onclick=()=>{const n=scenes.findIndex((s,i)=>i>=Math.max(0,index)&&s.mode==='dialogue');if(n>=0)requestScene(n);};
if($('next'))$('next').onclick=()=>{if(index<scenes.length-1)requestScene(index+1);else{remember();location.href=$('indexLink').href;}};
if($('compare'))$('compare').onclick=()=>{compare=!compare;footsteps.stop();$('compare').setAttribute('aria-pressed',String(compare));$('compare').textContent=compare?'영상 보기':'이미지 비교';};
if($('ambience'))$('ambience').onclick=()=>{motion=!motion;$('ambience').setAttribute('aria-pressed',String(motion));$('ambience').textContent=motion?'인물 움직임 켜짐':'인물 움직임 꺼짐';};
document.addEventListener('visibilitychange',()=>{if(document.hidden){sceneLife.stop();seasonAmbience.stop();videos.forEach(v=>v.pause());footsteps.stop();storyMusic.suspend();}else if(sound)storyMusic.retry();last=performance.now();});
addEventListener('pagehide',()=>{sceneLife.stop();seasonAmbience.stop();videos.forEach(v=>v.pause());footsteps.stop();voiceEnabled(false);music.pause();});
function play(r){const v=r.video;if(!v.paused||r.playPending||v.ended&&!v.loop)return;r.playPending=true;v.play().catch(()=>{r.playBlocked=true;}).finally(()=>{r.playPending=false;});}
canvas.addEventListener('click',()=>{if(sound)storyMusic.retry();if(current&&!transition&&!paused&&!finished&&!scrollDriven()&&current.startElapsed>=(scenes[index]?.startDelay||0)){current.playBlocked=false;play(current);}});
function mistAmount(p){mist.style.opacity=String(p);mist.style.setProperty('--veil',String(clamp((p-.62)/.38)));mist.style.setProperty('--drift',String((1-p)*12)+'%');}
function advance(){if(index<scenes.length-1)requestScene(index+1);else{finished=true;endingElapsed=scenes[index]?.id==='seasons'?2.2:0;current?.video.pause();footsteps.stop();prepareArchive();}}
function frame(now){
 const dt=document.hidden?0:Math.min(.08,Math.max(0,(now-last)/1000));last=now;
 if(!hasFrame&&current?.loaded){if(current.still&&current.image)draw(current.image);else if(current.video.readyState>=2)draw(current.video);}
 if(transition){
  const t=transition;t.elapsed+=dt;if(t.record.scene.id==='intro'&&introAssetsFailed())t.record.error='인트로 이미지를 불러오지 못했습니다.';
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
   if(p>=1&&t.record.loaded&&!t.record.error&&!t.record.video.seeking&&(t.record.scene.id!=='intro'||introAssetsReady())){
    current=t.record;index=t.to;local=Math.min(t.at,duration(index));target=local;current.video.pause();t.phase='out';t.elapsed=0;document.body.dataset.ready='true';
    draw(current.still?current.image:current.video);status(current.still?'이미지 미리보기':'');
   }
  }else{mistAmount(t.fade?1-ease(clamp(t.elapsed/t.fade)):0);draw(current.still?current.image:current.video);if(t.elapsed>=t.fade){transition=null;storyStarted=true;document.body.dataset.startup='done';showText();preloadNext();}}
 }else if(current){
  const s=scenes[index],v=current.video,d=duration(index),dialogue=s.mode==='dialogue',allowed=!paused&&!compare&&!document.hidden&&!finished;
  const drawable=current.still?!!current.image:current.loaded&&!v.seeking&&v.readyState>=2;
  const ready=current.still?!!current.image:drawable&&(v.readyState>=3||v.ended);
  const autoFrom=Number(s.autoFrom);
  if(allowed&&ready&&scrollDriven()&&autoFrom>0&&local>=autoFrom-.008){current.autoStarted=true;previewAuto=false;drag=null;target=local;footsteps.stop();}
  const scroll=scrollDriven();
  const delay=Math.max(0,Number(s.startDelay)||0);
  if(allowed&&ready&&current.startElapsed<delay)current.startElapsed=Math.min(delay,current.startElapsed+dt);
  const arrivalHold=current.startElapsed<delay;
  document.body.dataset.interaction=finished?'finished':arrivalHold?'arrival':scroll?'walking':dialogue?'dialogue':'automatic';
  if(scroll&&!current.still)v.pause();
  const run=allowed&&!arrivalHold&&(!scroll||previewAuto||Math.abs(target-local)>.008),active=run&&ready&&!current.error;
  if(current.error)status(current.error+' Story를 눌러 다시 시작할 수도 있습니다.',true);
  else if(current.playBlocked)status('화면을 눌러 영상을 재생해 주세요.');
  else if(!ready&&!scroll)status('Loading...');else status(compare?(current.image?'이미지 비교':'비교 이미지가 없습니다.'):current.still?'이미지 미리보기':'');
  // Paint the completed decoded frame before requesting the next scroll seek.
  if(compare&&current.image)draw(current.image);else if(drawable)draw(current.still?current.image:v);
  if(scroll&&allowed){
   if(previewAuto)target=Math.min(scrollLimit(),target+dt*scrollTimeMultiplier());
   if(current.still)local=target;
   else if(current.loaded&&!v.seeking&&v.readyState>=2){
    local=clamp(v.currentTime-current.clipIn,0,d);
    const gap=target-local;
    if(Math.abs(gap)>.008){
     const next=Math.abs(gap)<1/24?target:local+gap*(1-Math.exp(-Math.max(dt,1/60)*22));
     v.currentTime=Math.min(current.clipIn+next,Math.max(0,v.duration-.01));
    }
   }
  }else if(!current.still){if(active&&(motion||!dialogue))play(current);else v.pause();}
  if(active&&!scroll){if(dialogue||current.still||v.loop)local=Math.min(d,local+dt);else if(!v.paused||v.ended)local=clamp(v.currentTime-current.clipIn,0,d);}
  caption.dataset.scene=s.id;caption.dataset.intro=String(s.id==='intro');stage.style.setProperty('--nav-paper',String(s.id==='intro'?ease(clamp((local-4.2)/1.5)):1));caption.style.opacity=String(s.captionUntil==null?1:1-clamp((local-s.captionUntil)/.6));
  voiceEnabled(sound&&allowed&&ready&&!arrivalHold&&!current.error);if(dialogue&&allowed&&ready&&!current.error)voices.tick(dt);
  if(allowed&&local>=d-.025&&(!scroll||target>=d-.008)&&(!dialogue||voices.canFinish()))advance();
  if(!transition&&$('hint'))$('hint').hidden=finished||!scroll||previewAuto||paused||target>local+.015;
 }
 if(finished){endingElapsed+=dt;mistAmount(ease(clamp(endingElapsed/2.2)));archiveCta.hidden=false;archiveCta.style.opacity=String(ease(clamp((endingElapsed-.3)/1.2)));}

 const musicScene=scenes[index],musicVoice=voices.proof();
 sceneLife.tick({src:musicScene?.ambience||'',time:current?.video.currentTime||0,active:!paused&&!compare&&!transition&&!finished&&!document.hidden&&!!current&&musicScene?.mode!=='dialogue',sound,dt});
 const musicDuck=transition?.record.scene.mode==='dialogue'||musicScene?.mode==='dialogue'&&!musicVoice.ended;
 storyMusic.tick({duck:musicDuck,paused:paused||compare,hidden:document.hidden,finished,endingTime:musicScene?.id==='seasons'?local:null,endingDuration:duration(index),dt});
 const musicProof=storyMusic.proof();if($('soundToggle'))$('soundToggle').title=musicProof.blocked?'화면을 눌러 소리 재생 다시 시도':sound?'소리 끄기':'소리 켜기';
 const seasonPlaying=scenes[index]?.id==='seasons'&&!finished&&!compare&&!current?.error&&!current?.playBlocked&&current?.video.readyState>=3&&!current.video.paused&&!current.video.seeking;
 seasonAmbience.tick({active:seasonPlaying,time:local,sound,paused:paused||!seasonPlaying,hidden:document.hidden,transition:!!transition,dt});
 footsteps.tick();if($('run'))$('run').textContent=previewAuto?'이동 멈춤':'이동 재생';if($('chapter')&&index>=0)$('chapter').value=String(index);if($('progress'))$('progress').value=String((offset(index)+local)/Math.max(1,total));
 const deliveryVideo=current?.video,deliveryQuality=deliveryVideo?.getVideoPlaybackQuality?.();
 document.body.dataset.proof=JSON.stringify({engine:'test-render-media-v3',fit:'cover',dialogueFit:dialogueFit.proof(),introRendering:scenes[index]?.id==='intro'?introEffect.proof():null,paper:PAPER,paperColor:paperColor.proof(),storyStarted,startup:document.body.dataset.startup,loadingHiddenAt,firstSceneShownAt,firstSceneGapMs:firstSceneShownAt&&loadingHiddenAt?firstSceneShownAt-loadingHiddenAt:null,endingElapsed,scene:scenes[index]?.id,index,local,duration:duration(index),mode:scenes[index]?.mode,effectiveMode:current?.autoStarted?'auto':scenes[index]?.mode,autoFrom:scenes[index]?.autoFrom??null,autoStarted:!!current?.autoStarted,transition:transition?.phase||null,waiting:!!transition||!!current&&!current.loaded,renderedKind,renderedSource,imagePreview:renderedKind==='image',source:current?.scene.src||null,sourceTime:current?.video.currentTime||0,scrollTarget:target,sourcePaused:current?.video.paused??true,startDelay:scenes[index]?.startDelay||0,startElapsed:current?.startElapsed||0,interaction:document.body.dataset.interaction,scrollEnabled:canWalk(),sourceFps:current?.scene.fps??null,delivery:{width:deliveryVideo?.videoWidth||0,height:deliveryVideo?.videoHeight||0,playbackRate:deliveryVideo?.playbackRate??1,totalVideoFrames:deliveryQuality?.totalVideoFrames??null,droppedVideoFrames:deliveryQuality?.droppedVideoFrames??null},provenance:current?.scene.provenance??null,geometryVerified:false,voice:voices.proof(),seasonAmbience:seasonAmbience.proof(),musicVolume:music.volume,music:musicProof,sceneLife:sceneLife.proof(),footsteps:{active:foot.dataset.active,starts:Number(foot.dataset.starts||0)},finished});requestAnimationFrame(frame);
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

