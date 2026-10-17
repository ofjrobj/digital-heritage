import assert from 'node:assert/strict';
import {wheelPixels,inputDistance,motionCosts,limitedProgress,distanceProgress,chestProjection,WALK_SPEED} from './journey-input.js';
assert.equal(wheelPixels({deltaY:120,deltaMode:0}),120);
assert.equal(wheelPixels({deltaY:3,deltaMode:1}),120);
assert.equal(wheelPixels({deltaY:1,deltaMode:2},700),700);
assert(Math.abs(inputDistance(120)-1.8)<1e-9);assert(Math.abs(inputDistance(180,'drag')-1.8)<1e-9);
assert(Math.abs(inputDistance(-120)+1.8)<1e-9);assert(Math.abs(inputDistance(120)-Array.from({length:12},()=>inputDistance(10)).reduce((a,b)=>a+b,0))<1e-9);
for(const length of [40,100,180]){
 const frames=Array.from({length:241},(_,i)=>({p:[length*(i/240)**1.3,0,0],q:[Math.cos(i/240*Math.PI/4),0,0,Math.sin(i/240*Math.PI/4)]}));
 const costs=motionCosts(frames),distAt=p=>{const f=p*240,i=Math.min(239,Math.floor(f));return frames[i].p[0]+(frames[i+1].p[0]-frames[i].p[0])*(f-i);};
 const one=distanceProgress(costs,0,18);let many=0;for(let i=0;i<12;i++)many=distanceProgress(costs,many,1.5);
 assert(Math.abs(distAt(one)-18)<1e-6);assert(Math.abs(one-many)<1e-9);
 let a=0;for(let i=0;i<60;i++)a=limitedProgress(costs,a,1,1/60);assert(Math.abs(distAt(a)-WALK_SPEED)<1e-6);
 assert(Math.abs(distAt(distanceProgress(costs,one,-9))-9)<1e-6);
}
for(const [w,h,panel] of [[1440,900,660],[1920,1080,810],[390,844,540],[844,390,210]])for(const spread of [.15,.7]){const points=[{kind:'head',x:-spread,y:.15},{kind:'head',x:spread,y:.15},{kind:'chest',x:-spread,y:-.15},{kind:'chest',x:spread,y:-.15}];const f=chestProjection(points,w,h,panel,45);const chest=(1-(f.scale*-.15-f.offset))*h/2,head=(1-(f.scale*.15-f.offset))*h/2;assert(Math.abs(chest-panel)<.001);assert(head>=45);assert(f.scale*spread/(w/h)<.87);}
console.log('PASS: event partition invariance, equal metres per input, fixed 6.75m/s at three route lengths, reverse input, responsive chest framing');
