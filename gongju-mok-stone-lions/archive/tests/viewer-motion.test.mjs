import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createViewportBuffer,framingBlend,createFramingTransition,createViewportZoom} from '../viewer-motion.js';
import {createInspectionFraming} from '../scan-framing.js';

test('a grid enlargement keeps its drawing buffer until layout settles',()=>{
  const buffer=createViewportBuffer();
  buffer.request(600,400,0);
  assert.deepEqual(buffer.consume(0),{width:600,height:400});
  for(let frame=1;frame<=50;frame++){
    buffer.request(600,400+frame*4,frame*16);
    assert.equal(buffer.consume(frame*16),null);
  }
  assert.equal(buffer.consume(919),null);
  assert.deepEqual(buffer.consume(920),{width:600,height:600});
  assert.equal(buffer.consume(1000),null);
});

test('subpixel observation noise and hidden viewports do not reset the buffer',()=>{
  const buffer=createViewportBuffer();
  buffer.request(600.1,400.1,0);buffer.consume(0);
  buffer.request(600.2,400.2,16);
  buffer.request(0,0,32);
  buffer.request(NaN,400,48);
  assert.equal(buffer.consume(1000),null);
});

test('framing easing is monotone, independent of display refresh rate, and honors reduced motion',()=>{
  const travel=hz=>{
    let value=0;
    for(let frame=0;frame<hz;frame++){
      const next=value+(1-value)*framingBlend(1/hz);
      assert.ok(next>value&&next<1);value=next;
    }
    return value;
  };
  assert.ok(Math.abs(travel(60)-travel(120))<1e-12);
  assert.equal(framingBlend(1/60,true),1);
});

test('layout travel eases into and out of the shortest orbit without crossing the model',()=>{
 const point=degrees=>new THREE.Vector3(Math.cos(degrees*Math.PI/180),0,Math.sin(degrees*Math.PI/180)).multiplyScalar(3);
 const target=new THREE.Vector3(),start=point(350),goal={position:point(10),target};
 const motion=createFramingTransition(THREE,start,target),steps=[];
 let previous=start,travel=0,pose;
 for(let i=0;i<90;i++){
  pose=motion.sample(goal,1/60);
  const angle=previous.clone().normalize().angleTo(pose.position.clone().normalize());
  steps.push(angle);travel+=angle;previous=pose.position;
  assert.ok(Math.abs(pose.position.length()-3)<1e-9,'the path keeps its orbit radius');
 }
 assert.ok(Math.abs(travel-20*Math.PI/180)<1e-6,'rotation takes the 20-degree path');
 assert.ok(steps[0]<Math.max(...steps)*.02,'there is no fast first-frame whip');
 assert.ok(pose.done);assert.ok(pose.position.distanceTo(goal.position)<1e-9);
});

test('guide collapse preserves the rendered world-to-pixel scale while actual window resizing remains responsive',()=>{
 const zoom=createViewportZoom(1.25),initial=zoom.at(350,800)*350;
 for(const height of [400,450,525])assert.ok(Math.abs(zoom.at(height,800)*height-initial)<1e-9);
 assert.ok(Math.abs(zoom.at(400,600)*400-initial*.75)<1e-9);
});

test('large scale changes receive more travel time with a quiet start and finish',()=>{
 const run=distance=>{
  const target=new THREE.Vector3(),start=new THREE.Vector3(0,0,4);
  const motion=createFramingTransition(THREE,start,target);
  const goal={position:new THREE.Vector3(0,0,distance),target},steps=[];
  let before=4,pose;
  for(let frame=0;frame<600;frame++){
   pose=motion.sample(goal,1/60);
   const radius=pose.position.distanceTo(pose.target);
   steps.push(before-radius);before=radius;
   if(pose.done)break;
  }
  assert.ok(pose.done);
  assert.ok(steps.every(step=>step>=-1e-9),'zoom never reverses direction');
  assert.ok(steps[0]<Math.max(...steps)*.03,'start eases in');
  assert.ok(steps.at(-1)<Math.max(...steps)*.03,'finish eases out');
  return steps.length;
 };
 assert.ok(run(1)>run(3),'a fourfold close-up is slower than a nearby size adjustment');
});

