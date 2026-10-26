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
 button.setAttribute('aria-label','빛 방향 조절');button.setAttribute('aria-expanded','false');button.setAttribute('aria-pressed','false');button.setAttribute('aria-controls','light-direction-controls');
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>';
 const panel=document.createElement('div');panel.id='light-direction-controls';panel.className='light-controls';panel.hidden=true;panel.inert=true;
 const label=document.createElement('label');label.htmlFor='light-direction';label.textContent='빛 방향';
 const range=document.createElement('input');range.id='light-direction';range.type='range';range.min='-85';range.max='85';range.step='1';range.value='-31';
 range.setAttribute('aria-valuetext','왼쪽 31도');panel.append(label,range);row.append(button,panel);
 let enabled=false;
 function setEnabled(value){
  enabled=value;panel.hidden=!enabled;panel.inert=!enabled;
  row.dataset.lightOpen=String(enabled);
  button.setAttribute('aria-expanded',String(enabled));button.setAttribute('aria-pressed',String(enabled));
  for(const viewer of Object.values(viewers))viewer.setLightEnabled(enabled);
 }
 button.addEventListener('click',()=>setEnabled(!enabled));
 range.addEventListener('input',()=>{
  const angle=clampAngle(range.value);range.setAttribute('aria-valuetext',angle===0?'정면':`${angle<0?'왼쪽':'오른쪽'} ${Math.abs(angle)}도`);
  for(const viewer of Object.values(viewers))viewer.setLightAngle(angle);
 });
 row.addEventListener('keydown',event=>{if(event.key==='Escape'&&enabled){event.preventDefault();event.stopPropagation();setEnabled(false);button.focus();}});
 return {button,range,panel};
}
