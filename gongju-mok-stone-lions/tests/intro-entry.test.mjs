import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createIntroEntry} from '../assets/intro-entry.js';
import {UI_MOTION_SECONDS,uiMotionEase} from '../assets/ui-motion.js';

test('a fresh intro URL still requires the invitation after the media-ready gate', () => {
  const runtime=readFileSync(new URL('../assets/test-render-media.js',import.meta.url),'utf8');
  const init=runtime.slice(runtime.indexOf('const embeddedStory='),runtime.indexOf('const walkingInput='));
  const screen=runtime.match(/const entryScreen=.*?;\n/)[0];
  for(const search of ['', '?start=intro', '?start=intro&preview=ux', '?embed=story&start=intro', '?embed=story&start=main']){
    const nodes={introWelcome:{},introRecommendation:{},introEnter:{focus(){}}};
    const body={dataset:{},hasAttribute:name=>name==='data-intro-entry'};
    const context=vm.createContext({URLSearchParams,location:{search},document:{body,fonts:{ready:Promise.resolve()}},$:id=>nodes[id],createIntroEntry});
    vm.runInContext(init+screen+';globalThis.state={entryAccepted,entryScreen};',context);
    assert.equal(context.state.entryAccepted,false,search);
    assert.equal(nodes.introEnter.hidden,true,search);
    assert.equal(context.state.entryScreen.accept(),false,search);
    context.state.entryScreen.start();context.state.entryScreen.advance(2);
    assert.equal(nodes.introEnter.hidden,false,search);
    assert.equal(context.state.entryScreen.accept(),true,search);
  }
});

test('Index returns bypass the invitation only after the first media and fonts are ready', () => {
  const runtime=readFileSync(new URL('../assets/test-render-media.js',import.meta.url),'utf8');
  const init=runtime.slice(runtime.indexOf('const embeddedStory='),runtime.indexOf('const walkingInput='));
  const screen=runtime.match(/const entryScreen=.*?;\n/)[0];
  const loading=runtime.slice(runtime.indexOf("  }else if(t.phase==='loading'){")+"  }else if(t.phase==='loading'){".length,runtime.indexOf("  }else if(t.phase==='entry'){"));
  for(const search of ['?start=main','?start=main&preview=ux']){
    const nodes={introWelcome:{},introRecommendation:{},introEnter:{focus(){throw Error('return should not focus Enter');}}};
    const body={dataset:{startup:'loading'},hasAttribute:name=>name==='data-intro-entry'};
    const t={phase:'loading',elapsed:1,record:{loaded:false,video:{seeking:false},scene:{id:'intro'}}};
    const context=vm.createContext({URLSearchParams,location:{search},document:{body,fonts:{ready:Promise.resolve()}},$:id=>nodes[id],createIntroEntry,t,ctx:{fillRect(){}},PAPER:'#fff',width:100,height:100,mistAmount(){},status(){},replacementOpening:true,now:1000,loadingHiddenAt:null});
    vm.runInContext(init+screen+';globalThis.state={entryAccepted,entryScreen};',context);
    assert.equal(context.state.entryAccepted,true);
    vm.runInContext(loading,context);assert.equal(t.phase,'loading');
    t.record.loaded=true;
    vm.runInContext(loading,context);assert.equal(t.phase,'loading','fonts still gate the main screen');
    vm.runInContext('entryFontsReady=true;',context);
    vm.runInContext(loading,context);
    assert.equal(t.phase,'gap');assert.equal(body.dataset.introEntry,'cover');
    assert.equal(nodes.introWelcome.hidden,true);assert.equal(nodes.introEnter.hidden,true);
  }
});

test('an Index return starts at scene zero instead of the saved playback position', () => {
  const runtime=readFileSync(new URL('../assets/test-render-media.js',import.meta.url),'utf8');
  const startup=runtime.slice(runtime.indexOf(' const freshIntro='),runtime.indexOf("\n}catch(error){status('장면을 불러오지 못했습니다."));
  for(const entryGate of [true,false]){
    const reads=[],removed=[],requests=[];
    const context=vm.createContext({entryGate,embeddedStory:false,uiPreview:false,URLSearchParams,location:{search:'?start=main'},pendingIntroEntry:false,scenes:[{},{}],clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),
      sessionStorage:{getItem:key=>{reads.push(key);return JSON.stringify({index:1,local:19});},removeItem:key=>removed.push(key)},requestScene:(...args)=>requests.push(args)});
    vm.runInContext(startup,context);
    assert.deepEqual(reads,[]);assert.deepEqual(requests,[[0,0]]);
    assert.deepEqual(removed,['test-render-resume','ink-pilot-return']);
  }
});

function invitation(options = {}) {
  const body = {dataset: {}};
  const welcome = {};
  const recommendation = {};
  const button = {focusCount: 0, focus() { this.focusCount++; }};
  const entry = createIntroEntry({body, welcome, recommendation, button, ...options});
  return {entry, body, welcome, recommendation, button};
}

test('loading cannot be skipped by clicks or elapsed time before media is ready', () => {
  const {entry, body, welcome, button} = invitation();
  entry.advance(10);
  assert.equal(entry.accept(), false);
  assert.equal(body.dataset.introEntry, 'loading');
  assert.equal(welcome.hidden, true);
  assert.equal(button.disabled, true);
  assert.equal(button.focusCount, 0);
});

