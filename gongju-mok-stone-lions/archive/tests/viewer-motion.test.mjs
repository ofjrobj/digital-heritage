import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createViewportBuffer,framingBlend} from '../viewer-motion.js';
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
