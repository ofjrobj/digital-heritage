const root=document.documentElement,archive=document.querySelector('.archive');
let started=false,consumed=false,timer,fadeTimer,lastPoint=root.dataset.archivePoint||'';
const detail=archive.querySelector('.detail-card');
function clearTimers(){
 clearTimeout(timer);clearTimeout(fadeTimer);timer=fadeTimer=undefined;
}
function showDetail(selected){
 clearTimers();consumed=true;
 root.dataset.archiveOverview=selected?'detail':'expanded';
 if(detail)detail.hidden=!selected;
 if(selected)detail?.removeAttribute('aria-hidden');
 else detail?.setAttribute('aria-hidden','true');
}
function fadeGuide(){
 if(consumed||root.dataset.archivePoint)return;
 consumed=true;
 root.dataset.archiveOverview='fading';
 detail?.setAttribute('aria-hidden','true');
 if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){showDetail(false);return;}
 fadeTimer=setTimeout(()=>{
  if(root.dataset.archiveOverview==='fading'&&!root.dataset.archivePoint)showDetail(false);
 },1000);
}
function begin(){
 if(started||!['revealing','ready'].includes(root.dataset.archiveState))return;
 started=true;
 if(consumed||root.dataset.archivePoint){showDetail(!!root.dataset.archivePoint);return;}
 root.dataset.archiveOverview='hint';
 if(detail)detail.hidden=false;
 detail?.removeAttribute('aria-hidden');
 timer=setTimeout(fadeGuide,4000);
}
// The application commits one selection state. Observing it also covers
// deselection and quick repeated clicks without competing click handlers.
new MutationObserver(records=>{
 if(records.some(record=>record.attributeName==='data-archive-point')){
  const point=root.dataset.archivePoint||'';
  if(point!==lastPoint&&(started||point))showDetail(!!point);
  lastPoint=point;
 }
 begin();
}).observe(root,{attributes:true,attributeFilter:['data-archive-state','data-archive-point']});
begin();
