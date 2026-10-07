import {storyStops} from './story-sequence.js?v=story-flow-64';
import './ink-landscape-transition.js?v=story-flow-64';
const $=s=>document.querySelector(s);
const layers=['intro','observe','terrain','village','overview','memory'];
const css=document.createElement('style');css.textContent=`html,body{height:100%;overflow:hidden!important;overscroll-behavior:none}#intro,.story-section,.observation-flow{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;min-height:0!important;margin:0!important;opacity:0;visibility:hidden;pointer-events:none;transition:opacity 2.2s,visibility 2.2s;padding:0!important;overflow:clip!important}body[data-stage=intro] #intro,body[data-stage=observe] #intro,body[data-stage=terrain] #terrain,body[data-stage=village] #village,body[data-stage=overview] #village,body[data-stage=memory] #memory{opacity:1;visibility:visible;pointer-events:auto}#observe,#overview{display:none!important}#intro .intro-title{display:none}body[data-stage=observe] #introContinue{display:none}.terrain-stage{position:absolute!important;inset:0;top:0!important;height:100%!important;display:grid;place-items:center;background:#07100b}.terrain-stage h2,.terrain-stage small,.terrain-stage button{display:none}.terrain-stage svg{width:100%;height:100%;transform:perspective(1000px) rotateX(var(--map-tilt,0deg)) scale(var(--map-scale,1));transition:transform .15s}.terrain-stage path{stroke-dashoffset:calc(1400 * (1 - var(--map-reveal,0)));transition:none}#villageCanvas{position:absolute;inset:0;height:100%!important;width:100%!important}.story-section>h2,.story-section>small,#visitedCount{position:absolute;left:7vw;top:10vh;z-index:2;pointer-events:none}.story-section>small{top:7vh}.story-section>h2{font-size:26px}#spotList{position:absolute;left:5vw;right:5vw;bottom:5vh;justify-content:center;z-index:3}.episode-panel{top:15vh!important;right:5vw!important;max-width:30vw}#finishEpisodes{position:absolute;bottom:12vh;right:5vw;z-index:3}#memory h2,#memory small{display:none}#endingFilm{position:absolute;inset:0;width:100%;height:100%;max-height:none;object-fit:contain}#endingPlay,#restartStory{position:absolute;bottom:4vh;z-index:4}#endingPlay{left:4vw}#restartStory{right:4vw}.flow-nav{display:none!important}#stageCue{position:fixed;bottom:5vh;left:50%;transform:translateX(-50%);color:#a7b6a2;z-index:5;font:12px 'Gowun Batang';pointer-events:none;letter-spacing:.08em}#stageVeil{position:fixed;inset:0;z-index:1;pointer-events:none;background:radial-gradient(ellipse at 50% 56%,transparent,#0009);opacity:var(--reveal-veil,.85);transition:opacity .25s}body[data-stage=village] #stageCue,body[data-stage=memory] #stageCue{display:none}@media(max-width:650px){.episode-panel{max-width:none;width:84vw;left:8vw;right:auto!important;top:12vh!important}#spotList{gap:5px}#spotList button{font-size:11px;padding:7px 10px}.flow-nav{max-width:calc(100vw - 120px);flex-wrap:wrap}#village>h2{font-size:20px;top:10vh}}`;document.head.append(css);
const cue=document.createElement('div');cue.id='stageCue';document.body.append(cue);const veil=document.createElement('div');veil.id='stageVeil';document.body.append(veil);
let stage='intro',progress=0,lastInput=0,scanReturnStage='village',episodeActive=false,blockedUntil=0;
function boundary(){blockedUntil=(stage==='terrain'||stage==='village')?0:performance.now()+1800;}
document.addEventListener('story-boundary',boundary);
document.addEventListener('episode-active',e=>{episodeActive=e.detail;document.body.classList.toggle('episode-listening',Boolean(e.detail));cue.textContent=e.detail?'스크롤하여 계속':'';});
function navigate(id,position){
 if(id==='return-lions'){beginReturn();return;}
 if(id==='dialogue'){id='village';position='dialogue';}
 if(id==='terrain-end'){id='terrain';position=6.95;}
 if(!layers.includes(id))return;
 stage=id;document.body.dataset.stage=id;boundary();blockedUntil=(id==='village'||id==='terrain')?0:performance.now()+2800;
 document.querySelectorAll('.flow-nav a').forEach(a=>a.setAttribute('aria-current',String(a.hash==='#'+id)));
 progress=typeof position==='number'?position:({intro:0,observe:1,terrain:6,village:7,overview:8,memory:9}[id]);
 if(id!=='terrain'){document.body.classList.remove('surface-morph');document.body.style.removeProperty('--surface-opacity');}
 if(id==='intro')document.dispatchEvent(new CustomEvent('story-home'));
 if(id==='observe'&&!episodeActive)pose();
 if(id==='terrain')map();
 if(id==='village'&&position!=='dialogue')document.dispatchEvent(new CustomEvent('village-view',{detail:'enter'}));
 if(id==='overview')document.dispatchEvent(new CustomEvent('village-view',{detail:'overview'}));
 if(id==='memory')document.dispatchEvent(new CustomEvent('blender-ending-frame',{detail:0}));
 cue.textContent=id==='village'&&episodeActive?'스크롤하여 계속':id==='intro'?'':id==='observe'?'스크롤하여 표면을 따라가기':id==='terrain'?'스크롤하여 마을로 들어가기':id==='overview'?'스크롤하여 시간의 풍경으로':'';
 veil.style.display=['intro','observe'].includes(id)?'block':'none';
 document.documentElement.style.setProperty('--reveal-veil',id==='intro'?0:0);
}
const explored=new Set();let storyStarted=false;
$('#introContinue').hidden=true;$('#introContinue').textContent='다음 이야기로 →';$('#introContinue').setAttribute('aria-label','다음 이야기로');
document.addEventListener('lion-explored',e=>{explored.add(e.detail);document.body.dataset.explored=String(explored.size);$('#introContinue').hidden=true;});
let lastPart=-1;
function pose(){const parts=['whole','face','head','back','mane'];const i=Math.min(4,Math.max(0,Math.floor(progress-1)));if(i!==lastPart){lastPart=i;boundary();document.dispatchEvent(new CustomEvent('story-scan',{detail:{subject:'male',part:parts[i],guided:true}}));}document.dispatchEvent(new CustomEvent('story-pose',{detail:{zoom:1.05+i*.24,yaw:i>=3?-Math.PI/2:-Math.PI/4,height:i===1?.12:i===2?.28:i===3?.08:0}}));cue.textContent=['전체','얼굴','머리','등','갈기'][i]+' · 스크롤하여 계속';}
let transitionFilm=null,transitionTarget=0,transitionCurrent=0,returnStarted=0,routeIndex=0;let finishedEpisodes=0;
document.addEventListener('episode-complete',e=>finishedEpisodes=e.detail.total);
document.addEventListener('story-restart',()=>finishedEpisodes=0);
function beginReturn(){if(finishedEpisodes>=storyStops.length){navigate('memory');document.dispatchEvent(new CustomEvent('story-ending-autoplay'));return;}navigate('terrain',6);returnStarted=1;document.body.dataset.transitionDirection='out';cue.textContent='스크롤하여 돌의 무늬로 돌아가기';document.dispatchEvent(new CustomEvent('lion-return-prep'));drawRoute();}
function completeReturn(){returnStarted=0;document.body.classList.remove('surface-morph');navigate('intro');document.dispatchEvent(new CustomEvent('lion-pair-observe'));}

