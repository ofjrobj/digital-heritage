import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import * as THREE from '../vendor/three/three.module.js';
import {levelScan,createInspectionFraming} from '../scan-framing.js';
import {createFramingTransition} from '../viewer-motion.js';

const orbitSource=(await readFile(new URL('../vendor/addons/controls/OrbitControls.js',import.meta.url),'utf8'))
 .replace("from 'three'",`from '${new URL('../vendor/three/three.module.js',import.meta.url).href}'`);
const {OrbitControls}=await import(`data:text/javascript;base64,${Buffer.from(orbitSource).toString('base64')}`);
const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
const startHandler=app.slice(app.indexOf("controls.addEventListener('start',()=>{"),app.indexOf('  function animate('));
const decoderModule={exports:{}};
vm.runInNewContext(await readFile(new URL('../vendor/draco/draco_decoder.js',import.meta.url),'utf8'),{
 module:decoderModule,exports:decoderModule.exports,require:createRequire(import.meta.url),
 __dirname:fileURLToPath(new URL('../vendor/draco/',import.meta.url)),console,process,setTimeout,clearTimeout,performance
});
const draco=await decoderModule.exports({});
globalThis.document={documentElement:{dataset:{}}};
globalThis.innerHeight=900;

async function scanGeometry(sex){
 const bytes=await readFile(new URL(`../models/${sex}-continuous.glb`,import.meta.url));
 const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength));
 const primitive=gltf.meshes[0].primitives[0].extensions.KHR_draco_mesh_compression;
 const view=gltf.bufferViews[primitive.bufferView],start=28+jsonLength+(view.byteOffset||0);
 const encoded=bytes.subarray(start,start+view.byteLength);
 const decoder=new draco.Decoder(),buffer=new draco.DecoderBuffer(),mesh=new draco.Mesh(),values=new draco.DracoFloat32Array();
 try{
  buffer.Init(encoded,encoded.length);
  assert.ok(decoder.DecodeBufferToMesh(buffer,mesh).ok());
  decoder.GetAttributeFloatForAllPoints(mesh,decoder.GetAttributeByUniqueId(mesh,primitive.attributes.POSITION),values);
  const positions=new Float32Array(values.size());
  for(let i=0;i<positions.length;i++)positions[i]=values.GetValue(i);
  return new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(positions,3));
 }finally{for(const resource of [values,mesh,buffer,decoder])draco.destroy(resource);}
}

for(const sex of ['male','female'])test(`${sex}: interrupting actual scan presets retains size through drag, wheel and resize`,async()=>{
 const camera=new THREE.PerspectiveCamera(34,1,.01,100);camera.position.set(2.7,1.15,3.6);
 camera.zoom=sex==='male'?1:1.25;camera.updateProjectionMatrix();
 const controls=new OrbitControls(camera,null);controls.enableDamping=true;controls.dampingFactor=.08;
 controls.enablePan=false;controls.zoomSpeed=.65;controls.minPolarAngle=.001;controls.maxPolarAngle=2.4;
 const element={id:`${sex}-scene`,dataset:{},getBoundingClientRect:()=>({width:600,height:600})};
 const mesh=new THREE.Mesh(await scanGeometry(sex),new THREE.MeshBasicMaterial());
 const model=levelScan(THREE,mesh,{sex,targetSize:sex==='male'?1.83:2.1,yaw:(sex==='male'?-3.902609:-140.445485)*Math.PI/180});
 const framing=createInspectionFraming(THREE,{camera,controls,element});framing.bind(model);framing.resize({width:600,height:600});controls.update();
 const useOrbitUp=up=>{camera.up.copy(up);controls._quat.setFromUnitVectors(camera.up,new THREE.Vector3(0,1,0));controls._quatInverse.copy(controls._quat).invert();};
 const context={camera,controls,useOrbitUp,element,goal:null,cameraTransition:null};
 vm.runInNewContext(startHandler,context);
 for(const [from,to] of [[null,1],[null,4],[2,1]]){
  camera.aspect=1;camera.updateProjectionMatrix();framing.resize({width:600,height:600});
  const initial=framing.focus(from);camera.position.copy(initial.position);controls.target.copy(initial.target);controls.update();
  const oldUp=camera.up.clone(),goal=framing.focus(to);goal.up=camera.up.clone();useOrbitUp(oldUp);
  const motion=createFramingTransition(THREE,camera.position,controls.target,{quaternion:camera.quaternion,up:camera.up});
  let pose;for(let frame=0;frame<3;frame++)pose=motion.sample(goal,1/60);
  camera.position.copy(pose.position);controls.target.copy(pose.target);camera.quaternion.copy(pose.quaternion);camera.up.copy(pose.up);
  context.goal=goal;context.cameraTransition=motion;
  const distance=camera.position.distanceTo(controls.target),orientation=camera.quaternion.clone();
  controls.dispatchEvent({type:'start'});controls.update();
  assert.equal(context.goal,null);assert.equal(context.cameraTransition,null);
  assert.ok(Math.abs(camera.position.distanceTo(controls.target)-distance)<1e-9,'starting a drag must not clamp the current wider view');
  assert.ok(orientation.angleTo(camera.quaternion)<1e-7,'starting a drag preserves the displayed orientation');
  const scale=controls._getZoomScale(-1);
  controls.dispatchEvent({type:'start'});controls._handleMouseWheel({deltaY:-1,clientX:0,clientY:0});
  assert.ok(Math.abs(camera.position.distanceTo(controls.target)-distance*scale)<1e-9,'a wheel tick applies only its requested zoom');
  camera.aspect=500/550;camera.updateProjectionMatrix();
  const resized=framing.resize({width:500,height:550});
  assert.ok(resized);
  camera.position.copy(resized.position);controls.target.copy(resized.target);
  const resizedDistance=camera.position.distanceTo(controls.target);controls.update();
  assert.ok(Math.abs(camera.position.distanceTo(controls.target)-resizedDistance)<1e-9,'resize does not reinstate a range that clamps the interrupted view');
  const fresh=framing.focus(to);
  assert.ok(Math.abs(controls.maxDistance-fresh.position.distanceTo(fresh.target)*3.2)<1e-9,'a later explicit selection restores the normal preset range');
 }
});
