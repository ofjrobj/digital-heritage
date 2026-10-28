import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../assets/public-routes.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
function routes(base,search=''){
 const story={},back={},index={},current={};
 const links=new Map([['#storyLink',[story]],['[data-story-return]',[back]],['#indexLink, .tr-archive-cta',[index]],['#archiveStoryIndexBar [aria-current="page"], .archive .wordmark',[current]]]);
 const context=vm.createContext({URL,URLSearchParams,location:{search},previewRoute:value=>{const url=new URL(value);if(new URLSearchParams(search).get('preview')==='ux')url.searchParams.set('preview','ux');return url.href;},
  document:{querySelectorAll:selector=>links.get(selector)||[],getElementById:()=>null},MutationObserver:class{observe(){}}});
 vm.runInContext(source.replaceAll('import.meta.url',JSON.stringify(base)),context);
 return {story,back,index,current};
}

test('Index returns open the Story main screen under both project and local prefixes',()=>{
 for(const prefix of ['https://ofjrobj.github.io/digital-heritage/gongju-mok-stone-lions/','http://127.0.0.1:8794/']){
  const links=routes(prefix+'assets/public-routes.js?v=test');
  assert.equal(links.back.href,prefix+'?start=main');
  assert.equal(links.story.href,prefix+'?start=intro');
  assert.equal(links.index.href,prefix+'archive/');
 }
});

test('direct Story returns preserve the silent UX preview and native viewer paths',()=>{
 const prefix='https://example.com/project/';
 const preview=routes(prefix+'assets/public-routes.js','?preview=ux');
 assert.equal(preview.back.href,prefix+'?start=main&preview=ux');
 assert.equal(preview.index.href,prefix+'archive/?preview=ux');
 const native=routes(prefix+'assets/public-routes.js','?native=blender-test');
 assert.equal(native.back.href,prefix+'blender-test/?start=main');
 assert.equal(native.index.href,prefix+'archive/?native=blender-test');
});