function map(){const p=Math.min(1,Math.max(0,progress-6));$('#terrain').style.setProperty('--map-reveal',p);$('#terrain').style.setProperty('--map-tilt',(p*52)+'deg');$('#terrain').style.setProperty('--map-scale',1+p*.45);transitionTarget=p;}
document.addEventListener('stage-navigate',e=>navigate(e.detail));
document.addEventListener('experience-selected',()=>{document.dispatchEvent(new CustomEvent('episode-reset'));lastPart=-1;navigate(location.hash.slice(1)||'intro');window.scrollTo(0,0);});
document.querySelectorAll('.flow-nav a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.dispatchEvent(new CustomEvent('episode-reset'));lastPart=-1;navigate(a.hash.slice(1));}));
$('#introContinue').onclick=()=>{if(explored.size<2)return;storyStarted=true;navigate('observe');};$('#followLine').onclick=()=>navigate('terrain');$('#finishEpisodes').onclick=()=>navigate('overview');$('#overviewButton').onclick=()=>navigate('overview');$('#memoryButton').addEventListener('click',()=>navigate('memory'));
$('#restartStory').addEventListener('click',()=>{document.dispatchEvent(new CustomEvent('story-restart'));lastPart=-1;navigate('intro');});
document.addEventListener('story-scan',e=>{if(!e.detail.guided){scanReturnStage=e.detail.episode?'village':'observe';stage='observe';document.body.dataset.stage=stage;veil.style.display='none';cue.textContent='';boundary();document.querySelectorAll('.flow-nav a').forEach(a=>a.setAttribute('aria-current',String(a.hash==='#observe')));}});
function advance(delta){if(document.body.classList.contains('choosing-experience')||document.querySelector('dialog[open]')||performance.now()<blockedUntil)return;
 if(stage==='memory'){progress=Math.max(9,Math.min(10,progress+delta*.00012));document.dispatchEvent(new CustomEvent('blender-ending-frame',{detail:progress-9}));return;}
 if(stage==='intro'&&document.querySelector('#intro').dataset.observationPhase==='magnifier'){if(finishedEpisodes===storyStops.length&&delta>0){navigate('overview');document.dispatchEvent(new CustomEvent('blender-route-frame',{detail:{index:routeIndex,time:134}}));}return;}
 if(stage==='intro'&&!storyStarted)return;
 if(stage==='village'||episodeActive){document.dispatchEvent(new CustomEvent('episode-scroll',{detail:delta}));return;}
 progress=Math.max(0,progress+delta*(stage==='terrain'?(returnStarted?.00022:.00005):.0015));
 if(stage==='intro'){document.documentElement.style.setProperty('--reveal-veil',Math.max(0,.9-progress));if(progress>=1)navigate('observe',1);}
 else if(stage==='observe'){if(progress>=6)navigate('terrain',6);else if(progress<1)navigate('intro',.95);else pose();}
 else if(stage==='terrain'){progress=Math.max(6,Math.min(7,progress));drawRoute();if(progress>=7){if(returnStarted)completeReturn();else{document.body.classList.remove('surface-morph');navigate('village');document.dispatchEvent(new CustomEvent('episode-open',{detail:routeIndex}));}}}
 else if(stage==='overview'){const p=Math.min(1,Math.max(0,(progress-8)/2));document.dispatchEvent(new CustomEvent('blender-route-frame',{detail:{index:routeIndex,time:134+p*10}}));if(progress>=10){navigate('memory');document.dispatchEvent(new CustomEvent('blender-ending-frame',{detail:0}));}else if(progress<8)navigate('intro');}
 document.body.dataset.storyProgress=progress.toFixed(2);
}
window.addEventListener('wheel',e=>{if(e.target.closest('dialog,.experience-card'))return;e.preventDefault();const now=performance.now();if(now-lastInput<30)return;lastInput=now;advance(Math.max(-100,Math.min(100,e.deltaY)));},{passive:false});
let touchY=null;window.addEventListener('touchstart',e=>touchY=e.touches[0].clientY,{passive:true});window.addEventListener('touchmove',e=>{if(e.target.closest('dialog'))return;if(touchY!==null){e.preventDefault();advance(Math.max(-100,Math.min(100,(touchY-e.touches[0].clientY)*2)));touchY=e.touches[0].clientY;}},{passive:false});
window.addEventListener('keydown',e=>{if(e.target.closest('button,input,dialog'))return;if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();advance(300);}if(['ArrowUp','PageUp'].includes(e.key)){e.preventDefault();advance(-300);}});
navigate('intro');

