import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
// The original Blender film remains the historical sequence. Its modern hold
// blends into the new school-courtyard still with the actual scan models.
const host=document.createElement('div');host.id='endingModernArt';host.setAttribute('aria-label','현재 학교 마당의 두 석사자');
host.style.cssText='position:absolute;inset:0;z-index:2;opacity:0;transition:opacity 2.5s;pointer-events:none;background:#dddccb';document.querySelector('#memory').append(host);
const frames=await fetch('./assets/symbolic-frames-v002.json').then(r=>r.json());const frame=frames.find(f=>f.id==='current-summer');
const image=new Image();image.alt='현재 · 학교 마당의 밝은 여름';image.src=frame.url;image.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover';host.append(image);
const scene=new THREE.Scene(),loader=new GLTFLoader();scene.add(new THREE.HemisphereLight(0xffffee,0x435441,2.5));const sun=new THREE.DirectionalLight(0xffe8cb,3);sun.position.set(-3,6,4);scene.add(sun);
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%';host.append(renderer.domElement);
const camera=new THREE.OrthographicCamera(-3.2,3.2,1.8,-1.8,.1,50);camera.position.set(0,1.2,8);camera.lookAt(0,0,0);
let ready=false,show=false;const render=()=>{if(!ready)return;const aspect=host.clientWidth/host.clientHeight;camera.left=-1.8*aspect;camera.right=1.8*aspect;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight,false);renderer.render(scene,camera);};
await Promise.all(['stone-lion.glb','stone-lion-female.glb'].map(async(name,i)=>{const gltf=await loader.loadAsync('./assets/'+name),model=gltf.scene,box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());model.position.sub(box.getCenter(new THREE.Vector3()));const pivot=new THREE.Group();pivot.add(model);pivot.scale.setScalar(1.1/size.y);pivot.rotation.y=-Math.PI/4;pivot.position.set(i===0?.72:-.72,-.7,0);scene.add(pivot);}));
ready=true;host.dataset.ready='true';new ResizeObserver(render).observe(host);render();
document.addEventListener('ending-modern',e=>{show=e.detail;host.style.opacity=show?'1':'0';if(show)render();});
