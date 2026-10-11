import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

function createViewer({ element, loading, modelUrl, targetSize = 2.72 }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  camera.position.set(2.5, 1.1, 5.3);
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  element.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .06; controls.enablePan = false;
  controls.minDistance = 2.2; controls.maxDistance = 6.5; controls.minPolarAngle = .25; controls.maxPolarAngle = 2.25; controls.target.set(0,-.05,0);
  scene.add(new THREE.HemisphereLight(0xf5fff8,0x456b61,2.8));
  const key = new THREE.DirectionalLight(0xfff4df,3.3); key.position.set(-3,4,4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7daaa0,2.2); rim.position.set(4,1,-3); scene.add(rim);
  const root = new THREE.Group(); scene.add(root);
  const frame = () => { const r=element.getBoundingClientRect(); camera.aspect=r.width/r.height; camera.updateProjectionMatrix(); renderer.setSize(r.width,r.height,false); };
  addEventListener("resize",frame); frame();
  (async () => {
    const model=(await new GLTFLoader().loadAsync(modelUrl)).scene;
    model.rotation.y=-Math.PI/4;
    const box=new THREE.Box3().setFromObject(model), size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3()), scale=targetSize/Math.max(size.x,size.y,size.z);
    model.scale.setScalar(scale); model.position.sub(center.multiplyScalar(scale)); model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.material.side=THREE.DoubleSide;}}); root.add(model); loading.style.opacity=0;
  })().catch(error=>{console.error(error);loading.textContent="석사자를 불러오지 못했습니다. 새로고침해 주세요.";});
  function focus(position, target = [0, 0, 0]) { controls.target.set(...target); camera.position.set(...position); controls.update(); }
  function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)} animate();
  return { focus };
}
const viewers = {
  male: createViewer({element:document.querySelector("#male-scene"),loading:document.querySelector("#male-loading"),modelUrl:"./assets/stone-lion.glb",targetSize:3.4}),
  female: createViewer({element:document.querySelector("#female-scene"),loading:document.querySelector("#female-loading"),modelUrl:"./assets/stone-lion-female.glb",targetSize:3.0})
};
const pairViews = [
  {title:"두 개체의 등을 비교하세요", text:"등에서 목으로 이어지는 선과 굴곡을 나란히 살펴보세요. 두 석사자는 각각 드래그하여 돌려 볼 수 있습니다.", male:[0,1.15,-5.2], female:[0,1.15,-5.2]},
  {title:"두 개체의 머리를 비교하세요", text:"눈과 입의 윤곽, 얼굴의 폭을 비교해 보세요. 빛을 받는 면과 그림자가 지는 면을 따라 서로 다른 표정을 만나보세요.", male:[2.1,1.9,3.2], female:[-2.1,1.9,3.2]},
  {title:"두 개체의 몸통을 비교하세요", text:"어깨에서 몸통으로 이어지는 굴곡을 따라가 보세요. 돌 표면에 남은 선과 질감을 가까이에서 관찰할 수 있습니다.", male:[-3.1,.9,3.8], female:[3.1,.9,3.8]}
];
const detail = document.querySelector(".detail-card");
document.querySelectorAll(".hotspot").forEach(button => button.addEventListener("click", () => {
  const pointIndex = Number(button.dataset.point) - 1, note = pairViews[pointIndex];
  document.querySelectorAll(".hotspot").forEach(item => item.classList.toggle("is-active", item === button));
  viewers.male.focus(note.male);
  viewers.female.focus(note.female);
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
