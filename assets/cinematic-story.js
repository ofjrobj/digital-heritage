import {wheelPixels,gestureProgress,motionCosts,limitedProgress} from './journey-input.js?v=20261018-1';
import {setDialogueMist,clearDialogueMist} from './dialogue-mist.js?v=71-40';
import {cumulativeDistances,METRES_PER_SECOND,ARRIVAL_METRES,arrivalProgress} from './travel-distance.js?v=71-40';
const townCamera=await fetch('./assets/town-camera.json?v=74-route2').then(r=>r.json());
const travelCamera={tracks:townCamera.routes.map(r=>r.frames)};
const routeCosts=travelCamera.tracks.map(t=>motionCosts(t));
const travelLengths=travelCamera.tracks.map(t=>cumulativeDistances(t).at(-1));
const travelSeconds=i=>townCamera.routes[i].seconds;
let arrival=null;

import {setCharacterVoice,stopCharacterVoice,voiceCaption,characterVoicePlaying,characterVoiceFinished} from './character-voices.js?v=71-40';
import {dialogueCopy,dialoguePages} from './dialogue-copy.js?v=71-40';
import {storyStops} from './story-sequence.js?v=71-40';
const emit=(name,detail)=>document.dispatchEvent(new CustomEvent(name,{detail}));
const shots=[];let duration=0;
function shot(kind,seconds,extra={}){shots.push({kind,start:duration,end:duration+seconds,...extra});duration+=seconds;}
const cameraTest=document.body.dataset.cameraTest==='village';
const fullStory=document.body.dataset.fullStory==='true';
const dialogueSeconds=index=>Math.max(10,dialogueCopy[index].testimony.length/5);
if(cameraTest){
 shot('landscape-expand',18);shot('travel',travelSeconds(0),{stop:{route:0}});
 for(let index=0;index<5;index++){if(index)shot('transfer',travelSeconds(index),{from:index-1,to:index});shot('dialogue-in',2.4,{stop:{route:index}});shot('dialogue',dialogueSeconds(index),{stop:{route:index}});shot('dialogue-out',index<3?1.1:2.4,{stop:{route:index},from:index,to:index+1,continuous:index<3});}
 shot('transfer',travelSeconds(5),{from:4,to:5});shot('settle',2.6);shot('seasons',72);shot('fade',4.5);shot('explore',1);shot('archive',1);
}else{
 shot('entry',4);shot('rotate',8);shot('female-click',2);shot('female-scan',28);shot('male-transition',2);shot('male-scan',28);shot('pair',3);
 for(let i=0;i<storyStops.length;i++){const stop=storyStops[i];shot('lens',4,{stop});shot('motif',10,{stop});shot('travel',50,{stop});shot('dialogue',dialogueSeconds(stop.route),{stop});if(i<storyStops.length-1){shot('retreat',12,{stop});shot('pair',3);}}
 shot('guesthouse',195);shot('settle',2.6);shot('seasons',document.body.dataset.illustratedStory==='true'?12:18);shot('closing',6);shot('book',3);
}
const entryStart=shots.find(s=>s.kind==='landscape-expand')?.start??0;
const entryEnd=shots.find(s=>s.kind==='dialogue')?.start??1;
const currentShot=()=>shots.find(s=>elapsed<s.end)||shots.at(-1);
const control=document.createElement('div');control.id='cinemaControls';control.innerHTML=`<button id="cinemaPlay">스토리 재생</button><input id="cinemaSeek" aria-label="스토리 시간" type="range" min="0" max="${duration}" step=".1" value="0" hidden><button id="cinemaStop" hidden>스토리 닫기</button>`;document.body.append(control);
const explore=document.createElement('button');explore.id='exploreStoneLions';explore.type='button';explore.textContent='석사자상 탐구하기';explore.hidden=true;explore.onclick=()=>{running=false;explore.hidden=true;emit('archive-open');};document.body.append(explore);
const exploreStyle=document.createElement('style');exploreStyle.textContent=`#exploreStoneLions{position:fixed;left:50%;top:50%;bottom:auto;transform:translate(-50%,-50%);z-index:65;padding:14px 30px;border:1px solid #81978c;background:rgba(247,246,236,.86);color:#466157;font:22px 'User KoPubWorld Light',serif;cursor:pointer;animation:exploreBreath 2.8s ease-in-out infinite}#exploreStoneLions[hidden]{display:none}#exploreStoneLions:hover,#exploreStoneLions:focus-visible{animation:none;opacity:1;outline:2px solid #81978c;outline-offset:5px}@keyframes exploreBreath{0%,100%{opacity:.55}50%{opacity:1}}@media(prefers-reduced-motion:reduce){#exploreStoneLions{animation:none}}`;document.head.append(exploreStyle);
const testFade=document.createElement('div');testFade.id='storyEndFade';testFade.style.cssText='position:fixed;inset:0;background:#f4f2e9;opacity:0;pointer-events:none;z-index:50';if(cameraTest)document.body.append(testFade);
const panel=document.createElement('aside');panel.id='cinemaDialogue';panel.hidden=true;const soundHome=document.querySelector('#soundToggle');if(soundHome&&panel.contains(soundHome))document.body.append(soundHome);document.body.append(panel);
const style=document.createElement('style');style.textContent=`#cinemaControls{position:fixed;right:24px;bottom:24px;z-index:60;display:flex;gap:8px}#cinemaControls button{background:#18231e;color:#e8e5dc;border:1px solid #829184;border-radius:20px;padding:9px 16px;font:14px 'KoPub World Batang',serif;cursor:pointer}.choosing-experience #cinemaControls{display:none}body.cinema-running #episode,body.cinema-running #stageCue,body.cinema-running .scroll-cue,body.cinema-running #spotList,body.cinema-running #lionObservationFilm{visibility:hidden!important}#cinemaDialogue{position:fixed;left:28px;bottom:48px;width:350px;height:278px;box-sizing:border-box;padding:24px;background:#eeece4;color:#6a826e;z-index:20;font-family:'KoPub World Batang',serif}#cinemaDialogue h2{font-size:21px;line-height:1.5;margin:8px 0 22px;word-break:keep-all}#cinemaDialogue p{font-size:15px;line-height:1.8;word-break:keep-all;margin:0}#cinemaDialogue small{font-size:12px}body.cinema-running #introVideoSlot{inset:0!important}`;document.head.append(style);
const titles=['장사꾼 · 제금루','농민 · 동헌 · 혜의당','찬모 · 객사','주민 삼총사 · 민가','나무꾼 · 뒷산'];

