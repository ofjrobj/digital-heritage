import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../assets/fullscreen.js',import.meta.url),'utf8');

function fixture({journey=false,profile='selected-higgsfield',reduced=false,preview=false}={}){
 const events=new Map(),attributes=new Map(),timers=new Map(),frames=new Map();
 let id=0,observer,requested=0,now=0;
 const button={dataset:{},hidden:false,inert:false,setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k),addEventListener:(k,v)=>events.set('button:'+k,v)};
 const view={frameElement:null,parent:null,addEventListener(){},matchMedia:()=>({matches:reduced}),getComputedStyle:()=>({getPropertyValue:()=> '1s'}),
  setTimeout(fn,delay){const key=++id;timers.set(key,{fn,at:now+delay});return key;},clearTimeout:key=>timers.delete(key),
  requestAnimationFrame(fn){const key=++id;frames.set(key,fn);return key;},cancelAnimationFrame:key=>frames.delete(key),
  MutationObserver:class{constructor(fn){observer=fn;}observe(){}disconnect(){}}};
 const doc={currentScript:{src:'https://example.test/site/assets/fullscreen.js'},baseURI:'https://example.test/site/',defaultView:view,fullscreenEnabled:true,fullscreenElement:null,
  body:{dataset:{mediaProfile:profile,journeyStarted:String(journey)},children:[]},head:{append(){}},
  getElementById:id=>id==='fullscreenToggle'?button:null,createElement:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],
  addEventListener:(k,v)=>events.set('doc:'+k,v),removeEventListener:k=>events.delete('doc:'+k)};
 const hostDoc=preview?{...doc,fullscreenElement:null,addEventListener:(k,v)=>events.set('host:'+k,v),removeEventListener:k=>events.delete('host:'+k)}:doc;
 const host={dataset:{},ownerDocument:hostDoc,contains:node=>node===host,async requestFullscreen(){requested++;hostDoc.fullscreenElement=host;events.get((preview?'host:':'doc:')+'fullscreenchange')?.();}};
 doc.documentElement=host;
 if(preview){view.frameElement=Object.assign(host,{matches:()=>true,allowFullscreen:true});view.parent={frameElement:null};}
 vm.runInNewContext(source,{document:doc,window:view,URL,console});
 const advance=ms=>{now+=ms;for(const [key,timer]of [...timers])if(timer.at<=now){timers.delete(key);timer.fn();}for(const [key,fn]of [...frames]){frames.delete(key);fn();}};
 return {button,attributes,doc,hostDoc,advance,requested:()=>requested,
  click:()=>events.get('button:click')(),
  escape(){hostDoc.fullscreenElement=null;events.get((preview?'host:':'doc:')+'fullscreenchange')?.();},
  journey(value){doc.body.dataset.journeyStarted=String(value);observer();}};
}

test('expansion is present before Enter, fades while fullscreen, and returns on Escape before the journey',async()=>{
 const f=fixture();
 assert.equal(f.button.hidden,false);assert.equal(f.button.inert,false);
 assert.equal(f.button.dataset.fullscreenVisibility,'visible');
 assert.equal(f.attributes.get('aria-label'),'전체 화면');
 await f.click();assert.equal(f.requested(),1);
 assert.equal(f.button.dataset.fullscreenVisibility,'fading');assert.equal(f.button.hidden,false);
 f.advance(999);assert.equal(f.button.hidden,false);assert.equal(f.attributes.has('aria-hidden'),false);
 f.advance(1);assert.equal(f.button.hidden,true);assert.equal(f.button.inert,true);assert.equal(f.attributes.get('aria-hidden'),'true');
 await f.click();assert.equal(f.requested(),1,'the button cannot exit fullscreen');
 f.escape();f.advance(16);assert.equal(f.button.hidden,false);assert.equal(f.button.inert,false);assert.equal(f.button.dataset.fullscreenVisibility,'visible');
});

test('the first valid journey change fades once and returning to the first frame cannot restore the icon',()=>{
 const f=fixture();f.journey(true);
 assert.equal(f.button.hidden,false);assert.equal(f.button.dataset.fullscreenVisibility,'fading');
 f.advance(999);assert.equal(f.button.hidden,false);
 f.advance(1);assert.equal(f.button.hidden,true);assert.equal(f.button.inert,true);
 f.journey(false);f.escape();f.advance(1100);assert.equal(f.button.hidden,true);
});

test('Escape cancels an unfinished hide and the preview follows its persistent parent fullscreen state',async()=>{
 const f=fixture({preview:true});await f.click();f.advance(400);f.escape();f.advance(1100);
 assert.equal(f.button.hidden,false);assert.equal(f.button.dataset.fullscreenVisibility,'visible');
 await f.click();f.journey(true);f.advance(1000);f.escape();f.advance(16);assert.equal(f.button.hidden,true);
});

test('Index and an already started journey are hidden initially; reduced motion removes the control without animation',()=>{
 for(const f of [fixture({profile:''}),fixture({journey:true})]){assert.equal(f.button.hidden,true);assert.equal(f.button.inert,true);}
 const f=fixture({reduced:true});f.journey(true);assert.equal(f.button.hidden,true);
});


test('loading and Enter gates exempt the expansion button rather than overriding hidden content globally',async()=>{
 for(const file of ['intro-entry.css','test-render-media.css']){
  const css=await readFile(new URL('../assets/'+file,import.meta.url),'utf8');
  const gates=css.match(/body[^{}]*#stage>[^{}]*\{visibility:hidden!important\}/g);
  assert.ok(gates?.length);
  for(const gate of gates)for(const selector of gate.slice(0,gate.indexOf('{')).split(/,(?=body)/))assert.ok(selector.includes(':not(#fullscreenToggle)'),file+': '+selector);
 }
});
