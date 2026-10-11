import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { measurements } from './measurements.js?v=1';

const decoder = new DRACOLoader().setDecoderPath('./vendor/draco/').setWorkerLimit(1);
const loader = new GLTFLoader().setDRACOLoader(decoder);
const returnLink = document.querySelector('[data-story-return]');
const returnPage=new URLSearchParams(location.search).get('from')==='spatial-test'?'spatial-test.html':sessionStorage.getItem('ink-pilot-return');
returnLink.href='../'+(['review.html','review.html?candidate=720p','spatial-test.html'].includes(returnPage)?returnPage:'play.html');

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
const detail = document.querySelector(".detail-card");
const measurementTable=document.createElement('table');
measurementTable.className='measurement-table';measurementTable.hidden=true;
detail.querySelector('.detail-status').before(measurementTable);
detail.tabIndex=0;
function showMeasurements(note){
 const caption=document.createElement('caption');caption.textContent=note.label+' 비교';
 const head=document.createElement('thead'),headRow=document.createElement('tr');
 for(const label of ['항목','암','수']){const th=document.createElement('th');th.scope='col';th.textContent=label;headRow.append(th);}
 head.append(headRow);
 const body=document.createElement('tbody');
 for(const row of note.rows){const tr=document.createElement('tr');row.forEach((value,i)=>{const cell=document.createElement(i?'td':'th');if(!i)cell.scope='row';cell.textContent=value;tr.append(cell);});body.append(tr);}
 measurementTable.replaceChildren(caption,head,body);measurementTable.hidden=false;
 detail.classList.add('is-measurement');detail.scrollTop=0;
 detail.querySelector('.detail-status').textContent='제공 수치 · 암사자 / 수사자';
}
document.querySelectorAll(".hotspot").forEach(button => button.addEventListener("click", () => {
  const pointIndex = Number(button.dataset.point) - 1, note = measurements[pointIndex];
  document.querySelectorAll(".hotspot").forEach(item => item.classList.toggle("is-active", item === button));
  viewers.male.focus(note.position,note.target);
  viewers.female.focus(note.position,note.target);
  detail.querySelector(".detail-kicker").textContent = `${button.dataset.point} ${note.label} · 스캔 비교`;
  detail.querySelector("h3").textContent = note.title;
  detail.querySelector(".detail-copy").textContent = note.text;
  showMeasurements(note);
}));
document.querySelectorAll(".panel-toggle").forEach(button => button.addEventListener("click", () => {
  const panel = button.closest(".info-panel");
  const isOpen = panel.classList.contains("is-open");
  document.querySelectorAll(".info-panel").forEach(item => {
    item.classList.remove("is-open");
    item.querySelector(".panel-toggle").setAttribute("aria-expanded", "false");
  });
  if (!isOpen) {
    panel.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
  }
}));

// The initial view shows both complete scans; no detail point is selected yet.
document.querySelector('.hotspot.is-active')?.classList.remove('is-active');