test('entering and leaving the authored back view keeps the horizontal screen axis level',()=>{
 for(const roll of [-.37,-3.63]){
  const target=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),overview=new THREE.Vector3(2.7,1.15,3.6);
  const r=THREE.MathUtils.degToRad(roll),backUp=new THREE.Vector3(0,Math.cos(r),Math.sin(r));
  const back=new THREE.Vector3(-.002,backUp.y,backUp.z).normalize().multiplyScalar(4);
  for(const [start,initialUp,goal] of [[overview,up,{position:back,target,up:backUp}],[back,backUp,{position:overview,target,up}]]){
   const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(start,target,initialUp));
   const motion=createFramingTransition(THREE,start,target,{quaternion:q,up:initialUp});let pose,maxRoll=0;
   for(let frame=0;frame<600;frame++){
    pose=motion.sample(goal,1/60);
    maxRoll=Math.max(maxRoll,Math.abs(new THREE.Vector3(1,0,0).applyQuaternion(pose.quaternion).y));
    if(pose.done)break;
   }
   assert.ok(maxRoll<.25,`sideways tilt is limited, measured sine ${maxRoll}`);
   assert.ok(pose.done);assert.ok(pose.position.distanceTo(goal.position)<1e-9);
  }
 }
});

test('a layout-only resize of the top view leaves its angle unchanged',()=>{
 const target=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),start=new THREE.Vector3(-.002,4,0);
 const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(start,target,up));
 const motion=createFramingTransition(THREE,start,target,{quaternion:q,up});
 for(let frame=0;frame<80;frame++){
  const pose=motion.sample({position:start.clone().multiplyScalar(1.2),target,up},1/60);
  assert.ok(q.angleTo(pose.quaternion)<1e-7);
 }
});

test('a back-view turn rotates yaw and pitch together without an intermediate stop or scale reversal',()=>{
 const target=new THREE.Vector3(),start=new THREE.Vector3(2.7,1.15,3.6),up=new THREE.Vector3(0,1,0);
 const goalUp=new THREE.Vector3(0,Math.cos(-.063),Math.sin(-.063));
 const goal={position:new THREE.Vector3(-.002,goalUp.y,goalUp.z).normalize().multiplyScalar(3),target,up:goalUp};
 const initial=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(start,target,up));
 const initialAngles=new THREE.Euler().setFromQuaternion(initial,'YZX');
 const final=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(goal.position,target,goalUp));
 const finalAngles=new THREE.Euler().setFromQuaternion(final,'YZX');
 const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
 const motion=createFramingTransition(THREE,start,target,{quaternion:initial,up});
 let previous=initial,previousRadius=start.length(),pose;const steps=[];
 for(let i=0;i<600;i++){
  pose=motion.sample(goal,1/60);const angles=new THREE.Euler().setFromQuaternion(pose.quaternion,'YZX');
  const yaw=delta(initialAngles.y,angles.y)/delta(initialAngles.y,finalAngles.y);
  const pitch=delta(initialAngles.x,angles.x)/delta(initialAngles.x,finalAngles.x);
  assert.ok(Math.abs(yaw-pitch)<1e-6,'yaw and pitch use the same continuous progress');
  const radius=pose.position.distanceTo(pose.target);assert.ok(radius<=previousRadius+1e-9,'no pullback followed by a second zoom direction');previousRadius=radius;
  steps.push(previous.angleTo(pose.quaternion));previous=pose.quaternion;
  if(pose.done)break;
 }
 const middle=steps.slice(Math.floor(steps.length*.2),Math.ceil(steps.length*.8));
 assert.ok(Math.min(...middle)>Math.max(...steps)*.3,'the middle of the turn never pauses');
 assert.ok(pose.done);assert.ok(pose.quaternion.angleTo(final)<1e-7);
});

test('retargeting starts at the displayed pose and reduced motion settles immediately',()=>{
 const target=new THREE.Vector3(),goal={position:new THREE.Vector3(0,3,0),target};
 const moving=createFramingTransition(THREE,new THREE.Vector3(3,0,0),target);
 let pose;for(let i=0;i<20;i++)pose=moving.sample(goal,1/60);
 const next={position:new THREE.Vector3(0,0,-2),target:new THREE.Vector3(.2,.1,0)};
 const retargeted=createFramingTransition(THREE,pose.position,pose.target);
 const first=retargeted.sample(next,0);
 assert.ok(first.position.distanceTo(pose.position)<1e-9);
 assert.ok(first.target.distanceTo(pose.target)<1e-9);
 const reduced=retargeted.sample(next,1/60,true);
 assert.ok(reduced.done);assert.ok(reduced.position.distanceTo(next.position)<1e-9);
});

function fixture(width,height,id='male-scene'){
  const camera=new THREE.PerspectiveCamera(34,600/600,.01,100);
  const controls={target:new THREE.Vector3()};
  const element={id,dataset:{},getBoundingClientRect:()=>({width:600,height:600})};
  const framing=createInspectionFraming(THREE,{camera,controls,element});
  const model=new THREE.Mesh(new THREE.BoxGeometry(width,height,.65),new THREE.MeshBasicMaterial());
  framing.bind(model);framing.resize({width:600,height:600},null);
  return {camera,controls,element,framing,model};
}

