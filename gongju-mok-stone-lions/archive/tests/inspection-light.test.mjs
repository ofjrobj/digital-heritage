import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {lightPositionAt,createInspectionLight,mountInspectionLight} from '../inspection-light.js';

test('direction changes remain in front of the camera and preserve elevation and distance',()=>{
 const base=new THREE.Vector3(-3,4,5),radius=Math.hypot(3,5);
 for(const angle of [-100,-85,0,85,100]){
  const [x,y,z]=lightPositionAt(angle,base);
  assert.equal(y,4);assert.ok(z>0);assert.ok(Math.abs(Math.hypot(x,z)-radius)<1e-10);
 }
 assert.equal(lightPositionAt(0,base)[0],0);
 assert.ok(lightPositionAt(-85,base)[0]<0);
 assert.ok(lightPositionAt(85,base)[0]>0);
});

test('switching off restores the exact original light without changing its color or intensity',()=>{
 const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(-3,4,5);
 const element={dataset:{lighting:'fixed-neutral-key-chin-fill'}},before=key.position.clone();let redraws=0;
 const lighting=createInspectionLight(key,element,()=>redraws++);
 lighting.setEnabled(true);assert.deepEqual(key.position,before,'opening the control does not jump the light');
 lighting.setAngle(60);const adjusted=key.position.clone();assert.ok(adjusted.x>0);
 lighting.setEnabled(false);assert.deepEqual(key.position,before);
 assert.equal(element.dataset.lighting,'fixed-neutral-key-chin-fill');
 assert.equal(key.intensity,2.4);assert.equal(key.color.getHex(),0xffffff);
 lighting.setEnabled(true);assert.deepEqual(key.position,adjusted,'reopening keeps the chosen angle');
 assert.ok(redraws>=4);
});

class Element extends EventTarget{
 constructor(tag){super();this.tagName=tag;this.attributes={};this.children=[];this.dataset={};this.style={setProperty:()=>{}};}
 setAttribute(key,value){this.attributes[key]=String(value);}
 getAttribute(key){return this.attributes[key];}
 append(...nodes){for(const node of nodes){if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(n=>n!==node);this.children.push(node);node.parentNode=this;}}
 before(node){const parent=this.parentNode;parent.children.splice(parent.children.indexOf(this),0,node);node.parentNode=parent;}
 focus(){this.focused=true;}
 getBoundingClientRect(){return{x:0,y:0,width:30,height:30};}
 setPointerCapture(id){this.capture=id;}
 hasPointerCapture(id){return this.capture===id;}
 releasePointerCapture(){this.capture=null;}
}

const eventWith=(type,values={})=>Object.assign(new Event(type,{cancelable:true}),values);

test('the sun itself exposes the angle, controls both viewers with keys, and restores their lights on Escape',()=>{
 const previous=globalThis.document,previousObserver=globalThis.MutationObserver,root=new Element('div'),surface=new Element('button');surface.dataset.mode='relief';root.append(surface);
 globalThis.MutationObserver=class{constructor(callback){this.callback=callback;}observe(target){target.notifyMode=this.callback;}};
 globalThis.document={querySelector:()=>surface,createElement:tag=>new Element(tag)};
 try{
  const calls={male:[],female:[]},viewers=Object.fromEntries(Object.keys(calls).map(sex=>[sex,{setLightEnabled:v=>calls[sex].push(['enabled',v]),setLightAngle:v=>calls[sex].push(['angle',v])}]));
  const {button}=mountInspectionLight(viewers);
  assert.equal(button.getAttribute('role'),'slider');assert.equal(button.getAttribute('aria-label'),'빛 방향');
  assert.equal(button.getAttribute('aria-valuenow'),'-31');assert.equal(button.dataset.enabled,'false');
  button.dispatchEvent(new Event('click'));
  assert.equal(button.dataset.enabled,'true');
  button.dispatchEvent(eventWith('keydown',{key:'Home'}));
  assert.equal(button.getAttribute('aria-valuenow'),'0');
  button.dispatchEvent(eventWith('keydown',{key:'ArrowRight'}));
  assert.equal(button.getAttribute('aria-valuetext'),'오른쪽 5도, 조명 켜짐');
  button.dispatchEvent(eventWith('keydown',{key:'Escape'}));
  assert.equal(button.dataset.enabled,'false');
  assert.deepEqual(calls.male,[['enabled',true],['angle',0],['angle',5],['enabled',false]]);
  assert.deepEqual(calls.female,calls.male);
 }finally{globalThis.document=previous;globalThis.MutationObserver=previousObserver;}
});

