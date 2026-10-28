import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {measurements} from '../measurements.js';

// Run the actual DOM wiring without creating a WebGL renderer in Node.
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const wiring=source.slice(source.indexOf('// Side panels follow'));
function fixture(initialMaterial='color'){
 const node=(text='')=>({textContent:text,dataset:{},attrs:{},handlers:{},children:[],
  setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},
  addEventListener(k,fn){this.handlers[k]=fn;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},
  classList:{values:new Set(),toggle(k,on){on?this.values.add(k):this.values.delete(k);},add(k){this.values.add(k);},remove(k){this.values.delete(k);},contains(k){return this.values.has(k);}}
 });
 const root=node(),caption=node(),fields=new Map([
  ['.detail-kicker',node('두 개체의 스캔 데이터')],['h3',node('돌에 새겨진 결을 살펴보세요')],
  ['.detail-copy',node('가운데 번호를 누르면 같은 부위를 비교할 수 있습니다.')],['.detail-status',node('')]
 ]);
 caption.querySelector=s=>fields.get(s);
 const buttons=measurements.map((_,i)=>{const b=node();b.dataset.point=String(i+1).padStart(2,'0');return b;});
 const panels=['left','right'].map((side,i)=>{
  const panel=node();panel.dataset.side=side;
  const parts=new Map([['.panel-kicker',node(`OBJECT 0${i+1}`)],['.panel-subtitle',node('크기 정보')],['.object-size-list',node()],['.panel-note',node('팀 측정 기록')],['.panel-content',node()],['.panel-toggle',node()]]);
  parts.get('.object-size-list').innerHTML='<div>original size data</div>';
  parts.get('.object-size-list').after=el=>{parts.set('.panel-observation',el);el.remove=()=>parts.delete('.panel-observation');};
  panel.querySelector=s=>parts.get(s)||null;
  parts.get('.panel-toggle').closest=()=>panel;
  return panel;
 });
 const document={documentElement:root,createElement:()=>node(),addEventListener(){},
  querySelector:s=>s==='.detail-card'?caption:null,
  querySelectorAll:s=>s==='.hotspot'?buttons:s==='.info-panel'?panels:s==='.panel-toggle'?panels.map(p=>p.querySelector(s)):[]
 };
 const focuses={male:[],female:[]},materialChanges=[],materialState={mode:initialMaterial};
 vm.runInNewContext(wiring,{document,measurements,viewers:Object.fromEntries(Object.keys(focuses).map(sex=>[sex,{focus:index=>focuses[sex].push(index)}])),surfaceToggle:{setMode:mode=>{materialChanges.push(mode);materialState.mode=mode;}}});
 return {root,caption,fields,buttons,panels,focuses,materialChanges,materialState};
}

test('all numbered selections and deselections preserve material and restore overview information',()=>{
 for(const mode of ['color','relief','normal-map']){
  const f=fixture(mode),initialTitle=f.fields.get('h3').textContent,initialCopy=f.fields.get('.detail-copy').textContent;
  for(let index=0;index<5;index++){
   const button=f.buttons[index];button.handlers.click();
   assert.equal(f.root.dataset.archivePoint,button.dataset.point);
   assert.equal(button.attrs['aria-pressed'],'true');
   assert.equal(f.fields.get('h3').textContent,measurements[index].label);
   f.panels.forEach((panel,p)=>{
    assert.equal(panel.querySelector('.panel-subtitle').textContent,measurements[index].label);
    assert.equal(panel.querySelector('.panel-observation'),null,'generic observation prose stays in the shared caption only');
    assert.deepEqual(panel.querySelector('.object-size-list').children.map(row=>row.children[1].textContent),measurements[index].rows.map(row=>row[p===0?2:1]).filter(value=>value!=null));
   });
   button.handlers.click();
   assert.equal(f.root.dataset.archivePoint,'');
   assert(f.buttons.every(b=>b.attrs['aria-pressed']==='false'&&!b.classList.contains('is-active')));
   assert.equal(f.caption.attrs['aria-hidden'],'true');
   assert.equal(f.fields.get('h3').textContent,initialTitle);
   assert.equal(f.fields.get('.detail-copy').textContent,initialCopy);
   assert(f.panels.every(panel=>panel.querySelector('.panel-subtitle').textContent==='크기 정보'));
   assert.equal(f.focuses.male.at(-1),null);assert.equal(f.focuses.female.at(-1),null);
   assert.equal(f.materialState.mode,mode);
   assert.deepEqual(f.materialChanges,[],`${mode}: numbered actions never invoke a material change`);
  }
 }
});

test('rapid feature changes leave one matching selection and caption',()=>{
 const f=fixture();
 for(const index of [0,4,2,3,1])f.buttons[index].handlers.click();
 assert.equal(f.root.dataset.archivePoint,'02');
 assert.deepEqual(f.buttons.map(b=>b.attrs['aria-pressed']),['false','true','false','false','false']);
 assert.equal(f.fields.get('h3').textContent,'수염');
 assert.equal(f.focuses.male.at(-1),1);assert.equal(f.focuses.female.at(-1),1);
});
