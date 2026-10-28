import test from 'node:test';
import assert from 'node:assert/strict';
import {UI_MOTION_MS,UI_MOTION_SECONDS,uiMotionEase} from '../../assets/ui-motion.js';

test('UI JavaScript easing matches the CSS Bezier at known curve coordinates',()=>{
 assert.equal(UI_MOTION_MS,1000);assert.equal(UI_MOTION_SECONDS,1);
 for(const [x,y] of [[0,0],[.14359375,.47265625],[.30125,.78125],[.55828125,.94921875],[1,1]]){
  assert.ok(Math.abs(uiMotionEase(x)-y)<1e-6,`${x} should map to ${y}`);
 }
});

test('UI easing settles at its endpoints without overshoot or reversal',()=>{
 assert.equal(uiMotionEase(-1),0);assert.equal(uiMotionEase(2),1);
 let previous=0;
 for(let i=0;i<=100;i++){
  const value=uiMotionEase(i/100);assert.ok(value>=previous&&value<=1);previous=value;
 }
});
