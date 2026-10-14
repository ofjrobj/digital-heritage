import {createStoryVoices} from './story-voices.js?v=voices-timing-3';
import {createMusicFade} from './story-audio-mix.js?v=soft-return-3';
import {createScrollFootsteps} from './scroll-footsteps.js?v=slow-steps-2';
import {dialogueCopy} from './dialogue-copy.js?v=dialogue-final-20261014';
const $=id=>document.getElementById(id),stage=$('stage'),canvas=$('world'),ctx=canvas.getContext('2d',{alpha:false});
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ease=t=>t*t*(3-2*t);
const manifestURL=new URL('./test-render/manifest.json?v=ink2-complete-1',import.meta.url),url=s=>s?new URL(s,manifestURL).href:'';
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./test-render-media.css?v=3',import.meta.url).href;document.head.append(css);
document.body.classList.add('test-render-media');
const mist=document.createElement('div');mist.className='tr-mist';mist.setAttribute('aria-hidden','true');stage.append(mist);
const caption=document.createElement('p');caption.className='tr-caption';caption.hidden=true;stage.append(caption);
const finish=document.createElement('a');finish.id='endingIndex';finish.href=$('indexLink')?.href||'archive/index.html';finish.textContent='석사자 아카이브로';finish.hidden=true;stage.append(finish);
const videos=[0,1].map(()=>{const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.className='tr-source';v.setAttribute('aria-hidden','true');stage.append(v);return v;});
const records=[null,null],voices=createStoryVoices(stage),music=$('music');music.volume=0;const fadeMusic=createMusicFade(music);
const foot=document.createElement('audio');foot.id='scrollFootsteps';foot.preload='auto';foot.src=new URL('./footstep-single-v2.mp3',import.meta.url).href;stage.append(foot);
const names=['장사꾼','농민','찬모','주민 삼총사','나무꾼'];
let scenes=[],lengths=[],total=0,index=-1,current=null,transition=null,local=0,target=0,sound=false,paused=false,previewAuto=false,compare=false,motion=true,last=performance.now(),width=1,height=1,lastSource=null,hasFrame=false,finished=false,lastVoiceEnable=null,lastStatus='',renderedKind='none',renderedSource='';
const footsteps=createScrollFootsteps(foot,()=>sound&&!paused&&!compare&&!previewAuto&&!transition&&!document.hidden&&!current?.error&&scenes[index]?.mode==='scroll'&&scenes[index]?.footsteps===true&&(current.still||current.video.readyState>=2&&!current.video.seeking));
const duration=i=>lengths[i]||1,offset=i=>lengths.slice(0,Math.max(0,i)).reduce((a,b)=>a+b,0);
function status(text,retry=false){const node=$('loading');if(!node)return;const key=text+'|'+retry;if(key===lastStatus)return;lastStatus=key;node.replaceChildren(document.createTextNode(text));node.hidden=!text;if(retry){const button=document.createElement('button');button.textContent='다시 불러오기';button.onclick=()=>requestScene(transition?.to??Math.max(0,index),transition?.at??local);node.append(button);}}
function voiceEnabled(value){if(value!==lastVoiceEnable){lastVoiceEnable=value;voices.setEnabled(value);}}
function draw(source){
 if(!source)return false;const sw=source.videoWidth||source.naturalWidth,sh=source.videoHeight||source.naturalHeight;if(!sw||!sh)return false;
 ctx.fillStyle='#fafaf8';ctx.fillRect(0,0,width,height);const scale=Math.min(width/sw,height/sh);
 ctx.drawImage(source,(width-sw*scale)/2,(height-sh*scale)/2,sw*scale,sh*scale);lastSource=source;hasFrame=true;
 renderedKind=source.tagName==='VIDEO'?'video':'image';renderedSource=source.currentSrc||source.src||'';return true;
}
function resize(){const d=Math.min(devicePixelRatio||1,2);width=Math.max(1,stage.clientWidth);height=Math.max(1,stage.clientHeight);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);hasFrame=false;ctx.fillStyle='#fafaf8';ctx.fillRect(0,0,width,height);draw(lastSource);}
addEventListener('resize',resize);resize();
function showText(){const s=scenes[index],panel=$('cinemaDialogue');if(!s)return;const speaking=s.mode==='dialogue';if(panel){panel.hidden=!speaking;if(speaking){panel.querySelector('h2').textContent=names[s.speaker]||s.label;panel.querySelector('p').textContent=dialogueCopy[s.speaker]?.testimony||'';}}caption.textContent=s.caption||'';caption.hidden=!s.caption||speaking;if($('next'))$('next').textContent=index<scenes.length-1?'다음 장면으로':'아카이브로';voices.select(speaking?s.speaker:-1);}
function prepare(i,at=0){
 const s=scenes[i],slot=current?1-current.slot:0,v=videos[slot],r={slot,scene:s,video:v,image:null,loaded:false,error:null,still:!s.src,at,clipIn:Math.max(0,Number(s.clipIn)||0),playPending:false};
 records[slot]=r;v.pause();v.onloadeddata=null;v.onloadedmetadata=null;v.onerror=null;v.removeAttribute('src');v.load();
 if(s.image){const img=new Image();img.onload=()=>{r.image=img;if(r.still)r.loaded=true;};img.onerror=()=>{if(r.still)r.error='이미지를 불러오지 못했습니다.';};img.src=url(s.image);}
 if(s.src){
  v.loop=s.mode==='dialogue'?(s.loop!==false):!!s.loop;v.playbackRate=1;
  v.onloadedmetadata=()=>{if(records[slot]!==r)return;if(s.mode!=='dialogue'&&!s.loop&&Number.isFinite(v.duration)){lengths[i]=Math.max(.1,Math.min(lengths[i],v.duration-r.clipIn));total=lengths.reduce((a,b)=>a+b,0);}const seek=r.clipIn+(s.mode==='dialogue'?0:Math.min(at,duration(i)));if(seek>0)v.currentTime=Math.min(seek,Math.max(0,v.duration-.025));};
  v.onloadeddata=()=>{if(records[slot]===r)r.loaded=true;};v.onerror=()=>{if(records[slot]===r)r.error='영상을 불러오지 못했습니다.';};v.src=url(s.src);v.load();
 }else if(!s.image)r.error='장면 미디어가 없습니다.';
 return r;
}
function requestScene(i,at=0){
 if(i<0||i>=scenes.length)return;if(at>=duration(i)&&i<scenes.length-1){i++;at=0;}
 const bridge=scenes[i].bridge;if(bridge&&at>=bridge.at&&at<bridge.resume)at=bridge.resume;
 footsteps.stop();current?.video.pause();voices.select(-1);voiceEnabled(false);$('cinemaDialogue')?.setAttribute('hidden','');caption.hidden=true;finished=false;finish.hidden=true;if($('hint'))$('hint').hidden=true;
 transition={to:i,at:clamp(at,0,duration(i)),record:prepare(i,at),phase:'in',elapsed:0,fade:scenes[i].transition==='none'?0:.95};status('로딩중...');
}
function remember(){footsteps.stop();videos.forEach(v=>v.pause());voiceEnabled(false);music.pause();sessionStorage.setItem('test-render-resume',JSON.stringify({index,local}));sessionStorage.setItem('ink-pilot-return',location.pathname.endsWith('/test-render-clean.html')?'test-render-clean.html':'test-render.html');}
if($('indexLink'))$('indexLink').onclick=remember;finish.onclick=remember;
if($('storyLink'))$('storyLink').onclick=e=>{e.preventDefault();paused=false;previewAuto=false;requestScene(0);};
if($('soundToggle'))$('soundToggle').onclick=()=>{sound=!sound;const b=$('soundToggle');b.setAttribute('aria-pressed',String(sound));b.setAttribute('aria-label',sound?'소리 끄기':'소리 켜기');b.title=sound?'소리 끄기':'소리 켜기';const img=b.querySelector('img');if(img)img.src=new URL(sound?'./icons8-voice-50.png':'./icons8-mute-50.png',import.meta.url).href;if(sound)music.play().catch(()=>{});else{footsteps.stop();music.pause();music.volume=0;}voiceEnabled(sound&&!paused&&!transition&&!current?.error);};
function manual(delta){
 if(!delta||transition||paused||compare||!current||current.error||scenes[index].mode!=='scroll'||!current.still&&(current.video.seeking||current.video.readyState<2))return;
 previewAuto=false;const d=duration(index);
 if(delta<0){target=clamp(local+delta,0,d);if(!current.still){current.video.pause();current.video.currentTime=current.clipIn+target;}local=target;footsteps.stop();}
 else{target=Math.min(d,local+1.2,Math.max(local,target)+delta);footsteps.pulse();}
}
stage.addEventListener('wheel',e=>{if(e.target.closest('#testTools,#cinemaDialogue,nav,button,a'))return;e.preventDefault();manual(clamp(e.deltaY,-120,120)/120*.7);},{passive:false});
let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;manual(((drag.y-e.clientY)+(e.clientX-drag.x)*.25)/90);drag={x:e.clientX,y:e.clientY};});['pointerup','pointercancel'].forEach(t=>canvas.addEventListener(t,()=>{drag=null;footsteps.stop();}));
addEventListener('keydown',e=>{if(e.target.closest('input,select,button,textarea'))return;if(e.code==='Space'){e.preventDefault();paused=!paused;footsteps.stop();}else if(e.key==='ArrowDown'||e.key==='PageDown'){e.preventDefault();manual(.7);}else if(e.key==='ArrowUp'||e.key==='PageUp'){e.preventDefault();manual(-.7);}});
if($('run'))$('run').onclick=()=>{paused=false;previewAuto=!previewAuto;footsteps.stop();};
if($('chapter'))$('chapter').onchange=e=>requestScene(Number(e.target.value));
if($('progress'))$('progress').oninput=e=>{const t=clamp(Number(e.target.value))*total;let n=0;while(n<scenes.length-1&&offset(n)+duration(n)<=t)n++;requestScene(n,t-offset(n));};
if($('dialogue'))$('dialogue').onclick=()=>{const n=scenes.findIndex((s,i)=>i>=Math.max(0,index)&&s.mode==='dialogue');if(n>=0)requestScene(n);};
if($('next'))$('next').onclick=()=>{if(index<scenes.length-1)requestScene(index+1);else{remember();location.href=finish.href;}};
if($('compare'))$('compare').onclick=()=>{compare=!compare;footsteps.stop();$('compare').setAttribute('aria-pressed',String(compare));$('compare').textContent=compare?'영상 보기':'이미지 비교';};
if($('ambience'))$('ambience').onclick=()=>{motion=!motion;$('ambience').setAttribute('aria-pressed',String(motion));$('ambience').textContent=motion?'인물 움직임 켜짐':'인물 움직임 꺼짐';};
document.addEventListener('visibilitychange',()=>{if(document.hidden){videos.forEach(v=>v.pause());footsteps.stop();music.pause();music.volume=0;}else if(sound)music.play().catch(()=>{});last=performance.now();});
addEventListener('pagehide',()=>{videos.forEach(v=>v.pause());footsteps.stop();voiceEnabled(false);music.pause();});
function play(r){const v=r.video;if(!v.paused||r.playPending||v.ended&&!v.loop)return;r.playPending=true;v.play().catch(()=>{r.playBlocked=true;}).finally(()=>{r.playPending=false;});}
canvas.addEventListener('click',()=>{if(current&&!transition&&!paused){current.playBlocked=false;play(current);}});
function mistAmount(p){mist.style.opacity=String(p);mist.style.setProperty('--veil',String(clamp((p-.62)/.38)));mist.style.setProperty('--drift',String((1-p)*12)+'%');}
function advance(){if(index<scenes.length-1)requestScene(index+1);else{finished=true;current?.video.pause();footsteps.stop();finish.hidden=false;}}
function frame(now){
 const dt=document.hidden?0:Math.min(.08,Math.max(0,(now-last)/1000));last=now;
 if(!hasFrame&&current?.loaded){if(current.still&&current.image)draw(current.image);else if(current.video.readyState>=2)draw(current.video);}
 if(transition){
  const t=transition;t.elapsed+=dt;
  if(t.phase==='in'){
   const p=t.fade?clamp(t.elapsed/t.fade):1;mistAmount(t.fade?ease(p):0);
   if(!hasFrame&&t.record.image){draw(t.record.image);status('로딩중...');}
   if(t.record.error){mistAmount(.25);status(t.record.error+' Story를 눌러 다시 시작할 수도 있습니다.',true);}
   if(p>=1&&t.record.loaded&&!t.record.error&&!t.record.video.seeking){
    current=t.record;index=t.to;local=Math.min(t.at,duration(index));target=local;current.video.pause();t.phase='out';t.elapsed=0;document.body.dataset.ready='true';
    draw(current.still?current.image:current.video);status(current.still?'이미지 미리보기':'');
   }
  }else{mistAmount(t.fade?1-ease(clamp(t.elapsed/t.fade)):0);draw(current.still?current.image:current.video);if(t.elapsed>=t.fade){transition=null;showText();}}
 }else if(current){
  const s=scenes[index],v=current.video,d=duration(index),dialogue=s.mode==='dialogue',allowed=!paused&&!compare&&!document.hidden&&!finished;
  const drawable=current.still?!!current.image:current.loaded&&!v.seeking&&v.readyState>=2;
  const ready=current.still?!!current.image:drawable&&(v.readyState>=3||v.ended);
  const run=allowed&&(s.mode!=='scroll'||previewAuto||target>local+.015),active=run&&ready&&!current.error;
  if(current.error)status(current.error+' Story를 눌러 다시 시작할 수도 있습니다.',true);
  else if(current.playBlocked)status('화면을 눌러 영상을 재생해 주세요.');
  else if(!ready)status('로딩중...');else status(compare?(current.image?'이미지 비교':'비교 이미지가 없습니다.'):current.still?'이미지 미리보기':'');
  if(!current.still){if(active&&(motion||!dialogue))play(current);else v.pause();}
  if(active){if(dialogue||current.still||v.loop)local=Math.min(d,local+dt);else if(!v.paused||v.ended)local=clamp(v.currentTime-current.clipIn,0,d);}
  if(compare&&current.image)draw(current.image);else if(drawable)draw(current.still?current.image:v);
  caption.dataset.intro=String(s.id==='intro');caption.style.opacity=String(s.captionUntil==null?1:1-clamp((local-s.captionUntil)/.6));
  voiceEnabled(sound&&allowed&&ready&&!current.error);if(dialogue&&allowed&&ready&&!current.error)voices.tick(dt);
  const voice=voices.proof(),duck=dialogue&&!voice.ended;fadeMusic(sound&&!document.hidden&&!paused&&!duck ? .045 : 0,dt);
  if(active&&s.bridge&&local>=s.bridge.at&&local<s.bridge.resume-.05){requestScene(index,s.bridge.resume);transition.fade=s.bridge.fade||.95;}
  else if((active||allowed&&s.mode==='scroll'&&target>=d&&local>=d)&&local>=d-.025&&(!dialogue||voices.canFinish()))advance();
  if(!transition&&$('hint'))$('hint').hidden=finished||s.mode!=='scroll'||previewAuto||paused||target>local+.015;
 }
 footsteps.tick();if($('run'))$('run').textContent=previewAuto?'이동 멈춤':'이동 재생';if($('chapter')&&index>=0)$('chapter').value=String(index);if($('progress'))$('progress').value=String((offset(index)+local)/Math.max(1,total));
 document.body.dataset.proof=JSON.stringify({engine:'test-render-media-v2',scene:scenes[index]?.id,index,local,duration:duration(index),mode:scenes[index]?.mode,transition:transition?.phase||null,waiting:!!transition||!!current&&!current.loaded,renderedKind,renderedSource,imagePreview:renderedKind==='image',source:current?.scene.src||null,sourceTime:current?.video.currentTime||0,sourceFps:current?.scene.fps??null,provenance:current?.scene.provenance??null,geometryVerified:false,voice:voices.proof(),musicVolume:music.volume,footsteps:{active:foot.dataset.active,starts:Number(foot.dataset.starts||0)},finished});requestAnimationFrame(frame);
}
status('로딩중...');requestAnimationFrame(frame);
try{
 const response=await fetch(manifestURL);if(!response.ok)throw Error('manifest '+response.status);const manifest=await response.json();scenes=Array.isArray(manifest)?manifest:manifest.scenes;
 if(!Array.isArray(scenes)||!scenes.length)throw Error('장면 목록이 비어 있습니다.');
 for(const s of scenes){if(!['scroll','auto','dialogue'].includes(s.mode))throw Error('장면 모드 확인: '+s.id);if(s.mode==='dialogue'&&(!Number.isInteger(s.speaker)||s.speaker<0||s.speaker>4))throw Error('대사 인물 확인: '+s.id);}
 lengths=scenes.map(s=>s.mode==='dialogue'?voices.duration(s.speaker)+8:Math.max(.1,Number(s.duration)||Number(s.sourceDuration)||6));total=lengths.reduce((a,b)=>a+b,0);
 if($('chapter'))$('chapter').replaceChildren(...scenes.map((s,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=s.label||s.id;return o;}));
 let saved=null;try{saved=JSON.parse(sessionStorage.getItem('test-render-resume'));sessionStorage.removeItem('test-render-resume');}catch{}
 requestScene(saved&&Number.isInteger(saved.index)?clamp(saved.index,0,scenes.length-1):0,Number(saved?.local)||0);
}catch(error){status('장면을 불러오지 못했습니다. 새로고침해 주세요.');document.body.dataset.error=String(error);console.error(error);}
