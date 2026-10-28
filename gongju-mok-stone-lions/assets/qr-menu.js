(() => {
 const trigger=document.getElementById('projectQr');
 const dialog=document.getElementById('projectQrDialog');
 if(!trigger||!dialog)return;
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let closeTimer;
 function close(){
  if(!dialog.open||dialog.dataset.state==='closing')return;
  dialog.dataset.state='closing';
  if(reducedMotion.matches)dialog.close();
  else {
   const seconds=parseFloat(getComputedStyle(dialog).getPropertyValue('--ui-motion-duration'))||1;
   closeTimer=setTimeout(()=>dialog.close(),seconds*1000);
  }
 }
 trigger.addEventListener('click',()=>{
  clearTimeout(closeTimer);
  dialog.dataset.state='open';
  if(!dialog.open)dialog.showModal();
 });
 document.getElementById('projectQrClose').addEventListener('click',close);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const box=dialog.getBoundingClientRect();
  if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close();
 });
 dialog.addEventListener('close',()=>{clearTimeout(closeTimer);delete dialog.dataset.state;document.getElementById('projectMenuToggle')?.focus();});
 // Stop page navigation keys and scroll gestures while inspecting the codes.
 dialog.addEventListener('keydown',event=>event.stopPropagation());
 dialog.addEventListener('wheel',event=>event.stopPropagation(),{passive:true});
})();
