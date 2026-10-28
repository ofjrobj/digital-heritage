const root=document.documentElement,archive=document.querySelector('.archive');
let started=false,timer;
function begin(){
 if(started||!['revealing','ready'].includes(root.dataset.archiveState))return;
 started=true;root.dataset.archiveOverview='hint';
 timer=setTimeout(()=>{if(!archive.querySelector('.hotspot.is-active')){root.dataset.archiveOverview='expanded';archive.querySelector('.detail-card')?.setAttribute('aria-hidden','true');}},4000);
}
new MutationObserver(begin).observe(root,{attributes:true,attributeFilter:['data-archive-state']});
archive.querySelectorAll('.hotspot').forEach(button=>button.addEventListener('click',()=>{
 clearTimeout(timer);queueMicrotask(()=>{
  const active=!!archive.querySelector('.hotspot.is-active');
  root.dataset.archiveOverview=active?'detail':'expanded';
  if(active)archive.querySelector('.detail-card')?.removeAttribute('aria-hidden');
  else archive.querySelector('.detail-card')?.setAttribute('aria-hidden','true');
 });
}));
begin();
