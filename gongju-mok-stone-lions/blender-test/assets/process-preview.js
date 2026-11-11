import {wheelPixels} from './journey-input.js?v=20261018-4';

// This embed intentionally does not import the Story, menu, dialogue or audio runtimes.
const params=new URLSearchParams(location.search);
document.body.replaceChildren();
document.body.dataset.processPreview='true';
document.body.dataset.processMotionTime='0';
document.body.dataset.stage='terrain';
const panel=document.createElement('div');
panel.id='cinemaDialogue';panel.hidden=true;panel.setAttribute('aria-hidden','true');
document.body.append(panel);
const panelEnabled=params.get('panel')!=='0';
const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
const emit=(name,detail)=>document.dispatchEvent(new CustomEvent(name,{detail}));
const cameraData=await fetch('./assets/town-camera.json?v=woodcutter-forward-20261018').then(response=>{
  if(!response.ok)throw new Error('Camera data unavailable');
  return response.json();
});

// The same authored camera tracks are scrubbed directly, without narrative entry screens.
const shots=[];
let duration=0;
function shot(kind,seconds,extra={}){
  shots.push({kind,start:duration,end:duration+seconds,...extra});duration+=seconds;
}
shot('entry',cameraData.entry.seconds);
for(let index=0;index<cameraData.routes.length;index++){
  shot('route',cameraData.routes[index].seconds,{index});
  if(index<5)shot('dialogue',4,{index});
}
shot('ending',72);

export const frames=Object.freeze([
  {name:'overview',label:'마을 전경',kind:'entry',progress:.12},
  {name:'merchant',label:'장사꾼',kind:'route',index:0,progress:1,dialogue:true},
  {name:'farmer',label:'농민',kind:'route',index:1,progress:1,dialogue:true},
  {name:'cook',label:'찬모',kind:'route',index:2,progress:1,dialogue:true},
  {name:'village',label:'민가와 골목',kind:'route',index:3,progress:.45},
  {name:'residents',label:'주민 삼총사',kind:'route',index:3,progress:1,dialogue:true},
  {name:'woodcutter',label:'나무꾼',kind:'route',index:4,progress:1,dialogue:true},
  {name:'lions',label:'두 석사자',kind:'route',index:5,progress:1},
  {name:'present',label:'현재의 석사자',kind:'ending',progress:1}
].map(frame=>Object.freeze(frame)));

let ready=false,current=0,target=0,animation=0;
function renderFrame(frame){
  panel.hidden=!(panelEnabled&&frame.dialogue);
  document.body.dataset.processShot=frame.name||frame.kind;
  if(frame.kind==='entry')emit('blender-entry-frame',{progress:clamp(frame.progress)});
  else if(frame.kind==='ending')emit('blender-ending-frame',(70+74*clamp(frame.progress))/144);
  else emit('blender-route-frame',{index:frame.index,time:clamp(frame.progress)*150,dialogue:!!frame.dialogue});
}
function renderProgress(value){
  current=target=clamp(value);
  const elapsed=current*duration;
  const part=shots.find(item=>elapsed<item.end)||shots.at(-1);
  const progress=clamp((elapsed-part.start)/(part.end-part.start));
  renderFrame({...part,progress:part.kind==='dialogue'?1:progress,dialogue:part.kind==='dialogue'});
  document.body.dataset.processProgress=current.toFixed(6);
}
function frameProgress(frame){
  const part=shots.find(item=>item.kind===(frame.dialogue?'dialogue':frame.kind)&&item.index===frame.index);
  return part?(part.start+(part.end-part.start)*(frame.dialogue ? .5 : clamp(frame.progress)))/duration:0;
}
function settle(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
async function setFrame(nameOrFrame,{motionTime=0}={}){
  await loaded;
  const frame=typeof nameOrFrame==='string'?frames.find(item=>item.name===nameOrFrame):nameOrFrame;
  if(!frame||!['entry','route','ending'].includes(frame.kind))throw new Error('Unknown Blender process frame');
  if(animation){cancelAnimationFrame(animation);animation=0;}
  current=target=frameProgress(frame);
  document.body.dataset.processProgress=current.toFixed(6);
  document.body.dataset.processMotionTime=String(Number(motionTime)||0);
  renderFrame(frame);
  await settle();
  return {...frame,progress:clamp(frame.progress),timelineProgress:current};
}
async function setProgress(value,{motionTime=0}={}){
  await loaded;
  if(animation){cancelAnimationFrame(animation);animation=0;}
  document.body.dataset.processMotionTime=String(Number(motionTime)||0);
  renderProgress(value);
  await settle();
  return current;
}
function animate(){
  animation=0;
  const destination=target;
  const next=Math.abs(destination-current)<.00005?destination:current+(destination-current)*.18;
  renderProgress(next);target=destination;
  if(current!==target)animation=requestAnimationFrame(animate);
}
function move(delta){
  if(!ready)return;
  target=clamp(target+delta);
  if(!animation)animation=requestAnimationFrame(animate);
}
addEventListener('wheel',event=>{
  if(event.ctrlKey)return;
  event.preventDefault();move(wheelPixels(event,innerHeight)/8000);
},{passive:false});
let drag=null;
addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  drag={id:event.pointerId,y:event.clientY};
  document.documentElement.setPointerCapture(event.pointerId);event.preventDefault();
});
addEventListener('pointermove',event=>{
  if(drag?.id!==event.pointerId)return;
  move((drag.y-event.clientY)/Math.max(1,innerHeight*10));drag.y=event.clientY;event.preventDefault();
});
function release(event){
  if(drag?.id!==event.pointerId)return;
  drag=null;
  if(document.documentElement.hasPointerCapture(event.pointerId))document.documentElement.releasePointerCapture(event.pointerId);
}
addEventListener('pointerup',release);addEventListener('pointercancel',release);
addEventListener('keydown',event=>{
  if(!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(event.key))return;
  event.preventDefault();
  if(event.key==='Home')setProgress(0);
  else if(event.key==='End')setProgress(1);
  else move(['ArrowDown','ArrowRight'].includes(event.key) ? .015 : -.015);
});

const loaded=import('./blender-spatial-view.js?v=process-preview-20261111').then(()=>{
  ready=true;document.body.dataset.processReady='true';
});
window.blenderProcessPreview=Object.freeze({ready:loaded,frames,setFrame,setProgress,get progress(){return current;}});
document.addEventListener('blender-process-frame',event=>setFrame(event.detail));
document.addEventListener('blender-process-progress',event=>setProgress(event.detail));
await loaded;
const initial=frames.find(frame=>frame.name===params.get('frame'))||frames[0];
await setFrame(initial);
document.dispatchEvent(new CustomEvent('blender-process-ready',{detail:{frames}}));
