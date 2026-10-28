const root=document.documentElement,archive=document.querySelector('.archive');
let started=false,timer;
const detail=archive.querySelector('.detail-card');
function showDetail(selected){
 root.dataset.archiveOverview=selected?'detail':'expanded';
 if(selected)detail?.removeAttribute('aria-hidden');
 else detail?.setAttribute('aria-hidden','true');
}
function begin(){
 if(started||!['revealing','ready'].includes(root.dataset.archiveState))return;
 started=true;
 if(root.dataset.archivePoint){showDetail(true);return;}
 root.dataset.archiveOverview='hint';
 timer=setTimeout(()=>{if(!root.dataset.archivePoint)showDetail(false);},4000);
}
// The application commits one selection state. Observing it also covers
// deselection and quick repeated clicks without competing click handlers.
new MutationObserver(records=>{
 if(records.some(record=>record.attributeName==='data-archive-point')){
  clearTimeout(timer);
  if(started||root.dataset.archivePoint)showDetail(!!root.dataset.archivePoint);
 }
 begin();
}).observe(root,{attributes:true,attributeFilter:['data-archive-state','data-archive-point']});
begin();