let running=false,active=false,elapsed=0,dragTarget=0,last=0,previous=null;
let reviewFrozen=false;
const seek=control.querySelector('#cinemaSeek'),play=control.querySelector('#cinemaPlay'),stop=control.querySelector('#cinemaStop');
seek.oninput=()=>{reviewFrozen=cameraTest&&!fullStory;if(reviewFrozen){running=false;play.textContent='이어서 재생';}manualSeeking=false;arrival=null;elapsed=dragTarget=Number(seek.value);previous=null;renderStory();};
play.onclick=()=>{const shouldRun=cameraTest&&!fullStory?(reviewFrozen||!active||elapsed>=duration):!running;if(!active||elapsed>=duration){active=true;elapsed=dragTarget=0;previous=null;document.body.classList.add('cinema-running');stop.hidden=false;seek.hidden=false;emit('story-restart');}running=shouldRun;reviewFrozen=cameraTest&&!fullStory&&!running;play.textContent=running?'일시 정지':'이어서 재생';renderStory();};
stop.onclick=()=>{manualSeeking=false;arrival=null;active=running=false;stopCharacterVoice();previous=null;panel.hidden=true;const soundHome=document.querySelector('#soundToggle');if(soundHome&&panel.contains(soundHome))document.body.append(soundHome);testFade.style.opacity='0';stop.hidden=true;seek.hidden=true;play.textContent='스토리 재생';document.body.classList.remove('cinema-running','surface-morph');emit('cinema-release');emit('story-home');emit('stage-navigate','intro');};