test('a captured drag enables and clamps the light without the release click switching it off',()=>{
 const previous=globalThis.document,previousObserver=globalThis.MutationObserver,root=new Element('div'),surface=new Element('button');surface.dataset.mode='relief';root.append(surface);
 globalThis.MutationObserver=class{constructor(callback){this.callback=callback;}observe(target){target.notifyMode=this.callback;}};
 globalThis.document={querySelector:()=>surface,createElement:tag=>new Element(tag)};
 try{
  const {button}=mountInspectionLight({male:{setLightEnabled(){},setLightAngle(){}}});
  const pointer={pointerId:1,isPrimary:true,button:0};
  button.dispatchEvent(eventWith('pointerdown',{...pointer,clientX:15,clientY:15}));
  assert.equal(button.hasPointerCapture(1),true);
  button.dispatchEvent(eventWith('pointermove',{...pointer,clientX:100,clientY:15}));
  assert.equal(button.getAttribute('aria-valuenow'),'85');
  button.dispatchEvent(eventWith('pointerup',{...pointer,clientX:100,clientY:15}));
  assert.equal(button.hasPointerCapture(1),false);
  button.dispatchEvent(eventWith('click',{detail:1}));
  assert.equal(button.dataset.enabled,'true');
  button.dispatchEvent(eventWith('click',{detail:0}));
  assert.equal(button.dataset.enabled,'false','keyboard activation remains available immediately after dragging');
 }finally{globalThis.document=previous;globalThis.MutationObserver=previousObserver;}
});


test('the rotary light is available only in relief mode and leaving it restores normal lighting',()=>{
 const previous=globalThis.document,previousObserver=globalThis.MutationObserver,root=new Element('div'),surface=new Element('button');surface.dataset.mode='relief';root.append(surface);
 globalThis.MutationObserver=class{constructor(callback){this.callback=callback;}observe(target){target.notifyMode=this.callback;}};
 globalThis.document={querySelector:()=>surface,createElement:tag=>new Element(tag)};
 try{
  const calls=[];
  const {button}=mountInspectionLight({male:{setLightEnabled:value=>calls.push(value),setLightAngle(){}}});
  assert.equal(button.inert,false);assert.equal(button.parentNode.dataset.lightVisible,'true');
  button.dispatchEvent(new Event('click'));assert.equal(button.dataset.enabled,'true');
  surface.dataset.mode='normal-map';surface.notifyMode();
  assert.equal(button.inert,true);assert.equal(button.tabIndex,-1);assert.equal(button.getAttribute('aria-hidden'),'true');
  assert.equal(button.dataset.enabled,'false');assert.deepEqual(calls,[true,false]);
  surface.dataset.mode='color';surface.notifyMode();assert.equal(button.inert,true);
  surface.dataset.mode='relief';surface.notifyMode();
  assert.equal(button.inert,false);assert.equal(button.tabIndex,0);assert.equal(button.parentNode.dataset.lightVisible,'true');
 }finally{globalThis.document=previous;globalThis.MutationObserver=previousObserver;}
});

test('the brief rotation hint expires, dismisses on use and mode exit, and restarts on a fresh activation',()=>{
 const previous={document:globalThis.document,MutationObserver:globalThis.MutationObserver,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const root=new Element('div'),surface=new Element('button'),timers=new Map();let nextTimer=0;
 surface.dataset.mode='relief';root.append(surface);
 globalThis.MutationObserver=class{constructor(callback){this.callback=callback;}observe(target){target.notifyMode=this.callback;}};
 globalThis.document={querySelector:()=>surface,createElement:tag=>new Element(tag)};
 globalThis.setTimeout=(callback,delay)=>{const id=++nextTimer;timers.set(id,{callback,delay});return id;};
 globalThis.clearTimeout=id=>timers.delete(id);
 try{
  const {button,setEnabled}=mountInspectionLight({male:{setLightEnabled(){},setLightAngle(){}}});
  const hint=button.parentNode.children.find(node=>node.className==='inspection-hint');
  assert.equal(hint.textContent,'원을 잡고 돌려보세요');
  assert.equal(hint.getAttribute('aria-hidden'),'true','existing described-by help stays the accessible instruction');
  button.dispatchEvent(new Event('click'));
  assert.equal(hint.dataset.visible,'true');assert.equal(timers.size,1);
  const timer=[...timers.values()][0];assert.equal(timer.delay,2600);timer.callback();
  assert.equal(hint.dataset.visible,'false');assert.equal(timers.size,0);
  setEnabled(false);setEnabled(true);assert.equal(hint.dataset.visible,'true');
  button.dispatchEvent(eventWith('keydown',{key:'ArrowRight'}));
  assert.equal(hint.dataset.visible,'false');assert.equal(timers.size,0);
  setEnabled(false);setEnabled(true);
  const pointer={pointerId:1,isPrimary:true,button:0};
  button.dispatchEvent(eventWith('pointerdown',{...pointer,clientX:15,clientY:15}));
  button.dispatchEvent(eventWith('pointermove',{...pointer,clientX:20,clientY:15}));
  assert.equal(hint.dataset.visible,'false');assert.equal(timers.size,0);
  button.dispatchEvent(eventWith('pointerup',{...pointer,clientX:20,clientY:15}));
  setEnabled(false);setEnabled(true);
  surface.dataset.mode='color';surface.notifyMode();
  assert.equal(hint.dataset.visible,'false');assert.equal(timers.size,0);
 }finally{Object.assign(globalThis,previous);}
});
