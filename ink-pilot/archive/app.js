import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { measurements } from './measurements.js?v=archive-link-1';

const decoder = new DRACOLoader().setDecoderPath('./vendor/draco/').setWorkerLimit(1);
const loader = new GLTFLoader().setDRACOLoader(decoder);
const returnLink = document.querySelector('[data-story-return]');
const returnPage=new URLSearchParams(location.search).get('from')==='spatial-test'?'spatial-test.html':sessionStorage.getItem('ink-pilot-return');
const storyPage=['play.html','review.html','review.html?candidate=720p','spatial-test.html'].includes(returnPage)?returnPage:'spatial-test.html';
returnLink.href='../'+storyPage+(storyPage==='spatial-test.html'?'?rev=archive-link-1':'');

function createViewer({ element, loading, modelUrl, targetSize, yaw = 0 }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .01, 100);
  camera.position.set(2.7, 1.15, 3.6);
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  element.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', element.getAttribute('aria-label'));
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08; controls.enablePan = false;
  controls.minDistance = 1.15; controls.maxDistance = 6.5;
  controls.minPolarAngle = .18; controls.maxPolarAngle = 2.4;
  scene.add(new THREE.HemisphereLight(0xfff9ee, 0x62635f, 2));
  const key = new THREE.DirectionalLight(0xfff8ed, 2.2); key.position.set(-3,4,4);scene.add(key);
  const rim = new THREE.DirectionalLight(0xe0ebee, .7);rim.position.set(4,1,-3);scene.add(rim);
  let dirty = true, ready = false;
  const frame = () => {
    const r = element.getBoundingClientRect();
    if (!r.width || !r.height) return;
    camera.aspect=r.width/r.height;camera.updateProjectionMatrix();
    renderer.setSize(r.width,r.height,false);dirty=true;
  };
  new ResizeObserver(frame).observe(element);frame();
  const loaded = loader.loadAsync(modelUrl, event => {
    loading.textContent = event.total ? `불러오는 중 ${Math.min(100,Math.round(event.loaded/event.total*100))}%` : '스캔 데이터를 불러오는 중…';
  }).then(gltf => {
    const model=gltf.scene;
    model.rotation.y=yaw;
    const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3());
    const scale=targetSize/box.getSize(new THREE.Vector3()).x;
    model.scale.setScalar(scale);model.position.sub(center.multiplyScalar(scale));
    model.traverse(n=>{if(n.isMesh){n.material.roughness=.95;n.material.metalness=0;n.material.map && (n.material.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy()));}});
    scene.add(model);ready=true;dirty=true;loading.style.opacity=0;loading.setAttribute('aria-hidden','true');loading.hidden=true;
    element.dataset.loaded='true';
  }).catch(error => {
    console.error(error);loading.textContent='모델을 불러오지 못했습니다. 새로고침해 주세요.';element.dataset.loaded='error';
  });
  let goal=null;
  function focus(position,target=[0,0,0]) {goal={position:new THREE.Vector3(...position),target:new THREE.Vector3(...target)};dirty=true;}
  controls.addEventListener('start',()=>{goal=null;});
  function animate(){
    requestAnimationFrame(animate);
    if(document.hidden)return;
    if(goal){camera.position.lerp(goal.position,.1);controls.target.lerp(goal.target,.1);dirty=true;if(camera.position.distanceTo(goal.position)<.002){camera.position.copy(goal.position);controls.target.copy(goal.target);goal=null;}}
    if(controls.update())dirty=true;
    if(dirty){renderer.render(scene,camera);dirty=false;}
  }
  animate();return {focus,loaded};
}
const viewers = {
 male:createViewer({element:document.querySelector('#male-scene'),loading:document.querySelector('#male-loading'),modelUrl:'models/male.glb',targetSize:1.83,yaw:-3.902609*Math.PI/180}),
 female:createViewer({element:document.querySelector('#female-scene'),loading:document.querySelector('#female-loading'),modelUrl:'models/female.glb',targetSize:2.10,yaw:-140.445485*Math.PI/180})
};
// The archive's numbered descriptions and side panels use the supplied scan values.
// Keep the local GLB projection settings above: the remote archive used different OBJ axes.
const detail = document.querySelector('.detail-card');
const panels = [...document.querySelectorAll('.info-panel')];
const sourceNote = '출처 · 공주대학교 박물관 소장 (디지털 변환: 사자성어 팀)';
const descriptions = [
 '스캔 데이터를 통해 정수리 부분의 곱슬거리는 털 표현의 미세한 음각 양각을 입체적으로 관찰할 수 있습니다.',
 '마모되어 두드러지지 않던 입과 수염 자국의 굴곡이 스캔 데이터를 통해 뚜렷하게 드러납니다.',
 '목 뒤부터 등 전체로 규칙적으로 새겨진 결 형태의 털 무늬와 질감이 스캔 데이터를 통해 더욱 입체적이고 선명하게 확인됩니다.',
 '육안으로 확인하기 힘들었던 얼굴 윤곽과 이목구비 조형 표현이 스캔 데이터로 선명하게 시각화됩니다.',
 '암수사자의 얼굴 크기 차이가 비교되고, 눈매의 차이가 스캔 데이터를 통해 선명하게 확인됩니다.'
];
function setPanelOpen(panel, open) {
 panel.classList.toggle('is-open', open);
 panel.querySelector('.panel-toggle').setAttribute('aria-expanded', String(open));
}
function updatePanel(panel, objectName, column, point, note) {
 panel.querySelector('.panel-kicker').textContent=`OBJECT ${column===2?'01':'02'} · ${point} ${note.label}`;
 panel.querySelector('h1,h2').textContent=objectName;
 panel.querySelector('.panel-subtitle').textContent=note.label;
 const rows=note.rows.map(row=>{
  const pair=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');
  term.textContent=row[0];value.textContent=row[column];pair.append(term,value);return pair;
 });
 panel.querySelector('dl').replaceChildren(...rows);
 panel.querySelector('.panel-note').textContent=sourceNote;
 panel.querySelector('.panel-content').scrollTop=0;
}
function showObservation(index, focus=false) {
 const note=measurements[index],point=String(index+1).padStart(2,'0');
 document.querySelectorAll('.hotspot').forEach(button=>{
  const selected=button.dataset.point===point;
  button.classList.toggle('is-active',selected);
  button.setAttribute('aria-pressed',String(selected));
 });
 detail.querySelector('.detail-kicker').textContent=`${point} · 두 개체 공통 시점`;
 detail.querySelector('h3').textContent=`${point}. ${note.label}`;
 detail.querySelector('.detail-copy').textContent=descriptions[index];
 detail.querySelector('.detail-status').textContent=sourceNote;
 updatePanel(document.querySelector('.left-panel'),'수사자',2,point,note);
 updatePanel(document.querySelector('.right-panel'),'암사자',1,point,note);
 if(focus){viewers.male.focus(note.position,note.target);viewers.female.focus(note.position,note.target);}
}
showObservation(0);
document.querySelectorAll('.hotspot').forEach(button=>button.addEventListener('click',()=>{
 if(button.classList.contains('is-active')&&panels.some(panel=>panel.classList.contains('is-open'))){
  panels.forEach(panel=>setPanelOpen(panel,false));return;
 }
 showObservation(Number(button.dataset.point)-1,true);
 panels.forEach(panel=>setPanelOpen(panel,true));
}));
document.querySelectorAll('.panel-toggle').forEach(button=>button.addEventListener('click',()=>{
 const panel=button.closest('.info-panel'),wasOpen=panel.classList.contains('is-open');
 panels.forEach(item=>setPanelOpen(item,false));
 if(!wasOpen)setPanelOpen(panel,true);
}));
