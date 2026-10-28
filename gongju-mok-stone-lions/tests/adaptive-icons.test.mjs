import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {iconTone,createAdaptiveIcons}=await import('../assets/adaptive-icons.js');

test('pale paper gets muted gray, dark scenery gets light gray, and paper overlays restore muted gray',()=>{
 assert.deepEqual(iconTone([232,232,230,255]),[119,119,113]);
 assert.deepEqual(iconTone([30,30,30,255]),[222,222,216]);
 assert.deepEqual(iconTone([0,0,0,0]),[119,119,113]);
 assert.deepEqual(iconTone([30,30,30,255],1),[119,119,113]);
 const values=[80,100,120,140,160,180,210].map(value=>iconTone([value,value,value,255])[0]);
 assert.ok(values.every((value,index)=>!index||value<=values[index-1]),'the tone changes continuously without threshold flips');
});

function fixture({ids=['fullscreenToggle','soundToggle'],colorSources={}}={}){
 const stats={reads:0,bounds:0,writes:0,regions:[]};let sourceX=0,fail=false;
 const ctx={clearRect(){},drawImage(canvas,x,y,w,h){sourceX=x;stats.regions.push({x,y,w,h});},getImageData(){stats.reads++;if(fail)throw Error('tainted');const value=sourceX<200?232:30;return {data:new Uint8ClampedArray([value,value,value,255])};}};
 const doc={hidden:false,defaultView:{getComputedStyle:node=>node.computed},createElement:()=>({getContext:()=>ctx})};
 const canvas={width:2000,height:1000,ownerDocument:doc,getBoundingClientRect(){stats.bounds++;return{left:0,top:0,width:1000,height:500};}};
 const nodes=ids.map((id,index)=>({id,computed:{visibility:'visible',display:'grid',opacity:'1'},rect:{left:20+index*200,top:20,width:40,height:40},getBoundingClientRect(){stats.bounds++;return{...this.rect,right:this.rect.left+this.rect.width,bottom:this.rect.top+this.rect.height};},style:{setProperty(name,value){assert.equal(name,'--scene-icon-color');stats.writes++;this.color=value;}}}));
 return {icons:createAdaptiveIcons(canvas,nodes,{colorSources}),stats,nodes,doc,fail:()=>{fail=true;}};
}

test('each icon samples its own actual region and eases independently with a bounded pixel-read budget',()=>{
 const {icons,stats,nodes}=fixture();
 icons.tick(0,.016,true);
 assert.equal(stats.reads,2);assert.deepEqual(stats.regions[0],{x:52,y:52,w:56,h:56});
 const initial=Number(nodes[1].style.color.match(/\d+/)[0]);assert.ok(initial>119&&initial<222,'a dark scene does not cause a one-frame flash');
 for(let now=10;now<=1000;now+=10)icons.tick(now,.01,true);
 assert.equal(stats.reads,6);
 assert.equal(nodes[0].style.color,'rgb(119, 119, 113)');
 assert.ok(Number(nodes[1].style.color.match(/\d+/)[0])>210);
 assert.equal(nodes[1].style.color,'rgb(222, 222, 216)','the shared UI timing settles at one second');
});

test('unchanged video frames skip readbacks but an icon moving on the same frame is sampled again',()=>{
 const {icons,stats,nodes}=fixture();icons.tick(0,.016,true,{frameKey:1});icons.tick(400,.016,true,{frameKey:1});assert.equal(stats.reads,2);
 nodes[1].rect.top=120;icons.tick(800,.016,true,{frameKey:1});assert.equal(stats.reads,3);
 icons.tick(1200,.016,true,{frameKey:2});assert.equal(stats.reads,5);
});

test('hidden pages and hidden controls perform no pixel reads, and the revealed icon resamples',()=>{
 const {icons,stats,nodes,doc}=fixture();icons.tick(0,.016,true,{visible:false});assert.equal(stats.bounds,0);
 doc.hidden=true;icons.tick(400,.016,true);assert.equal(stats.bounds,0);doc.hidden=false;
 nodes[1].computed.visibility='hidden';icons.tick(800,.016,true,{frameKey:1});assert.equal(stats.reads,1);
 nodes[1].computed.visibility='visible';icons.tick(1200,.016,true,{frameKey:1});assert.equal(stats.reads,2);
});

test('a blocked canvas read falls back quietly and is never retried every frame',()=>{
 const {icons,stats,fail}=fixture();fail();icons.tick(0,.016,true);icons.tick(500,.016,true);icons.tick(1000,.016,true);
 assert.equal(stats.reads,1);assert.equal(icons.proof().failed,true);
 assert.equal(icons.proof().colors[0].color,'rgb(119, 119, 113)');
});

test('integration targets icon controls only and keeps the original raster masks and fullscreen visibility policy',async()=>{
 const css=await readFile(new URL('../assets/test-render-media.css',import.meta.url),'utf8');
 const media=await readFile(new URL('../assets/test-render-media.js',import.meta.url),'utf8');
 const fullscreen=await readFile(new URL('../assets/fullscreen.js',import.meta.url),'utf8');
 const adaptiveRules=css.slice(css.indexOf('/* The original icon outlines'));
 assert.ok(!adaptiveRules.includes('storyIndexBar'));
 assert.match(adaptiveRules,/icons8-voice-50\.png/);assert.match(adaptiveRules,/icons8-mute-50\.png/);
 assert.match(media,/\['fullscreenToggle','soundToggle','projectMenuToggle','projectAbout','projectVr','projectQr'\]\.map\(\$\)/);
 assert.match(fullscreen,/const offered = !!hostDoc\.fullscreenEnabled && doc\.body\?\.dataset\.mediaProfile === 'selected-higgsfield'/);
});


test('fullscreen copies the plus tone on every easing frame instead of sampling its own different background',()=>{
 const {icons,stats,nodes}=fixture({ids:['fullscreenToggle','projectMenuToggle'],colorSources:{fullscreenToggle:'projectMenuToggle'}});
 for(let now=0;now<=1000;now+=10){
  icons.tick(now,.01,true,{frameKey:1});
  assert.equal(nodes[0].style.color,nodes[1].style.color);
 }
 assert.equal(stats.reads,1,'only the source icon reads its background');
 assert.equal(nodes[0].style.color,'rgb(222, 222, 216)','the plus background controls both icons');
 nodes[1].rect.left=20;
 for(let now=1200;now<=2400;now+=10){
  icons.tick(now,.01,true,{frameKey:2});
  assert.equal(nodes[0].style.color,nodes[1].style.color);
 }
 assert.equal(stats.reads,2);
 assert.equal(nodes[0].style.color,'rgb(119, 119, 113)','both return to muted gray as the source background brightens');
});

test('fullscreen keeps its accessible state label without a visible or native hover tooltip',async()=>{
 const [html,js,css]=await Promise.all(['../index.html','../assets/fullscreen.js','../assets/fullscreen.css'].map(path=>readFile(new URL(path,import.meta.url),'utf8')));
 const button=html.match(/<button id="fullscreenToggle"[^>]*>/)?.[0];
 assert.ok(button);assert.match(button,/aria-label="전체 화면"/);
 assert.doesNotMatch(button,/\btitle=|data-tooltip=/);
 assert.match(js,/setAttribute\('aria-label', '전체 화면'\)/);
 assert.match(js,/removeAttribute\('data-tooltip'\)/);
 assert.doesNotMatch(js,/dataset\.tooltip\s*=/);
 assert.match(css,/#fullscreenToggle::after\{content:none\}/);
});