test('embedded entry waits for readiness without taking focus from the containing page', () => {
  const {entry, body, welcome, recommendation, button} = invitation({recommendationSeconds: 0, focusOnReady: false});
  assert.equal(welcome.hidden, true);
  assert.equal(entry.accept(), false);
  entry.start();
  assert.equal(body.dataset.introEntry, 'ready');
  assert.equal(recommendation.hidden, true);
  assert.equal(button.disabled, false);
  assert.equal(button.focusCount, 0);
  assert.equal(entry.accept(), true);
});

test('ready media shows the recommendation for two visible seconds before enabling entry', () => {
  const {entry, body, welcome, recommendation, button} = invitation();
  entry.start();
  assert.equal(body.dataset.introEntry, 'recommendation');
  assert.equal(welcome.hidden, false);
  assert.equal(recommendation.hidden, false);
  assert.equal(button.hidden, true);
  entry.advance(1.99);
  assert.equal(entry.accept(), false);
  entry.advance(0); // Hidden tabs provide no visible frame time.
  assert.equal(body.dataset.introEntry, 'recommendation');
  entry.advance(.02);
  assert.equal(body.dataset.introEntry, 'ready');
  assert.equal(recommendation.hidden, true);
  assert.equal(button.hidden, false);
  assert.equal(button.disabled, false);
  assert.equal(button.focusCount, 1);
  entry.advance(10);
  assert.equal(button.focusCount, 1);
});

test('repeated ready notifications do not restart the recommendation', () => {
  const {entry, body} = invitation();
  entry.start();
  entry.advance(1);
  entry.start();
  entry.advance(1);
  assert.equal(body.dataset.introEntry, 'ready');
});

test('an accepted click is consumed only once and removes the invitation from interaction', () => {
  const {entry, body, welcome, button} = invitation();
  entry.start();
  entry.advance(2);
  assert.equal(entry.accept(), true);
  assert.equal(entry.accept(), false);
  assert.equal(body.dataset.introEntry, 'cover');
  assert.equal(welcome.inert, true);
  assert.equal(button.disabled, true);
  entry.start();
  entry.advance(10);
  assert.equal(body.dataset.introEntry, 'cover');
});

test('an error hides either invitation state and retry gets the complete recommendation', () => {
  for (const elapsed of [1, 2]) {
    const {entry, body, welcome, recommendation, button} = invitation();
    entry.start();
    entry.advance(elapsed);
    entry.reset();
    assert.equal(body.dataset.introEntry, 'loading');
    assert.equal(welcome.hidden, true);
    assert.equal(recommendation.hidden, true);
    assert.equal(button.hidden, true);
    assert.equal(entry.accept(), false);
    entry.start();
    entry.advance(1);
    assert.equal(body.dataset.introEntry, 'recommendation');
    entry.advance(1);
    assert.equal(body.dataset.introEntry, 'ready');
  }
});

test('Story/Index stays inaccessible before Enter and fades in only with the opened scene', () => {
  const runtime=readFileSync(new URL('../assets/test-render-media.js',import.meta.url),'utf8');
  const source=runtime.slice(runtime.indexOf('function updateStoryNavigation('),runtime.indexOf('\nfunction advance()'));
  const attributes=new Map(),styles=new Map(),nav={inert:true,getAttribute:key=>attributes.get(key),setAttribute:(key,value)=>attributes.set(key,value),hasAttribute:key=>attributes.has(key),removeAttribute:key=>attributes.delete(key)};
  const context=vm.createContext({$:()=>nav,entryGate:true,entryAccepted:false,entryNavReveal:0,entryNavReducedMotion:{matches:false},transition:null,current:null,scenes:[{mode:'walk'}],index:0,navOpacity:1,fogLevel:0,clamp:x=>Math.max(0,Math.min(1,x)),ease:x=>x*x*(3-2*x),stage:{style:{getPropertyValue:key=>styles.get(key),setProperty:(key,value)=>styles.set(key,value)}},document:{body:{dataset:{startup:'loading'}}}});
  vm.runInContext(source,context);
  Object.assign(context,{UI_MOTION_SECONDS,uiMotionEase});
  for(const startup of ['loading','entry']){
    context.document.body.dataset.startup=startup;
    context.updateStoryNavigation(10);
    assert.equal(context.navOpacity,0);
    assert.equal(nav.inert,true);
    assert.equal(attributes.get('aria-hidden'),'true');
  }
  context.entryAccepted=true;context.document.body.dataset.startup='gap';
  context.updateStoryNavigation(.1);assert.equal(context.navOpacity,0);
  context.document.body.dataset.startup='reveal';context.updateStoryNavigation(.1);
  assert.ok(context.navOpacity>0&&context.navOpacity<1);
  context.updateStoryNavigation(.6);
  assert.ok(context.navOpacity<1,'the shared one-second entrance is still in progress');
  context.updateStoryNavigation(.3);
  assert.equal(context.navOpacity,1);assert.equal(nav.inert,false);
  assert.equal(attributes.has('aria-hidden'),false);
  context.scenes[0].mode='dialogue';context.updateStoryNavigation(.1);
  assert.equal(context.navOpacity,0);assert.equal(nav.inert,true);
  context.scenes[0].mode='walk';context.entryAccepted=false;context.updateStoryNavigation(.1);
  assert.equal(context.navOpacity,0);assert.equal(nav.inert,true);
  context.entryAccepted=true;context.entryNavReducedMotion.matches=true;context.updateStoryNavigation(.01);
  assert.equal(context.navOpacity,1);
});
