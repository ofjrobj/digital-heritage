import {approachState,shouldStartApproach} from './dialogue-approach.js?v=arrival-20261020-v27';
import {createAdaptiveNavPaper} from './adaptive-nav-paper.js?v=frame-paced-scroll-20261026';
import {createAdaptiveIcons} from './adaptive-icons.js?v=fullscreen-menu-tone-20261028';
import {UI_MOTION_MS,UI_MOTION_SECONDS,uiMotionEase,uiRevealOpacity} from './ui-motion.js?v=ui-motion-audit-20261028';
import {createQuietAmbience} from './quiet-ambience.js?v=ending-clock-20261028';
import {continuousScrollRate,createScrollTween,sampleScrollTween,scrollTweenDuration,sourcePlaybackRate,nextScrollStop,nearestSharpStop,manualScrollHoldTime,boundedManualTarget} from './scroll-motion.js?v=native-rate-20261029';
import {createFootageFog} from './footage-fog.js?v=edge-dissolve-20261019-v24';
import {createSceneLife} from './scene-life.js?v=sound-fade-20261019-v17';
import {createSeasonAmbience} from './season-ambience.js?v=sound-fade-20261019-v17';
import {createDialogueFaceSafe} from './dialogue-face-safe.js?v=arrival-hold-20261019-v1';
import {dialogueFrame} from './dialogue-framing.js?v=arrival-hold-20261019-v1';
import {seasonsFrame} from './seasons-framing.js?v=all-visitors-1';
import {createStoryVoices} from './story-voices.js?v=requested-fixes-20261028-v7';
import {createStoryMusic,endingAudioGain} from './story-audio-mix.js?v=ending-audio-20261028';
import {createScrollFootsteps} from './scroll-footsteps.js?v=manual-movement-20261019-v19';
import {dialogueCopy} from './dialogue-copy.js?v=dialogue-final-20261014';
import {createIntroInkSpread,introVisualTime} from './intro-ink-spread.js?v=three-drops-slow-intro-1';
import {createPaperColor, PAPER_CSS} from './paper-color.js?v=decoded-frame-20261026';
import {sceneColorGrade} from './scene-color-grade.js?v=cook-turn-20261028';
import {createWalkingInput,walkingTargetDelta,walkingPlaybackRate} from './walking-input.js?v=retina-cadence-20261028';
import {setPlaybackRate,holdPresentedFrame,reverseFrameStep,createPresentedFrameClock} from './video-playback.js?v=frame-paced-scroll-20261026';
import {dialogueApproachGain,sceneArrivalDelay} from './dialogue-audio-flow.js?v=drag-arrival-audio-1';
import {createIntroEntry} from './intro-entry.js?v=embedded-story-20261026';
import {uiPreview} from './ui-preview.js?v=requested-fixes-20261028-v7';
import {createStoryIndexTransition} from './story-index-transition.js?v=ready-index-20261029';
const replacementOpening=document.body.dataset.mediaProfile==='selected-higgsfield';
const reviewWindow=document.body.dataset.reviewWindow==='true';
const embeddedStory=new URLSearchParams(location.search).get('embed')==='story';
const directStoryStart=!embeddedStory&&new URLSearchParams(location.search).get('start')==='main';
const entryGate=document.body.hasAttribute('data-intro-entry');
// Fresh visits keep the invitation; Index returns open the same first cover.
let entryAccepted=!entryGate||directStoryStart,entryFontsReady=!entryGate;
if(entryGate)document.fonts.ready.then(()=>{entryFontsReady=true;});
const walkingInput=createWalkingInput({oneStepPerGesture:replacementOpening});
let walkingRate=0,walkingDirection=1,reverseElapsed=0;
const paperColor=createPaperColor(),presentedFrames=createPresentedFrameClock();
let lastPaint=null,canvasPaints=0;
const introEffect=createIntroInkSpread({paper:PAPER_CSS});
let normalizedVillage=null;
const introPaintings=['./cover-reference.png','./test-render/intro-mountains.webp'].map(path=>{const im=new Image();im.src=new URL(path,import.meta.url).href;return im;});
const introVillage=new Image();introVillage.src=new URL('./test-render/aerial-bridge-v4.svg?v=flow-cover-sound-1',import.meta.url).href;
introVillage.onerror=()=>{introVillage.dataset.failed='true';};
const introAssetsReady=()=>[...introPaintings,introVillage].every(im=>im.complete&&im.naturalWidth);
const introAssetsFailed=()=>[...introPaintings,introVillage].some(im=>im.dataset.failed==='true'||im.complete&&!im.naturalWidth);
const $=id=>document.getElementById(id),stage=$('stage'),canvas=$('world'),ctx=canvas.getContext('2d',{alpha:false});
const entryScreen=entryGate?createIntroEntry({body:document.body,welcome:$('introWelcome'),recommendation:$('introRecommendation'),button:$('introEnter'),recommendationSeconds:embeddedStory?0:2,focusOnReady:!embeddedStory}):null;
if(embeddedStory){
 document.documentElement.dataset.storyEmbed='true';
 $('introEnter').querySelector('.entry-label').textContent='체험 시작';$('introEnter').lang='ko';
 for(const id of ['storyIndexBar','projectMenu','projectAbout','projectVr','cinemaDialogue','soundToggle','testTools'])if($(id))$(id).inert=true;
}
const PAPER=PAPER_CSS;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ease=t=>t*t*(3-2*t);
const manifestURL=new URL(document.body.dataset.mediaManifest||'./test-render/manifest.json?v=rolling-fog-common-walk-1',import.meta.url),url=s=>s?new URL(s,manifestURL).href:'';
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./test-render-media.css?v=ui-motion-audit-20261028',import.meta.url).href;document.head.append(css);
document.body.classList.add('test-render-media');
const mist=document.createElement('div');mist.className='tr-mist';mist.setAttribute('aria-hidden','true');stage.append(mist);
const footageFog=createFootageFog({stage,world:canvas,mist,subtle:replacementOpening});
stage.style.setProperty('--nav-paper','0');
const adaptiveNavPaper=createAdaptiveNavPaper(stage,canvas,$('storyIndexBar'));
const adaptiveIcons=createAdaptiveIcons(canvas,['fullscreenToggle','soundToggle','projectMenuToggle','projectAbout','projectVr','projectQr'].map($),{colorSources:{fullscreenToggle:'projectMenuToggle'}});
// Opacity follows video time directly; a CSS transition here carries the old
// title opacity into the narration and produces a visible dip/flash at the swap.
const caption=document.createElement('p');caption.className='tr-caption';caption.hidden=true;caption.style.transition='none';stage.append(caption);
const endingPaper=document.createElement('div');endingPaper.className='tr-ending-paper';endingPaper.setAttribute('aria-hidden','true');stage.append(endingPaper);
const archiveCta=document.createElement('a');archiveCta.className='tr-archive-cta';const archiveCtaLabel=document.createElement('span');archiveCtaLabel.textContent='아카이브 탐색';archiveCta.append(archiveCtaLabel);archiveCta.href=$('indexLink')?.href||'archive/index.html';archiveCta.hidden=true;stage.append(archiveCta);
let archiveFrame=null,endingElapsed=0,endingRestartShown=false,storyStarted=false,loadingHiddenAt=null,firstSceneShownAt=null;
function prepareArchive(){if(embeddedStory||archiveFrame)return;archiveFrame=document.createElement('iframe');archiveFrame.className='tr-archive';archiveFrame.title='석사자 아카이브';archiveFrame.src=$('indexLink')?.href||'archive/index.html';archiveFrame.setAttribute('aria-hidden','true');archiveFrame.inert=true;archiveFrame.onload=()=>{archiveFrame.dataset.loaded='true';try{archiveFrame.contentDocument.querySelectorAll('[data-story-return]').forEach(a=>a.target=uiPreview?'_parent':'_top');}catch{}};stage.append(archiveFrame);}
const videos=[0,1].map(()=>{const v=document.createElement('video');v.muted=true;v.crossOrigin='anonymous';v.playsInline=true;v.preload='auto';v.className='tr-source';v.setAttribute('aria-hidden','true');stage.append(v);return v;});
const records=[null,null],voices=createStoryVoices(stage,{tailSeconds:1,onEnded:speaker=>{if(current?.scene.mode==='dialogue'&&current.scene.speaker===speaker)finishDialoguePanel();}}),music=$('music');music.volume=0;const storyMusic=createStoryMusic(music);
const foot=document.createElement('audio');foot.id='scrollFootsteps';foot.preload='auto';foot.src=replacementOpening?new URL('../media/v17/drag-footsteps.mp3',import.meta.url).href:new URL('./footstep-single-v2.mp3',import.meta.url).href;stage.append(foot);
const names=['장사꾼','농민','찬모','주민 삼총사','나무꾼'];
let scenes=[],lengths=[],total=0,index=-1,current=null,transition=null,local=0,target=0,sound=!embeddedStory&&!uiPreview,paused=false,previewAuto=false,compare=false,motion=true,last=performance.now(),width=1,height=1,lastScrollAt=-Infinity,lastSource=null,hasFrame=false,finished=false,lastVoiceEnable=null,lastStatus='',renderedKind='none',renderedSource='';
let drag=null,lastDragMoveAt=-Infinity,lastWheelMoveAt=-Infinity,lastManualInputAt=-Infinity,manualIdleMs=120;
// A wheel gesture can start muted video even when the browser denies sound.
// Keep that fallback across frames instead of immediately unmuting it again.
let nativeAudioBlocked=false;
let pendingIntroEntry=false,sceneJoin=null,openingLayout=null,lastSceneTransition=null,endingFadeAmount=0,endingSoundGain=1,seamMatch=null;
const archiveTransition=createStoryIndexTransition({link:archiveCta,stage,prepare:prepareArchive,getFrame:()=>archiveFrame,remember});
const footsteps=createScrollFootsteps(foot,()=>Math.abs(target-local)>.008&&(!!current?.scrubTween||!current?.video.paused)&&sound&&!paused&&!compare&&!previewAuto&&!transition&&!finished&&!document.hidden&&!!current&&!current.error&&scrollDriven()&&scenes[index]?.mode==='scroll'&&scenes[index]?.footsteps===true&&(current.still||current.loaded||current.video.readyState>=2),()=>performance.now(),()=>endingSoundGain*dialogueApproachGain(scenes[index],scenes[index+1],local,duration(index))*(current?.scrubTween?Math.min(1,Math.abs(sampleScrollTween(current.scrubTween,performance.now()).velocity)/1.2):current?.scene.scrollPlayback==='continuous'?Math.min(1,walkingRate/.75):1));
// Public film audio is authored separately: no embedded or extracted ambience.
const seasonAmbience=replacementOpening?null:createSeasonAmbience(stage),sceneLife=replacementOpening?null:createSceneLife(stage);
const disabledAmbience={enabled:false,source:"",volume:0,paused:true,muted:true};
const quietAmbience=replacementOpening&&!embeddedStory&&!uiPreview?createQuietAmbience(stage):null;
if(embeddedStory||uiPreview)stage.querySelectorAll('audio').forEach(audio=>{audio.muted=true;});
if($('introEnter'))$('introEnter').onclick=()=>{
 if(entryAccepted||!(transition?.phase==='entry'||embeddedStory&&finished)||transition?.record.error||!entryScreen?.accept())return;
 entryAccepted=true;stage.focus({preventScroll:true});
 if(embeddedStory){if(finished)requestScene(0);enterFromIntro(1);}
 // Prime the separate tracks silently on this real click; the cover stays silent.
 if(sound){unlockNativeSound();quietAmbience?.retry();footsteps.retry();}
};
if($('introWelcome'))$('introWelcome').addEventListener('transitionend',()=>{
 if(entryAccepted)$('introWelcome').hidden=true;
});
function journeyStarted(){return !replacementOpening||!!current&&(current.scene.id!=='intro'||!!current.autoStarted||local>.001);}
const dialogueFit=createDialogueFaceSafe({stage,panel:$('cinemaDialogue'),tools:$('testTools'),sound:$('soundToggle')});
const duration=i=>lengths[i]||1,offset=i=>lengths.slice(0,Math.max(0,i)).reduce((a,b)=>a+b,0);
// Keep target/local/seek in source seconds; scale only incoming walking time.
// The opening becomes automatic at the mountain reveal, without changing its source.
function scrollDriven(r=current){return r?.scene.mode==='scroll'&&!r.autoStarted;}
function departureActive(r=current){return !!r?.scene.autoTurnUntil&&!r.departureDone;}
function scrollLimit(){const from=Number(scenes[index]?.autoFrom);return from>0?Math.min(duration(index),from):duration(index);}
// Use the same untrimmed walking scale so an editorial trim stays shorter.
function walkingReference(){const s=scenes[index];return s?.mode==='scroll'&&s.footsteps?Math.max(.1,Number(s.walkingReferenceDuration)||duration(index)):30;}
function walkingInputRange(){
 const seconds=Number(scenes[index]?.secondsPerScroll);
 if(replacementOpening&&Number.isFinite(seconds)&&seconds>0)return seconds*6;
 const steps=Number(scenes[index]?.scrollSteps);
 if(replacementOpening)return duration(index)*(Number.isFinite(steps)&&steps>0?6/steps:1);
 return scenes[index]?.footsteps?walkingReference():scrollLimit();
}
function status(text,retry=false){if(storyStarted&&text==='Loading...')text='';const node=$('loading');if(!node)return;const key=text+'|'+retry;if(key===lastStatus)return;lastStatus=key;node.replaceChildren(document.createTextNode(text));node.hidden=!text;if(retry){const button=document.createElement('button');button.textContent='다시 불러오기';button.onclick=()=>requestScene(transition?.to??Math.max(0,index),transition?.at??local);node.append(button);}}
function voiceEnabled(value){value=value&&!embeddedStory&&!uiPreview;if(value!==lastVoiceEnable){lastVoiceEnable=value;voices.setEnabled(value);}}
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
// Centre the drawn face (not the source rectangle), then ease back to the native landscape crop.
function openingFrame(scene,W,H,sw,sh,time){
 const f=scene.openingFraming,hold=Number(f.holdUntil)||0,end=Math.max(hold+.01,Number(f.releaseAt)||hold+.01);
 const amount=1-ease(clamp((time-hold)/(end-hold))),focalX=.5+(clamp(Number(f.focalX)||.5,.1,.9)-.5)*amount;
 // Overscan only as much as needed to keep both edges covered after shifting.
 const scale=Math.max(W/(sw*2*Math.min(focalX,1-focalX)),H/sh),w=sw*scale,h=sh*scale;
 return {x:W*.5-focalX*w,y:(H-h)/2,w,h,focalX,amount,centerX:W*.5};
}
// Fade the final source frames into the same paper color as the page.
// Complete on the last decodable frame so finishing never flashes the image back.
function sourceEndFade(scene,time){
 const seconds=Number(scene?.endFadeSeconds)||0;
 if(seconds<=0)return 0;
 const end=Math.max(0,(Number(scene.sourceDuration)||Number(scene.duration)||0)-(Number(scene.clipIn)||0));
 const lastFrame=Math.max(0,end-1/(Number(scene.fps)||24));
 const start=Math.max(0,end-seconds);
 return ease(clamp((time-start)/Math.max(.001,lastFrame-start)));
}
// Blend toward the actual following video's first frame before switching sources.
// The landing image and subsequent playback therefore share the exact same frame.
function exitMatchState(record,time){
 const spec=record?.scene.exitMatch;
 if(!spec)return null;
 const fromIndex=scenes.indexOf(record.scene),next=scenes[fromIndex+1];
 if(!next||next.id!==spec.target)return null;
 const to=records.find(r=>r?.scene===next&&r.loaded&&!r.error&&!r.video.seeking&&r.video.readyState>=2);
 const end=duration(fromIndex)-1/(Number(record.scene.fps)||24);
 const progress=clamp((time-(end-spec.seconds))/spec.seconds);
 if(!to||progress<=0)return null;
 if(!to.joinImage){
  const v=to.video,graded=paperColor.render(v),image=document.createElement('canvas');
  image.width=v.videoWidth;image.height=v.videoHeight;image.getContext('2d').drawImage(graded,0,0,image.width,image.height);to.joinImage=image;
 }
 // Track gate landmarks while the source camera is still moving, then dissolve
 // only after both posts and the crossbeam have reached the following framing.
 let framing=spec;
 if(spec.keyframes?.length){
  const keys=spec.keyframes;let a=keys[0],b=keys[keys.length-1];
  for(let i=1;i<keys.length;i++){if(time<=keys[i].time){a=keys[i-1];b=keys[i];break;}a=keys[i];}
  const t=clamp((time-a.time)/Math.max(.001,b.time-a.time));framing={};
  for(const key of ['scaleX','scaleY','offsetX','offsetY'])framing[key]=a[key]+(b[key]-a[key])*t;
 }
 const blendStart=spec.blendStart??.2;
 return {spec:framing,to,image:to.joinImage,progress,alignment:ease(clamp(progress/(spec.alignmentFraction??.6))),blend:ease(clamp((progress-blendStart)/(1-blendStart)))};
}
function connectionLook(scene,time){
 const keys=scene?.connectionLook;if(!keys?.length)return null;
 if(time<=keys[0].time)return keys[0];
 for(let i=1;i<keys.length;i++)if(time<=keys[i].time){
  const a=keys[i-1],b=keys[i],u=ease(clamp((time-a.time)/(b.time-a.time))),out={};
  for(const key of ['scale','x','y','brightness'])out[key]=a[key]+(b[key]-a[key])*u;
  return out;
 }
 return keys[keys.length-1];
}
function draw(source){
 if(!source)return false;const sw=source.videoWidth||source.naturalWidth,sh=source.videoHeight||source.naturalHeight;if(!sw||!sh)return false;
 const sceneRecord=records.find(r=>r&&(r.video===source||r.image===source));
 const paintTime=Math.max(0,(source.currentTime||0)-(sceneRecord?.clipIn||0)),scene=sceneRecord?.scene;
 const frameKey=source.tagName==='VIDEO'?presentedFrames.key(source):null;
 // Reuse the canvas only when its source pixels and framing are unchanged.
 // Every composited transition clears this cache so its overlays never accumulate.
 const lookKeys=scene?.connectionLook;
 const animated=transition||sceneJoin||current?.approaching
  ||scene?.openingFraming&&paintTime<scene.openingFraming.releaseAt
  ||lookKeys?.length&&paintTime>lookKeys[0].time&&paintTime<lookKeys[lookKeys.length-1].time
  ||scene?.departureGrade&&paintTime<scene.departureGrade.until
  ||scene?.exitMatch&&paintTime>=duration(scenes.indexOf(scene))-scene.exitMatch.seconds-1/(Number(scene.fps)||30)
  ||sourceEndFade(scene,paintTime)>0||scene?.id==='seasons'&&!scene.motionBaked||scene?.id==='intro'&&!replacementOpening;
 const reusable=source.tagName==='VIDEO'&&!animated;
 if(reusable&&hasFrame&&lastPaint?.source===source&&lastPaint.key===frameKey&&lastPaint.width===width&&lastPaint.height===height){dialogueFit.update(sceneRecord?.scene,source);return true;}
 lastPaint=reusable?{source,key:frameKey,width,height}:null;canvasPaints++;
 ctx.fillStyle=PAPER;ctx.fillRect(0,0,width,height);const scale=Math.max(width/sw,height/sh);
 const isIntro=sceneRecord?.scene.id==='intro'&&!replacementOpening&&introAssetsReady();
 const match=exitMatchState(sceneRecord,Math.max(0,(source.currentTime||0)-(sceneRecord?.clipIn||0)));
 const graded=isIntro?source:paperColor.render(source,sceneColorGrade(sceneRecord),!!sceneRecord?.scene.preserveSourceColor);
 const look=connectionLook(sceneRecord?.scene,Math.max(0,(source.currentTime||0)-(sceneRecord?.clipIn||0)));
 openingLayout=null;
 const seasonFit=null; // All scene images fill the viewport, including narrow windows.
 function paint(x,y,w,h){
  ctx.save();
  if(look){
   x+=look.x*w;y+=look.y*h;w*=look.scale;h*=look.scale;if(look.brightness!==1)ctx.filter=`brightness(${look.brightness})`;
   // Extend the source's sky edge when a small framing correction moves it
   // below the viewport, so no strip of a different paper color is exposed.
   if(y>0)ctx.drawImage(graded,0,0,graded.videoWidth||graded.naturalWidth||graded.width,1,x,0,w,y+1);
  }
  if(match){ctx.drawImage(graded,x,y,w,h);const p=match.alignment,m=match.spec;x+=(Number(m.offsetX)||0)*w*p;y+=(Number(m.offsetY)||0)*h*p;w*=1+((Number(m.scaleX)||1)-1)*p;h*=1+((Number(m.scaleY)||1)-1)*p;}
  ctx.drawImage(graded,x,y,w,h);ctx.restore();
 }
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
 }else if(sceneRecord?.scene.id==='intro'&&sceneRecord.scene.openingFraming){
  const r=openingFrame(sceneRecord.scene,width,height,sw,sh,source.currentTime||0);openingLayout=r;paint(r.x,r.y,r.w,r.h);
 }else if(sceneRecord?.scene.mode==='dialogue'){
  const r=dialogueFrame(sceneRecord.scene,width,height,sw,sh,source.currentTime||0);paint(r.x,r.y,r.w,r.h);
 }else paint((width-sw*scale)/2,(height-sh*scale)/2,sw*scale,sh*scale);dialogueFit.update(sceneRecord?.scene,source);lastSource=source;hasFrame=true;
 seamMatch=match?{from:sceneRecord.scene.id,to:match.to.scene.id,progress:match.progress,blend:match.blend}:null;
 if(match){const im=match.image,k=Math.max(width/im.width,height/im.height);ctx.save();ctx.globalAlpha=match.blend;ctx.drawImage(im,(width-im.width*k)/2,(height-im.height*k)/2,im.width*k,im.height*k);ctx.restore();}
 endingFadeAmount=sourceEndFade(sceneRecord?.scene,Math.max(0,(source.currentTime||0)-(sceneRecord?.clipIn||0)));
 if(endingFadeAmount>0){ctx.save();ctx.globalAlpha=endingFadeAmount;ctx.fillStyle=PAPER;ctx.fillRect(0,0,width,height);ctx.restore();}
 if(sceneRecord&&source.tagName==='VIDEO'&&!source.seeking)sceneRecord.lastDecodedTime=source.currentTime;
 renderedKind=source.tagName==='VIDEO'?'video':'image';renderedSource=source.currentSrc||source.src||'';return true;
}
function resize(){
 const d=Math.min(devicePixelRatio||1,2),w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);
 const pixelWidth=Math.round(w*d),pixelHeight=Math.round(h*d);
 if(width===w&&height===h&&canvas.width===pixelWidth&&canvas.height===pixelHeight)return;
 width=w;height=h;canvas.width=pixelWidth;canvas.height=pixelHeight;
 ctx.setTransform(d,0,0,d,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';hasFrame=false;ctx.fillStyle=PAPER;ctx.fillRect(0,0,width,height);draw(lastSource);
}
addEventListener('resize',resize);new ResizeObserver(resize).observe(stage);resize();
// Hide on the actual audio end event, independently of the later fog transition.
function finishDialoguePanel(){
 if(!current||current.scene.mode!=='dialogue')return;
 current.dialogueEnded=true;
 const panel=$('cinemaDialogue');if(panel){panel.hidden=true;panel.inert=true;}
}
function showText(){const s=scenes[index],panel=$('cinemaDialogue');if(!s)return;if(embeddedStory){panel.hidden=true;panel.inert=true;caption.hidden=true;voices.select(-1);return;}if(s.id==='seasons')prepareArchive();const dialogueScene=s.mode==='dialogue',speaking=dialogueScene&&(current?.startElapsed||0)>=sceneArrivalDelay(s);document.body.dataset.dialogue=String(dialogueScene);if(panel){panel.inert=!speaking;panel.style.opacity='1';panel.hidden=!speaking;if(speaking){panel.querySelector('h2').textContent=names[s.speaker]||s.label;panel.querySelector('p').textContent=dialogueCopy[s.speaker]?.testimony||'';panel.querySelector('p').scrollTop=0;}}caption.dataset.scene=s.id;caption.dataset.intro=String(s.id==='intro');caption.textContent=s.caption||'';caption.hidden=!s.caption||speaking;if($('next'))$('next').textContent=index<scenes.length-1?'다음 장면으로':'아카이브로';voices.select(speaking?s.speaker:-1);dialogueFit.invalidate();}
function prepare(i,at=0){
 const s=scenes[i],slot=current?1-current.slot:0,v=videos[slot],r={slot,scene:s,video:v,image:null,loaded:false,error:null,still:!s.src,at,clipIn:Math.max(0,Number(s.clipIn)||0),playPending:false,manualHeld:false,completeWheelStep:false,departureDone:at>=(Number(s.autoTurnUntil)||0),startElapsed:0,autoStarted:Number(s.autoFrom)>0&&at>=Number(s.autoFrom)};
 records[slot]=r;v.pause();v.muted=true;v.onloadeddata=null;v.onloadedmetadata=null;v.onerror=null;v.removeAttribute('src');v.load();
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
 cached.autoStarted=Number(scenes[i].autoFrom)>0&&at>=Number(scenes[i].autoFrom);cached.startElapsed=0;cached.departureDone=at>=(Number(scenes[i].autoTurnUntil)||0);cached.playBlocked=false;cached.manualHeld=false;cached.completeWheelStep=false;cached.lastDecodedTime=undefined;cached.scrubTarget=undefined;cached.scrubTween=null;cached.settledTarget=null;cached.approaching=false;cached.approachCover=0;
 const seek=cached.clipIn+(scenes[i].mode==='dialogue'?0:at);
 if(cached.video.readyState>=1&&Math.abs(cached.video.currentTime-seek)>.04)cached.video.currentTime=seek;
 return cached;
}
function preloadNext(){
 const next=scenes[index+1];if(!next||next.src&&next.src===current?.scene.src)return;
 if(!records.some(r=>r?.scene===next))prepare(index+1,!replacementOpening&&scenes[index]?.id==='intro'?1.625:0);
}
function continuousAdvance(){
 const next=scenes[index+1];if(!next)return false;
 // Dialogue must disappear under mist even when the following walk has transition:none.
 if(scenes[index]?.mode==='dialogue'||next.mode==='dialogue')return false;
 if(scenes[index]?.id==='intro'||replacementOpening&&next.transition==='none'){
  const ready=records.find(r=>r?.scene===next&&r.loaded&&!r.error&&!r.video.seeking&&r.video.readyState>=2);
  if(!ready)return false;
  const joinSeconds=Number(current.scene.exitCrossfadeSeconds)||0;
  if(joinSeconds>0&&hasFrame){const image=document.createElement('canvas');image.width=canvas.width;image.height=canvas.height;image.getContext('2d').drawImage(canvas,0,0);sceneJoin={image,elapsed:0,duration:joinSeconds};}
  current.video.pause();current=ready;index++;local=current.video.currentTime-current.clipIn;target=local;
 }else if(current.scene.src===next.src&&Math.abs(current.clipIn+duration(index)-(Number(next.clipIn)||0))<.05){
  index++;current.scene=next;current.clipIn=Number(next.clipIn)||0;current.autoStarted=false;
  current.startElapsed=0;local=Math.max(0,current.video.currentTime-current.clipIn);target=local;current.video.pause();
 }else return false;
 current.manualHeld=false;current.completeWheelStep=false;current.lastDecodedTime=undefined;
 walkingInput.reset();walkingRate=0;reverseElapsed=0;lastWheelMoveAt=-Infinity;lastManualInputAt=-Infinity;footsteps.stop();showText();preloadNext();return true;
}
function openingPlaybackRate(scene,time,d){
 if(replacementOpening&&(scene?.id==='intro'||scene?.playbackCurve?.length))return sourcePlaybackRate(scene.playbackCurve,time);
 if(scene?.id==='intro')return .52+.08*ease(clamp((time-1.3)/2.3));
 if(scene?.id!=='aerial-entry')return 1;
 const cruise=.82+.08*ease(clamp((time-1.625)/1.8)),glide=cruise-.18*ease(clamp((time-4.5)/2.3));
 return Math.max(.18,glide*(1-.78*ease(clamp((time-(d-3.1))/3.1))));
}
function openingCaption(scene,time){
 let text=scene.caption||'',opacity=scene.captionUntil==null?1:1-ease(clamp((time-scene.captionUntil)/(Number(scene.captionFadeSeconds)||.6))),title=scene.id==='intro';
 const opening=scenes.find(s=>s.id==='aerial-entry'),welcome=scenes.find(s=>s.id==='entry-merchant');
 if(scene.id==='intro'&&replacementOpening&&scene.narrationCaption&&time>=scene.narrationCaption.start){const n=scene.narrationCaption;text=n.text;title=false;opacity=ease(clamp((time-n.start)/n.fadeIn))*(1-ease(clamp((time-n.holdUntil)/(n.end-n.holdUntil))));}
 if(scene.id==='intro'&&!replacementOpening&&time>3.9){text=opening?.caption||'';opacity=ease(clamp((time-4)/1.2));title=false;}
 if(scene.id==='aerial-entry'){
  if(time<8){text=opening?.caption||'';opacity=1-ease(clamp((time-6.4)/1.1));}
  else{text=welcome?.caption||'';opacity=ease(clamp((time-8.3)/1.2));}
 }
 if(scene.id==='entry-merchant')opacity=1-ease(clamp((time-.3)/1.2));
 if(caption.dataset.scene!==scene.id)caption.dataset.scene=scene.id;
 if(caption.dataset.intro!==String(title))caption.dataset.intro=String(title);
 if(caption.textContent!==text)caption.textContent=text;
 const hidden=!text||scene.mode==='dialogue';if(caption.hidden!==hidden)caption.hidden=hidden;
 if(caption.style.opacity!==String(opacity))caption.style.opacity=String(opacity);
}
function transitionTiming(from,to,quick=false){
 if(quick)return {cover:0,reveal:0,hold:0};
 if(from?.mode==='dialogue'||to?.mode==='dialogue')return {cover:1.2,reveal:1.0,hold:0};
 const exit=Number(from?.exitTransitionSeconds),seconds=to?.transition==='none'?0:Number.isFinite(exit)&&exit>=0?exit:1.6;
 return {cover:seconds,reveal:seconds,hold:seconds > 0 ? .1 : 0};
}
function requestScene(i,at=0,quick=false){
 sceneJoin=null;
 lastManualInputAt=-Infinity;
 const from=scenes[index],timing=transitionTiming(from,scenes[i],quick);
 const precovered=!quick&&!!current?.approaching&&(current.approachCover||0)>=.999;
 if(i<0||i>=scenes.length)return;if(at>=duration(i)&&i<scenes.length-1){i++;at=0;}
 walkingInput.reset();walkingRate=0;reverseElapsed=0;lastWheelMoveAt=-Infinity;footsteps.stop();drag=null;current?.video.pause();voices.select(-1);voiceEnabled(false);if(from?.mode!=='dialogue'||!timing.cover)$('cinemaDialogue')?.setAttribute('hidden','');if($('cinemaDialogue')){$('cinemaDialogue').inert=true;$('cinemaDialogue').style.opacity='1';}caption.hidden=true;archiveCta.hidden=true;finished=false;endingElapsed=0;endingPaper.style.opacity='0';archiveCta.inert=true;document.body.dataset.ending='false';if(archiveFrame){archiveFrame.style.opacity='0';archiveFrame.style.pointerEvents='none';archiveFrame.inert=true;archiveFrame.setAttribute('aria-hidden','true');}if($('hint'))$('hint').hidden=true;
 const fade=storyStarted?timing.cover:(replacementOpening?0:.8);
 const soft=replacementOpening&&storyStarted&&timing.cover>0&&hasFrame;let fromImage=null;
 if(soft){fromImage=document.createElement('canvas');fromImage.width=canvas.width;fromImage.height=canvas.height;fromImage.getContext('2d').drawImage(canvas,0,0);}
 transition={soft,fromImage,precovered,blendDuration:precovered ? 1.0 : (from?.mode==='dialogue'||scenes[i]?.mode==='dialogue') ? 2.2 : .95,briefPaper:from?.mode==='dialogue'||scenes[i]?.mode==='dialogue',fromDialogue:from?.mode==='dialogue',from:from?.id,to:i,at:clamp(at,0,duration(i)),record:preparedScene(i,at),phase:soft?'blend-wait':storyStarted?'in':'loading',initial:!storyStarted,elapsed:0,fade,reveal:storyStarted?timing.reveal:fade,hold:timing.hold};footageFog.start(!transition.initial&&transition.fade>0);status('Loading...');
}
function remember(){if(embeddedStory||uiPreview)return;footageFog.stop();sceneLife?.stop();seasonAmbience?.stop();quietAmbience?.stop();footsteps.stop();videos.forEach(v=>v.pause());voiceEnabled(false);music.pause();sessionStorage.setItem('test-render-resume',JSON.stringify({index,local}));sessionStorage.setItem('ink-pilot-return',location.pathname.endsWith('/test-render-clean.html')?'test-render-clean.html':'test-render.html');}
document.addEventListener('fullscreen-navigation',()=>{paused=true;remember();});
if($('indexLink'))$('indexLink').onclick=e=>{
 remember();
 if(entryGate&&entryAccepted&&!journeyStarted()&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){
  e.preventDefault();document.body.dataset.leavingIntro='true';
  setTimeout(()=>location.assign($('indexLink').href),entryNavReducedMotion.matches?0:UI_MOTION_MS);
 }
};
if($('storyLink'))$('storyLink').onclick=e=>{e.preventDefault();paused=false;previewAuto=false;requestScene(0);};
function syncSoundButton(){const b=$('soundToggle');if(!b)return;b.setAttribute('aria-pressed',String(sound));b.setAttribute('aria-label',sound?'소리 끄기':'소리 켜기');const img=b.querySelector('img');if(img)img.src=new URL(sound?'./icons8-voice-50.png':'./icons8-mute-50.png',import.meta.url).href;}
function retrySound(){if(!sound)return;if(navigator.userActivation?.isActive)footsteps.retry();storyMusic.retry();sceneLife?.retry();quietAmbience?.retry();if(current&&!transition&&!paused&&current.startElapsed>=sceneArrivalDelay(scenes[index])){voices.setEnabled(true);lastVoiceEnable=true;}}
function unlockNativeSound(){if(navigator.userActivation?.isActive)nativeAudioBlocked=false;}
if($('soundToggle'))$('soundToggle').onclick=()=>{if(embeddedStory||uiPreview)return;if(sound&&(nativeAudioBlocked||footsteps.proof().blocked||storyMusic.proof().blocked||quietAmbience?.blocked()||voices.proof().failed)){unlockNativeSound();retrySound();return;}sound=!sound;if(sound){unlockNativeSound();quietAmbience?.retry();}syncSoundButton();storyMusic.enable(sound&&!replacementOpening);if(!sound){footsteps.stop();quietAmbience?.stop();}voiceEnabled(sound&&!paused&&!transition&&!current?.error&&!!current&&current.startElapsed>=sceneArrivalDelay(scenes[index]));};
for(const type of ['pointerdown','keydown','wheel'])stage.addEventListener(type,e=>{if(!e.target.closest('#soundToggle')){if(type!=='wheel'&&e.isTrusted)unlockNativeSound();retrySound();}},{passive:true});
syncSoundButton();storyMusic.enable(sound&&!replacementOpening);
function canWalk(){return entryAccepted&&!!current&&!departureActive()&&!current.approaching&&!current.error&&!transition&&!paused&&!compare&&!finished&&scrollDriven();}
function canNavigateEmbeddedScene(){return embeddedStory&&entryAccepted&&!!current&&current.loaded&&!current.error&&!transition&&!paused&&!compare&&!finished&&current.scene.mode==='dialogue'&&current.startElapsed>=sceneArrivalDelay(current.scene);}
function navigateEmbeddedScene(delta){
 if(!delta||!canNavigateEmbeddedScene())return false;
 const next=index+Math.sign(delta);if(next<0||next>=scenes.length)return false;
 requestScene(next);return true;
}
function scrollPositionAt(record,time,now){
 const tween=record.scrubTween;
 if(!tween||tween.to!==time)return time;
 const motion=sampleScrollTween(tween,now);
 if(motion.done){record.scrubTween=null;return time;}
 return motion.position;
}
function seekScrollPosition(record,time){
 const video=record.video;video.pause();
 if(record.scrubTarget===time)return;
 const lastFrame=Number.isFinite(video.duration)?Math.max(0,video.duration-.001):Infinity;
 const seek=Math.min(record.clipIn+time,lastFrame);
 // Do not interrupt decoding to request another position within the same frame.
 if(record.scrubTween&&Math.abs(video.currentTime-seek)<1/(Number(record.scene.fps)||24))return;
 video.currentTime=seek;
 record.scrubTarget=time;
}
function holdManualFrame(released=false,now=performance.now()){
 const r=current;
 if(!replacementOpening||!r||r.manualHeld||r.still||!r.loaded||transition)return;
 // A wheel notch commits one bounded walking step. Do not cut that step off
 // after 120–240ms and force another decoder restart for the next notch.
 // Direct dragging, keyboard release and loss of focus still stop immediately.
 if(r.completeWheelStep&&!released)return;
 const shouldHold=manualScrollHoldTime({scene:r.scene,currentTime:r.lastDecodedTime??r.video.currentTime,clipIn:r.clipIn,duration:duration(index),lastInputAt:lastManualInputAt,now,released,idleMs:manualIdleMs,automatic:!scrollDriven(r)||departureActive(r)||r.approaching||previewAuto});
 if(shouldHold===null)return;
 const hold=holdPresentedFrame(r,duration(index));
 r.manualHeld=true;r.completeWheelStep=false;r.scrubTween=null;
 local=target=hold;r.settledTarget=hold;walkingRate=0;reverseElapsed=0;sceneJoin=null;seamMatch=null;footsteps.stop();
 if(!r.video.seeking&&r.video.readyState>=2)draw(r.video);
}
// One forward gesture starts the entire selected intro; subsequent gestures are consumed.
// Accept it during initial media loading too, rather than losing the first gesture.
function enterFromIntro(delta){
 if(!entryAccepted||!replacementOpening||delta<=0||paused||compare||finished)return false;
 if(!scenes.length){pendingIntroEntry=true;return true;}
 const intro=transition?.record.scene||current?.scene||scenes[0];
 if(intro.id!=='intro'||!intro.enterOnScroll&&!intro.playOnScroll)return false;
 if(intro.playOnScroll){
  const record=transition?.record||current;
  if(!record){pendingIntroEntry=true;return true;}
  record.autoStarted=true;record.manualHeld=false;record.autoRate=1;pendingIntroEntry=false;previewAuto=false;return true;
 }
 const next=scenes.indexOf(intro)+1;if(next>=scenes.length)return false;
 pendingIntroEntry=false;previewAuto=false;requestScene(next);return true;
}
function manual(delta,fromDrag=false,idleMs=120,fromWheel=false){
 if(!delta||enterFromIntro(delta)||!canWalk())return;
 previewAuto=false;current.manualHeld=false;current.completeWheelStep=fromWheel;manualIdleMs=idleMs;if(walkingDirection!==Math.sign(delta))reverseElapsed=0;walkingDirection=Math.sign(delta);lastScrollAt=lastManualInputAt=performance.now();
 // A reversed gesture cancels the old travel queue immediately.
 if((target-local)*walkingDirection<-.008){target=local;walkingRate=0;current.video.pause();}
 // Wheel steps have time to accelerate smoothly; direct input keeps its
 // immediate response before pointer/key release holds the reached frame.
 if(replacementOpening&&current.scene.scrollPlayback==='continuous'&&!walkingRate){
  const cruise=Math.min(Number(current.scene.scrollCruiseRate)||.95,Number(current.scene.maxPlaybackRate)||Infinity);
  walkingRate=fromWheel&&walkingDirection>0?Math.min(.5,cruise):cruise;
 }
 const previousTarget=target;current.settledTarget=null;
 target=!fromDrag&&scenes[index]?.scrollStops?.length
  ?nextScrollStop(scenes[index],target,Math.sign(delta),scrollLimit())
  :clamp(target+walkingTargetDelta(walkingInputRange(),delta),0,scrollLimit());
 if(replacementOpening&&current.scene.scrollPlayback==='continuous')target=boundedManualTarget(target,local,scrollLimit(),current.scene,fromDrag);
 // Start the native decoder in the input handler, without waiting for another
 // render frame. Reverse input continues to use the single-seek path below.
 if(current.scene.scrollPlayback==='continuous'&&target>local&&!current.video.seeking&&current.video.readyState>=2){
  setPlaybackRate(current.video,walkingRate);play(current);
 }
 if(scenes[index]?.scrollPlayback==='seek'){
  current.video.pause();
  const smoothing=scrollTweenDuration(scenes[index],local,target,duration(index),fromDrag);
  if(target!==previousTarget)current.scrubTween=smoothing>0?createScrollTween(local,target,lastScrollAt,smoothing,current.scrubTween):null;
 }
 if(fromDrag&&target!==previousTarget){lastDragMoveAt=performance.now();footsteps.pulse();}
}
stage.addEventListener('wheel',e=>{
 if(embeddedStory&&!e.ctrlKey)e.preventDefault();
 if(e.ctrlKey||e.target.closest('#testTools,#cinemaDialogue,nav,button,a,input,select,textarea,[contenteditable]'))return;
 const now=performance.now();let delta=walkingInput.wheelGestureSteps(e,now);
 if(canWalk()&&walkingInput.lastActiveAt()===now){
  lastManualInputAt=now;lastWheelMoveAt=now;manualIdleMs=walkingInput.releaseDelayMs();
  // A renewed direct packet resumes immediately, even inside the old gesture
  // lock; decaying trackpad momentum does not reach this branch.
  if(!delta&&(current.manualHeld||current.settledTarget===target))delta=-Math.sign(e.deltaY);
 }
 if(!delta)return;if(enterFromIntro(delta)){e.preventDefault();return;}if(embeddedStory&&navigateEmbeddedScene(delta))return;if(!canWalk())return;
 e.preventDefault();const before=target;manual(delta,false,walkingInput.releaseDelayMs(),true);if(target!==before)lastWheelMoveAt=now;
},{passive:false});
canvas.addEventListener('pointerdown',e=>{if(!canWalk()&&!canNavigateEmbeddedScene()||!e.isPrimary||e.pointerType==='mouse'&&e.button!==0)return;drag={x:e.clientX,y:e.clientY,pointerId:e.pointerId,sceneStep:canNavigateEmbeddedScene()};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.pointerId)return;const distance=(drag.y-e.clientY)+(e.clientX-drag.x)*.25;if(drag.sceneStep){if(Math.abs(distance)<24)return;navigateEmbeddedScene(Math.sign(distance));drag=null;return;}manual(distance/90,true);drag={x:e.clientX,y:e.clientY,pointerId:e.pointerId};});
function stopDragging(){
 const wasDragging=!!drag;drag=null;lastDragMoveAt=-Infinity;footsteps.release();
 if(wasDragging&&replacementOpening){holdManualFrame(true);return;}
 if(wasDragging&&canWalk()&&scenes[index]?.dragStopTimes?.length){
  target=nearestSharpStop(scenes[index],target,scrollLimit());
  const now=performance.now(),ms=scrollTweenDuration(scenes[index],local,target,duration(index),true);
  if(scenes[index]?.scrollPlayback!=='continuous')current.scrubTween=ms>0?createScrollTween(local,target,now,ms,current.scrubTween):null;
 }
}
['pointerup','pointercancel','lostpointercapture'].forEach(t=>canvas.addEventListener(t,stopDragging));
addEventListener('blur',()=>{lastWheelMoveAt=-Infinity;stopDragging();holdManualFrame(true);});
addEventListener('keyup',e=>{if(['ArrowDown','PageDown','ArrowUp','PageUp'].includes(e.key))holdManualFrame(true);});
addEventListener('keydown',e=>{if(!entryAccepted)return;if(e.target.closest('input,select,button,textarea,a,nav,[contenteditable],#cinemaDialogue'))return;if(embeddedStory&&['ArrowDown','PageDown','ArrowUp','PageUp'].includes(e.key)&&navigateEmbeddedScene(['ArrowDown','PageDown'].includes(e.key)?1:-1)){e.preventDefault();return;}if(e.code==='Space'){e.preventDefault();paused=!paused;footsteps.stop();}else if(canWalk()&&(e.key==='ArrowDown'||e.key==='PageDown')){e.preventDefault();manual(1);}else if(canWalk()&&(e.key==='ArrowUp'||e.key==='PageUp')){e.preventDefault();manual(-1);}});
if($('run'))$('run').onclick=()=>{paused=false;if(enterFromIntro(1))return;previewAuto=!previewAuto;if(previewAuto&&current)current.manualHeld=false;walkingDirection=1;walkingInput.reset();footsteps.stop();};
function reviewJump(i){paused=false;previewAuto=false;compare=false;requestScene(clamp(i,0,scenes.length-1),0,reviewWindow);}
if($('reviewPrev'))$('reviewPrev').onclick=()=>reviewJump(index-1);
if($('reviewNext'))$('reviewNext').onclick=()=>reviewJump(index+1);
if($('reviewRestart'))$('reviewRestart').onclick=()=>reviewJump(Math.max(0,index));
if($('reviewTime'))$('reviewTime').oninput=e=>{if(scenes[index]?.mode==='dialogue')return;paused=true;previewAuto=false;const at=Math.min(duration(index)-1/(Number(scenes[index]?.fps)||24),Number(e.target.value)/1000*duration(index));requestScene(index,Math.max(0,at),true);};
if($('reviewPause'))$('reviewPause').onclick=()=>{paused=!paused;footsteps.stop();};
if($('reviewTransition'))$('reviewTransition').onclick=()=>{if(index<0||index>=scenes.length-1)return;paused=false;previewAuto=false;requestScene(index+1);};
if($('chapter'))$('chapter').onchange=e=>reviewJump(Number(e.target.value));
if($('progress'))$('progress').oninput=e=>{const t=clamp(Number(e.target.value))*total;let n=0;while(n<scenes.length-1&&offset(n)+duration(n)<=t)n++;requestScene(n,t-offset(n));};
if($('dialogue'))$('dialogue').onclick=()=>{const n=scenes.findIndex((s,i)=>i>=Math.max(0,index)&&s.mode==='dialogue');if(n>=0)requestScene(n);};
if($('next'))$('next').onclick=()=>{if(index<scenes.length-1)requestScene(index+1);else{remember();location.href=$('indexLink').href;}};
if($('compare'))$('compare').onclick=()=>{compare=!compare;footsteps.stop();$('compare').setAttribute('aria-pressed',String(compare));$('compare').textContent=compare?'영상 보기':'이미지 비교';};
if($('ambience'))$('ambience').onclick=()=>{motion=!motion;$('ambience').setAttribute('aria-pressed',String(motion));$('ambience').textContent=motion?'인물 움직임 켜짐':'인물 움직임 꺼짐';};
document.addEventListener('visibilitychange',()=>{if(document.hidden){lastWheelMoveAt=-Infinity;sceneLife?.stop();seasonAmbience?.stop();quietAmbience?.stop();videos.forEach(v=>v.pause());footsteps.stop();storyMusic.suspend();}else if(sound)storyMusic.retry();last=performance.now();});
addEventListener('pagehide',()=>{lastWheelMoveAt=-Infinity;sceneLife?.stop();seasonAmbience?.stop();quietAmbience?.stop();videos.forEach(v=>v.pause());footsteps.stop();voiceEnabled(false);music.pause();});
function play(r){
 const v=r.video;if(!v.paused||r.playPending||v.ended&&!v.loop)return;
 if(nativeAudioBlocked){v.muted=true;v.volume=0;}
 r.playPending=true;
 v.play().then(()=>{r.playBlocked=false;if(r.manualHeld)v.pause();}).catch(error=>{
  if(records[r.slot]!==r||error.name==='AbortError')return;
  r.playBlocked=true;
  if(error.name==='NotAllowedError'&&!v.muted){
   nativeAudioBlocked=true;v.muted=true;v.volume=0;
   // The next animation frame retries the same scroll target without sound.
  }
 }).finally(()=>{r.playPending=false;});
}
let fogLevel=0,navOpacity=1,entryNavReveal=entryGate?0:1;
const entryNavReducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function mistAmount(p){fogLevel=p;mist.style.opacity=String(p);mist.style.setProperty('--veil',String(clamp((p-.62)/.38)));mist.style.setProperty('--drift',String((1-p)*12)+'%');mist.style.setProperty('--fog-progress',String(p));footageFog.update(p);}
// Navigation is veiled by the same fog, then stays absent during dialogue.
function updateStoryNavigation(dt=0){
 const nav=$('storyIndexBar');if(!nav)return;
 const t=transition,underFog=!!t&&!t.initial&&t.fade>0&&!t.record.error;
 navOpacity=scenes[index]?.mode==='dialogue'?0:1;
 if(underFog){
  if(t.soft){const p=t.phase==='blend'?ease(clamp(t.elapsed/t.blendDuration)):0;navOpacity=(t.fromDialogue?0:1)*(1-p)+(t.record.scene.mode==='dialogue'?0:1)*p;}
  else if(t.phase==='in')navOpacity=t.fromDialogue?0:1-ease(clamp((fogLevel-.10)/.75));
  else if(t.phase==='out')navOpacity=t.record.scene.mode==='dialogue'?0:1-ease(clamp((fogLevel-.02)/.85));
 }
 if(current?.approaching&&!t)navOpacity*=1-(current.approachCover||0);
 if(t?.record.error)navOpacity=1;
 // The invitation owns the screen until Enter is accepted and the scene opens.
 if(entryGate){
  const entryOpening=entryAccepted&&!['loading','gap'].includes(document.body.dataset.startup);
  entryNavReveal=!entryOpening?0:entryNavReducedMotion.matches?1:Math.min(1,entryNavReveal+dt/UI_MOTION_SECONDS);
  navOpacity*=uiMotionEase(entryNavReveal);
 }
 const opacity=String(navOpacity),hidden=navOpacity<.005,inert=navOpacity<.35;
 if(stage.style.getPropertyValue('--story-nav-opacity')!==opacity)stage.style.setProperty('--story-nav-opacity',opacity);
 if(document.body.dataset.navFog!==String(underFog))document.body.dataset.navFog=String(underFog);
 if(document.body.dataset.navHidden!==String(hidden))document.body.dataset.navHidden=String(hidden);
 if(nav.inert!==inert)nav.inert=inert;
 if(hidden){if(nav.getAttribute('aria-hidden')!=='true')nav.setAttribute('aria-hidden','true');}
 else if(nav.hasAttribute('aria-hidden'))nav.removeAttribute('aria-hidden');
}
function advance(){if(continuousAdvance())return;if(scenes[index]?.id==='intro')return;if(index<scenes.length-1)requestScene(index+1);else{finished=true;endingElapsed=0;endingRestartShown=false;current?.video.pause();footsteps.stop();prepareArchive();}}
let nextProofAt=0;
function frame(now){
 const visibleDt=document.hidden?0:Math.max(0,(now-last)/1000),dt=Math.min(.08,visibleDt);last=now;
 if(archiveTransition.visible()){requestAnimationFrame(frame);return;}
 if(!hasFrame&&current?.loaded){if(current.still&&current.image)draw(current.image);else if(current.video.readyState>=2)draw(current.video);}
 if(transition){
  const t=transition;if(!paused)t.elapsed+=dt;if(!replacementOpening&&t.record.scene.id==='intro'&&introAssetsFailed())t.record.error='인트로 이미지를 불러오지 못했습니다.';
  if(t.soft&&(t.phase==='blend-wait'||t.phase==='blend')){
   if(t.phase==='blend-wait'){
    mistAmount(0);t.elapsed=0;
    if(t.record.error)status(t.record.error,true);
    else if(t.record.loaded&&!t.record.video.seeking&&(t.record.still||t.record.video.readyState>=2)){
     $('cinemaDialogue')?.setAttribute('hidden','');current=t.record;index=t.to;local=Math.min(t.at,duration(index));target=local;current.video.pause();t.phase='blend';status('');
    }
   }
   if(t.phase==='blend'){
    const p=clamp(t.elapsed/t.blendDuration);draw(current.still?current.image:current.video);
    if(t.briefPaper){
     // Arrival already covered while the camera was moving: reveal once only.
     const split=1.2/2.2;
     if(!t.precovered&&p<split)ctx.drawImage(t.fromImage,0,0,width,height);
     const cover=t.precovered?1-ease(p):p<split?ease(p/split):1-ease((p-split)/(1-split));
     ctx.save();ctx.globalAlpha=cover;ctx.fillStyle=PAPER;ctx.fillRect(0,0,width,height);ctx.restore();
     mistAmount(0);
    }else{ctx.save();ctx.globalAlpha=1-ease(p);ctx.drawImage(t.fromImage,0,0,width,height);ctx.restore();mistAmount(Math.sin(Math.PI*p));}
    if(p>=1){lastSceneTransition={from:t.from||null,to:t.record.scene.id,covered:!!t.briefPaper,style:t.precovered?'approach-paper-reveal':t.briefPaper?'gentle-paper-fade':'edge-mist-dissolve',duration:t.blendDuration,hold:0};mistAmount(0);footageFog.stop();transition=null;storyStarted=true;document.body.dataset.startup='done';showText();preloadNext();}
   }
  }else if(t.phase==='loading'){
   mistAmount(0);ctx.fillStyle=PAPER;ctx.fillRect(0,0,width,height);status('Loading...');
   if(t.record.error){status(t.record.error,true);}
   else if(t.record.loaded&&!t.record.video.seeking&&(replacementOpening||t.record.scene.id!=='intro'||introAssetsReady())&&(!entryGate||entryFontsReady&&t.elapsed>=.65)){
    status('');loadingHiddenAt=now;t.elapsed=0;
    if(entryGate&&!entryAccepted){
     t.phase='entry';document.body.dataset.startup='entry';entryScreen.start();
    }else{if(directStoryStart&&entryGate)document.body.dataset.introEntry='cover';t.phase='gap';document.body.dataset.startup='gap';}
   }
  }else if(t.phase==='entry'){
   if(t.record.error){entryScreen.reset();t.phase='loading';t.elapsed=0;document.body.dataset.startup='loading';status(t.record.error,true);}
   else if(entryAccepted){t.phase='gap';t.elapsed=0;document.body.dataset.startup='gap';}
   else entryScreen.advance(paused?0:visibleDt);
  }else if(t.phase==='gap'){
   if(t.elapsed>=(replacementOpening?0:1)){current=t.record;index=t.to;local=Math.min(t.at,duration(index));target=local;current.video.pause();t.phase='out';t.elapsed=0;firstSceneShownAt=now;document.body.dataset.startup='reveal';document.body.dataset.ready='true';draw(current.still?current.image:current.video);mistAmount(t.fade?1:0);}
  }else if(t.phase==='in'){
   const p=t.fade?clamp(t.elapsed/t.fade):1;mistAmount(t.fade?ease(p):0);
   if(t.fromDialogue&&$('cinemaDialogue'))$('cinemaDialogue').style.opacity=String(1-ease(clamp(p/.62)));
   if(!hasFrame&&t.record.image){draw(t.record.image);status('Loading...');}
   if(t.record.error){mistAmount(.25);status(t.record.error+(embeddedStory?'':' Story를 눌러 다시 시작할 수도 있습니다.'),true);}
   if(p>=1&&t.elapsed>=t.fade+t.hold&&t.record.loaded&&!t.record.error&&!t.record.video.seeking&&(replacementOpening||t.record.scene.id!=='intro'||introAssetsReady())){
    footageFog.midpoint();$('cinemaDialogue')?.setAttribute('hidden','');current=t.record;index=t.to;local=Math.min(t.at,duration(index));target=local;current.video.pause();t.phase='out';t.elapsed=0;document.body.dataset.ready='true';
    draw(current.still?current.image:current.video);status(current.still?'이미지 미리보기':'');
   }
  }else{mistAmount(t.reveal?1-ease(clamp(t.elapsed/t.reveal)):0);draw(current.still?current.image:current.video);if(t.elapsed>=t.reveal){lastSceneTransition={from:t.from||null,to:t.record.scene.id,covered:t.fade>0,cover:t.fade,reveal:t.reveal,hold:t.hold};footageFog.stop();transition=null;storyStarted=true;document.body.dataset.startup='done';showText();preloadNext();}}
 }else if(current){
  const s=scenes[index],v=current.video,d=duration(index),dialogue=s.mode==='dialogue',allowed=!paused&&!compare&&!document.hidden&&!finished;
  const drawable=current.still?!!current.image:current.loaded&&!v.seeking&&v.readyState>=2;
  const ready=current.still?!!current.image:drawable&&(v.readyState>=3||v.ended);
  // Read the newly presented position before release/automatic handoff checks.
  // A release on the crossing frame must not strand an approach at its marker.
  if(drawable&&!current.still&&s.mode==='scroll')local=clamp(v.currentTime-current.clipIn,0,d);
  const autoFrom=Number(s.autoFrom);
  if(allowed&&ready&&scrollDriven()&&autoFrom>0&&local>=autoFrom-1/(Number(s.fps)||30)-.004){current.autoStarted=true;current.manualHeld=false;current.autoRate=Math.max(.15,Math.min(current.video.playbackRate,openingPlaybackRate(s,local,d)));previewAuto=false;drag=null;lastWheelMoveAt=-Infinity;target=local;footsteps.stop();}
  // Once the visible camera crosses the approach marker, own only the final
  // few seconds. Input before that marker remains bounded to one walking step.
  if(allowed&&ready&&!current.approaching&&shouldStartApproach(s,scenes[index+1],local,!v.paused||previewAuto,walkingDirection)){
   current.approaching=true;current.approachCover=0;current.settledTarget=null;
   target=d;previewAuto=false;walkingDirection=1;walkingInput.reset();drag=null;
  }
  if(allowed)holdManualFrame(false,now);
  const departing=departureActive();
  if(departing&&allowed&&ready){target=Number(s.autoTurnUntil);walkingDirection=1;previewAuto=false;drag=null;}
  const scroll=scrollDriven();
  const delay=sceneArrivalDelay(s);
  if(allowed&&ready&&current.startElapsed<delay)current.startElapsed=Math.min(delay,current.startElapsed+dt);
  const arrivalHold=current.startElapsed<delay;
  if(!embeddedStory&&dialogue&&!arrivalHold&&!current.dialogueEnded&&$('cinemaDialogue')?.hidden)showText();
  const interaction=finished?'finished':arrivalHold?'arrival':departing?'turning':current.approaching?'approaching':scroll?'walking':dialogue?'dialogue':'automatic';
  if(document.body.dataset.interaction!==interaction)document.body.dataset.interaction=interaction;
  if(!allowed){reverseElapsed=0;walkingRate=0;if(!current.still)v.pause();}
  const run=allowed&&!arrivalHold&&(!scroll||previewAuto||Math.abs(target-local)>.008),active=run&&ready&&!current.error;
  if(current.error)status(current.error+(embeddedStory?'':' Story를 눌러 다시 시작할 수도 있습니다.'),true);
  else if(!ready&&!scroll)status('Loading...');else status(compare?(current.image?'이미지 비교':'비교 이미지가 없습니다.'):current.still?'이미지 미리보기':'');
  // Paint the completed decoded frame before requesting the next scroll seek.
  if(compare&&current.image)draw(current.image);else if(drawable)draw(current.still?current.image:v);
  if(scroll&&allowed){
   const turnRate=departing?sourcePlaybackRate(s.autoTurnCurve,local):sourcePlaybackRate(s.walkingRateCurve,local);
   const arrival=current.approaching?approachState(s,local):null;
   const pacedScene=arrival?{...s,scrollCruiseRate:arrival.rate,scrollArrivalRate:arrival.rate}:turnRate===1?s:{...s,scrollCruiseRate:(s.scrollCruiseRate||.95)*turnRate};
   if(current.approaching)target=d;
   // Count visible elapsed time while a reverse frame is decoding. One seek stays in flight.
   reverseElapsed=walkingDirection<0&&target-local<-.008?Math.min(.25,reverseElapsed+dt):0;
   if(previewAuto)target=Math.min(scrollLimit(),target+dt*turnRate);
   if(current.still)local=target;
   else if(current.loaded&&!v.seeking&&v.readyState>=2){
    local=clamp(v.currentTime-current.clipIn,0,d);
    const gap=target-local;
    if(s.scrollPlayback==='continuous'&&!previewAuto){
     // Decode forward in order. Repeated input extends the target without
     // pausing or restarting the velocity envelope at every wheel packet.
     current.scrubTween=null;
     const tolerance=1/(Number(s.fps)||30)+.004;
     if(departing){
      // The camera turn is an authored film, not a manual scroll destination.
      // Keep its native cadence through the turn instead of braking to a crawl.
      if(gap<=tolerance){
       v.pause();walkingRate=0;reverseElapsed=0;current.settledTarget=target;footsteps.stop();
      }else{walkingRate=turnRate;setPlaybackRate(v,walkingRate);play(current);}
     }else if(current.settledTarget===target||Math.abs(gap)<=tolerance||gap<0&&walkingDirection>=0){
      v.pause();walkingRate=0;reverseElapsed=0;footsteps.stop();
      // Latch the stop. Decoders can report a nearby timestamp; never restart
      // playback or repeatedly seek the same final frame to chase milliseconds.
      current.settledTarget=target;
     }else if(gap>0){
      reverseElapsed=0;
      // A zero elapsed frame (for example just after tab visibility changes)
      // is not an arrival and must never jump to the queued destination.
      if(dt>0)walkingRate=continuousScrollRate(gap,dt,walkingRate,pacedScene,d-local);
      if(walkingRate){setPlaybackRate(v,walkingRate);play(current);}else v.pause();
     }else{
      // HTML video has no portable reverse playback. Keep one seek in flight
      // and use decoded progress, rather than a wall-clock tween that skips ahead.
      v.pause();
      if(reverseElapsed>0)walkingRate=continuousScrollRate(-gap,Math.min(.08,reverseElapsed),walkingRate,pacedScene,local);
      const step=reverseFrameStep(local,target,reverseElapsed,walkingRate,Number(s.fps)||30);
      reverseElapsed=step.remaining;
      if(step.time<local)seekScrollPosition(current,step.time);
     }
    }else if(s.scrollPlayback==='seek'&&!previewAuto){
     // Ease the selected step briefly, without starting native autoplay or
     // leaving a playback queue after the bounded transition has settled.
     walkingRate=0;reverseElapsed=0;seekScrollPosition(current,scrollPositionAt(current,target,now));
    }else if(gap>.008){
     walkingRate=walkingPlaybackRate(gap,dt,walkingRate,walkingReference(),(s.maxPlaybackRate||1)*turnRate);
     if(walkingRate){setPlaybackRate(v,walkingRate);play(current);}else v.pause();
    }else if(gap<-.008&&walkingDirection<0){
     v.pause();const reverseDt=reverseElapsed;reverseElapsed=0;
     walkingRate=walkingPlaybackRate(-gap,reverseDt,walkingRate,walkingReference(),(s.maxPlaybackRate||1)*turnRate);
     if(walkingRate>0)v.currentTime=current.clipIn+Math.max(target,local-reverseDt*walkingRate);
    }else{v.pause();walkingRate=0;footsteps.stop();}
   }
  }else if(!current.still){
   reverseElapsed=0;
   const desired=openingPlaybackRate(s,local,d);
   current.autoRate=(current.autoRate??v.playbackRate)+(desired-(current.autoRate??v.playbackRate))*(1-Math.exp(-dt/((s.id==='intro'||s.id==='aerial-entry') ? .45 : .16)));setPlaybackRate(v,current.autoRate);
   if(active&&(motion||!dialogue))play(current);else v.pause();
  }
  if(s.id==='intro'&&!replacementOpening){
   const arrival=records.find(r=>r?.scene.id==='aerial-entry');
   if(allowed&&local>=3.0&&arrival?.loaded&&!arrival.video.seeking){arrival.autoRate=Math.min(openingPlaybackRate(arrival.scene,arrival.video.currentTime-arrival.clipIn,duration(index+1)),v.playbackRate);arrival.video.playbackRate=arrival.autoRate;play(arrival);}
   else if(arrival)arrival.video.pause();
  }
  if(active&&!scroll){if(dialogue||current.still||v.loop)local=Math.min(d,local+dt);else if(!v.paused||v.ended)local=clamp(v.currentTime-current.clipIn,0,d);}
  if(departing&&allowed&&ready&&v.paused&&current.settledTarget===target){
   current.departureDone=true;previewAuto=false;walkingInput.reset();walkingRate=0;lastWheelMoveAt=-Infinity;
  }
  const visualTime=s.id==='intro'&&!replacementOpening?introVisualTime(local):local;
  openingCaption(s,visualTime);
  voiceEnabled(sound&&journeyStarted()&&allowed&&ready&&!arrivalHold&&!current.error);if(dialogue&&allowed&&ready&&!arrivalHold&&!current.error)voices.tick(dt);
  if(dialogue&&!current.dialogueEnded&&(voices.proof().ended||!sound&&local>=.5+voices.duration(s.speaker)))finishDialoguePanel();
  if(current.approaching){
   const arrival=approachState(s,local);current.approachCover=arrival.cover;
   ctx.save();ctx.globalAlpha=arrival.cover;ctx.fillStyle=PAPER;ctx.fillRect(0,0,width,height);ctx.restore();
   if(allowed&&arrival.done)advance();
  }
  // Let the final film deliver its last frame before covering it with paper.
  // A near-duration threshold can cut off playback while it is still running.
  const finalFilm=index===scenes.length-1&&!current.still&&!dialogue&&!v.loop&&!scroll;
  const reachedEnd=finalFilm?v.ended:local>=d-.025||current.settledTarget===target&&target>=d-.008;
  if(!transition&&allowed&&reachedEnd&&(!scroll||target>=d-.008)&&(!scroll||s.scrollPlayback!=='continuous'||v.paused&&(current.settledTarget===target||Math.abs(target-local)<=.012))&&(!dialogue||voices.canFinish()&&!(sound&&voices.proof().failed)))advance();
  if(!transition&&$('hint'))$('hint').hidden=finished||!scroll||!!current.approaching||departureActive()||previewAuto||paused;
 }
 if(finished){
  if(!paused&&!document.hidden)endingElapsed+=dt;
  const reveal=ease(clamp(endingElapsed/6.5));
  document.body.dataset.ending='true';mistAmount(reveal);endingPaper.style.opacity=String(reveal);
  archiveCta.hidden=endingElapsed<2;archiveCta.inert=endingElapsed<2;
  archiveCta.style.opacity=String(uiRevealOpacity(endingElapsed,2,entryNavReducedMotion.matches));
  if(embeddedStory&&reveal>=1&&!endingRestartShown){endingRestartShown=true;entryAccepted=false;entryScreen.reset();entryScreen.start();$('introEnter').querySelector('.entry-label').textContent='다시 시작';}
 }

 if(sceneJoin&&current?.loaded&&!current.video.seeking){
  if(!paused&&!document.hidden)sceneJoin.elapsed+=dt;
  const progress=clamp(sceneJoin.elapsed/sceneJoin.duration);
  ctx.save();ctx.globalAlpha=1-ease(progress);ctx.drawImage(sceneJoin.image,0,0,width,height);ctx.restore();
  if(progress>=1)sceneJoin=null;
 }
 if($('reviewPause'))$('reviewPause').textContent=paused?'계속 재생':'일시 정지';
 if($('reviewTransition'))$('reviewTransition').disabled=!!transition||scenes[index]?.mode!=='dialogue';
 if($('reviewTime'))$('reviewTime').disabled=!!transition||scenes[index]?.mode==='dialogue';
 if($('reviewTime')&&document.activeElement!==$('reviewTime'))$('reviewTime').value=String(Math.round(local/duration(index)*1000));
 if($('reviewReadout'))$('reviewReadout').textContent=`${Math.max(0,index)+1} / ${scenes.length} · ${local.toFixed(1)} / ${duration(index).toFixed(1)}초`;
 updateStoryNavigation(dt);
 adaptiveNavPaper.tick(now,dt,hasFrame,{visible:!embeddedStory&&navOpacity>.005,frameKey:canvasPaints});
 adaptiveIcons.tick(now,dt,hasFrame,{visible:!embeddedStory,frameKey:canvasPaints,paperCover:Number(endingPaper.style.opacity)||0});
 footageFog.tick(now,paused||document.hidden);
 const musicScene=scenes[index],musicVoice=voices.proof();
 const journey=journeyStarted();if(document.body.dataset.journeyStarted!==String(journey))document.body.dataset.journeyStarted=String(journey);
 if($('soundToggle')&&$('soundToggle').inert!==(uiPreview||!journey))$('soundToggle').inert=uiPreview||!journey;
 const projectInert=embeddedStory||journey||!entryAccepted||document.body.dataset.leavingIntro==='true';
 for(const id of ['projectMenu','projectAbout','projectVr']){const node=$(id);if(node&&node.inert!==projectInert)node.inert=projectInert;}
 const approachGain=dialogueApproachGain(musicScene,scenes[index+1],local,duration(index));
 endingSoundGain=endingAudioGain({finalScene:index===scenes.length-1,time:local,duration:duration(index),fps:musicScene?.fps,finished});
 const ambienceEndingGain=Math.min(1-endingFadeAmount,endingSoundGain);
 voices.setGain(endingSoundGain);
 // Public story videos are always silent, even if a future manifest enables native audio.
 for(const video of videos){
  const nativeEnabled=!replacementOpening&&video===current?.video&&musicScene?.nativeAudio===true&&sound&&!nativeAudioBlocked&&!paused&&!compare&&!transition&&!finished&&!document.hidden&&walkingDirection>=0;
  video.muted=!nativeEnabled;
  video.volume=nativeEnabled?approachGain*endingSoundGain:0;
 }
 sceneLife?.tick({src:url(musicScene?.ambience||''),time:current?.video.currentTime||0,active:!paused&&!compare&&!previewAuto&&!transition&&!finished&&!document.hidden&&!!current&&(replacementOpening?musicScene?.mode==='scroll'&&(!!current.scrubTween||!current.video.paused):musicScene?.mode==='scroll'&&!!drag&&now-lastDragMoveAt<200&&Math.abs(target-local)>.008),sound,gain:approachGain*endingSoundGain,dt});
 const musicDuck=transition?.record.scene.mode==='dialogue'||musicScene?.mode==='dialogue'&&!musicVoice.ended;
 storyMusic.tick({duck:musicDuck,paused:paused||compare,hidden:document.hidden,finished,endingTime:musicScene?.id==='seasons'?local:null,endingDuration:duration(index),sceneGain:approachGain*endingSoundGain,dt});
 quietAmbience?.tick({voiceActive:musicVoice.enabled&&!musicVoice.paused&&!musicVoice.ended||musicScene?.id==='intro'&&local>=3.4&&local<7.8,playbackRate:current?.video.playbackRate??1,scene:musicScene,time:local,duration:duration(index),moving:!!current&&!current.video.paused&&!current.video.seeking,active:storyStarted&&!!current&&!current.error,sound:sound&&journey,paused:paused||compare,hidden:document.hidden,transition:!!transition&&(transition.fromDialogue||transition.record.scene.mode==='dialogue'),finished,approach:approachGain,endingGain:ambienceEndingGain,dt});
 const musicProof=storyMusic.proof();if($('soundToggle')){const blocked=sound&&(nativeAudioBlocked||footsteps.proof().blocked||musicProof.blocked||quietAmbience?.blocked()||musicVoice.failed);$('soundToggle').dataset.blocked=String(blocked);$('soundToggle').title=blocked?'소리 켜기':sound?'소리 끄기':'소리 켜기';$('soundToggle').setAttribute('aria-label',blocked?'소리 켜기':sound?'소리 끄기':'소리 켜기');}
 const seasonPlaying=scenes[index]?.id==='seasons'&&!finished&&!compare&&!current?.error&&!current?.playBlocked&&current?.video.readyState>=3&&!current.video.paused&&!current.video.seeking;
 seasonAmbience?.tick({active:seasonPlaying,time:local,gain:ambienceEndingGain,sound,paused:paused||!seasonPlaying,hidden:document.hidden,transition:!!transition,dt});
 footsteps.tick();if($('run'))$('run').textContent=previewAuto?'이동 멈춤':'이동 재생';if($('chapter')&&index>=0)$('chapter').value=String(index);if($('progress'))$('progress').value=String((offset(index)+local)/Math.max(1,total));
 if(now>=nextProofAt){
 nextProofAt=now+200;
 const deliveryVideo=current?.video,deliveryQuality=deliveryVideo?.getVideoPlaybackQuality?.();
 document.body.dataset.proof=JSON.stringify({engine:'test-render-media-v3',embeddedStory,uiPreview,audioPolicy:replacementOpening?'separate-tracks-only':'legacy',quietAmbience:quietAmbience?.proof()??null,fit:'cover',dialogueFit:dialogueFit.proof(),dialoguePanel:{hidden:$('cinemaDialogue')?.hidden??true,ended:!!current?.dialogueEnded},fog:footageFog.proof(),navigation:{paper:adaptiveNavPaper.proof(),opacity:navOpacity,underFog:document.body.dataset.navFog==='true'},introRendering:scenes[index]?.id==='intro'?introEffect.proof():null,paper:PAPER,paperColor:paperColor.proof(),openingLayout,storyStarted,startup:document.body.dataset.startup,loadingHiddenAt,firstSceneShownAt,firstSceneGapMs:firstSceneShownAt&&loadingHiddenAt?firstSceneShownAt-loadingHiddenAt:null,endingElapsed,endingFadeAmount,endingSoundGain,seamMatch,sceneJoin:sceneJoin?{elapsed:sceneJoin.elapsed,duration:sceneJoin.duration}:null,paused,scene:scenes[index]?.id,index,local,duration:duration(index),approach:{active:!!current?.approaching,cover:current?.approachCover||0,config:current?.scene.dialogueApproach||null},mode:scenes[index]?.mode,effectiveMode:current?.autoStarted?'auto':scenes[index]?.mode,autoFrom:scenes[index]?.autoFrom??null,autoStarted:!!current?.autoStarted,transition:transition?.phase||null,transitionDetails:transition?{style:transition.precovered?'approach-paper-reveal':transition.briefPaper?'gentle-paper-fade':transition.soft?'edge-mist-dissolve':'cover',blendDuration:transition.blendDuration,from:transition.from,to:transition.record.scene.id,elapsed:transition.elapsed,cover:transition.fade,reveal:transition.reveal,hold:transition.hold}:null,lastSceneTransition,waiting:!!transition||!!current&&!current.loaded,renderedKind,renderedSource,imagePreview:renderedKind==='image',source:current?.scene.src||null,sourceTime:current?.video.currentTime||0,scrollTarget:target,sourcePaused:current?.video.paused??true,manualHeld:!!current?.manualHeld,completeWheelStep:!!current?.completeWheelStep,inputIdleMs:Number.isFinite(lastManualInputAt)?Math.max(0,now-lastManualInputAt):null,settledTarget:current?.settledTarget??null,startDelay:sceneArrivalDelay(scenes[index]),startElapsed:current?.startElapsed||0,interaction:document.body.dataset.interaction,scrollEnabled:canWalk(),automaticTurn:{active:departureActive(),until:current?.scene.autoTurnUntil??null,done:!!current?.departureDone},walkingReferenceDuration:scenes[index]?.walkingReferenceDuration??null,scrollSteps:scenes[index]?.scrollSteps??6,secondsPerScroll:scenes[index]?.secondsPerScroll??null,scrollPlayback:scenes[index]?.scrollPlayback??'play',scrollSmoothingMs:scenes[index]?.scrollSmoothingMs??0,scrollTween:current?.scrubTween??null,maxPlaybackRate:scenes[index]?.maxPlaybackRate??null,nativeAudio:{blocked:nativeAudioBlocked,selected:!replacementOpening&&scenes[index]?.nativeAudio===true,muted:deliveryVideo?.muted??true,volume:deliveryVideo?.volume??0},sourceFps:current?.scene.fps??null,delivery:{canvasPaints,width:deliveryVideo?.videoWidth||0,height:deliveryVideo?.videoHeight||0,playbackRate:deliveryVideo?.playbackRate??1,totalVideoFrames:deliveryQuality?.totalVideoFrames??null,droppedVideoFrames:deliveryQuality?.droppedVideoFrames??null},provenance:current?.scene.provenance??null,geometryVerified:false,voice:voices.proof(),seasonAmbience:(seasonAmbience?.proof()??disabledAmbience),musicVolume:music.volume,music:musicProof,sceneLife:(sceneLife?.proof()??disabledAmbience),footsteps:{active:foot.dataset.active,starts:Number(foot.dataset.starts||0),dragging:!!drag,input:'manual-movement',blocked:footsteps.proof().blocked,volume:foot.volume,wheelActive:now-lastWheelMoveAt<200,source:foot.currentSrc||foot.src},dialogueApproachGain:approachGain,finished});
 }
 requestAnimationFrame(frame);
}
status('Loading...');requestAnimationFrame(frame);
try{
 const response=await fetch(manifestURL,{cache:'no-store'});if(!response.ok)throw Error('manifest '+response.status);const manifest=await response.json();scenes=Array.isArray(manifest)?manifest:manifest.scenes;
 if(!Array.isArray(scenes)||!scenes.length)throw Error('장면 목록이 비어 있습니다.');
 for(const s of scenes){if(!['scroll','auto','dialogue'].includes(s.mode))throw Error('장면 모드 확인: '+s.id);if(s.mode==='dialogue'&&(!Number.isInteger(s.speaker)||s.speaker<0||s.speaker>4))throw Error('대사 인물 확인: '+s.id);}
 lengths=scenes.map(s=>s.mode==='dialogue'?voices.sceneDuration(s.speaker):Math.max(.1,Number(s.duration)||Number(s.sourceDuration)||6));total=lengths.reduce((a,b)=>a+b,0);
 if($('chapter'))$('chapter').replaceChildren(...scenes.map((s,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=s.label||s.id;return o;}));
 const freshIntro=entryGate||['intro','main'].includes(new URLSearchParams(location.search).get('start'));
 let saved=null;try{if(!embeddedStory&&!uiPreview){if(!freshIntro)saved=JSON.parse(sessionStorage.getItem('test-render-resume'));sessionStorage.removeItem('test-render-resume');if(freshIntro)sessionStorage.removeItem('ink-pilot-return');}}catch{}
 if(pendingIntroEntry&&scenes[0].playOnScroll){requestScene(0);transition.record.autoStarted=true;transition.record.autoRate=1;pendingIntroEntry=false;}
 else if(pendingIntroEntry&&scenes[0].enterOnScroll&&scenes.length>1){pendingIntroEntry=false;requestScene(1);} 
 else requestScene(saved&&Number.isInteger(saved.index)?clamp(saved.index,0,scenes.length-1):0,Number(saved?.local)||0);
}catch(error){status('장면을 불러오지 못했습니다. 새로고침해 주세요.');document.body.dataset.error=String(error);console.error(error);}


