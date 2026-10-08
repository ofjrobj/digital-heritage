import {setCharacterVoice,stopCharacterVoice,voiceCaption} from './character-voices.js?v=72';
import {dialogueCopy,dialoguePages} from './dialogue-copy.js?v=dialogue-66';
import {storyStops} from './story-sequence.js?v=story-flow-70';
const emit=(name,detail)=>document.dispatchEvent(new CustomEvent(name,{detail}));
const shots=[];let duration=0;
function shot(kind,seconds,extra={}){shots.push({kind,start:duration,end:duration+seconds,...extra});duration+=seconds;}
const cameraTest=document.body.dataset.cameraTest==='village';
const fullStory=document.body.dataset.fullStory==='true';
const dialogueSeconds=index=>dialoguePages(index).reduce((total,page)=>total+page.seconds,0);
if(cameraTest){
 if(cameraTest){shot('pair-reveal',5);shot('head-push',8);shot('crown-zoom',8);shot('relief-trace',7);shot('relief-landscape',8);shot('landscape-expand',18);}
 else{shot('pair',4);shot('back-zoom',14);shot('motif',7,{stop:{subject:'male',region:'back',route:0}});}
 shot('travel',50,{stop:{route:0}});
 for(let index=0;index<5;index++){if(index)shot('transfer',90,{from:index-1,to:index});shot('dialogue',dialogueSeconds(index),{stop:{route:index}});}
 shot('transfer',100,{from:4,to:5});shot('settle',3);shot('seasons',60);shot('fade',3);shot('archive',1);
}else{
 shot('entry',4);shot('rotate',8);shot('female-click',2);shot('female-scan',28);shot('male-transition',2);shot('male-scan',28);shot('pair',3);
 for(let i=0;i<storyStops.length;i++){const stop=storyStops[i];shot('lens',4,{stop});shot('motif',10,{stop});shot('travel',50,{stop});shot('dialogue',dialogueSeconds(stop.route),{stop});if(i<storyStops.length-1){shot('retreat',12,{stop});shot('pair',3);}}
 shot('guesthouse',195);shot('settle',3);shot('seasons',60);shot('closing',6);shot('book',3);
}
const control=document.createElement('div');control.id='cinemaControls';control.innerHTML=`<button id="cinemaPlay">스토리 재생</button><input id="cinemaSeek" aria-label="스토리 시간" type="range" min="0" max="${duration}" step=".1" value="0" hidden><button id="cinemaStop" hidden>스토리 닫기</button>`;document.body.append(control);
const testFade=document.createElement('div');testFade.style.cssText='position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:50';if(cameraTest)document.body.append(testFade);
const panel=document.createElement('aside');panel.id='cinemaDialogue';panel.hidden=true;document.body.append(panel);
const style=document.createElement('style');style.textContent=`#cinemaControls{position:fixed;right:24px;bottom:24px;z-index:60;display:flex;gap:8px}#cinemaControls button{background:#18231e;color:#e8e5dc;border:1px solid #829184;border-radius:20px;padding:9px 16px;font:14px 'KoPub World Batang',serif;cursor:pointer}.choosing-experience #cinemaControls{display:none}body.cinema-running #episode,body.cinema-running #stageCue,body.cinema-running .scroll-cue,body.cinema-running #spotList,body.cinema-running #lionObservationFilm{visibility:hidden!important}#cinemaDialogue{position:fixed;left:28px;bottom:48px;width:350px;height:278px;box-sizing:border-box;padding:24px;background:#eeece4;color:#6a826e;z-index:20;font-family:'KoPub World Batang',serif}#cinemaDialogue h2{font-size:21px;line-height:1.5;margin:8px 0 22px;word-break:keep-all}#cinemaDialogue p{font-size:15px;line-height:1.8;word-break:keep-all;margin:0}#cinemaDialogue small{font-size:12px}body.cinema-running #introVideoSlot{inset:0!important}`;document.head.append(style);
const titles=['장사꾼 · 제금루','농민 · 동헌 · 혜의당','찬모 · 객사','주민 삼총사 · 민가','나무꾼 · 뒷산'];

