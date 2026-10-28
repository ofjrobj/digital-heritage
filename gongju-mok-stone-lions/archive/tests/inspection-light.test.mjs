import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {lightPositionAt,createInspectionLight,mountInspectionLight} from '../inspection-light.js';

test('light direction covers the full circle, including behind the model, without changing elevation or distance',()=>{
 const base=new THREE.Vector3(-3,4,5),radius=Math.hypot(3,5);
 const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} should equal ${expected}`);
 for(const angle of [-1081,-360,-100,-31,0,90,180,270,359,360,720,1081]){
  const position=lightPositionAt(angle,base),[x,y,z]=position;
  assert.equal(y,4);near(Math.hypot(x,z),radius);
  position.forEach((value,index)=>near(value,lightPositionAt(angle+360,base)[index]));
 }
 const cardinal=[[0,0,radius],[90,radius,0],[180,0,-radius],[270,-radius,0]];
 for(const [angle,x,z] of cardinal){const position=lightPositionAt(angle,base);near(position[0],x);near(position[2],z);}
 assert.ok(lightPositionAt(100,base)[2]<0,'the light can reach behind the model');
 assert.ok(lightPositionAt(-100,base)[2]<0,'back lighting is reachable in either direction');
 for(const invalid of [NaN,Infinity,-Infinity,'invalid'])assert.deepEqual(lightPositionAt(invalid,base),lightPositionAt(0,base));
});

test('rotary inspection preserves directional contrast and restores its exact original position, color and intensity when off',()=>{
 const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(-3,4,5);
 const element={dataset:{lighting:'fixed-neutral-key-chin-fill'}},before=key.position.clone();let redraws=0;
 const lighting=createInspectionLight(key,element,()=>redraws++);
 lighting.setEnabled(true);assert.deepEqual(key.position,before,'opening the control does not jump the light');
 assert.ok(Math.abs(key.intensity-2.64)<1e-12);assert.equal(key.color.getHex(),0xffffff);
 lighting.setAngle(60);const adjusted=key.position.clone();assert.ok(adjusted.x>0);
 lighting.setEnabled(false);assert.deepEqual(key.position,before);
 assert.equal(element.dataset.lighting,'fixed-neutral-key-chin-fill');
 assert.equal(key.intensity,2.4);assert.equal(key.color.getHex(),0xffffff);
 lighting.setEnabled(true);assert.deepEqual(key.position,adjusted,'reopening keeps the chosen angle');
 assert.ok(redraws>=4);
});

test('inspection keeps the key dominant over sky and lower fill and restores originals across repeated toggles',()=>{
 const scene=new THREE.Scene(),key=new THREE.DirectionalLight(0xffffff,1.8);
 key.position.set(-3,4,5);
 const hemisphere=new THREE.HemisphereLight(0xffffff,0x888888,.8),fill=new THREE.DirectionalLight(0xffffff,.65);
 scene.add(key,hemisphere,fill);
 const ground=hemisphere.groundColor.clone(),lighting=createInspectionLight(key,{dataset:{lighting:'original'}},()=>{});
 for(let i=0;i<3;i++){
  lighting.setEnabled(true);lighting.setAngle(180);
  assert.ok(key.intensity>1.8);assert.ok(hemisphere.intensity>=.8&&hemisphere.intensity<=1);assert.equal(fill.intensity,.65);
  assert.ok(key.intensity>hemisphere.intensity+fill.intensity,'directional light must dominate diffuse fill to reveal relief');
  assert.ok(hemisphere.groundColor.r>ground.r);
  lighting.setEnabled(false);
  assert.equal(key.intensity,1.8);assert.equal(hemisphere.intensity,.8);assert.equal(fill.intensity,.65);
  assert.deepEqual(hemisphere.groundColor,ground);
 }
});

test('turning inspection off restores the latest material lighting, not the creation-time color setup',()=>{
 const scene=new THREE.Scene(),key=new THREE.DirectionalLight(0xffffff,1.8),fill=new THREE.HemisphereLight(0xffffff,0x888888,.8);
 key.position.set(-3,4,5);scene.add(key,fill);
 const lighting=createInspectionLight(key,{dataset:{}},()=>{});
 key.intensity=2.4;fill.intensity=.6;
 lighting.setEnabled(true);lighting.setAngle(180);lighting.setEnabled(false);
 assert.equal(key.intensity,2.4);assert.equal(fill.intensity,.6);
});

class Element extends EventTarget{
 constructor(tag){super();this.tagName=tag;this.attributes={};this.children=[];this.dataset={};const styles=new Map();this.style={setProperty:(name,value)=>styles.set(name,value),getPropertyValue:name=>styles.get(name)};}
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
  assert.equal(button.dataset.tooltip,undefined,'no visible angle/status tooltip is added');
  assert.equal(button.getAttribute('title'),undefined);
  assert.equal(button.getAttribute('aria-valuemin'),'0');assert.equal(button.getAttribute('aria-valuemax'),'359');
  assert.equal(button.getAttribute('aria-valuenow'),'329');assert.equal(button.getAttribute('aria-valuetext'),'329도, 조명 꺼짐');assert.equal(button.dataset.enabled,'false');
  button.dispatchEvent(new Event('click'));
  assert.equal(button.dataset.enabled,'true');
  button.dispatchEvent(eventWith('keydown',{key:'Home'}));
  assert.equal(button.getAttribute('aria-valuenow'),'0');
  button.dispatchEvent(eventWith('keydown',{key:'ArrowRight'}));
  assert.equal(button.getAttribute('aria-valuetext'),'5도, 조명 켜짐');
  button.dispatchEvent(eventWith('keydown',{key:'Escape'}));
  assert.equal(button.dataset.enabled,'false');
  assert.deepEqual(calls.male,[['enabled',true],['angle',0],['angle',5],['enabled',false]]);
  assert.deepEqual(calls.female,calls.male);
 }finally{globalThis.document=previous;globalThis.MutationObserver=previousObserver;}
});

test('a captured centre drag enables full-circle lighting without the release click switching it off',()=>{
 const previous=globalThis.document,previousObserver=globalThis.MutationObserver,root=new Element('div'),surface=new Element('button');surface.dataset.mode='relief';root.append(surface);
 globalThis.MutationObserver=class{constructor(callback){this.callback=callback;}observe(target){target.notifyMode=this.callback;}};
 globalThis.document={querySelector:()=>surface,createElement:tag=>new Element(tag)};
 try{
  const {button}=mountInspectionLight({male:{setLightEnabled(){},setLightAngle(){}}});
  const pointer={pointerId:1,isPrimary:true,button:0};
  button.dispatchEvent(eventWith('pointerdown',{...pointer,clientX:15,clientY:15}));
  assert.equal(button.hasPointerCapture(1),true);
  button.dispatchEvent(eventWith('pointermove',{...pointer,clientX:100,clientY:15}));
  assert.equal(button.getAttribute('aria-valuenow'),'139');
  button.dispatchEvent(eventWith('pointerup',{...pointer,clientX:100,clientY:15}));
  assert.equal(button.hasPointerCapture(1),false);
  button.dispatchEvent(eventWith('click',{detail:1}));
  assert.equal(button.dataset.enabled,'true');
  button.dispatchEvent(eventWith('click',{detail:0}));
  assert.equal(button.dataset.enabled,'false','keyboard activation remains available immediately after dragging');
 }finally{globalThis.document=previous;globalThis.MutationObserver=previousObserver;}
});


test('keyboard steps wrap at zero, preserve accumulated rotation, and support Home and End',()=>{
 const previous=globalThis.document,previousObserver=globalThis.MutationObserver,root=new Element('div'),surface=new Element('button');surface.dataset.mode='relief';root.append(surface);
 globalThis.MutationObserver=class{constructor(callback){this.callback=callback;}observe(target){target.notifyMode=this.callback;}};
 globalThis.document={querySelector:()=>surface,createElement:tag=>new Element(tag)};
 try{
  const calls=[];
  const {button}=mountInspectionLight({male:{setLightEnabled(){},setLightAngle:value=>calls.push(value)}});
  const press=(key,expected,shiftKey=false)=>{
   const event=eventWith('keydown',{key,shiftKey});button.dispatchEvent(event);
   assert.equal(event.defaultPrevented,true);
   assert.equal(button.getAttribute('aria-valuenow'),String(expected));
   assert.equal(button.getAttribute('aria-valuetext'),`${expected}도, 조명 켜짐`);
  };
  press('Home',0);press('ArrowLeft',355);press('ArrowRight',0);
  press('ArrowDown',345,true);press('ArrowUp',0,true);
  press('End',359);press('ArrowRight',4);press('ArrowUp',19,true);
  press('ArrowDown',14);press('Home',0);
  assert.deepEqual(calls,[0,-5,0,-15,0,359,364,379,374,0]);
 }finally{globalThis.document=previous;globalThis.MutationObserver=previousObserver;}
});

test('rim dragging makes multiple continuous turns through 359/0 in both directions',()=>{
 const previous=globalThis.document,previousObserver=globalThis.MutationObserver,root=new Element('div'),surface=new Element('button');surface.dataset.mode='relief';root.append(surface);
 globalThis.MutationObserver=class{constructor(callback){this.callback=callback;}observe(target){target.notifyMode=this.callback;}};
 globalThis.document={querySelector:()=>surface,createElement:tag=>new Element(tag)};
 try{
  const calls=[];
  const {button,setAngle}=mountInspectionLight({male:{setLightEnabled(){},setLightAngle:value=>calls.push(value)}});
  const pointer={pointerId:1,isPrimary:true,button:0};
  const at=degrees=>{const radians=degrees*Math.PI/180;return{...pointer,clientX:15+13*Math.sin(radians),clientY:15-13*Math.cos(radians)};};
  setAngle(0);button.dispatchEvent(eventWith('pointerdown',at(0)));
  assert.equal(button.hasPointerCapture(1),true);
  const clockwise=[90,180,270,350,359,360,361,450,540,630,710,719,720,721,810,900,990,1070,1079,1080];
  const reverse=[990,900,810,730,721,720,719,630,540,450,370,361,360,359,270,180,90,10,1,0,-1];
  for(const angle of [...clockwise,...reverse]){
   button.dispatchEvent(eventWith('pointermove',at(angle)));
   const expected=((angle%360)+360)%360;
   assert.equal(button.getAttribute('aria-valuenow'),String(expected),`visible angle after ${angle} degrees`);
   assert.equal(calls.at(-1),angle,'viewer angle must remain continuous across full turns');
   assert.equal(button.style.getPropertyValue('--light-angle'),`${angle}deg`,'the dial must not spin backwards on wrapping');
  }
  button.dispatchEvent(eventWith('pointerup',at(-1)));
  assert.equal(button.hasPointerCapture(1),false);assert.equal(button.dataset.enabled,'true');
  button.dispatchEvent(eventWith('click',{detail:1}));assert.equal(button.dataset.enabled,'true');
 }finally{globalThis.document=previous;globalThis.MutationObserver=previousObserver;}
});


test('the rotary light is available in relief and normal-map modes and color restores the original lighting',()=>{
 const previous=globalThis.document,previousObserver=globalThis.MutationObserver,root=new Element('div'),surface=new Element('button');surface.dataset.mode='relief';root.append(surface);
 globalThis.MutationObserver=class{constructor(callback){this.callback=callback;}observe(target){target.notifyMode=this.callback;}};
 globalThis.document={querySelector:()=>surface,createElement:tag=>new Element(tag)};
 try{
  const calls=[];
  const {button}=mountInspectionLight({male:{setLightEnabled:value=>calls.push(value),setLightAngle(){}}});
  assert.equal(button.inert,false);assert.equal(button.parentNode.dataset.lightVisible,'true');
  button.dispatchEvent(new Event('click'));assert.equal(button.dataset.enabled,'true');
  surface.dataset.mode='normal-map';surface.notifyMode();
  assert.equal(button.inert,false);assert.equal(button.tabIndex,0);assert.equal(button.getAttribute('aria-hidden'),'false');
  assert.equal(button.dataset.enabled,'true');assert.deepEqual(calls,[true]);
  surface.dataset.mode='color';surface.notifyMode();
  assert.equal(button.inert,true);assert.equal(button.tabIndex,-1);assert.equal(button.getAttribute('aria-hidden'),'true');
  assert.equal(button.dataset.enabled,'false');assert.deepEqual(calls,[true,false]);
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
  assert.equal(hint.dataset.visible,'true','show the existing hint when the light control first appears');
  assert.equal(timers.size,1);
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
  surface.dataset.mode='relief';surface.notifyMode();
  assert.equal(hint.dataset.visible,'true','returning to an inspection mode briefly shows the existing instruction');
  assert.equal(timers.size,1);
 }finally{Object.assign(globalThis,previous);}
});
