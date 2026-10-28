import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from '../vendor/three/three.module.js';
import {createInspectionFraming} from '../scan-framing.js';

const source=await readFile(new URL('../scan-compare.js',import.meta.url),'utf8');
const focusSource=source.slice(source.indexOf('  function focusPart('),source.indexOf("  controls.addEventListener('start'"));
globalThis.document={documentElement:{dataset:{archiveOverview:'expanded'}}};
globalThis.innerHeight=800;
function fixture(sex){
 const camera=new THREE.PerspectiveCamera(34,1,.01,100),controls={target:new THREE.Vector3()};
 camera.zoom=sex==='female'?1.25:1;camera.updateProjectionMatrix();
 const element={id:`${sex}-scene`,dataset:{},getBoundingClientRect:()=>({width:600,height:500})};
 const framing=createInspectionFraming(THREE,{camera,controls,element});
 const model=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.5,.65,30,30,30),new THREE.MeshBasicMaterial());
 framing.bind(model);framing.resize({width:600,height:500});
 const focusPart=vm.runInNewContext(`${focusSource};focusPart`,{framing});
 return {camera,controls,framing,focusPart};
}
for(const sex of ['male','female'])test(`${sex}: standalone beard context survives repeated window changes without accumulating zoom`,()=>{
 const {camera,controls,framing,focusPart}=fixture(sex);
 const base=framing.focus(1),baseRadius=base.position.distanceTo(base.target);
 let goal=focusPart(1);
 assert.ok(Math.abs(goal.position.distanceTo(goal.target)/baseRadius-1.35)<1e-10);
 for(const [width,height] of [[600,500],[420,500],[700,400],[320,480],[600,500]]){
  camera.position.copy(goal.position);controls.target.copy(goal.target);
  camera.aspect=width/height;camera.updateProjectionMatrix();
  goal=framing.resize({width,height},null)||goal;
  const baseline=framing.reference(1,width,height);
  const fittedRadius=baseline.position.distanceTo(goal.target);
  assert.ok(Math.abs(goal.position.distanceTo(goal.target)/fittedRadius-1.35)<1e-8);
 }
 const baseBack=framing.focus(2),back=focusPart(2);
 assert.ok(baseBack.position.distanceTo(back.position)<1e-10,'back preset remains unchanged');
 assert.ok(baseBack.target.distanceTo(back.target)<1e-10);
});
