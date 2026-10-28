(() => {
 const trigger=document.getElementById('projectQr');
 const dialog=document.getElementById('projectQrDialog');
 if(!trigger||!dialog)return;
 trigger.addEventListener('click',()=>dialog.showModal());
 document.getElementById('projectQrClose').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const box=dialog.getBoundingClientRect();
  if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();
 });
 dialog.addEventListener('close',()=>document.getElementById('projectMenuToggle')?.focus());
 // Stop page navigation keys and scroll gestures while inspecting the codes.
 dialog.addEventListener('keydown',event=>event.stopPropagation());
 dialog.addEventListener('wheel',event=>event.stopPropagation(),{passive:true});
})();