function pinStage(){for(const id of ['intro','terrain','village','memory']){const el=document.getElementById(id);if(el&&el.scrollTop)el.scrollTop=0;}requestAnimationFrame(pinStage);}pinStage();

// Route timing is entirely scroll-driven; entry and exit are separate Blender paths.
document.addEventListener('stage-navigate',e=>{if(e.detail!=='terrain')return;const key=$('#intro').dataset.selectedRegion;routeIndex={mane:2,eyes:0,mouth:3,head:1,back:4}[key]??0;returnStarted=0;progress=6;map();drawRoute();});
function drawRoute(){
 const p=Math.max(0,Math.min(1,progress-6));
 const time=returnStarted?174+p*30:Math.max(0,(p-.20)/.80)*150;
 // Fade through black: never superimpose the scan and the village.
 const surface=returnStarted?Math.max(0,(p-.96)/.04):0;
 const village=returnStarted?Math.max(0,Math.min(1,(.96-p)/.06)):Math.max(0,Math.min(1,(p-.16)/.04));
 document.body.classList.add('surface-morph');
 document.body.style.setProperty('--surface-opacity',String(surface));
 document.dispatchEvent(new CustomEvent('blender-route-frame',{detail:{index:routeIndex,time,opacity:village}}));
 if(returnStarted)document.dispatchEvent(new CustomEvent('lion-return-progress',{detail:p}));
 else document.dispatchEvent(new CustomEvent('ink-landscape-frame',{detail:{progress:p,index:routeIndex}}));
}
const morphCSS=document.createElement('style');morphCSS.textContent='body[data-stage=terrain]{background:#000!important}body[data-stage=terrain] #intro{transition:none!important}body.surface-morph[data-stage=terrain] #intro{background:#000!important;opacity:var(--surface-opacity,1);visibility:visible;pointer-events:none;z-index:4;transition:none}body.surface-morph #introVideoSlot{inset:0!important}body.surface-morph #intro .lion-interface,body.surface-morph #intro .intro-controls,body.surface-morph #lionBack{visibility:hidden!important}body.surface-morph #terrain{z-index:3}';document.head.append(morphCSS);

