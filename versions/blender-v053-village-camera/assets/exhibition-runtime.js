// A single lightweight stage controller replaces the hidden legacy village viewer.
const emit=(name,detail)=>document.dispatchEvent(new CustomEvent(name,{detail}));
const shell=document.createElement('main');shell.id='exhibitionStages';shell.innerHTML='<section id="terrain" aria-label="공주목 마을"><div class="terrain-stage"></div></section><section id="village" aria-label="마을의 사람들"></section><section id="memory" aria-label="석사자의 시간"></section>';document.body.append(shell);
document.body.dataset.stage='intro';
document.body.append(document.querySelector('.intro-controls'));
let spatialPromise,spatialAttempt=0;
const loading=document.createElement('div');loading.id='villageLoadStatus';loading.setAttribute('role','status');loading.hidden=true;document.body.append(loading);
function preloadVillage(){
 if(spatialPromise)return spatialPromise;
 loading.innerHTML='풍경을 불러오는 중입니다…';
 if(document.body.dataset.experience&&!document.body.classList.contains('higgsfield-active'))loading.hidden=false;
 const attempt=spatialAttempt++;
 spatialPromise=import('./blender-spatial-view.js?v=mountain-entry-5&attempt='+attempt).then(()=>{loading.hidden=true;}).catch(error=>{
 spatialPromise=null;loading.hidden=false;loading.textContent='풍경을 불러오지 못했습니다. ';
 const retry=document.createElement('button');retry.textContent='다시 불러오기';retry.onclick=()=>location.reload();loading.append(retry);console.error(error);
 });return spatialPromise;
}

document.addEventListener('village-preload',preloadVillage);
document.addEventListener('stage-navigate',e=>{document.body.dataset.stage=e.detail;if(e.detail==='intro')emit('story-home');if(['terrain','village','memory'].includes(e.detail)&&document.body.dataset.higgsfieldTest!=='true')preloadVillage();});
let archivePromise;
function preloadArchive(){return archivePromise??=import('./value-archive.js?v=analysis-57');}
document.addEventListener('archive-preload',()=>preloadArchive().then(m=>m.prepareArchive()).catch(()=>{}));
document.addEventListener('archive-open',()=>{document.body.classList.add('archive-active');preloadArchive().then(m=>m.openArchive()).catch(error=>{console.error(error);document.body.classList.remove('archive-active');});});
document.addEventListener('archive-story',()=>document.body.classList.remove('archive-active'));
// Native Blender view; no generated media loaded.
await import('./cinematic-story.js?v=mountain-entry-5');
document.addEventListener('experience-selected',()=>{document.body.dataset.stage='intro';emit('exhibition-start');});
document.querySelector('#coverIndex').onclick=()=>{document.querySelector('[data-experience="desktop"]').click();emit('archive-open');};
// Keep first-visit cost small: no 3D village, ending model or unused videos before entry.

await import('./museum-ui.js?v=88');

await import('./background-music.js?v=1');

// Prepare the village while the title is visible; no scan model in the opening.
// Village loads during the first conversation, after the lightweight film entry.

preloadVillage();
document.addEventListener('spatial-ready',()=>{if(document.body.classList.contains('choosing-experience'))document.dispatchEvent(new CustomEvent('blender-entry-frame',{detail:{progress:0}}));});
