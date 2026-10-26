import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createNormalMapView} from '../normal-map-view.js';
import {mountSurfaceToggle} from '../surface-view.js';

function fixture(load){
 const texture=new THREE.Texture(),api={...THREE,TextureLoader:class{loadAsync(url){assert.equal(url,'normal.webp');return load?load(texture):Promise.resolve(texture);}}};
 const element={dataset:{surfaceMode:'relief'}},original=new THREE.MeshStandardMaterial({color:0x737373});
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(),original),model=new THREE.Group();model.add(mesh);
 const view=createNormalMapView(api,{element,textureUrl:'normal.webp'});view.bind(model);
 return {view,mesh,texture,original,element};
}

test('normal view uses the actual supplied texture and matching glTF UV orientation',async()=>{
 const {view,mesh,texture,original,element}=fixture();
 assert.equal(await view.setEnabled(true),true);
 assert.equal(mesh.material.isMeshBasicMaterial,true);assert.equal(mesh.material.map,texture);
 assert.equal(texture.flipY,false);assert.equal(texture.colorSpace,THREE.SRGBColorSpace);
 assert.equal(mesh.material.toneMapped,false);assert.equal(element.dataset.surfaceMode,'normal-map');
 await view.setEnabled(false);assert.equal(mesh.material,original);assert.equal(element.dataset.surfaceMode,'relief');
});

test('closing normal view restores whichever color or gray material was active',async()=>{
 const {view,mesh,element}=fixture();
 const color=new THREE.MeshStandardMaterial({map:new THREE.Texture()});mesh.material=color;element.dataset.surfaceMode='color';
 await view.setEnabled(true);await view.setEnabled(false);
 assert.equal(mesh.material,color);assert.equal(element.dataset.surfaceMode,'color');
});

test('leaving normal mode while its texture loads does not replace the newly selected material',async()=>{
 let resolve;const {view,mesh,original,texture}=fixture(()=>new Promise(done=>resolve=done));
 const pending=view.setEnabled(true);await view.setEnabled(false);resolve(texture);await pending;
 assert.equal(mesh.material,original);
});

test('a failed texture leaves the original material intact and can be retried',async()=>{
 let attempts=0;const {view,mesh,original,element}=fixture(texture=>++attempts===1?Promise.reject(Error('network')):Promise.resolve(texture));
 assert.equal(await view.setEnabled(true),false);assert.equal(mesh.material,original);assert.equal(element.dataset.normalMap,'error');
 assert.equal(await view.setEnabled(true),true);assert.equal(mesh.material.isMeshBasicMaterial,true);assert.equal(attempts,2);
});

function pairedControl(loads=[]){
 const fixtures=[fixture(loads[0]),fixture(loads[1])];
 const button={dataset:{},attributes:{},listeners:{},
  setAttribute(name,value){this.attributes[name]=value;},removeAttribute(name){delete this.attributes[name];},
  addEventListener(name,fn){this.listeners[name]=fn;},querySelectorAll(){return [];},click(){return this.listeners.click();}};
 const hotspot={addEventListener(name,fn){this[name]=fn;}};
 const root={createElement(){return button;},querySelector(){return {after(){}};},querySelectorAll(){return [hotspot];}};
 const viewers=fixtures.map(f=>{
  f.color=new THREE.MeshStandardMaterial({map:new THREE.Texture()});
  return {setNormalMap:f.view.setEnabled,setColor(value){f.view.setEnabled(false);f.mesh.material=value?f.color:f.original;f.element.dataset.surfaceMode=value?'color':'relief';}};
 });
 mountSurfaceToggle(viewers,root);
 return {button,hotspot,fixtures};
}

test('the one surface button cycles actual normal, color, and untextured materials on both scans',async()=>{
 const {button,fixtures}=pairedControl();
 assert.equal(button.dataset.mode,'relief');
 await button.click();assert.equal(button.dataset.mode,'normal-map');
 fixtures.forEach(f=>assert.equal(f.mesh.material.map,f.texture));
 await button.click();assert.equal(button.dataset.mode,'color');
 fixtures.forEach(f=>assert.equal(f.mesh.material,f.color));
 await button.click();assert.equal(button.dataset.mode,'relief');
 fixtures.forEach(f=>assert.equal(f.mesh.material,f.original));
 assert.match(button.attributes['aria-label'],/무채색.*노멀맵/);
});

for(const reset of ['rapid clicks','observation selection'])test(`pending paired normal loads cannot override ${reset}`,async()=>{
 const resolve=[];
 const {button,hotspot,fixtures}=pairedControl([0,1].map(i=>texture=>new Promise(done=>resolve[i]=()=>done(texture))));
 const pending=button.click();
 assert.equal(button.attributes['aria-busy'],'true');
 if(reset==='rapid clicks'){await button.click();await button.click();}else await hotspot.click();
 resolve.forEach(done=>done());await pending;
 assert.equal(button.dataset.mode,'relief');assert.equal(button.attributes['aria-busy'],undefined);
 fixtures.forEach(f=>assert.equal(f.mesh.material,f.original));
});

test('one failed normal map restores both scans and the merged button can retry',async()=>{
 let attempts=0;
 const {button,fixtures}=pairedControl([undefined,texture=>++attempts===1?Promise.reject(Error('network')):Promise.resolve(texture)]);
 await button.click();
 assert.equal(button.dataset.mode,'relief');fixtures.forEach(f=>assert.equal(f.mesh.material,f.original));
 await button.click();
 assert.equal(button.dataset.mode,'normal-map');fixtures.forEach(f=>assert.equal(f.mesh.material.map,f.texture));
});
