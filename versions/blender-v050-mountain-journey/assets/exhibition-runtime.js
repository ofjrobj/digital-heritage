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
 if(document.body.dataset.experience)loading.hidden=false;
 const attempt=spatialAttempt++;
 spatialPromise=import('./blender-spatial-view.js?v=light-entry-2&attempt='+attempt).then(()=>{loading.hidden=true;}).catch(error=>{
 spatialPromise=null;loading.hidden=false;loading.textContent='풍경을 불러오지 못했습니다. ';
 const retry=document.createElement('button');retry.textContent='다시 불러오기';retry.onclick=()=>location.reload();loading.append(retry);console.error(error);
 });return spatialPromise;
}
document.addEventListener('experience-selected',()=>{if(document.body.dataset.spatialReady!=='true')loading.hidden=false;});
document.addEventListener('village-preload',preloadVillage);
document.addEventListener('stage-navigate',e=>{document.body.dataset.stage=e.detail;if(e.detail==='intro')emit('story-home');if(['terrain','village','memory'].includes(e.detail))preloadVillage();});
let archivePromise;
function preloadArchive(){return archivePromise??=import('./value-archive.js?v=ink-cover-1');}
document.addEventListener('archive-preload',preloadArchive);
document.addEventListener('archive-open',()=>{document.body.classList.add('archive-active');preloadArchive().then(m=>m.openArchive()).catch(error=>{console.error(error);document.body.classList.remove('archive-active');});});
document.addEventListener('archive-story',()=>document.body.classList.remove('archive-active'));
await import('./cinematic-story.js?v=clean-dialogue-54');
document.addEventListener('experience-selected',()=>{document.body.dataset.stage='intro';preloadVillage();emit('exhibition-start');});
document.querySelector('#coverIndex').onclick=()=>{document.querySelector('[data-experience="desktop"]').click();emit('archive-open');};
// Keep first-visit cost small: no 3D village, ending model or unused videos before entry.

await import('./museum-ui.js?v=88');
await import('./ink-entry.js?v=2');

// Prepare the village while the title is visible; no scan model in the opening.
preloadVillage();
