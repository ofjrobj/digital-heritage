import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const runtime=readFileSync(new URL('../assets/test-render-media.js',import.meta.url),'utf8');
const drawCode=runtime.slice(runtime.indexOf('function draw(source)'),runtime.indexOf('function resize()'));

function renderer() {
  let revision=0,paints=0;
  const source={tagName:'VIDEO',videoWidth:1920,videoHeight:1080,currentTime:1,currentSrc:'scene.mp4',seeking:false};
  const record={scene:{id:'walking',mode:'scroll',fps:30},video:source,clipIn:0};
  const context=vm.createContext({
    records:[record],scenes:[record.scene],current:record,source,transition:null,sceneJoin:null,
    width:1280,height:720,hasFrame:false,lastPaint:null,lastSource:null,canvasPaints:0,
    PAPER:'#e8e8e6',replacementOpening:true,seamMatch:null,endingFadeAmount:0,
    openingLayout:null,renderedKind:'',renderedSource:'',
    presentedFrames:{key:()=>revision},paperColor:{render:value=>value},
    sourceEndFade:()=>0,exitMatchState:()=>null,sceneColorGrade:()=>null,connectionLook:()=>null,
    duration:()=>20,dialogueFit:{update(){}},
    ctx:{fillRect(){},drawImage(){paints++;},save(){},restore(){}},
  });
  vm.runInContext(drawCode,context);
  return {context,source,record,draw:()=>context.draw(source),nextFrame(){revision++;},paints:()=>paints};
}

test('ordinary walking copies each presented video frame once, despite a faster playback clock',()=>{
  const r=renderer();r.draw();assert.equal(r.paints(),1);
  for(let i=0;i<4;i++){r.source.currentTime+=1/120;r.draw();}
  assert.equal(r.paints(),1);
  r.nextFrame();r.draw();assert.equal(r.paints(),2);
  r.source.currentTime+=1/120;r.draw();assert.equal(r.paints(),2);
});

test('transitions and approach overlays repaint their base on every composition',()=>{
  for(const effect of ['transition','sceneJoin','approaching']){
    const r=renderer();r.draw();
    if(effect==='approaching')r.record.approaching=true;else r.context[effect]={};
    r.draw();r.draw();assert.equal(r.paints(),3,effect);
    if(effect==='approaching')r.record.approaching=false;else r.context[effect]=null;
    r.draw();assert.equal(r.paints(),4,'remove the old overlay before caching');
    r.draw();assert.equal(r.paints(),4);
  }
});

test('viewport changes and canvas invalidation repaint a paused source frame',()=>{
  const r=renderer();r.draw();r.context.width=800;r.draw();assert.equal(r.paints(),2);
  r.context.hasFrame=false;r.draw();assert.equal(r.paints(),3);
});
