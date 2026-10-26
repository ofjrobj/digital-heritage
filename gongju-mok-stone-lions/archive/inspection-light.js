const clampAngle=value=>Math.max(-85,Math.min(85,Number.isFinite(Number(value))?Number(value):0));

export function lightPositionAt(angle,base){
 const radians=clampAngle(angle)*Math.PI/180,radius=Math.hypot(base.x,base.z);
 return [Math.sin(radians)*radius,base.y,Math.cos(radians)*radius];
}

// The archive's render camera is fixed. Moving the key in this scene therefore
// keeps the chosen light direction relative to the screen while either lion turns.
export function createInspectionLight(key,element,redraw){
 const base=key.position.clone(),originalLighting=element.dataset.lighting;
 let enabled=false,angle=null;
 function apply(){
  if(enabled&&angle!==null)key.position.set(...lightPositionAt(angle,base));
  else key.position.copy(base);
  element.dataset.lighting=enabled?'adjustable-neutral-key-chin-fill':originalLighting;
  redraw();
 }
 return {
  setEnabled(value){enabled=!!value;apply();},
  setAngle(value){angle=clampAngle(value);if(enabled)apply();}
 };
}

export function mountInspectionLight(viewers){
 const surface=document.querySelector('.surface-toggle');if(!surface)return;
 const row=document.createElement('div');row.className='inspection-tools';surface.before(row);row.append(surface);
 const button=document.createElement('button');button.type='button';button.className='light-toggle';
 button.setAttribute('role','slider');button.setAttribute('aria-label','빛 방향');
 button.setAttribute('aria-valuemin','-85');button.setAttribute('aria-valuemax','85');button.setAttribute('aria-orientation','horizontal');
 button.setAttribute('aria-describedby','light-direction-help');
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/><circle class="light-bearing" cx="12" cy="2" r="1.5"/></svg>';
 const help=document.createElement('span');help.id='light-direction-help';help.className='inspection-help';
 help.textContent='클릭하면 조명을 켜거나 끕니다. 원을 드래그하거나 방향키로 빛 방향을 바꾸고, Home 키로 정면에 맞춥니다.';
 const hint=document.createElement('span');hint.className='inspection-hint';hint.setAttribute('aria-hidden','true');
 hint.textContent='원을 잡고 돌려보세요';
 row.append(button,help,hint);
 let enabled=false,angle=-31,drag=null,suppressClickUntil=0,hintTimer;
 function hideHint(){
  clearTimeout(hintTimer);hintTimer=undefined;hint.dataset.visible='false';
 }
 function showHint(){
  hideHint();hint.dataset.visible='true';hintTimer=setTimeout(hideHint,2600);
 }
 function describe(){
  const direction=angle===0?'정면':`${angle<0?'왼쪽':'오른쪽'} ${Math.abs(angle)}도`;
  button.dataset.enabled=String(enabled);button.setAttribute('aria-valuenow',String(angle));
  button.setAttribute('aria-valuetext',`${direction}, 조명 ${enabled?'켜짐':'꺼짐'}`);
  button.title=`빛 방향 · ${direction} (${enabled?'켜짐':'꺼짐'})`;
  button.style.setProperty('--light-angle',`${angle}deg`);
 }
 function setEnabled(value,showGuide=true){
  const wasEnabled=enabled;
  enabled=!!value;
  for(const viewer of Object.values(viewers))viewer.setLightEnabled(enabled);
  describe();
  if(!enabled)hideHint();else if(!wasEnabled&&showGuide)showHint();
 }
 function setAngle(value){
  hideHint();
  angle=Math.round(clampAngle(value));
  for(const viewer of Object.values(viewers))viewer.setLightAngle(angle);
  if(!enabled)setEnabled(true,false);else describe();
 }
 button.addEventListener('click',event=>{
  if(event.detail>0&&performance.now()<suppressClickUntil)return;
  setEnabled(!enabled);
 });
 button.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0)return;
  const rect=button.getBoundingClientRect(),cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
  const x=event.clientX-cx,y=event.clientY-cy;
  // A press near the centre has no stable polar angle; horizontal movement is
  // its equivalent. Rim drags follow the actual rotation around the circle.
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,cx,cy,start:angle,previous:Math.atan2(x,-y),rotation:0,polar:Math.hypot(x,y)>=6,moved:false};
  suppressClickUntil=0;button.setPointerCapture(event.pointerId);button.focus({preventScroll:true});
 });
 button.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(!drag.moved&&Math.hypot(dx,dy)<3)return;
  drag.moved=true;
  if(drag.polar){
   const next=Math.atan2(event.clientX-drag.cx,-(event.clientY-drag.cy));
   const delta=Math.atan2(Math.sin(next-drag.previous),Math.cos(next-drag.previous));
   drag.rotation+=delta*180/Math.PI;drag.previous=next;
   setAngle(drag.start+drag.rotation);
  }else setAngle(drag.start+dx*2);
 });
 function finishDrag(event){
  if(!drag||event.pointerId!==drag.id)return;
  if(drag.moved)suppressClickUntil=performance.now()+350;
  drag=null;if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);
 }
 button.addEventListener('pointerup',finishDrag);button.addEventListener('pointercancel',finishDrag);
 button.addEventListener('lostpointercapture',()=>{drag=null;});
 button.addEventListener('keydown',event=>{
  const step=event.shiftKey?15:5;
  if(['ArrowLeft','ArrowDown','ArrowRight','ArrowUp','Home'].includes(event.key)){
   event.preventDefault();setAngle(event.key==='Home'?0:angle+(['ArrowLeft','ArrowDown'].includes(event.key)?-step:step));
  }else if(event.key==='Escape'&&enabled){event.preventDefault();event.stopPropagation();setEnabled(false);}
 });
 function syncSurfaceMode(){
  const visible=surface.dataset.mode==='relief';
  if(!visible){
   hideHint();
   if(document.activeElement===button)surface.focus({preventScroll:true});
   if(drag){if(button.hasPointerCapture(drag.id))button.releasePointerCapture(drag.id);drag=null;}
   if(enabled)setEnabled(false);
  }
  row.dataset.lightVisible=String(visible);button.inert=!visible;button.tabIndex=visible?0:-1;
  button.setAttribute('aria-hidden',String(!visible));
 }
 const modeObserver=new MutationObserver(syncSurfaceMode);
 modeObserver.observe(surface,{attributes:true,attributeFilter:['data-mode']});
 describe();syncSurfaceMode();return {button,setAngle,setEnabled};
}
