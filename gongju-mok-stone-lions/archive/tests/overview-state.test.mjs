import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../../assets/archive-overview.js',import.meta.url),'utf8');
function fixture(state='revealing'){
 const root={dataset:{archiveState:state,archivePoint:''}},detail={attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}};
 let observer;const timers=new Map();let nextTimer=0;
 const document={documentElement:root,querySelector:()=>({querySelector:()=>detail})};
 vm.runInNewContext(source,{document,MutationObserver:class{constructor(fn){observer=fn;}observe(){}},setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer;},clearTimeout:id=>timers.delete(id)});
 return {root,detail,timers,select(point){root.dataset.archivePoint=point;observer([{attributeName:'data-archive-point'}]);},state(value){root.dataset.archiveState=value;observer([{attributeName:'data-archive-state'}]);}};
}

test('overview guide starts after reveal, yields to selection, and stays hidden after deselection',()=>{
 const f=fixture('loading');assert.equal(f.root.dataset.archiveOverview,undefined);
 f.state('positioning');assert.equal(f.root.dataset.archiveOverview,undefined);
 f.state('revealing');assert.equal(f.root.dataset.archiveOverview,'hint');assert.equal(f.timers.size,1);
 f.select('01');assert.equal(f.root.dataset.archiveOverview,'detail');assert.equal(f.timers.size,0);assert.equal(f.detail.attrs['aria-hidden'],undefined);
 f.select('');assert.equal(f.root.dataset.archiveOverview,'expanded');assert.equal(f.detail.attrs['aria-hidden'],'true');
 f.state('ready');assert.equal(f.root.dataset.archiveOverview,'expanded');assert.equal(f.timers.size,0);
 f.select('05');assert.equal(f.root.dataset.archiveOverview,'detail');assert.equal(f.detail.attrs['aria-hidden'],undefined);
});

test('initial guide times out without leaving an active feature caption',()=>{
 const f=fixture();
 for(const fn of f.timers.values())fn();
 assert.equal(f.root.dataset.archiveOverview,'expanded');assert.equal(f.detail.attrs['aria-hidden'],'true');
});
