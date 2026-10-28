import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three/three.module.js';
import {levelScan,createInspectionFraming} from '../scan-framing.js';
import {framingBlend} from '../viewer-motion.js';

// Use the exact OrbitControls version shipped by the viewer. Resolve its
// browser import-map entry without installing another Three.js version.
const orbitSource=(await readFile(new URL('../vendor/addons/controls/OrbitControls.js',import.meta.url),'utf8'))
 .replace("from 'three'",`from '${new URL('../vendor/three/three.module.js',import.meta.url).href}'`);
const {OrbitControls}=await import(`data:text/javascript;base64,${Buffer.from(orbitSource).toString('base64')}`);

globalThis.document={documentElement:{dataset:{}}};
globalThis.innerHeight=900;

function fixture(sex,width=2,height=1.4,depth=.7){
 const camera=new THREE.PerspectiveCamera(34,1,.01,100),controls={target:new THREE.Vector3()};
 camera.zoom=sex==='female'?1.25:1;camera.updateProjectionMatrix();
 const element={id:sex+'-scene',dataset:{},getBoundingClientRect:()=>({width:600,height:600})};
 const model=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth,30,30,30),new THREE.MeshBasicMaterial());
 const framing=createInspectionFraming(THREE,{camera,controls,element});
 framing.bind(model);framing.resize({width:600,height:600});
 return {framing,model,camera,controls};
}
const angles=goal=>{
 const direction=goal.position.clone().sub(goal.target).normalize();
 return {yaw:THREE.MathUtils.radToDeg(Math.atan2(direction.z,direction.x)),pitch:THREE.MathUtils.radToDeg(Math.asin(direction.y))};
};

test('overview and crown share one body direction across the aligned scans',()=>{
 const pair=[fixture('male'),fixture('female')];
 for(const index of [null,0]){
  const directions=pair.map(({framing})=>{
   const goal=framing.focus(index);
   return goal.position.clone().sub(goal.target).normalize();
  });
  assert.ok(directions[0].distanceTo(directions[1])<1e-10,'face yaw does not tilt the body comparison');
 }
});

test('back camera follows the measured body lean without rotating scan geometry',()=>{
 for(const [sex,roll] of [['male',-.37],['female',-3.63]]){
  const {framing,model,camera}=fixture(sex),rotation=model.quaternion.clone();
  const goal=framing.focus(2),direction=goal.position.clone().sub(goal.target).normalize();
  assert.ok(Math.abs(THREE.MathUtils.radToDeg(Math.atan2(direction.z,direction.y))-roll)<1e-8);
  const reference=framing.reference(2,600,600),headUp=new THREE.Vector3(1,0,0).transformDirection(reference.matrixWorldInverse);
  assert.ok(headUp.y>.999,'the long axis stays vertical in the back view');
  assert.ok(model.quaternion.equals(rotation));
  assert.ok(camera.up.distanceTo(new THREE.Vector3(0,1,0))>0);
  framing.focus(null);assert.deepEqual(camera.up.toArray(),[0,1,0]);
 }
});

test('beard and eyes look straight at each scan’s own frontal face plane',()=>{
 for(const [sex,yaw,pitch] of [['male',5,4],['female',-10,13]]){
  const {framing,model}=fixture(sex),vertices=Array.from(model.geometry.attributes.position.array);
  for(const index of [1,4]){
   const actual=angles(framing.focus(index));
   assert.ok(Math.abs(actual.yaw-yaw)<1e-8);
   assert.ok(Math.abs(actual.pitch-pitch)<1e-8);
  }
  assert.deepEqual(Array.from(model.geometry.attributes.position.array),vertices);
  assert.deepEqual(model.scale.toArray(),[1,1,1]);
 }
});

test('facial-feature portraits turn only twelve degrees from each frontal view',()=>{
 for(const [sex,offset] of [['male',12],['female',-12]]){
  const {framing}=fixture(sex),front=angles(framing.focus(4)),portrait=angles(framing.focus(3));
  assert.ok(Math.abs(portrait.yaw-front.yaw-offset)<1e-8);
  assert.ok(Math.abs(portrait.pitch-front.pitch)<1e-8);
 }
});

test('beard view fits the complete object from crown to feet',()=>{
 for(const sex of ['male','female']){
  const {framing,model}=fixture(sex),camera=framing.reference(1,600,600);
  const vertices=model.geometry.attributes.position;
  for(let i=0;i<vertices.count;i++){
   const p=new THREE.Vector3().fromBufferAttribute(vertices,i).project(camera);
   assert.ok(Math.abs(p.x)<.95&&Math.abs(p.y)<.95,'the full object stays within the viewport');
  }
 }
});

