import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../assets/adaptive-nav-paper.js',import.meta.url),'utf8');
const {createAdaptiveNavPaper}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

function fixture(){
  const stats={reads:0,bounds:0,writes:0};
  const bounds={left:0,top:0,width:1280,height:720};
  const stage={getBoundingClientRect(){stats.bounds++;return bounds;},style:{setProperty(){stats.writes++;}}};
  const nav={getBoundingClientRect(){stats.bounds++;return {left:20,top:20,width:120,height:30};}};
  const previous=globalThis.document;
  globalThis.document={createElement(){return {getContext(){return {drawImage(){},getImageData(){stats.reads++;return {data:new Uint8ClampedArray([40,40,40,255])};}};}};}};
  const paper=createAdaptiveNavPaper(stage,{width:2560,height:1440},nav);
  globalThis.document=previous;
  return {paper,stats};
}

test('display refreshes keep canvas readbacks within a 400 ms budget',()=>{
  const {paper,stats}=fixture();
  for(let now=0;now<=1000;now+=10)paper.tick(now,.01,true);
  assert.equal(stats.reads,3);
  assert.equal(stats.bounds,6);
  assert.ok(paper.proof().opacity>0,'contrast continues to ease between samples');
});

test('a known unchanged frame needs no repeat readback; a changed frame is sampled',()=>{
  const {paper,stats}=fixture();
  paper.tick(0,.016,true,{frameKey:1});
  paper.tick(1000,.016,true,{frameKey:1});
  assert.equal(stats.reads,1);
  paper.tick(1001,.016,true,{frameKey:2});
  assert.equal(stats.reads,2);
  paper.tick(1100,.016,true,{frameKey:3});
  assert.equal(stats.reads,2,'a new frame does not bypass the sampling budget');
  paper.tick(1401,.016,true,{frameKey:3});
  assert.equal(stats.reads,3);
});

test('hidden navigation performs no layout, pixel read, or style write and resamples on reveal',()=>{
  const {paper,stats}=fixture();
  paper.tick(0,.016,true,{frameKey:1});
  const before={...stats};
  paper.tick(1000,.016,true,{visible:false,frameKey:1});
  assert.deepEqual(stats,before);
  paper.tick(1001,.016,true,{visible:true,frameKey:1});
  assert.equal(stats.reads,2);
});

test('omitting a frame key keeps animated transitions eligible for sampling',()=>{
  const {paper,stats}=fixture();
  paper.tick(0,.016,true,{frameKey:1});
  paper.tick(400,.016,true);
  paper.tick(800,.016,true);
  assert.equal(stats.reads,3);
});
