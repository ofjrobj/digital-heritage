import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createNormalMapView} from '../normal-map-view.js';

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
