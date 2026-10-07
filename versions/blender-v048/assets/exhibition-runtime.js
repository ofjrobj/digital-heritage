// A single lightweight stage controller replaces the hidden legacy village viewer.
const emit=(name,detail)=>document.dispatchEvent(new CustomEvent(name,{detail}));
const shell=document.createElement('main');shell.id='exhibitionStages';shell.innerHTML='<section id="terrain" aria-label="공주목 마을"><div class="terrain-stage"></div></section><section id="village" aria-label="마을의 사람들"></section><section id="memory" aria-label="석사자의 시간"></section>';document.body.append(shell);
document.body.dataset.stage='intro';
document.body.append(document.querySelector('.intro-controls'));
let spatialPromise;
function preloadVillage(){return spatialPromise??=import('./blender-spatial-view.js?v=story-flow-70').catch(error=>{spatialPromise=null;document.querySelector('#lionStatus').textContent='마을을 불러오지 못했습니다. 연결을 확인해 주세요.';console.error(error);});}
document.addEventListener('village-preload',preloadVillage);
document.addEventListener('stage-navigate',e=>{document.body.dataset.stage=e.detail;if(e.detail==='intro')emit('story-home');if(['terrain','village','memory'].includes(e.detail))preloadVillage();});
let archivePromise;
function preloadArchive(){return archivePromise??=import('./value-archive.js?v=70');}
document.addEventListener('archive-preload',preloadArchive);
document.addEventListener('archive-open',()=>{document.body.classList.add('archive-active');preloadArchive().then(m=>m.openArchive()).catch(error=>{console.error(error);document.body.classList.remove('archive-active');});});
document.addEventListener('archive-story',()=>document.body.classList.remove('archive-active'));
await import('./cinematic-story.js?v=story-flow-70');
document.addEventListener('experience-selected',()=>{document.body.dataset.stage='intro';emit('exhibition-start');});
document.querySelector('#coverIndex').onclick=()=>{document.querySelector('[data-experience="desktop"]').click();emit('archive-open');};
// Keep first-visit cost small: no 3D village, ending model or unused videos before entry.
// The drawn line becomes a landscape contour while the continuous village camera advances.
const svgNS='http://www.w3.org/2000/svg',ridge=document.createElementNS(svgNS,'svg');ridge.id='ridgeBridge';ridge.setAttribute('viewBox','0 0 1000 600');ridge.setAttribute('preserveAspectRatio','none');ridge.setAttribute('aria-hidden','true');document.body.append(ridge);
const ridgePaths=Array.from({length:7},()=>{const p=document.createElementNS(svgNS,'path');ridge.append(p);return p;});
document.addEventListener('relief-landscape-frame',e=>{const p=e.detail.progress;ridge.style.opacity=p>=1?'0':String(Math.sin(Math.PI*p)*.65);for(let i=0;i<7;i++){const y=320+i*17;ridgePaths[i].setAttribute('d',`M -100 ${y+120} C ${120-p*80} ${y-140},${200+p*100} ${y-180},${370+p*120} ${y-20} S ${680+p*160} ${y-220},1100 ${y-170}`);}});
