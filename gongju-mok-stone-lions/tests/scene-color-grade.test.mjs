import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const js=await readFile(new URL('../assets/scene-color-grade.js',import.meta.url),'utf8');
const {sceneColorGrade}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const media=JSON.parse(await readFile(new URL('../selected-media.json',import.meta.url),'utf8'));
const turn=media.scenes.find(s=>s.id==='cook-trio'),cook=media.scenes.find(s=>s.id==='cook');
const at=(scene,time,clipIn=0)=>sceneColorGrade({scene,video:{currentTime:time+clipIn},clipIn});
test('cook dialogue stays unchanged, turn begins brightening only once the camera moves',()=>{
 assert.equal(at(cook,0),cook.colorGrade);assert.equal(at(cook,14),cook.colorGrade);
 assert.deepEqual(at(turn,0),at(turn,turn.departureGrade.start));
 assert.deepEqual(at(turn,0),at(turn,0,10));
 for(let i=1;i<=30;i++){
  const previous=at(turn,(i-1)*.1)||{},next=at(turn,i*.1)||{};
  for(const field of ['gain','shadowGain'])for(let c=0;c<3;c++)assert.ok((next[field]?.[c]??1)>=(previous[field]?.[c]??1));
 }
 assert.equal(at(turn,turn.departureGrade.until),turn.colorGrade);
 assert.equal(at(turn,20),turn.colorGrade);
});
test('returning through the turn reproduces the same grade without wall-clock history',()=>{
 const first=at(turn,1.5);at(turn,4);assert.deepEqual(at(turn,1.5),first);
 const scene={colorGrade:{gain:[1.1,1,1],shadowGain:[.95,.95,.95],saturation:1.05},departureGrade:{start:1,until:3,gain:[.8,.8,.8],shadowGain:[.7,.7,.7],saturation:.9}};
 const middle=at(scene,2);[.95,.9,.9].forEach((value,i)=>assert.ok(Math.abs(middle.gain[i]-value)<1e-12));assert.equal(at(scene,3),scene.colorGrade);
});