const flowOnlyCSS=document.createElement('style');flowOnlyCSS.textContent=`
body[data-experience=desktop] #introVideoSlot,body.cinematic-observation #introVideoSlot{inset:0!important}
body[data-experience=mobile].cinematic-observation #introVideoSlot{top:0!important;bottom:0!important}
#introContinue,#finishEpisodes,#epNext,#epClose,.film-back,#lionBack,#scanReturn{display:none!important}
#villageCanvas{opacity:0;pointer-events:none}#villageInkBackdrop{object-fit:cover}
body[data-stage=overview] #spotList{display:none}
body[data-stage=terrain] #stageCue,body[data-stage=overview] #stageCue{background:transparent!important}
body.episode-listening #spotList{visibility:hidden}body.episode-listening[data-stage=village] #stageCue{display:block;background:transparent!important}
`;document.head.append(flowOnlyCSS);
const overheadStyle=document.createElement('style');overheadStyle.textContent=`body[data-stage=terrain] #village{opacity:var(--route-space-opacity,0);visibility:visible;pointer-events:none;z-index:3;transition:none}body[data-stage=terrain] #villageCanvas,body[data-stage=overview] #villageCanvas{opacity:1;filter:saturate(.55);pointer-events:none}body[data-stage=terrain] #villageInkBackdrop,body[data-stage=overview] #villageInkBackdrop{visibility:hidden}body[data-stage=terrain] #village>*:not(#villageCanvas){visibility:hidden}body[data-stage=overview] #village{z-index:3}body[data-stage=overview] #stageCue{display:block}`;document.head.append(overheadStyle);
$('#villageCanvas').setAttribute('aria-label','공주의 마을');
$('#scanReturn').textContent='돌의 무늬로 돌아가기';
// No extra click gate between testimony and the return journey.
document.addEventListener('lion-pair-ready',()=>{cue.textContent=finishedEpisodes===storyStops.length?'스크롤하여 시간의 풍경으로':'';});

import "./cinematic-story.js?v=story-flow-64";