let running=false,active=false,elapsed=0,dragTarget=0,last=0,previous=null;
const seek=control.querySelector('#cinemaSeek'),play=control.querySelector('#cinemaPlay'),stop=control.querySelector('#cinemaStop');
seek.oninput=()=>{elapsed=dragTarget=Number(seek.value);previous=null;renderStory();};
play.onclick=()=>{if(!active||elapsed>=duration){active=true;elapsed=dragTarget=0;previous=null;document.body.classList.add('cinema-running');stop.hidden=false;seek.hidden=false;emit('story-restart');}running=!running;play.textContent=running?'일시 정지':'이어서 재생';renderStory();};
stop.onclick=()=>{active=running=false;stopCharacterVoice();previous=null;panel.hidden=true;testFade.style.opacity='0';stop.hidden=true;seek.hidden=true;play.textContent='스토리 재생';document.body.classList.remove('cinema-running','surface-morph');emit('cinema-release');emit('story-home');emit('stage-navigate','intro');};

if(cameraTest&&!fullStory){
 const jump=document.createElement('select');jump.setAttribute('aria-label','카메라 테스트 장면');jump.style.cssText='max-width:190px;background:#18231e;color:#e8e5dc;border:1px solid #829184;padding:8px';
 const labels={'pair-reveal':'유물 · 두 석사자','head-push':'머리로 접근','crown-zoom':'정수리 갈기 클로즈업','relief-trace':'갈기 굴곡의 선','relief-landscape':'유물 → 마을','landscape-expand':'마을 진입',pair:'유물 · 반측면 고정','back-zoom':'등 무늬로 접근',entry:'유물 등장',rotate:'유물 회전',motif:'유물 → 마을',travel:'마을 → 인물 1',guesthouse:'객사터 석사자로 이동',settle:'석사자 앞 정지',seasons:'시대·계절 변화',fade:'가치해석으로',archive:'가치해석 · 석사자의 결'};
 shots.forEach((q,i)=>{const option=document.createElement('option');option.value=i;option.textContent=q.kind==='dialogue'?`인물 ${q.stop.route+1} · ${titles[q.stop.route]}`:q.kind==='transfer'?(q.from===4?'마을 귀환':`인물 ${q.from+1} → 인물 ${q.to+1}`):labels[q.kind];jump.append(option);});control.prepend(jump);
 jump.onchange=()=>{const choice=Number(jump.value);if(!active){play.click();running=false;play.textContent='이어서 재생';}elapsed=dragTarget=shots[choice].start;seek.value=elapsed;previous=null;renderStory();};
}
// The reference's quiet vertical index remains usable, rather than decorative.
const chapterIndex=document.createElement('nav');chapterIndex.id='storySectionIndex';chapterIndex.setAttribute('aria-label','이야기 구간');
const sections=[['형태','pair-reveal'],['무늬','crown-zoom'],['마을','travel'],['시간','settle'],['가치해석','archive']];
sections.forEach(([label,kind],i)=>{const b=document.createElement('button');b.type='button';b.textContent=String(i+1).padStart(2,'0')+'  '+label;b.onclick=()=>{const q=shots.find(s=>s.kind===kind);if(!q)return;if(!active)play.click();elapsed=dragTarget=q.start;seek.value=elapsed;previous=null;renderStory();};chapterIndex.append(b);});if(cameraTest)document.body.append(chapterIndex);
const dragHint=document.createElement('div');dragHint.id='journeyDragHint';dragHint.innerHTML='<span aria-hidden="true">↔</span> 드래그하여 공간을 따라가세요';document.body.append(dragHint);
let drag=null;
const blocked=()=>document.body.classList.contains('archive-active');
const isControl=target=>target.closest('button,a,input,select,textarea,nav,dialog,[role="dialog"]:not(#experienceChoice)');
function beginJourney(){if(document.body.classList.contains('choosing-experience'))document.querySelector('[data-experience="desktop"]').click();if(!active){active=true;elapsed=dragTarget=1.2;previous=null;document.body.classList.add('cinema-running');seek.hidden=false;stop.hidden=false;emit('story-restart');}running=false;play.textContent='이어서 재생';}
function advance(amount){beginJourney();dragTarget=Math.max(0,Math.min(duration,dragTarget+amount));}
window.addEventListener('pointerdown',e=>{if(blocked()||isControl(e.target)||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,axis:null};document.documentElement.setPointerCapture(e.pointerId);e.preventDefault();e.stopImmediatePropagation();},{capture:true});
window.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.axis){if(Math.hypot(dx,dy)<6)return;drag.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';}advance(-(drag.axis==='x'?dx:dy)*.065);drag.x=e.clientX;drag.y=e.clientY;document.body.classList.add('journey-dragging');e.preventDefault();e.stopImmediatePropagation();},{capture:true});
function releaseDrag(e){if(drag?.id!==e.pointerId)return;drag=null;document.body.classList.remove('journey-dragging');if(document.documentElement.hasPointerCapture(e.pointerId))document.documentElement.releasePointerCapture(e.pointerId);e.stopImmediatePropagation();}
window.addEventListener('pointerup',releaseDrag,{capture:true});window.addEventListener('pointercancel',releaseDrag,{capture:true});
window.addEventListener('wheel',e=>{if(blocked()||isControl(e.target))return;e.preventDefault();e.stopImmediatePropagation();const unit=e.deltaMode===1?16:e.deltaMode===2?innerHeight:1;advance(Math.max(-160,Math.min(160,(Math.abs(e.deltaY)>Math.abs(e.deltaX)?e.deltaY:e.deltaX)*unit))*.045);},{capture:true,passive:false});
window.addEventListener('keydown',e=>{if(blocked()||isControl(e.target))return;if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key)){e.preventDefault();advance(['ArrowDown','ArrowRight'].includes(e.key)?4:-4);}});
function renderStory(){
 const q=shots.find(s=>elapsed<s.end)||shots.at(-1),u=Math.min(1,(elapsed-q.start)/(q.end-q.start)),t=elapsed-q.start;const changed=previous!==q;previous=q;
 if(q.kind!=='dialogue')stopCharacterVoice();
 chapterIndex.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',String(i===(elapsed<13?0:elapsed<36?1:elapsed<shots.find(s=>s.kind==='settle')?.start?2:q.kind==='archive'?4:3))));testFade.style.opacity='0';emit('relief-landscape-frame',{progress:1});if(cameraTest&&!fullStory)control.querySelector('select').value=String(shots.indexOf(q));document.body.dataset.storyShot=q.kind;panel.hidden=true;emit('cinema-closing',{visible:false,book:false});
 if(q.kind==='archive'){running=false;emit('archive-open');return;}
 if(['pair-reveal','head-push','crown-zoom','relief-trace','back-zoom','entry','rotate','female-click','female-scan','male-transition','male-scan','pair','lens'].includes(q.kind)){
  if(changed){emit('stage-navigate','intro');emit('ink-landscape-frame',{progress:1,index:0});}
  let kind=['pair-reveal','head-push','crown-zoom','relief-trace'].includes(q.kind)?q.kind:q.kind==='back-zoom'?'back-zoom':q.kind==='entry'?'entry':q.kind==='rotate'?'rotate':q.kind==='lens'?'lens':q.kind.endsWith('scan')?'scan':'pair';
  emit('cinema-lion-frame',{kind,time:kind==='scan'?(q.kind==='female-scan'?u*131.9:132+u*131.9):t,progress:u,...q.stop});
 }else if(['relief-landscape','landscape-expand'].includes(q.kind)){
 if(changed){if(q.kind==='relief-landscape'){emit('cinema-lion-frame',{kind:'relief-trace',time:7,progress:1});emit('capture-relief-lines');}emit('stage-navigate','terrain');emit('ink-landscape-frame',{index:0,progress:1});}
 emit('blender-route-frame',{index:0,time:0,opacity:1});emit('blender-entry-frame',{progress:(elapsed-28)/76});if(q.kind==='relief-landscape')emit('relief-landscape-frame',{progress:u});
 }else if(q.kind==='transfer'){
 if(changed){emit('stage-navigate','terrain');emit('ink-landscape-frame',{index:0,progress:1});}
 emit('blender-transfer-frame',{from:q.from,to:q.to,progress:u});
 }else if(['motif','travel','dialogue','retreat'].includes(q.kind)){
  if(changed){emit('stage-navigate','terrain');if(q.stop)emit('capture-story-motif',q.stop);}
  const index=q.stop.route;
  if(q.kind==='motif'){emit('ink-landscape-frame',{index,progress:u*.235});emit('blender-route-frame',{index,time:0,opacity:u<.8?0:(u-.8)/.2});}
  else{emit('ink-landscape-frame',{index,progress:1});const time=q.kind==='travel'?u*150:q.kind==='dialogue'?150+u*24:174+u*30;emit('blender-route-frame',{index,time,opacity:1});if(cameraTest&&q.kind==='travel')emit('blender-entry-frame',{progress:(elapsed-28)/76});if(q.kind==='dialogue'){panel.hidden=false;const copy=dialogueCopy[index];const names=['장사꾼','농민','찬모','주민 삼총사','나무꾼'];let remaining=u*(q.end-q.start);const pages=dialoguePages(index);const introEnd=pages.findIndex(page=>dialogueCopy[index].testimony.startsWith(page.text));const testimonyStart=pages.slice(0,introEnd).reduce((sum,page)=>sum+page.seconds,0);if(remaining>=testimonyStart)setCharacterVoice(index);else stopCharacterVoice();let current=pages.at(-1);for(const page of pages){if(remaining<page.seconds){current=page;break;}remaining-=page.seconds;}current=voiceCaption(index,pages.slice(introEnd))||current;const content='<h2>'+names[index]+'</h2><p>'+current.text+'</p>';if(panel.innerHTML!==content)panel.innerHTML=content;}}
 }else{
  if(changed){emit('stage-navigate','memory');emit('ink-landscape-frame',{index:0,progress:1});}
  const source=q.kind==='guesthouse'?u*70:q.kind==='settle'?70:q.kind==='seasons'?70+u*70:140;
  emit('blender-ending-frame',source/144);
  emit('cinema-closing',{visible:q.kind==='closing'||q.kind==='book',book:q.kind==='book'});
 if(q.kind==='fade'){testFade.style.background='#e5e9e3';testFade.style.opacity=String(u);if(u>.3)emit('archive-preload');}
 }
 if(elapsed>=duration){running=false;play.textContent='다시 재생';}
}
function tick(now){requestAnimationFrame(tick);const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(!active||blocked()||document.hidden||document.querySelector('#intro').dataset.lionReady!=='true')return;
const requested=running?elapsed+dt:dragTarget;if(Math.max(elapsed,requested)>=10)emit('village-preload');const memoryStart=shots.find(s=>s.kind==='settle')?.start??Infinity;if(Math.max(elapsed,requested)>=memoryStart-100)emit('ending-preload');
let limit=duration;if(document.body.dataset.spatialReady!=='true')limit=27.95;else if(document.body.dataset.endingReady!=='true')limit=memoryStart-.05;
const destination=Math.min(Math.max(elapsed,limit),requested);if(Math.abs(destination-elapsed)<.002){if(elapsed!==destination){elapsed=destination;seek.value=elapsed;renderStory();}return;}
elapsed=running?destination:elapsed+(destination-elapsed)*(1-Math.exp(-dt*7));elapsed=Math.max(0,Math.min(duration,elapsed));if(running)dragTarget=elapsed;seek.value=elapsed;renderStory();}requestAnimationFrame(tick);

document.addEventListener('archive-open',()=>{running=false;panel.hidden=true;});
document.addEventListener('archive-story',()=>{active=true;running=false;elapsed=dragTarget=0;previous=null;seek.hidden=false;stop.hidden=false;seek.value=0;play.textContent='이어서 재생';document.body.classList.add('cinema-running');renderStory();});
document.addEventListener('exhibition-start',()=>{beginJourney();renderStory();});
for(const readyEvent of ['lion-ready','spatial-ready'])document.addEventListener(readyEvent,()=>{if(active&&!blocked()){previous=null;renderStory();}});

document.addEventListener('character-voice-time',()=>{if(active&&!blocked()&&previous?.kind==='dialogue')renderStory();});
