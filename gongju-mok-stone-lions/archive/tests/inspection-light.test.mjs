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
 constructor(tag){super();this.tagName=tag;this.attributes={};this.children=[];this.dataset={};}
 setAttribute(key,value){this.attributes[key]=String(value);}
 getAttribute(key){return this.attributes[key];}
 append(...nodes){for(const node of nodes){if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(n=>n!==node);this.children.push(node);node.parentNode=this;}}
 before(node){const parent=this.parentNode;parent.children.splice(parent.children.indexOf(this),0,node);node.parentNode=parent;}
 focus(){this.focused=true;}
}

test('one accessible slider controls both viewers and Escape closes it and restores their lights',()=>{
 const previous=globalThis.document,root=new Element('div'),surface=new Element('button');root.append(surface);
 globalThis.document={querySelector:()=>surface,createElement:tag=>new Element(tag)};
 try{
  const calls={male:[],female:[]},viewers=Object.fromEntries(Object.keys(calls).map(sex=>[sex,{setLightEnabled:v=>calls[sex].push(['enabled',v]),setLightAngle:v=>calls[sex].push(['angle',v])}]));
  const {button,range,panel}=mountInspectionLight(viewers);
  assert.equal(panel.hidden,true);assert.equal(panel.inert,true);
  assert.equal(button.getAttribute('aria-controls'),panel.id);
  assert.equal(panel.children[0].htmlFor,range.id);
  button.dispatchEvent(new Event('click'));
  assert.equal(button.getAttribute('aria-expanded'),'true');assert.equal(panel.hidden,false);
  range.value='60';range.dispatchEvent(new Event('input'));
  assert.equal(range.getAttribute('aria-valuetext'),'오른쪽 60도');
  const escape=new Event('keydown',{cancelable:true});Object.defineProperty(escape,'key',{value:'Escape'});button.parentNode.dispatchEvent(escape);
  assert.equal(panel.hidden,true);assert.equal(panel.inert,true);assert.equal(button.focused,true);
  assert.deepEqual(calls.male,[['enabled',true],['angle',60],['enabled',false]]);
  assert.deepEqual(calls.female,calls.male);
 }finally{globalThis.document=previous;}
});
