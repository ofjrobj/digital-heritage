import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const runtime=readFileSync(new URL('../assets/test-render-media.js',import.meta.url),'utf8');
const drawCode=runtime.slice(runtime.indexOf('function draw(source)'),runtime.indexOf('function resize()'));

function renderer() {
  let revision=0,paints=0,layoutChecks=0;
  const source={tagName:'VIDEO',videoWidth:1920,videoHeight:1080,currentTime:1,currentSrc:'scene.mp4',seeking:false};
  const record={scene:{id:'walking',mode:'scroll',fps:30},video:source,clipIn:0};
  const context=vm.createContext({
    records:[record],scenes:[record.scene],current:record,source,transition:null,sceneJoin:null,
    width:1280,height:720,hasFrame:false,lastPaint:null,lastSource:null,canvasPaints:0,
    PAPER:'#e8e8e6',replacementOpening:true,seamMatch:null,endingFadeAmount:0,
    openingLayout:null,renderedKind:'',renderedSource:'',
    presentedFrames:{key:()=>revision},paperColor:{render:value=>value},
    sourceEndFade:()=>0,exitMatchState:()=>null,sceneColorGrade:()=>null,connectionLook:()=>null,
    duration:()=>20,dialogueFit:{update(){layoutChecks++;}},
    dialogueFrame:(_scene,w,h)=>({x:0,y:0,w,h}),
    ctx:{fillRect(){},drawImage(){paints++;},save(){},restore(){}},
  });
  vm.runInContext(drawCode,context);
  return {context,source,record,draw:()=>context.draw(source),nextFrame(){revision++;},paints:()=>paints,layoutChecks:()=>layoutChecks};
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

test('dialogue reuses unchanged pixels while retaining caption layout checks',()=>{
  const r=renderer();r.record.scene.mode='dialogue';r.draw();
  for(let i=0;i<10;i++){r.source.currentTime+=1/120;r.draw();}
  assert.equal(r.paints(),1);
  assert.equal(r.layoutChecks(),11,'font or control layout changes remain observable');
  r.nextFrame();r.draw();assert.equal(r.paints(),2);
});

test('stable navigation does not mutate DOM state on every animation frame',()=>{
  let writes=0;
  const properties=new Map(),attributes=new Map();
  const dataset=new Proxy({}, {set(target,key,value){writes++;target[key]=value;return true;}});
  const nav={inert:false,getAttribute:key=>attributes.get(key),hasAttribute:key=>attributes.has(key),
    setAttribute(key,value){writes++;attributes.set(key,value);},removeAttribute(key){writes++;attributes.delete(key);}};
  const context=vm.createContext({
    $:()=>nav,navOpacity:1,transition:null,current:null,scenes:[{mode:'scroll'}],index:0,fogLevel:0,
    document:{body:{dataset}},stage:{style:{getPropertyValue:key=>properties.get(key)||'',setProperty(key,value){writes++;properties.set(key,value);}}},
  });
  const code=runtime.slice(runtime.indexOf('function updateStoryNavigation()'),runtime.indexOf('function advance()'));
  vm.runInContext(code,context);context.updateStoryNavigation();const initial=writes;
  for(let i=0;i<120;i++)context.updateStoryNavigation();
  assert.equal(writes,initial);
  context.scenes[0].mode='dialogue';context.updateStoryNavigation();
  assert.equal(nav.inert,true);assert.equal(attributes.get('aria-hidden'),'true');
  context.scenes[0].mode='scroll';context.updateStoryNavigation();
  assert.equal(nav.inert,false);assert.equal(attributes.has('aria-hidden'),false);
});
