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
 assert.equal(mesh.material.isMeshStandardMaterial,true);assert.equal(mesh.material.normalMap,texture);
 assert.equal(mesh.material.map,null,'tangent-space RGB must not be painted as albedo');
 assert.deepEqual(mesh.material.normalScale.toArray(),[1,-1],'the source bitangent follows the OBJ-to-glTF V-axis conversion');
 assert.equal(texture.flipY,false);assert.equal(texture.colorSpace,THREE.NoColorSpace);
 const shader={fragmentShader:THREE.ShaderLib.standard.fragmentShader};mesh.material.onBeforeCompile(shader);
 const decoded=shader.fragmentShader.indexOf('#include <normal_fragment_maps>');
 const colored=shader.fragmentShader.indexOf('outgoingLight = packNormalToRGB(inspectionDetail) * inspectionShade;');
 const lit=shader.fragmentShader.indexOf('#include <lights_physical_fragment>');
 assert.ok(decoded<lit&&lit<colored,'lighting is measured on the decoded normal before its separate RGB visualization');
 assert.equal(mesh.material.toneMapped,false,'normal coordinates must not receive photographic tone mapping');
 assert.ok(!shader.fragmentShader.includes('#include <colorspace_fragment>'),'normal RGB remains the standard display encoding');
 assert.match(shader.fragmentShader,/mix\(0\.72, 1\.0, inspectionIllumination\)/,'the diagnostic colors retain a readable light floor');
 assert.equal(element.dataset.surfaceMode,'normal-map');
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
 assert.equal(await view.setEnabled(true),true);assert.equal(mesh.material.isMeshStandardMaterial,true);assert.ok(mesh.material.normalMap?.isTexture);assert.equal(attempts,2);
});

function pairedControl(loads=[]){
 const fixtures=[fixture(loads[0]),fixture(loads[1])];
 const button={dataset:{},attributes:{},listeners:{},
  setAttribute(name,value){this.attributes[name]=value;},removeAttribute(name){delete this.attributes[name];},
  addEventListener(name,fn){this.listeners[name]=fn;},querySelectorAll(){return [];},click(){return this.listeners.click();}};
 const root={createElement(){return button;},querySelector(){return {after(){}};}};
 const viewers=fixtures.map(f=>{
  f.color=new THREE.MeshStandardMaterial({map:new THREE.Texture()});
  return {setNormalMap:f.view.setEnabled,setColor(value){f.view.setEnabled(false);f.mesh.material=value?f.color:f.original;f.element.dataset.surfaceMode=value?'color':'relief';}};
 });
 const controller=mountSurfaceToggle(viewers,root);
 return {button,controller,fixtures};
}

test('the one surface button cycles actual normal, color, and untextured materials on both scans',async()=>{
 const {button,fixtures}=pairedControl();
 assert.equal(button.dataset.mode,'color');
 fixtures.forEach(f=>assert.equal(f.mesh.material,f.color));
 await button.click();assert.equal(button.dataset.mode,'relief');
 fixtures.forEach(f=>assert.equal(f.mesh.material,f.original));
 assert.match(button.attributes['aria-label'],/무채색.*노멀맵/);
 await button.click();assert.equal(button.dataset.mode,'normal-map');
 fixtures.forEach(f=>assert.equal(f.mesh.material.normalMap,f.texture));
 await button.click();assert.equal(button.dataset.mode,'color');
 fixtures.forEach(f=>assert.equal(f.mesh.material,f.color));
});

for(const reset of ['rapid clicks','explicit material reset'])test(`pending paired normal loads cannot override ${reset}`,async()=>{
 const resolve=[];
 const {button,controller,fixtures}=pairedControl([0,1].map(i=>texture=>new Promise(done=>resolve[i]=()=>done(texture))));
 await button.click();
 const pending=button.click();
 assert.equal(button.attributes['aria-busy'],'true');
 if(reset==='rapid clicks'){await button.click();await button.click();}else await controller.setMode('relief');
 resolve.forEach(done=>done());await pending;
 assert.equal(button.dataset.mode,'relief');assert.equal(button.attributes['aria-busy'],undefined);
 fixtures.forEach(f=>assert.equal(f.mesh.material,f.original));
});

test('one failed normal map restores both scans and the merged button can retry',async()=>{
 let attempts=0;
 const {button,fixtures}=pairedControl([undefined,texture=>++attempts===1?Promise.reject(Error('network')):Promise.resolve(texture)]);
 await button.click();await button.click();
 assert.equal(button.dataset.mode,'relief');fixtures.forEach(f=>assert.equal(f.mesh.material,f.original));
 await button.click();
 assert.equal(button.dataset.mode,'normal-map');fixtures.forEach(f=>assert.equal(f.mesh.material.normalMap,f.texture));
});
