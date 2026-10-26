import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../assets/paper-color.js',import.meta.url),'utf8');
const {createPaperColor}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

function renderer(){
  const stats={uploads:0,draws:0,whiteSamples:0};
  const gl=new Proxy({
    getShaderParameter:()=>true,getProgramParameter:()=>true,
    getUniformLocation:(_,name)=>name,
    texImage2D:()=>{stats.uploads++;},drawArrays:()=>{stats.draws++;},
  },{get:(object,key)=>key in object?object[key]:()=>({})});
  const context={drawImage(){},getImageData(){
    stats.whiteSamples++;
    return {data:new Uint8ClampedArray(160*90*4).fill(240)};
  }};
  const previous=globalThis.document;
  globalThis.document={createElement(){return {width:0,height:0,addEventListener(){},getContext(type){return type==='webgl'?gl:context;}};}};
  const color=createPaperColor();
  return {stats,render(...args){return color.render(...args);},proof(){return color.proof();},restore(){globalThis.document=previous;}};
}

class Video extends EventTarget {
  tagName='VIDEO';videoWidth=1920;videoHeight=1080;currentTime=0;currentSrc='film.mp4';seeking=false;
  callbacks=new Map();serial=0;
  requestVideoFrameCallback(callback){const id=++this.serial;this.callbacks.set(id,callback);return id;}
  cancelVideoFrameCallback(id){this.callbacks.delete(id);}
  present(){const pending=[...this.callbacks.values()];this.callbacks.clear();for(const callback of pending)callback();}
}

test('refreshing the display does not upload the same decoded video frame again',()=>{
  const color=renderer(),video=new Video();
  try{
    color.render(video);
    for(let i=1;i<=10;i++){video.currentTime=i/120;color.render(video);}
    assert.equal(color.stats.uploads,1);
    video.present();color.render(video);
    assert.equal(color.stats.uploads,2);
    assert.equal(video.callbacks.size,1,'only one callback waits for the next frame');
  }finally{color.restore();}
});

test('seeking, reloading, and a new grade invalidate the cached pixels',()=>{
  const color=renderer(),video=new Video();
  try{
    color.render(video);
    video.dispatchEvent(new Event('seeked'));color.render(video);
    assert.equal(color.stats.uploads,2);
    video.dispatchEvent(new Event('emptied'));
    assert.equal(video.callbacks.size,0);
    video.dispatchEvent(new Event('loadeddata'));color.render(video);
    assert.equal(color.stats.uploads,3);
    assert.equal(video.callbacks.size,1);
    color.render(video,{saturation:.8});
    assert.equal(color.stats.draws,4,'grading changes remain visible without a new source frame');
    assert.equal(color.stats.uploads,3,'a new grade reuses the unchanged decoded texture');
    video.seeking=true;color.render(video,{saturation:.8});
    assert.equal(color.stats.uploads,4);
  }finally{color.restore();}
});

test('animated departure grades keep one raw white profile and reuse decoded pixels',()=>{
  const color=renderer(),video=new Video();
  try{
    for(let i=0;i<120;i++)color.render(video,{saturation:.8+i/600,gain:[1+i/1200,1,1]});
    assert.equal(color.proof().profiles,1);
    assert.equal(color.stats.whiteSamples,1,'the raw footage white is sampled once');
    assert.equal(color.stats.uploads,1,'uniform-only changes do not reupload the texture');
    assert.equal(color.stats.draws,120,'all animated grade changes are still rendered');
    video.present();color.render(video,{saturation:1});
    assert.equal(color.stats.uploads,2);
    assert.equal(color.stats.whiteSamples,1);
    video.currentSrc='next-film.mp4';video.dispatchEvent(new Event('loadeddata'));color.render(video);
    assert.equal(color.proof().profiles,2,'different footage receives its own white sample');
    assert.equal(color.stats.whiteSamples,2);
  }finally{color.restore();}
});

test('two media elements for the same URL never reuse each other’s rendered frame',()=>{
  const color=renderer(),first=new Video(),second=new Video();
  try{
    color.render(first);color.render(second);color.render(first);
    assert.equal(color.stats.uploads,3);
  }finally{color.restore();}
});

test('browsers without video frame callbacks keep time-based invalidation',()=>{
  const color=renderer(),video=new Video();video.requestVideoFrameCallback=undefined;
  try{
    color.render(video);color.render(video);
    assert.equal(color.stats.uploads,1);
    video.currentTime=1/30;color.render(video);
    assert.equal(color.stats.uploads,2);
  }finally{color.restore();}
});
