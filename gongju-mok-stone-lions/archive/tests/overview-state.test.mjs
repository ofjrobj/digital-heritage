import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../../assets/archive-overview.js',import.meta.url),'utf8');
function fixture(state='revealing',{reducedMotion=false}={}){
 const root={dataset:{archiveState:state,archivePoint:''}},detail={hidden:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}};
 let observer;const timers=new Map();let nextTimer=0,now=0;
 const document={documentElement:root,querySelector:()=>({querySelector:()=>detail})};
 vm.runInNewContext(source,{document,matchMedia:()=>({matches:reducedMotion}),MutationObserver:class{constructor(fn){observer=fn;}observe(){}},setTimeout:(fn,delay)=>{timers.set(++nextTimer,{fn,at:now+delay});return nextTimer;},clearTimeout:id=>timers.delete(id)});
 return {root,detail,timers,select(point){root.dataset.archivePoint=point;observer([{attributeName:'data-archive-point'}]);},state(value){root.dataset.archiveState=value;observer([{attributeName:'data-archive-state'}]);},tick(ms){
  const end=now+ms;
  while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}
  now=end;
 }};
}

test('overview guide starts after reveal, yields to selection, and stays hidden after deselection',()=>{
 const f=fixture('loading');assert.equal(f.root.dataset.archiveOverview,undefined);
 f.state('positioning');assert.equal(f.root.dataset.archiveOverview,undefined);
 f.state('revealing');assert.equal(f.root.dataset.archiveOverview,'hint');assert.equal(f.timers.size,1);
 f.select('01');assert.equal(f.root.dataset.archiveOverview,'detail');assert.equal(f.timers.size,0);assert.equal(f.detail.attrs['aria-hidden'],undefined);
 f.select('');assert.equal(f.root.dataset.archiveOverview,'expanded');assert.equal(f.detail.attrs['aria-hidden'],'true');
 assert.equal(f.detail.hidden,true);
 f.state('ready');assert.equal(f.root.dataset.archiveOverview,'expanded');assert.equal(f.timers.size,0);
 f.select('05');assert.equal(f.root.dataset.archiveOverview,'detail');assert.equal(f.detail.attrs['aria-hidden'],undefined);
 assert.equal(f.detail.hidden,false);
});

test('initial guide fades once then leaves no rendered caption box',()=>{
 const f=fixture();
 f.tick(3999);assert.equal(f.root.dataset.archiveOverview,'hint');assert.equal(f.detail.hidden,false);
 f.tick(1);assert.equal(f.root.dataset.archiveOverview,'fading');assert.equal(f.detail.hidden,false);
 f.tick(1000);
 assert.equal(f.root.dataset.archiveOverview,'expanded');assert.equal(f.detail.attrs['aria-hidden'],'true');
 assert.equal(f.detail.hidden,true);assert.equal(f.timers.size,0);
 for(const point of ['04','','01','','03',''])f.select(point);
 f.state('revealing');f.state('ready');f.tick(10000);
 assert.equal(f.detail.hidden,true);assert.equal(f.root.dataset.archiveOverview,'expanded');assert.equal(f.timers.size,0);
});

test('an observation selected during the fade cannot be hidden by an old timer',()=>{
 const f=fixture();f.tick(4100);assert.equal(f.root.dataset.archiveOverview,'fading');
 f.select('04');f.tick(10000);
 assert.equal(f.root.dataset.archiveOverview,'detail');assert.equal(f.detail.hidden,false);assert.equal(f.detail.attrs['aria-hidden'],undefined);
 f.select('');assert.equal(f.detail.hidden,true);
});

test('an early observation consumes the introduction before the models reveal',()=>{
 const f=fixture('loading');f.select('01');f.select('');f.state('revealing');
 assert.equal(f.root.dataset.archiveOverview,'expanded');assert.equal(f.detail.hidden,true);assert.equal(f.timers.size,0);
});

test('redundant empty selection and readiness updates do not restart the guide',()=>{
 const f=fixture();f.tick(3000);f.select('');f.state('ready');f.tick(1000);
 assert.equal(f.root.dataset.archiveOverview,'fading');f.tick(1000);assert.equal(f.detail.hidden,true);
});

test('reduced motion removes the guide immediately after its initial reading time',()=>{
 const f=fixture('revealing',{reducedMotion:true});f.tick(4000);
 assert.equal(f.detail.hidden,true);assert.equal(f.root.dataset.archiveOverview,'expanded');assert.equal(f.timers.size,0);
});
