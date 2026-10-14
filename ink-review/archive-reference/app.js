import {createSurfaceView,mountSurfaceToggle} from '../archive/surface-view.js?v=relief-contrast-1';
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";


const decoder = new DRACOLoader().setDecoderPath('../archive/vendor/draco/').setWorkerLimit(1);
const loader = new GLTFLoader().setDRACOLoader(decoder);
function createViewer({ element, loading, modelUrl, targetSize, yaw = 0, displayZoom = 1 }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .01, 100);
  camera.position.set(2.7, 1.15, 3.6);
  // Match subject size in the two viewer panels; this is display magnification only.
  // Scan vertices, proportions, scene scale and supplied measurements stay unchanged.
  camera.zoom = displayZoom;
  camera.updateProjectionMatrix();
  element.dataset.displayZoom = String(displayZoom);
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  element.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', element.getAttribute('aria-label'));
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08; controls.enablePan = false;
  controls.enableZoom = true; controls.zoomSpeed = .65;
  controls.minDistance = 1.15; controls.maxDistance = 6.5;
  controls.minPolarAngle = .18; controls.maxPolarAngle = 2.4;
  scene.add(new THREE.HemisphereLight(0xfff9ee, 0x62635f, 2));
  const key = new THREE.DirectionalLight(0xfff8ed, 2.2); key.position.set(-3,4,4);scene.add(key);
  const rim = new THREE.DirectionalLight(0xe0ebee, .7);rim.position.set(4,1,-3);scene.add(rim);
  let dirty = true, ready = false;
  // Wheel zoom updates synchronously inside OrbitControls, before the next RAF.
  controls.addEventListener('change',()=>{dirty=true;});
  const surface = createSurfaceView(THREE,scene,element,()=>{dirty=true;});
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
    model.traverse(n=>{if(n.isMesh){n.material.roughness=.95;n.material.metalness=0;n.material.map && (n.material.map.anisotropy=renderer.capabilities.getMaxAnisotropy());}});
    model.traverse(n=>{if(n.isMesh&&n.material.map)element.dataset.colorTextureResolution=`${n.material.map.image.width}x${n.material.map.image.height}`;});
    surface.bind(model);scene.add(model);ready=true;dirty=true;loading.style.opacity=0;loading.setAttribute('aria-hidden','true');loading.hidden=true;
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
    if(dirty){renderer.render(scene,camera);element.dataset.viewDistance=camera.position.distanceTo(controls.target).toFixed(4);dirty=false;}
  }
  animate();return {focus,loaded,setColor:surface.setColor};
}
const viewers = {
 male:createViewer({element:document.querySelector('#male-scene'),loading:document.querySelector('#male-loading'),modelUrl:'../archive/models/male-continuous.glb',targetSize:1.83,yaw:-3.902609*Math.PI/180}),
 female:createViewer({element:document.querySelector('#female-scene'),loading:document.querySelector('#female-loading'),modelUrl:'../archive/models/female-continuous.glb',targetSize:2.10,yaw:-140.445485*Math.PI/180,displayZoom:1.25})
};
mountSurfaceToggle(viewers);
const pairViews = [
  {label:"갈기", title:"두 개체의 갈기를 비교하세요", text:"스캔 데이터를 통해 정수리 부분의 곱슬거리는 털 표현의 미세한 음각 양각을 입체적으로 관찰할 수 있습니다.", measurements:[{label:"정수리 갈기 수",female:"8개",male:"11개"}], male:[0,1.15,-5.2], female:[0,1.15,-5.2]},
  {label:"수염", title:"두 개체의 수염을 비교하세요", text:"마모되어 두드러지지 않던 입과 수염 자국의 굴곡이 스캔 데이터를 통해 뚜렷하게 드러납니다.", measurements:[{label:"수염 수 (한쪽 당)",female:"8개",male:"4개"},{label:"수염 평균 길이",female:"6.5cm",male:"9.5cm"}], male:[2.1,1.9,3.2], female:[-2.1,1.9,3.2]},
  {label:"무늬", title:"두 개체의 무늬를 비교하세요", text:"목 뒤부터 등 전체로 규칙적으로 새겨진 결 형태의 털 무늬와 질감이 스캔 데이터를 통해 더욱 입체적이고 선명하게 확인됩니다.", measurements:[{label:"몸 길이",female:"120.1cm",male:"104.6cm"},{label:"등 줄기 수",female:"16",male:"18"}], male:[-3.1,.9,3.8], female:[3.1,.9,3.8]},
  {label:"이목구비", title:"두 개체의 이목구비를 비교하세요", text:"육안으로 확인하기 힘들었던 얼굴 윤곽과 이목구비 조형 표현이 스캔 데이터로 선명하게 시각화됩니다.", measurements:[{label:"코 길이",female:"15.4cm",male:"10.2cm"},{label:"귀 크기",female:"11.2cm",male:"15.5cm"},{label:"입 크기",female:"21.9cm",male:"15.9cm"},{label:"이빨 크기",female:"1.2cm",male:"1.8cm"},{label:"이빨 수",female:"9개",male:"7개"}], male:[0,1.2,5.2], female:[0,1.2,5.2]},
  {label:"눈매", title:"두 개체의 눈매를 비교하세요", text:"암수사자의 얼굴 크기 차이가 비교되고, 눈매의 차이가 스캔 데이터를 통해 선명하게 확인됩니다.", measurements:[{label:"얼굴 길이",female:"34.1cm",male:"36.8cm"},{label:"얼굴 넓이",female:"34.5cm",male:"37.6cm"},{label:"오른쪽 눈 길이",female:"9.5cm",male:"80.4cm"},{label:"왼쪽 눈 길이",female:"9.4cm",male:"77.1cm"}], male:[5.1,1.1,.2], female:[-5.1,1.1,.2]}
];
pairViews.forEach((view, index) => { view.title = `${String(index + 1).padStart(2, "0")}. ${view.label}`; });
const detail = document.querySelector(".detail-card");
document.querySelector(".wordmark-title").textContent = "봉황동 석사자";
detail.querySelector("h3").textContent = pairViews[0].title;
detail.querySelector(".detail-copy").textContent = pairViews[0].text;
detail.querySelector(".detail-status").textContent = "출처 · 공주대학교 박물관 소장 (디지털 변환: 사자성어 팀)";
const updatePanel = (panel, objectName, sex, point, note) => {
  const { label, measurements } = note;
  panel.querySelector(".panel-kicker").textContent = `OBJECT ${objectName === "숫사자" ? "01" : "02"} · ${point} ${label}`;
  panel.querySelector("h1, h2").textContent = objectName;
  panel.querySelector(".panel-subtitle").textContent = label;
  panel.querySelector("dl").innerHTML = measurements.map(item => `<div><dt>${item.label}</dt><dd>${item[sex]}</dd></div>`).join("");
  panel.querySelector(".panel-note").textContent = "출처 · 공주대학교 박물관 소장 (디지털 변환: 사자성어 팀)";
};
updatePanel(document.querySelector(".left-panel"), "숫사자", "male", "01", pairViews[0]);
updatePanel(document.querySelector(".right-panel"), "암사자", "female", "01", pairViews[0]);
document.querySelectorAll(".hotspot").forEach(button => button.addEventListener("click", () => {
  const pointIndex = Number(button.dataset.point) - 1, note = pairViews[pointIndex];
  const panels = [...document.querySelectorAll(".info-panel")];
  if (button.classList.contains("is-active") && panels.some(panel => panel.classList.contains("is-open"))) {
    panels.forEach(panel => {
      panel.classList.remove("is-open");
      panel.querySelector(".panel-toggle").setAttribute("aria-expanded", "false");
    });
    return;
  }
  document.querySelectorAll(".hotspot").forEach(item => item.classList.toggle("is-active", item === button));
  viewers.male.focus(note.male);
  viewers.female.focus(note.female);
  detail.querySelector("h3").textContent = note.title;
  detail.querySelector(".detail-copy").textContent = note.text;
  updatePanel(document.querySelector(".left-panel"), "숫사자", "male", button.dataset.point, note);
  updatePanel(document.querySelector(".right-panel"), "암사자", "female", button.dataset.point, note);
  panels.forEach(panel => {
    panel.classList.add("is-open");
    panel.querySelector(".panel-toggle").setAttribute("aria-expanded", "true");
  });
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
