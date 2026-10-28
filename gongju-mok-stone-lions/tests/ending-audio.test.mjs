import test from 'node:test';
import assert from 'node:assert/strict';
import {endingAudioGain} from '../assets/story-audio-mix.js';
import {ambienceTargets,createQuietAmbience} from '../assets/quiet-ambience.js';

test('all final sound fades smoothly to silence on the last source frame',()=>{
 const duration=18.5,fps=30,end=duration-1/fps;
 const state={finalScene:true,duration,fps};
 assert.equal(endingAudioGain({...state,time:end-4}),1);
 assert.equal(endingAudioGain({...state,time:end-2}),.5);
 let previous=1;
 for(let time=end-4;time<=end;time+=1/fps){
  const gain=endingAudioGain({...state,time});
  assert.ok(gain<=previous&&gain>=0);
  assert.ok(previous-gain<.015,'no abrupt volume step');
  previous=gain;
 }
 assert.equal(endingAudioGain({...state,time:end}),0);
 assert.equal(endingAudioGain({...state,time:duration,finished:true}),0);
});

test('the public season soundtrack obeys the shared ending gain',()=>{
 const state={scene:{id:'seasons'},active:true,sound:true,moving:true};
 for(const gain of [1,.5,0])assert.equal(ambienceTargets({...state,endingGain:gain}).seasons,.72*gain);
 assert.equal(ambienceTargets({...state,finished:true}).seasons,0);
});

test('replaying or returning to another scene restores the full sound envelope',()=>{
 assert.equal(endingAudioGain({finalScene:true,time:18.5,duration:18.5,finished:true}),0);
 assert.equal(endingAudioGain({finalScene:true,time:0,duration:18.5}),1);
 assert.equal(endingAudioGain({finalScene:false,time:100,duration:100}),1);
 assert.equal(endingAudioGain({}),1);
});


test('the slowed modern scene keeps its audio clock without repeated correction seeks',async()=>{
 const originalDocument=globalThis.document,tracks=[];
 globalThis.document={hidden:false,createElement(){let time=0,seeks=0;const audio={paused:true,volume:0,readyState:4,playbackRate:1,addEventListener(){},setAttribute(){},play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;},get currentTime(){return time;},set currentTime(value){time=value;seeks++;},advance(dt){if(!this.paused)time+=dt*this.playbackRate;},get seeks(){return seeks;}};tracks.push(audio);return audio;}};
 try{
  const ambience=createQuietAmbience({append(){}}),state={scene:{id:'seasons'},active:true,moving:true,sound:true,playbackRate:.75,dt:1/60,time:0,endingGain:1};
  ambience.tick(state);await Promise.resolve();await Promise.resolve();
  const season=tracks.find(a=>a.id==='quietAmbience-seasons');
  assert.equal(season.playbackRate,.75);
  for(let i=1;i<=300;i++){for(const a of tracks)a.advance(state.dt);state.time=i*state.dt*.75;ambience.tick(state);}
  assert.equal(season.seeks,1,'only the initial synchronization is needed');
  assert.ok(Math.abs(season.currentTime-state.time)<1e-8);
  ambience.tick({...state,finished:true,endingGain:0});
  for(const a of tracks){assert.equal(a.volume,0);assert.equal(a.paused,true);}
 }finally{globalThis.document=originalDocument;}
});
