import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../assets/ui-preview.js',import.meta.url),'utf8').replaceAll('export ','').replace('import.meta.url',JSON.stringify('https://example.com/assets/ui-preview.js'));
const runtime=readFileSync(new URL('../assets/test-render-media.js',import.meta.url),'utf8');
function scope(search){
 const events={},links=[];
 const context=vm.createContext({URL,URLSearchParams,location:{search},document:{documentElement:{dataset:{}},head:{append:link=>links.push(link)},createElement:()=>({})},addEventListener:(type,handler,options)=>events[type]={handler,options}});
 vm.runInContext(source,context);return{context,events,links};
}
function runtimePart(start,end){return runtime.slice(runtime.indexOf(start),runtime.indexOf(end,runtime.indexOf(start)));}

test('only UX previews contain wheel input and keep their flag through Story/Index navigation',()=>{
 const preview=scope('?start=intro&preview=ux');let prevented=0;
 preview.events.wheel.handler({ctrlKey:false,preventDefault(){prevented++;}});
 preview.events.wheel.handler({ctrlKey:true,preventDefault(){prevented++;}});
 assert.equal(prevented,1);assert.equal(preview.events.wheel.options.passive,false);
 assert.equal(preview.context.previewRoute('https://example.com/?start=intro'),'https://example.com/?start=intro&preview=ux');
 assert.equal(preview.context.previewRoute('https://example.com/archive/'),'https://example.com/archive/?preview=ux');
 assert.equal(preview.context.document.documentElement.dataset.uiPreview,'true');
 const main=scope('?start=intro');assert.deepEqual(Object.keys(main.events),[]);assert.equal(main.links.length,0);
 assert.equal(main.context.previewRoute('https://example.com/?start=intro'),'https://example.com/?start=intro');
});

test('the preview cannot enable voice or toggle sound, while the main Story can',()=>{
 for(const uiPreview of [true,false]){
  const values=[],button={};
  const context=vm.createContext({uiPreview,embeddedStory:false,sound:false,lastVoiceEnable:null,voices:{setEnabled:value=>values.push(value)},$:()=>button,nativeAudioBlocked:false,unlockNativeSound(){},quietAmbience:null,syncSoundButton(){},storyMusic:{enable(){}},replacementOpening:true,paused:false,transition:null,current:null});
  vm.runInContext(runtimePart('function voiceEnabled(', 'function seasonUiInsets('),context);
  context.voiceEnabled(true);assert.deepEqual(values,[!uiPreview]);
  vm.runInContext(runtimePart("if($('soundToggle'))$('soundToggle').onclick", "for(const type of ['pointerdown'"),context);
  button.onclick();assert.equal(context.sound,!uiPreview);
 }
});

test('opening or leaving the UX preview does not consume or overwrite the main Story resume state',()=>{
 const touched=[];
 const context=vm.createContext({document:{addEventListener(){}},uiPreview:true,embeddedStory:false,entryGate:true,URLSearchParams,location:{search:'?start=intro&preview=ux'},sessionStorage:{getItem:key=>touched.push(key),removeItem:key=>touched.push(key),setItem:key=>touched.push(key)}});
 vm.runInContext(runtimePart(' const freshIntro=', ' if(pendingIntroEntry&&'),context);
 vm.runInContext(runtimePart('function remember()', "if($('indexLink'))"),context);context.remember();
 assert.deepEqual(touched,[]);
});