globalThis.document={documentElement:{dataset:{archiveOverview:'hint'}}};
globalThis.innerHeight=900;

test('matching overview heights changes camera destinations without changing scan geometry',()=>{
  const male=fixture(1.8,1.5),female=fixture(2.4,1,'female-scene');
  const oldPosition=male.camera.position.clone(),oldScale=male.model.scale.clone();
  const height=Math.min(male.framing.naturalOverviewHeight(),female.framing.naturalOverviewHeight());
  for(const viewer of [male,female]){
    viewer.framing.setOverviewHeight(height);
    const goal=viewer.framing.resize({width:600,height:600},null);
    if(goal)viewer.camera.position.copy(goal.position);
  }
  const heights=[male,female].map(v=>Number(v.element.dataset.framedPixels.split(',')[1]));
  assert.ok(Math.abs(heights[0]-heights[1])<.2,heights.join(' vs '));
  assert.ok(male.camera.position.distanceTo(oldPosition)>.1);
  assert.deepEqual(male.model.scale,oldScale);
});

test('expanded layout and late pair fitting produce goals instead of camera jumps',()=>{
  document.documentElement.dataset.archiveOverview='hint';
  const viewer=fixture(1.8,1.5),before=viewer.camera.position.clone();
  document.documentElement.dataset.archiveOverview='expanded';
  let goal=viewer.framing.resize({width:600,height:750},null);
  assert.deepEqual(viewer.camera.position,before);
  assert.ok(goal);
  viewer.framing.setOverviewHeight(viewer.framing.naturalOverviewHeight()*.8);
  goal=viewer.framing.resize({width:600,height:750},goal);
  assert.deepEqual(viewer.camera.position,before);
  assert.ok(goal.position.distanceTo(before)>.01);
  document.documentElement.dataset.archiveOverview='hint';
});

test('a single visible sculpture uses its own available area and restores comparison sizing on return',()=>{
 for(const index of [null,1,2,4]){
  const viewer=fixture(1.8,1.5);
  let goal=viewer.framing.focus(index);
  viewer.camera.position.copy(goal.position);viewer.controls.target.copy(goal.target);
  const available=viewer.framing.naturalFramingHeight();
  viewer.framing.setFramingHeight(available*.55);
  goal=viewer.framing.resize({width:600,height:600},null);
  if(goal){viewer.camera.position.copy(goal.position);viewer.controls.target.copy(goal.target);}
  const sharedRadius=viewer.camera.position.distanceTo(viewer.controls.target),before=viewer.camera.position.clone();
  assert.equal(viewer.framing.setComparisonEnabled(false),true);
  goal=viewer.framing.resize({width:600,height:600},null);
  assert.deepEqual(viewer.camera.position,before,'single-view fitting returns an eased destination, never a camera jump');
  assert.ok(goal.position.distanceTo(goal.target)<sharedRadius*.8,'the hidden peer no longer limits the visible scan');
  viewer.camera.position.copy(goal.position);viewer.controls.target.copy(goal.target);
  viewer.framing.setComparisonEnabled(true);
  goal=viewer.framing.resize({width:600,height:600},null);
  assert.ok(Math.abs(goal.position.distanceTo(goal.target)-sharedRadius)<1e-6,'paired comparison resumes at its preserved height');
 }
});

test('guide removal cannot increase the paired overview budget or trigger repeated matching adjustments',()=>{
 document.documentElement.dataset.archiveOverview='hint';
 const viewer=fixture(1.8,1.5),zoom=createViewportZoom(viewer.camera.zoom);
 viewer.camera.zoom=zoom.at(600,innerHeight);
 viewer.framing.setOverviewHeight(viewer.framing.naturalOverviewHeight());
 viewer.framing.resize({width:600,height:600},null);
 const before=Number(viewer.element.dataset.framedPixels.split(',')[1]);
 document.documentElement.dataset.archiveOverview='expanded';
 for(const height of [700,800,900]){
  viewer.camera.aspect=600/height;viewer.camera.zoom=zoom.at(height,innerHeight);viewer.camera.updateProjectionMatrix();
  const goal=viewer.framing.resize({width:600,height},null);
  if(goal){viewer.camera.position.copy(goal.position);viewer.controls.target.copy(goal.target);}
  viewer.framing.setOverviewHeight(viewer.framing.naturalOverviewHeight());
  viewer.framing.resize({width:600,height},null);
  const after=Number(viewer.element.dataset.framedPixels.split(',')[1]);
  assert.ok(after<=before+.2,`${before} px should not grow to ${after} px after the guide folds`);
  assert.equal(viewer.framing.setOverviewHeight(viewer.framing.naturalOverviewHeight()),false,'matching reaches a stable value');
 }
 document.documentElement.dataset.archiveOverview='hint';
});
