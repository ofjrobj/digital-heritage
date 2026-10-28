import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/vr-placeholder.js',import.meta.url),'utf8');
function fixture(){
 const events=new Map(),documentEvents=new Map();let observer,hoverChange;
 const node=id=>({id,inert:false,dataset:{},attrs:new Map(),setAttribute(k,v){this.attrs.set(k,v);},getAttribute(k){return this.attrs.get(k);},addEventListener(k,fn){events.set(id+':'+k,fn);},contains(value){return value?.id?.startsWith('project');},querySelector(){return {focus(){}};},focus(){}});
 const ids=['projectVr','vrNotice','projectMenu','projectMenuToggle','projectMenuItems'];const nodes=Object.fromEntries(ids.map(id=>[id,node(id)]));
 const notice=nodes.vrNotice;notice.hidden=true;notice.textContent='';nodes.projectMenuItems.inert=true;
 const hover={matches:true,addEventListener(type,fn){hoverChange=fn;}};
 const doc={body:{dataset:{introEntry:'cover',journeyStarted:'false'}},documentElement:{dataset:{}},hidden:false,getElementById:id=>nodes[id],addEventListener:(type,fn)=>documentEvents.set(type,fn)};
 vm.runInNewContext(source,{document:doc,matchMedia:()=>hover,clearTimeout(){},MutationObserver:class{constructor(fn){observer=fn;}observe(){}}});
 const dispatch=(id,type,data={})=>events.get(id+':'+type)?.({detail:1,stopPropagation(){},...data});
 return {nodes,notice,doc,dispatch,open:()=>dispatch('projectMenuToggle','click'),journey(){doc.body.dataset.journeyStarted='true';observer();},loseHover(){hover.matches=false;hoverChange({matches:false});}};
}
test('VR notice appears only for a mouse hovering an open available menu and leaves with the pointer',()=>{
 const f=fixture();f.dispatch('projectVr','pointerenter',{pointerType:'mouse'});assert.equal(f.notice.hidden,true);
 f.open();f.dispatch('projectVr','pointerenter',{pointerType:'mouse'});assert.equal(f.notice.hidden,false);assert.equal(f.notice.textContent,'아직 준비 중입니다.');
 f.dispatch('projectVr','pointerleave',{pointerType:'mouse'});assert.equal(f.notice.hidden,true);assert.equal(f.notice.textContent,'');
});
test('focus, keyboard/click and touch cannot reveal the notice',()=>{
 const f=fixture();f.open();
 for(const [event,data] of [['focus',{}],['click',{detail:0}],['pointerenter',{pointerType:'touch'}],['click',{detail:1}]]){f.dispatch('projectVr',event,data);assert.equal(f.notice.hidden,true);}
 f.loseHover();f.dispatch('projectVr','pointerenter',{pointerType:'mouse'});assert.equal(f.notice.hidden,true);
});
test('closing the menu, leaving the cover or losing hover capability clears a shown notice',()=>{
 for(const dismiss of [f=>f.open(),f=>f.journey(),f=>f.loseHover()]){
  const f=fixture();f.open();f.dispatch('projectVr','pointerenter',{pointerType:'mouse'});assert.equal(f.notice.hidden,false);
  dismiss(f);assert.equal(f.notice.hidden,true);assert.equal(f.notice.textContent,'');
 }
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/<button id="projectVr"[^>]*aria-label="VR 체험"/);
});
