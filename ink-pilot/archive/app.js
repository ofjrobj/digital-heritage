import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const decoder = new DRACOLoader().setDecoderPath('./vendor/draco/').setWorkerLimit(1);
const loader = new GLTFLoader().setDRACOLoader(decoder);
const returnLink = document.querySelector('[data-story-return]');
const returnPage=sessionStorage.getItem('ink-pilot-return');
returnLink.href='../'+(['review.html','review.html?candidate=720p'].includes(returnPage)?returnPage:'play.html');

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
    loading.textContent = event.total ? `불러오는 중 ${Math.round(event.loaded/event.total*100)}%` : '스캔 데이터를 불러오는 중…';
  }).then(gltf => {
    const model=gltf.scene;
    model.rotation.y=yaw;
    const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3());
    const scale=targetSize/box.getSize(new THREE.Vector3()).x;
    model.scale.setScalar(scale);model.position.sub(center.multiplyScalar(scale));
    model.traverse(n=>{if(n.isMesh){n.material.roughness=.95;n.material.metalness=0;n.material.map && (n.material.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy()));}});
    scene.add(model);ready=true;dirty=true;loading.style.opacity=0;loading.setAttribute('aria-hidden','true');
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
const pairViews = [
 {title:'등의 결을 비교하세요',text:'목 뒤에서 등으로 이어지는 털 무늬를 돌려 보세요. 스캔 표면에 남은 선의 깊이와 간격을 서로 비교할 수 있습니다.',male:[-2.5,2.3,2.8],female:[-2.5,2.3,2.8]},
 {title:'머리의 조각을 살펴보세요',text:'정수리의 곱슬거리는 갈기와 귀 주변의 굴곡을 입체적으로 살펴보세요.',male:[2,1.2,1.8],female:[2,1.2,1.8],target:[.45,.2,0]},
 {title:'몸통의 윤곽을 비교하세요',text:'각 개체의 몸 길이와 몸통·다리의 비례, 표면에 새겨진 털 무늬를 함께 살펴보세요.',male:[.5,1,3.5],female:[.5,1,3.5]},
 {title:'얼굴과 눈매를 비교하세요',text:'눈·코·입과 수염 자국을 정면에서 비교하세요. 마우스나 손가락으로 방향을 바꿔 조각의 굴곡을 확인할 수 있습니다.',male:[3.4,.4,0],female:[3.4,.4,0],target:[.35,0,0]},
 {title:'측면과 꼬리를 살펴보세요',text:'옆면으로 돌려 몸통과 다리, 꼬리로 이어지는 형태를 확인하세요.',male:[0,.45,3.6],female:[0,.45,3.6]}
];
const detail = document.querySelector(".detail-card");
document.querySelectorAll(".hotspot").forEach(button => button.addEventListener("click", () => {
  const pointIndex = Number(button.dataset.point) - 1, note = pairViews[pointIndex];
  document.querySelectorAll(".hotspot").forEach(item => item.classList.toggle("is-active", item === button));
  viewers.male.focus(note.male,note.target);
  viewers.female.focus(note.female,note.target);
  detail.querySelector(".detail-kicker").textContent = `${button.dataset.point} · 두 개체 공통 시점`;
  detail.querySelector("h3").textContent = note.title;
  detail.querySelector(".detail-copy").textContent = note.text;
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
