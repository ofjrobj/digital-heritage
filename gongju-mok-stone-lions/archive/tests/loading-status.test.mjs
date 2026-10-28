import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../../assets/archive-ready.js',import.meta.url),'utf8');

function fixture({progressBeforeBegin=false}={}){
 const elements=[],timers=new Map(),frames=[],listeners=new Map();let nextTimer=0,observer;
 function element(tag='div'){
  const el={tag,children:[],dataset:{},attrs:{},hidden:false,textContent:'',className:'',parent:null,
   setAttribute(k,v){this.attrs[k]=v;},addEventListener(){},
   append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}},
   remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);this.parent=null;}};
  elements.push(el);return el;
 }
 const body=element('body'),archive=element();archive.className='archive';body.append(archive);
 const scenes={},labels={};
 for(const side of ['male','female']){
  const card=element('article');archive.append(card);
  scenes[side]=element();scenes[side].id=`${side}-scene`;card.append(scenes[side]);
  labels[side]=element('p');labels[side].id=`${side}-loading`;labels[side].className='loading';
  labels[side].textContent=progressBeforeBegin?'Loading... 100%':`OBJECT ${side==='male'?'01':'02'} LOADING`;card.append(labels[side]);
 }
 const root={dataset:{}},document={readyState:'complete',documentElement:root,body,createElement:element,
  querySelector:selector=>selector==='.archive'?archive:null,
  getElementById:id=>elements.find(el=>el.id===id)};
 vm.runInNewContext(source,{document,matchMedia:()=>({matches:false}),location:{reload(){}},
  MutationObserver:class{constructor(fn){observer=fn;}observe(){}disconnect(){}},
  setTimeout:(fn,delay)=>{timers.set(++nextTimer,{fn,delay});return nextTimer;},clearTimeout:id=>timers.delete(id),
  requestAnimationFrame:fn=>frames.push(fn),addEventListener:(name,fn)=>listeners.set(name,fn)});
 function connected(node){return node===body||node.parent&&connected(node.parent);}
 return {root,archive,labels,scenes,
  visibleStatuses:()=>elements.filter(el=>connected(el)&&!el.hidden&&(el.className==='loading'||el.className.includes('archive-model-status'))),
  statusNodes:()=>elements.filter(el=>connected(el)&&el.attrs.role==='status'),
  runTimer(delay){for(const [id,timer] of timers)if(timer.delay===delay){timers.delete(id);timer.fn();return;}},
  flushFrames(){while(frames.length)frames.shift()();},
  progress(side,percentage){labels[side].textContent=`Loading... ${percentage}%`;},
  loaded(side,state){scenes[side].dataset.loaded=state;if(state==='true'){labels[side].hidden=true;labels[side].setAttribute('aria-hidden','true');}observer();},
  moduleError(filename){listeners.get('error')({filename});}};
}

test('one status per model survives transfer, decode wait and independent readiness',()=>{
 const f=fixture();
 assert.equal(f.visibleStatuses().length,2);
 assert.deepEqual(f.statusNodes(),[f.labels.male,f.labels.female]);
 f.progress('male',100);f.progress('female',64);
 assert.deepEqual(f.visibleStatuses().map(el=>el.textContent),['Loading... 100%','Loading... 64%']);
 f.runTimer(1720);assert.equal(f.root.dataset.archiveUi,'ready');
 assert.equal(f.root.dataset.archiveState,'loading'); // UI does not wait for decoding.
 f.loaded('male','true');assert.deepEqual(f.visibleStatuses(),[f.labels.female]);
 f.runTimer(45000);assert.equal(f.root.dataset.archiveState,'delayed');
 assert.equal(f.labels.female.textContent,'Loading... 64%');
 f.progress('female',100);assert.equal(f.visibleStatuses().length,1);
 f.loaded('female','true');f.flushFrames();f.runTimer(0);f.runTimer(1700);
 assert.equal(f.root.dataset.archiveState,'ready');assert.equal(f.archive.attrs['aria-busy'],'false');
 assert.equal(f.visibleStatuses().length,0);
});

test('coordinator initialization preserves progress already reported by the loader',()=>{
 const f=fixture({progressBeforeBegin:true});
 assert.deepEqual(f.visibleStatuses().map(el=>el.textContent),['Loading... 100%','Loading... 100%']);
});

test('a model failure does not overwrite the other model progress or create another status',()=>{
 const f=fixture();f.progress('female',78);f.loaded('male','error');
 assert.equal(f.visibleStatuses().length,2);
 assert.equal(f.labels.male.textContent,'3D 자료를 불러오지 못했습니다.');
 assert.equal(f.labels.female.textContent,'Loading... 78%');
 f.loaded('female','true');assert.deepEqual(f.visibleStatuses(),[f.labels.male]);
});

test('module failure uses the same statuses after the script cache version changes',()=>{
 const f=fixture();f.moduleError('https://example.test/archive/app.js?v=future-release');
 assert.equal(f.root.dataset.archiveState,'error');assert.equal(f.visibleStatuses().length,2);
 assert.ok(f.visibleStatuses().every(el=>el.textContent==='3D 자료를 불러오지 못했습니다.'));
});
