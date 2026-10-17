import assert from 'node:assert/strict';
import {wheelPixels,gestureProgress,motionCosts,limitedProgress,chestProjection} from './journey-input.js';
assert.equal(wheelPixels({deltaY:120,deltaMode:0}),120);
assert.equal(wheelPixels({deltaY:3,deltaMode:1}),120);
assert.equal(wheelPixels({deltaY:1,deltaMode:2},700),700);
for(const [kind,px] of [['wheel',100],['wheel',120],['drag',180],['drag',240]]){const gestures=Math.ceil(1/gestureProgress(px,kind));assert(gestures>=5&&gestures<=8,`${kind} ${gestures}`);}
assert(gestureProgress(10000)<.191);
const frames=Array.from({length:241},(_,i)=>({p:[i/24,0,0],q:[Math.cos(i/240*Math.PI/4),0,0,Math.sin(i/240*Math.PI/4)]}));
const costs=motionCosts(frames);let p=0,maxDistance=0,maxTurn=0;
for(let i=0;i<900;i++){const n=limitedProgress(costs,p,1,1/60);maxDistance=Math.max(maxDistance,(n-p)*10*60);maxTurn=Math.max(maxTurn,(n-p)*90*60);p=n;}
assert.equal(p,1);assert(maxDistance<=4.501);assert(maxTurn<=28.001);
assert(limitedProgress(costs,.5,0,1/60)<.5);
for(const [w,h,panel] of [[1440,900,660],[1920,1080,810],[390,844,540],[844,390,210]])for(const spread of [.15,.7]){const points=[{kind:'head',x:-spread,y:.15},{kind:'head',x:spread,y:.15},{kind:'chest',x:-spread,y:-.15},{kind:'chest',x:spread,y:-.15}];const f=chestProjection(points,w,h,panel,45);const chest=(1-(f.scale*-.15-f.offset))*h/2,head=(1-(f.scale*.15-f.offset))*h/2;assert(Math.abs(chest-panel)<.001);assert(head>=45);assert(f.scale*spread/(w/h)<.87);}
console.log('PASS: 5–8 gestures, input directions, translation/turn limits, chest crop at four viewport sizes');