test('paired front views share crown and foot baselines despite different proportions and camera zoom',()=>{
 const pair=[fixture('male',1.8,1.5,.65),fixture('female',2.4,1,1.2)];
 const goals=pair.map(v=>v.framing.focus(1));
 const height=Math.min(...pair.map(v=>v.framing.naturalFramingHeight()));
 const bounds=pair.map((v,index)=>{
  v.framing.setFramingHeight(height);
  const goal=v.framing.resize({width:600,height:600},goals[index])||goals[index];
  v.camera.position.copy(goal.position);v.camera.lookAt(goal.target);v.camera.updateMatrixWorld(true);
  let top=Infinity,bottom=-Infinity;
  const vertices=v.model.geometry.attributes.position;
  for(let i=0;i<vertices.count;i++){
   const p=new THREE.Vector3().fromBufferAttribute(vertices,i).project(v.camera),y=(1-p.y)*300;
   top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  assert.ok(Math.abs((top+bottom)/2-300)<.1,'the visible silhouette is centred');
  return {top,bottom};
 });
 assert.ok(Math.abs(bounds[0].top-bounds[1].top)<.1);
 assert.ok(Math.abs(bounds[0].bottom-bounds[1].bottom)<.1);
});

test('face and eye framing includes the crown and excludes lower-body fitting points',()=>{
 const {framing}=fixture('male');
 for(const index of [3,4]){
  const goal=framing.focus(index);
  assert.ok(goal.target.y>.3,'focus moves above the body centre');
  assert.ok(Number.isFinite(goal.position.length()));
 }
});

test('rotated irregular scans are scaled and centred from their vertices, not a rotated empty box',()=>{
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([-2,-1,0,2,1,0,2,-1,1],3));
 const scan=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial()),yaw=-140*Math.PI/180;
 scan.rotation.y=yaw;
 const width=new THREE.Box3().setFromObject(scan,true).getSize(new THREE.Vector3()).x;
 const root=levelScan(THREE,scan,{yaw,targetSize:2.1,sex:'female'});
 assert.ok(Math.abs(scan.scale.x-2.1/width)<1e-10);
 assert.ok(new THREE.Box3().setFromObject(root,true).getCenter(new THREE.Vector3()).length()<1e-10);
 assert.deepEqual(Array.from(geometry.attributes.position.array),[-2,-1,0,2,1,0,2,-1,1]);
});

test('numbered selections cancel prior drag inertia and settle at the preset after rapid changes and resize',()=>{
 for(const sex of ['male','female']){
  const camera=new THREE.PerspectiveCamera(34,1,.01,100);
  camera.position.set(3,1,4);camera.zoom=sex==='female'?1.25:1;camera.updateProjectionMatrix();
  const controls=new OrbitControls(camera,null);
  controls.enableDamping=true;controls.dampingFactor=.08;controls.enablePan=false;
  controls.minPolarAngle=.001;controls.maxPolarAngle=2.4;
  const model=new THREE.Mesh(new THREE.BoxGeometry(2,1.4,.7,30,30,30),new THREE.MeshBasicMaterial());
  const framing=createInspectionFraming(THREE,{camera,controls,element:{id:sex+'-scene',dataset:{},getBoundingClientRect:()=>({width:600,height:600})}});
  framing.bind(model);framing.resize({width:600,height:600});
  let goal=null;
  const tick=()=>{
   if(goal){
    const blend=framingBlend(1/60,false);
    camera.position.lerp(goal.position,blend);controls.target.lerp(goal.target,blend);
    if(camera.position.distanceTo(goal.position)<.002&&controls.target.distanceTo(goal.target)<.002){camera.position.copy(goal.position);controls.target.copy(goal.target);goal=null;}
   }
   controls.update();
  };
  for(const index of [2,0,4,1,3]){
   // A fast drag left/down immediately followed by another feature button.
   controls._sphericalDelta.set(0,1.2,-.7);controls.update();
   goal=framing.focus(index);
   assert.equal(controls._sphericalDelta.theta,0);
   assert.equal(controls._sphericalDelta.phi,0);
   for(let step=0;step<4;step++)tick();
  }
  // The active transition must survive a tall, narrow resize as well.
  camera.aspect=280/540;camera.updateProjectionMatrix();
  goal=framing.resize({width:280,height:540},goal)||goal;
  for(let step=0;step<240;step++)tick();
  const expected=framing.reference(3,280,540);
  assert.ok(camera.position.clone().sub(controls.target).normalize().distanceTo(expected.position.clone().sub(framing.focus(3).target).normalize())<1e-7);
  camera.lookAt(controls.target);camera.updateMatrixWorld(true);
  assert.ok(camera.quaternion.angleTo(expected.quaternion)<1e-6,'both cameras return to their corresponding reference orientation');
  assert.deepEqual(camera.up.toArray(),[0,1,0],'the back-view up axis does not leak into facial views');
  for(const index of [0,1,2,3,4]){
   controls._sphericalDelta.set(0,-.9,.6);controls.update();
   goal=framing.focus(index);
   for(let step=0;step<240;step++)tick();
   const reference=framing.reference(index,280,540);
   assert.ok(camera.quaternion.angleTo(reference.quaternion)<1e-6,`${sex} feature ${index+1} restores its reference after independent dragging`);
  }
 }
});
