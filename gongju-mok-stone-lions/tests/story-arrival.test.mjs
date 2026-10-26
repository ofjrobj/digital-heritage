import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {shouldStartApproach} from '../assets/dialogue-approach.js';
import {sourcePlaybackRate} from '../assets/scroll-motion.js';

const runtime=readFileSync(new URL('../assets/test-render-media.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../selected-media.json',import.meta.url),'utf8'));
function between(start,end){return runtime.slice(runtime.indexOf(start),runtime.indexOf(end,runtime.indexOf(start)));}
const arrivalCode=between('  // Read the newly presented position before release/', '  const departing=departureActive();');
const rateCode=between('function openingPlaybackRate(', 'function openingCaption(');
const fadeCode=between('function sourceEndFade(', '// Blend toward the actual following');
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ease=t=>t*t*(3-2*t);

function arrival(scene,mediaTime,{paused=false,release=false}={}){
  const video={currentTime:mediaTime,playbackRate:1.5,paused};
  const current={scene,video,clipIn:0,manualHeld:paused};
  const next=manifest.scenes[manifest.scenes.indexOf(scene)+1];
  const context=vm.createContext({
    current,v:video,s:scene,d:scene.duration,scenes:[scene,next],index:0,local:0,target:scene.autoFrom??scene.duration,
    allowed:true,ready:true,drawable:true,previewAuto:false,walkingDirection:1,now:1000,
    drag:{},lastWheelMoveAt:0,replacementOpening:true,
    scrollDriven:()=>!current.autoStarted,clamp,ease,sourcePlaybackRate,shouldStartApproach,
    footsteps:{stop(){}},walkingInput:{reset(){}},
    holdManualFrame(){if(release&&!current.autoStarted&&!current.approaching){current.manualHeld=true;video.paused=true;}},
  });
  vm.runInContext(rateCode+arrivalCode,context);return {current,context};
}

test('the visible lion approach hands off automatically even on the release frame',()=>{
  const scene=manifest.scenes.find(s=>s.id==='return-lions');
  assert.ok(scene.autoFrom>scene.duration*.5&&scene.autoFrom<scene.duration-2);
  const reached=arrival(scene,scene.autoFrom-1/scene.fps,{release:true});
  assert.equal(reached.current.autoStarted,true);
  assert.equal(reached.current.manualHeld,false);
  assert.equal(reached.context.drag,null);
  assert.equal(reached.context.local,scene.autoFrom-1/scene.fps);
  const stoppedAtMarker=arrival(scene,scene.autoFrom-1/scene.fps,{paused:true});
  assert.equal(stoppedAtMarker.current.autoStarted,true);
  assert.equal(stoppedAtMarker.current.manualHeld,false);
});

test('an ordinary early release does not start the final lion approach',()=>{
  const scene=manifest.scenes.find(s=>s.id==='return-lions');
  const early=arrival(scene,scene.autoFrom-.5,{release:true});
  assert.notEqual(early.current.autoStarted,true);
  assert.equal(early.current.manualHeld,true);
});

test('crossing a dialogue approach marker on release still owns the final approach',()=>{
  const scene=manifest.scenes.find(s=>s.id==='entry-merchant');
  const reached=arrival(scene,scene.dialogueApproach.start+.01,{release:true});
  assert.equal(reached.current.approaching,true);
  assert.equal(reached.current.manualHeld,false);
  assert.equal(reached.context.target,scene.duration);
});

test('the modern fade keeps its original source onset but takes longer on screen',()=>{
  const scene=manifest.scenes.find(s=>s.id==='seasons');
  const context=vm.createContext({replacementOpening:true,sourcePlaybackRate,clamp,ease});
  vm.runInContext(rateCode+fadeCode,context);
  const start=scene.duration-scene.endFadeSeconds,last=scene.duration-1/scene.fps;
  assert.equal(context.openingPlaybackRate(scene,10,scene.duration),1);
  assert.equal(context.openingPlaybackRate(scene,16,scene.duration),.75);
  assert.equal(context.sourceEndFade(scene,start),0);
  assert.equal(context.sourceEndFade(scene,last),1);
  let wallSeconds=0;
  for(let time=start;time<last;time+=.001)wallSeconds+=.001/context.openingPlaybackRate(scene,time,scene.duration);
  assert.ok(wallSeconds>6&&wallSeconds<6.4, `${wallSeconds}s visible fade`);
  const intro=manifest.scenes.find(s=>s.id==='intro');
  assert.equal(context.openingPlaybackRate(intro,10,intro.duration),1);
});