if(cameraTest&&!fullStory){
 const jump=document.createElement('select');jump.setAttribute('aria-label','카메라 테스트 장면');jump.style.cssText='max-width:190px;background:#18231e;color:#e8e5dc;border:1px solid #829184;padding:8px';
 const labels={'pair-reveal':'유물 · 두 석사자','head-push':'머리로 접근','crown-zoom':'정수리 갈기 클로즈업','relief-trace':'갈기 굴곡의 선','relief-landscape':'유물 → 마을','landscape-expand':'공주목 읍치 진입',pair:'유물 · 반측면 고정','back-zoom':'등 무늬로 접근',entry:'유물 등장',rotate:'유물 회전',motif:'유물 → 마을',travel:'읍치 → 인물 1',guesthouse:'객사터 석사자로 이동',settle:'석사자 앞 정지',seasons:'시대·계절 변화',fade:'가치해석으로',explore:'석사자상 탐구하기',archive:'가치해석 · 석사자의 결'};
 shots.forEach((q,i)=>{const option=document.createElement('option');option.value=i;option.textContent=q.kind==='dialogue-in'?`인물 ${q.stop.route+1} · 안개 진입`:q.kind==='dialogue-out'?`인물 ${q.stop.route+1} · ${q.continuous?'연속 출발':'안개 퇴장'}`:q.kind==='dialogue'?`인물 ${q.stop.route+1} · ${titles[q.stop.route]}`:q.kind==='transfer'?(q.from===4?'객사 앞으로 귀환':`인물 ${q.from+1} → 인물 ${q.to+1}`):labels[q.kind];jump.append(option);});control.prepend(jump);
 jump.onchange=()=>{reviewFrozen=true;const choice=Number(jump.value);if(!active){play.click();running=false;play.textContent='이어서 재생';}reviewFrozen=!['landscape-expand','dialogue-in','dialogue-out','settle','seasons','fade'].includes(shots[choice].kind);running=!reviewFrozen;play.textContent=running?'일시 정지':'이어서 재생';manualSeeking=false;arrival=null;elapsed=dragTarget=shots[choice].start;seek.value=elapsed;previous=null;renderStory();};
}
// The reference's quiet vertical index remains usable, rather than decorative.
const chapterIndex=document.createElement('nav');chapterIndex.id='storySectionIndex';chapterIndex.setAttribute('aria-label','이야기 구간');
const sections=[['형태','pair-reveal'],['무늬','crown-zoom'],['마을','travel'],['시간','settle'],['가치해석','archive']];
sections.forEach(([label,kind],i)=>{const b=document.createElement('button');b.type='button';b.textContent=String(i+1).padStart(2,'0')+'  '+label;b.onclick=()=>{const q=shots.find(s=>s.kind===kind);if(!q)return;if(!active)play.click();elapsed=dragTarget=q.start;seek.value=elapsed;previous=null;renderStory();};chapterIndex.append(b);});// Keep chapter bookkeeping off-screen; the story is advanced by dragging.
const dragHint=document.createElement('div');dragHint.id='journeyDragHint';dragHint.setAttribute('role','img');dragHint.setAttribute('aria-label','아래로 스크롤하거나 위로 드래그하여 앞으로 이동합니다. 인물 사이 이동은 약 5~8회입니다.');dragHint.innerHTML='<span class="scroll-stem" aria-hidden="true"></span><span>Scroll</span>';document.body.append(dragHint);
let drag=null,autoRewinding=false,manualSeeking=false;
const blocked=()=>document.body.classList.contains('archive-active')||document.body.classList.contains('orientation-intro');
const isControl=target=>target.closest('button,a,input,select,textarea,nav,dialog,[role="dialog"]:not(#experienceChoice)');
function beginJourney(){reviewFrozen=cameraTest&&!fullStory&&active&&currentShot().kind!=='landscape-expand';if(document.body.classList.contains('choosing-experience'))document.querySelector('[data-experience="desktop"]').click();if(!active){active=true;elapsed=dragTarget=0;previous=null;document.body.classList.add('cinema-running');seek.hidden=false;stop.hidden=false;emit('story-restart');}running=false;play.textContent='이어서 재생';}
function advance(amount){
 if(!amount)return;
 if(!active){if(amount<0)return;beginJourney();manualSeeking=false;reviewFrozen=false;renderStory();return;}
 // Once the final approach has taken over, input cannot scrub the seasons.
 if(active&&(arrival||['landscape-expand','dialogue-in','dialogue','dialogue-out','settle','seasons','fade'].includes(currentShot().kind)))return;
 if(active&&currentShot().kind==='explore'&&amount>0)return;
 arrival=null;autoRewinding=amount<0;amount*=amount<0?.5:1;
 beginJourney();manualSeeking=true;stopCharacterVoice();
 const base=Math.sign(amount)!==Math.sign(dragTarget-elapsed)?elapsed:dragTarget;
 const routeShot=currentShot();
 if(cameraTest&&['travel','transfer'].includes(routeShot.kind)){
  const requested=Math.max(routeShot.start,Math.min(routeShot.end,base+amount*(routeShot.end-routeShot.start)));
  dragTarget=requested;reviewFrozen=false;running=false;renderStory();
  return;
 }
 const end=shots.find(s=>s.kind==='explore')?.start??duration;
 dragTarget=Math.max(0,Math.min(end,Math.max(elapsed-1.5,Math.min(elapsed+3,base+amount))));
}
window.addEventListener('pointerdown',e=>{if(blocked()||isControl(e.target)||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,axis:null,budget:0,direction:0};document.documentElement.setPointerCapture(e.pointerId);e.preventDefault();e.stopImmediatePropagation();},{capture:true});
window.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.axis){if(Math.hypot(dx,dy)<6)return;if(Math.abs(dy)<6)return;drag.axis='y';}const raw=-(drag.axis==='x'?dx:dy),direction=Math.sign(raw);if(direction!==drag.direction){drag.budget=0;drag.direction=direction;}const before=gestureProgress(drag.budget,'drag');drag.budget+=Math.abs(raw);advance(direction*(gestureProgress(drag.budget,'drag')-before));drag.x=e.clientX;drag.y=e.clientY;document.body.classList.add('journey-dragging');e.preventDefault();e.stopImmediatePropagation();},{capture:true});
function releaseDrag(e){if(drag?.id!==e.pointerId)return;drag=null;document.body.classList.remove('journey-dragging');if(document.documentElement.hasPointerCapture(e.pointerId))document.documentElement.releasePointerCapture(e.pointerId);e.stopImmediatePropagation();}
window.addEventListener('pointerup',releaseDrag,{capture:true});window.addEventListener('pointercancel',releaseDrag,{capture:true});
let wheelLast=-Infinity,wheelBudget=0,wheelDirection=0;
window.addEventListener('wheel',e=>{if(blocked()||isControl(e.target))return;e.preventDefault();e.stopImmediatePropagation();
 if(e.ctrlKey)return;
 const now=performance.now(),raw=wheelPixels(e,innerHeight),dir=Math.sign(raw);
 if(now-wheelLast>180||dir!==wheelDirection){wheelBudget=0;wheelDirection=dir;}
 wheelLast=now;const before=gestureProgress(wheelBudget);wheelBudget+=Math.abs(raw);
 advance(dir*(gestureProgress(wheelBudget)-before));
},{capture:true,passive:false});
window.addEventListener('keydown',e=>{if(blocked()||isControl(e.target))return;if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key)){e.preventDefault();advance(['ArrowDown','ArrowRight'].includes(e.key)?1/6:-1/6);}});
function renderStory(){
 if(blocked()){explore.hidden=true;testFade.style.opacity='0';return;}
 const q=shots.find(s=>elapsed<s.end)||shots.at(-1),u=Math.min(1,(elapsed-q.start)/(q.end-q.start)),t=elapsed-q.start;const changed=previous!==q;previous=q;emit('higgsfield-frame',{kind:q.kind,index:q.stop?.route??-1,time:t,progress:u,elapsed});
 explore.hidden=q.kind!=='explore';
 if(cameraTest&&!fullStory)play.textContent=(!reviewFrozen&&(running||['landscape-expand','dialogue-in','dialogue','dialogue-out','settle','seasons','fade'].includes(q.kind)))?'일시 정지':'이어서 재생';
 if(q.kind==='dialogue-out'&&!q.continuous)setDialogueMist(q.kind,u);else clearDialogueMist();
 dragHint.style.visibility=(arrival||running||['explore','landscape-expand','dialogue-in','dialogue','dialogue-out','settle','seasons','fade','archive'].includes(q.kind))?'hidden':'visible';
 dragHint.setAttribute('aria-hidden',String(dragHint.style.visibility==='hidden'));
 if(q.kind==='dialogue'){running=false;if(!manualSeeking)dragTarget=elapsed;}else stopCharacterVoice();
 chapterIndex.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',String(i===(elapsed<13?0:elapsed<36?1:elapsed<shots.find(s=>s.kind==='settle')?.start?2:q.kind==='archive'?4:3))));testFade.style.opacity=q.kind==='explore'?'1':'0';emit('relief-landscape-frame',{progress:1});if(cameraTest&&!fullStory)control.querySelector('select').value=String(shots.indexOf(q));document.body.dataset.storyShot=q.kind;panel.hidden=true;const soundHome=document.querySelector('#soundToggle');if(soundHome&&panel.contains(soundHome))document.body.append(soundHome);emit('cinema-closing',{visible:false,book:false});
 if(q.kind==='archive'){running=false;emit('archive-open');return;}
 if(['pair-reveal','head-push','crown-zoom','relief-trace','back-zoom','entry','rotate','female-click','female-scan','male-transition','male-scan','pair','lens'].includes(q.kind)){
  if(changed){emit('stage-navigate','intro');emit('ink-landscape-frame',{progress:1,index:0});}
  let kind=['pair-reveal','head-push','crown-zoom','relief-trace'].includes(q.kind)?q.kind:q.kind==='back-zoom'?'back-zoom':q.kind==='entry'?'entry':q.kind==='rotate'?'rotate':q.kind==='lens'?'lens':q.kind.endsWith('scan')?'scan':'pair';
  emit('cinema-lion-frame',{kind,time:kind==='scan'?(q.kind==='female-scan'?u*131.9:132+u*131.9):t,progress:u,...q.stop});
 }else if(['relief-landscape','landscape-expand'].includes(q.kind)){
 if(changed){if(q.kind==='relief-landscape'){emit('cinema-lion-frame',{kind:'relief-trace',time:7,progress:1});emit('capture-relief-lines');}emit('stage-navigate','terrain');emit('ink-landscape-frame',{index:0,progress:1});}
 emit('blender-entry-frame',{progress:u});if(q.kind==='relief-landscape')emit('relief-landscape-frame',{progress:u});
 }else if(q.kind==='dialogue-in'||q.kind==='dialogue-out'){
 if(changed){emit('stage-navigate','terrain');emit('ink-landscape-frame',{index:0,progress:1});}
 const index=q.stop.route;
 if(q.kind==='dialogue-in')emit('blender-route-frame',{index,time:150,opacity:1,dialogue:u*u*(3-2*u)});
 else if(q.continuous)emit('blender-route-frame',{index,time:150,opacity:1,dialogue:1-u*u*(3-2*u)});
 else if(u<.48)emit('blender-route-frame',{index,time:150,opacity:1,dialogue:true});
 else emit('blender-transfer-frame',{from:index,to:index+1,progress:0});
 }else if(q.kind==='transfer'){
 if(changed){emit('stage-navigate','terrain');emit('ink-landscape-frame',{index:0,progress:1});}
 emit('blender-transfer-frame',{from:q.from,to:q.to,progress:u});
 }else if(['motif','travel','dialogue','retreat'].includes(q.kind)){
  if(changed){emit('stage-navigate','terrain');if(q.stop)emit('capture-story-motif',q.stop);}
  const index=q.stop.route;
  if(q.kind==='motif'){emit('ink-landscape-frame',{index,progress:u*.235});emit('blender-route-frame',{index,time:0,opacity:u<.8?0:(u-.8)/.2});}
  else{emit('ink-landscape-frame',{index,progress:1});const time=q.kind==='travel'?u*150:q.kind==='dialogue'?150+u*24:174+u*30;emit('blender-route-frame',{index,time,opacity:1,dialogue:q.kind==='dialogue'});if(q.kind==='dialogue'){panel.hidden=false;const copy=dialogueCopy[index];const names=['장사꾼','농민','찬모','주민 삼총사','나무꾼'];if(!cameraTest||document.body.dataset.cleanPlay==='true')setCharacterVoice(index);const content='<h2>'+names[index]+'</h2><p>'+copy.testimony+'</p><i class="hanji-corner tl"></i><i class="hanji-corner tr"></i><i class="hanji-corner br"></i><i class="hanji-corner bl"></i>';if(panel.dataset.speaker!==String(index)){panel.innerHTML=content+'<div class="dialogue-footer"></div>';panel.dataset.speaker=String(index);}const sound=document.querySelector('#soundToggle');if(sound)document.body.append(sound);}}
 }else{
  if(changed){emit('stage-navigate','memory');emit('ink-landscape-frame',{index:0,progress:1});}
  const source=q.kind==='guesthouse'?u*70:q.kind==='settle'?70:q.kind==='seasons'?70+u*74:144;
  emit('blender-ending-frame',source/144);
  emit('cinema-closing',{visible:q.kind==='closing'||q.kind==='book',book:q.kind==='book'});
 if(q.kind==='settle')testFade.style.opacity='0';
 if(q.kind==='seasons'&&u>.3)emit('archive-preload');
 if(q.kind==='fade'){testFade.style.background='#f4f2e9';testFade.style.opacity=String(u);if(u>.3)emit('archive-preload');}
 }
 if(elapsed>=duration){running=false;play.textContent='다시 재생';}
}
function tick(now){requestAnimationFrame(tick);const dt=last?Math.min(.1,(now-last)/1000)*(document.body.dataset.sourceCapture==='true'?2:1):0;last=now;if(!active||blocked()||document.hidden||(elapsed>=shots.find(s=>s.kind==='dialogue').end&&document.body.dataset.spatialReady!=='true'))return;
if(document.body.dataset.sourceCapture==='true')running=true;
const q=currentShot();
if(manualSeeking&&cameraTest&&['travel','transfer'].includes(q.kind)){
 if(document.body.dataset.spatialReady!=='true')return;
 const i=q.kind==='travel'?q.stop.route:q.to,span=q.end-q.start,p=(elapsed-q.start)/span,dest=(dragTarget-q.start)/span;
 const remaining=Math.abs(dest-p)*routeCosts[i].at(-1),ease=Math.min(1,remaining/.3);
 const next=limitedProgress(routeCosts[i],p,dest,dt*ease);
 elapsed=q.start+next*span;
 if(Math.abs(dragTarget-elapsed)<.008){elapsed=dragTarget;manualSeeking=false;reviewFrozen=false;}
 seek.value=elapsed;renderStory();return;
}
if(manualSeeking){
 emit('village-preload');emit('ending-preload');
 if(document.body.dataset.spatialReady!=='true')return;
 const memoryStart=shots.find(s=>s.kind==='settle')?.start??duration;
 const limit=document.body.dataset.endingReady==='true'?duration:memoryStart-.05;
 const entryBoundary=shots.find(s=>['dialogue-in','dialogue-out'].includes(s.kind)&&s.start>elapsed+.0001);
 const destination=Math.min(dragTarget,Math.max(elapsed,limit),!autoRewinding&&entryBoundary?entryBoundary.start:Infinity);
 const delta=destination-elapsed;
 const routeInput=cameraTest&&['travel','transfer'].includes(q.kind);
 const rate=routeInput?.55:1.2;
 const step=Math.sign(delta)*Math.min(Math.abs(delta),dt*rate,Math.abs(delta)*(1-Math.exp(-dt*7)));
 elapsed+=step;seek.value=elapsed;renderStory();
 if(!autoRewinding&&entryBoundary&&elapsed>=entryBoundary.start-.001){
  elapsed=dragTarget=entryBoundary.start;manualSeeking=false;reviewFrozen=false;running=false;renderStory();
 }else if(q.kind==='transfer'&&q.to===5&&q.end-elapsed<=Math.min(2.5,(q.end-q.start)*.08)&&dragTarget>=q.end-.001&&!autoRewinding){
  manualSeeking=false;reviewFrozen=false;arrival={shot:q,start:elapsed,time:0,duration:3*(q.end-elapsed)/rate};dragTarget=elapsed;running=false;
 }else if(Math.abs(dragTarget-elapsed)<.015){elapsed=dragTarget;manualSeeking=false;if(['dialogue-in','dialogue-out'].includes(currentShot().kind)){reviewFrozen=false;running=false;}renderStory();}
 return;
}
if(reviewFrozen&&cameraTest&&!fullStory)return;
if(q.kind==='explore'){if(document.body.dataset.sourceCapture==='true')document.dispatchEvent(new Event('capture-finished'));running=false;dragTarget=elapsed;return;}
if(arrival&&arrival.shot!==q)arrival=null;
if(arrival){
 if(arrival.shot.to===5)emit('ending-preload');
 arrival.time+=dt;
 const u=arrival.time/Math.max(.001,arrival.duration);
 elapsed=arrival.start+(q.end-arrival.start)*arrivalProgress(u);
 if(u>=1){elapsed=q.end;arrival=null;}
 dragTarget=elapsed;seek.value=elapsed;renderStory();return;
}
if(q.kind==='landscape-expand'){if(document.body.dataset.spatialReady!=='true')return;elapsed=Math.min(q.end,elapsed+dt);dragTarget=elapsed;running=false;seek.value=elapsed;renderStory();return;}
if(['dialogue-in','dialogue-out','settle','seasons','fade'].includes(q.kind)){elapsed=Math.min(q.end,elapsed+dt);dragTarget=elapsed;seek.value=elapsed;renderStory();return;}
if(q.kind==='dialogue'){
 emit('village-preload');
 const next=elapsed+dt;
 if(next>=q.end||characterVoiceFinished()){
  if(characterVoicePlaying()){elapsed=q.end-.001;}else{elapsed=q.end;running=false;}
 }else elapsed=next;
 dragTarget=elapsed;seek.value=elapsed;renderStory();return;
}
let requested=running?elapsed+dt:dragTarget;
// Stop at the next conversation even if a large input spans its boundary.
const nextDialogue=shots.find(s=>['dialogue-in','dialogue'].includes(s.kind)&&s.start>elapsed);
if(nextDialogue&&requested>=nextDialogue.start)requested=nextDialogue.start;if(Math.max(elapsed,requested)>=entryEnd-1)emit('village-preload');const memoryStart=shots.find(s=>s.kind==='settle')?.start??Infinity;if(Math.max(elapsed,requested)>=memoryStart-100)emit('ending-preload');
let limit=duration;if(document.body.dataset.endingReady!=='true')limit=memoryStart-.05;
const destination=Math.min(Math.max(elapsed,limit),requested);if(Math.abs(destination-elapsed)<.02){if(elapsed!==destination){elapsed=destination;seek.value=elapsed;renderStory();}return;}
const longJourney=q.kind==='transfer'&&q.to>=4;
const maxRate=running?1:(longJourney?2.2:1.35);
const step=running?destination-elapsed:(destination-elapsed)*(1-Math.exp(-dt*5));
elapsed+=Math.sign(step)*Math.min(Math.abs(step),dt*maxRate);
elapsed=Math.max(0,Math.min(duration,elapsed));
if(cameraTest&&['travel','transfer'].includes(q.kind)&&!autoRewinding){
 const remaining=q.end-elapsed;
 if(remaining<=(q.kind==='transfer'&&q.to===5?2.5:ARRIVAL_METRES/METRES_PER_SECOND)){
  arrival={shot:q,start:elapsed,time:0,duration:3*remaining/maxRate};
  dragTarget=elapsed;running=false;
 }
}
if(running)dragTarget=elapsed;seek.value=elapsed;renderStory();}requestAnimationFrame(tick);

let resumeStoryAt=0;document.addEventListener('archive-open',()=>{resumeStoryAt=elapsed<shots.find(s=>s.kind==='archive').start?elapsed:0;running=false;explore.hidden=true;panel.hidden=true;testFade.style.opacity='0';const soundHome=document.querySelector('#soundToggle');if(soundHome&&panel.contains(soundHome))document.body.append(soundHome);});
document.addEventListener('archive-story',()=>{arrival=null;elapsed=dragTarget=0;seek.value=0;autoRewinding=false;stop.onclick();emit('story-restart');document.querySelector('#experienceSwitch').click();});
document.addEventListener('exhibition-start',()=>{beginJourney();manualSeeking=false;reviewFrozen=false;renderStory();});
for(const readyEvent of ['lion-ready','spatial-ready'])document.addEventListener(readyEvent,()=>{if(active&&!blocked()){previous=null;renderStory();}});

document.addEventListener('character-voice-time',()=>{if(active&&!blocked()&&previous?.kind==='dialogue')renderStory();});

document.addEventListener('capture-start',()=>{arrival=null;manualSeeking=false;active=true;running=true;elapsed=dragTarget=0;previous=null;renderStory();});
