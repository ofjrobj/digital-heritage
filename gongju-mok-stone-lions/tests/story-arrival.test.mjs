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

test('the entire modern video remains visible through its final source frame',()=>{
  const scene=manifest.scenes.find(s=>s.id==='seasons');
  const context=vm.createContext({replacementOpening:true,sourcePlaybackRate,clamp,ease});
  vm.runInContext(rateCode+fadeCode,context);
  assert.equal(context.openingPlaybackRate(scene,10,scene.duration),1);
  assert.equal(context.openingPlaybackRate(scene,16,scene.duration),.75);
  for(const time of [0,13.7,17,scene.duration-1/scene.fps,scene.duration]){
    assert.equal(context.sourceEndFade(scene,time),0,`no paper covering at ${time}s`);
  }
});

test('the final film waits for ended even when its clock reaches the declared duration',()=>{
  const code=between('  const finalFilm=', "  if(!transition&&$('hint'))").replaceAll('const ','var ');
  let advances=0;
  const context=vm.createContext({
    index:0,scenes:[{}],current:{still:false},dialogue:false,scroll:false,v:{loop:false,ended:false,paused:false},
    local:18.5,d:18.5,target:18.5,transition:null,allowed:true,s:{},advance(){advances++;},
  });
  vm.runInContext(code,context);assert.equal(advances,0);
  context.v.ended=true;vm.runInContext(code.replaceAll('const ','var '),context);assert.equal(advances,1);
  // Ordinary intermediate scene boundaries retain their existing trim behavior.
  context.scenes.push({});context.v.ended=false;
  vm.runInContext(code.replaceAll('const ','var '),vm.createContext({...context}));
  assert.equal(advances,2);
});

test('the completed last frame fades over 6.5 seconds, then the embedded restart appears',()=>{
  const code=between(' if(finished){','\n if(sceneJoin&&');
  for(const embeddedStory of [false,true]){
    let resets=0;
    const context=vm.createContext({finished:true,endingElapsed:0,dt:0,paused:false,document:{hidden:false,body:{dataset:{}}},
      clamp,ease,mistAmount(){},endingPaper:{style:{}},archiveCta:{style:{}},embeddedStory,endingRestartShown:false,
      entryAccepted:true,entryScreen:{reset(){resets++;},start(){}},$:()=>({querySelector:()=>({})}),
    });
    vm.runInContext(code,context);assert.equal(Number(context.endingPaper.style.opacity),0);assert.equal(resets,0);
    context.dt=3.25;vm.runInContext(code,context);
    assert.equal(Number(context.endingPaper.style.opacity),.5);assert.equal(resets,0);
    context.document.hidden=true;vm.runInContext(code,context);assert.equal(context.endingElapsed,3.25);
    context.document.hidden=false;vm.runInContext(code,context);
    assert.equal(Number(context.endingPaper.style.opacity),1);assert.equal(resets,embeddedStory?1:0);
    vm.runInContext(code,context);assert.equal(resets,embeddedStory?1:0);
  }
});
