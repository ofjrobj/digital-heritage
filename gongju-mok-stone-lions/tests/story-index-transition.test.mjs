import test from 'node:test';
import assert from 'node:assert/strict';
import {createStoryIndexTransition, waitForArchiveReady} from '../assets/story-index-transition.js';

function fixture({ready=true,reduced=false}={}) {
  const callbacks=new Map(), events=new Map(), timers=new Map(), observers=[];
  let nextTimer=1, focusCount=0, prepares=0, remembers=0;
  const attributes=new Map();
  const link={href:'https://example.com/project/archive/?preview=ux',inert:false,
    addEventListener(name,callback){callbacks.set(name,callback);},
    setAttribute(k,v){attributes.set(k,v);},removeAttribute(k){attributes.delete(k);},focus(){focusCount++;}};
  const frameEvents=new Map();
  const root={dataset:{archiveState:ready?'ready':'loading'}};
  const frame={inert:true,contentDocument:{title:'Index',documentElement:root},
    addEventListener(name,callback){frameEvents.set(name,callback);},removeEventListener(name){frameEvents.delete(name);},
    removeAttribute(){},setAttribute(){},focus(){focusCount++;}};
  const other={inert:true},stage={children:[link,other,frame]};
  const assignments=[], pushes=[];
  const win={matchMedia:()=>({matches:reduced}),
    history:{state:{original:true},pushState(...args){pushes.push(args);}},
    location:{assign:url=>assignments.push(url)},
    addEventListener(name,callback){events.set(name,callback);},
    setTimeout(callback,delay){const id=nextTimer++;timers.set(id,{callback,delay});return id;},
    clearTimeout:id=>timers.delete(id),
    MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(){this.active=true;}disconnect(){this.active=false;}}
  };
  const doc={title:'Story',body:{dataset:{}}};
  const controller=createStoryIndexTransition({link,stage,getFrame:()=>frame,prepare(){prepares++;},remember(){remembers++;},win,doc});
  const click=extra=>callbacks.get('click')({button:0,preventDefault(){},...extra});
  const runTimers=delay=>{for(const[id,timer]of [...timers])if(timer.delay<=delay){timers.delete(id);timer.callback();}};
  return {controller,click,doc,frame,root,link,other,events,assignments,pushes,attributes,timers,win,observers,runTimers,
    proof:()=>({prepares,remembers,focusCount}),ready(){root.dataset.archiveState='ready';for(const observer of [...observers])if(observer.active)observer.callback();}};
}

test('the decoded Index fades in without reloading models and keeps the route query',async()=>{
  const f=fixture();await f.click();
  assert.equal(f.controller.visible(),true);
  assert.equal(f.doc.body.dataset.archiveTransition,'entering');
  assert.equal(f.link.inert,true);
  assert.equal(f.frame.inert,false);
  assert.equal(f.doc.title,'Index');
  assert.equal(f.pushes.length,1);
  assert.equal(f.pushes[0][2],f.link.href);
  assert.deepEqual(f.assignments,[]);
  assert.deepEqual([...f.timers.values()].map(t=>t.delay),[1000]);
  f.runTimers(1000);assert.equal(f.doc.body.dataset.archiveTransition,'open');
  await f.click();assert.equal(f.pushes.length,1,'double click cannot create another history entry');
});

test('the transition waits for both archive models and its first reveal to finish',async()=>{
  const f=fixture({ready:false});const pending=f.click();
  assert.equal(f.controller.visible(),false);
  assert.equal(f.doc.body.dataset.archiveTransition,'waiting');
  assert.equal(f.attributes.get('aria-busy'),'true');
  f.ready();await pending;
  assert.equal(f.controller.visible(),true);
  assert.equal(f.attributes.has('aria-busy'),false);
  assert.equal(f.observers.every(o=>!o.active),true);
});

test('Back restores the same Story ending and Forward restores the ready Index',async()=>{
  const f=fixture();await f.click();f.runTimers(1000);
  f.events.get('popstate')({state:{original:true}});
  assert.equal(f.controller.visible(),false);
  assert.equal(f.frame.inert,true);
  assert.equal(f.link.inert,false);
  assert.equal(f.other.inert,true,'previously inert controls remain inert');
  assert.equal(f.doc.title,'Story');
  f.runTimers(1000);assert.equal(f.doc.body.dataset.archiveTransition,undefined);
  f.events.get('popstate')({state:{gongjuArchiveOverlay:true}});
  assert.equal(f.controller.visible(),true);
  assert.equal(f.pushes.length,1);
  assert.deepEqual(f.assignments,[]);
});

test('new-tab gestures retain ordinary link behavior',async()=>{
  for(const extra of [{metaKey:true},{ctrlKey:true},{shiftKey:true},{button:1}]){
    const f=fixture();await f.click(extra);
    assert.equal(f.proof().prepares,0);assert.equal(f.pushes.length,0);
  }
});

test('a failed preload falls back to the original URL after the shared fade',async()=>{
  const f=fixture({ready:false});f.root.dataset.archiveState='error';await f.click();
  assert.equal(f.doc.body.dataset.archiveTransition,'fallback');
  assert.deepEqual(f.assignments,[]);
  f.runTimers(1000);assert.deepEqual(f.assignments,[f.link.href]);
});

test('reduced motion and readiness timeout retain a usable route',async()=>{
  const f=fixture({reduced:true});await f.click();
  f.runTimers(0);assert.equal(f.doc.body.dataset.archiveTransition,'open');
  const waiting=fixture({ready:false});const pending=waitForArchiveReady(waiting.frame,waiting.win);
  waiting.runTimers(12000);await assert.rejects(pending,/timeout/);
});
