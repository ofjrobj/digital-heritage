import {levelScan,createInspectionFraming} from './scan-framing.js?v=measured-back-frame-20261028';
import {createViewportBuffer,framingBlend} from './viewer-motion.js?v=smooth-pair-20261026';
import {createSurfaceView,mountSurfaceToggle} from './surface-view.js?v=toggle-observation-20261028';
import {createInspectionLight,mountInspectionLight} from './inspection-light.js?v=normal-light-20261028';
import {createNormalMapView} from './normal-map-view.js?v=normal-handedness-20261028-v3';
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { measurements } from './measurements.js?v=original-panel-info-20261028-v3';

const decoder = new DRACOLoader().setDecoderPath('./vendor/draco/').setWorkerLimit(1);
const loader = new GLTFLoader().setDRACOLoader(decoder);
const returnLink = document.querySelector('[data-story-return]');
const nativePage = new URLSearchParams(location.search).get('native');
const isBlender = ['blender-test', 'play', 'review'].includes(nativePage);
returnLink.href = isBlender ? '../blender-test/?start=intro' : '../?start=intro';

let overviewSyncPending=false;
function synchronizeOverview(){
  if(overviewSyncPending)return;overviewSyncPending=true;
  requestAnimationFrame(()=>{
    overviewSyncPending=false;
    const pair=Object.values(viewers),heights=pair.map(viewer=>viewer.framingHeight());
    if(heights.every(height=>Number.isFinite(height)&&height>0)){
      const height=Math.min(...heights);
      pair.forEach(viewer=>viewer.setFramingHeight(height));
    }
  });
}

function createViewer({ element, loading, modelUrl, targetSize, yaw = 0, displayZoom = 1 }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .01, 100);
  camera.position.set(2.7, 1.15, 3.6);
  // Match subject size in the two viewer panels; this is display magnification only.
  // Scan vertices, proportions, scene scale and supplied measurements stay unchanged.
  camera.zoom = displayZoom;
  camera.updateProjectionMatrix();
  // OrbitControls drives a virtual viewpoint; only the scan root receives its view matrix.
  // The render camera stays fixed; the optional light control moves only the key.
  const renderCamera = new THREE.PerspectiveCamera(34, 1, .01, 100);
  renderCamera.zoom = displayZoom;
  const inspectionRoot = new THREE.Group();
  inspectionRoot.matrixAutoUpdate = false;
  scene.add(inspectionRoot);
  element.dataset.lighting = "fixed-neutral-key-chin-fill";
  element.dataset.interaction = "enabled";
  element.dataset.displayZoom = String(displayZoom);
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .9;
  element.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', element.getAttribute('aria-label'));
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08; controls.enablePan = false;
  controls.enableZoom = true; controls.zoomSpeed = .65;
  controls.minDistance = 1.15; controls.maxDistance = 6.5;
  controls.minPolarAngle = .001; controls.maxPolarAngle = 2.4;
  // Neutral upper key preserves relief; lower frontal fill opens the chin and neck.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, .8));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(-3, 4, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, .65);
  fill.position.set(3, -3, 4); scene.add(fill);
  let dirty = true, ready = false, goal = null;
  const inspectionLight=createInspectionLight(key,element,()=>{dirty=true;});
  let resizePending = true, lastFrameAt = performance.now();
  const viewportBuffer=createViewportBuffer();
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  // Wheel zoom updates synchronously inside OrbitControls, before the next RAF.
  controls.addEventListener('change',()=>{dirty=true;});
  const surface = createSurfaceView(THREE,scene,element,()=>{dirty=true;});
  const sex=element.id==='male-scene'?'male':'female';
  const normalMap=createNormalMapView(THREE,{element,textureUrl:`assets/${sex}-normal-map.webp`,redraw:()=>{dirty=true;}});
  const framing=createInspectionFraming(THREE,{camera,controls,element});
  renderer.domElement.style.cursor="grab";
  const frame = now => {
    const r = element.getBoundingClientRect();
    if (!r.width || !r.height) return;
    camera.aspect=r.width/r.height;camera.updateProjectionMatrix();
    renderCamera.aspect=camera.aspect;renderCamera.updateProjectionMatrix();
    viewportBuffer.request(r.width,r.height,now);
    // A newly bound model still needs fitting when its viewport size is unchanged.
    goal=framing.resize(r,goal)||null;dirty=true;synchronizeOverview();
  };
  // ResizeObserver runs after animation callbacks. Defer buffer changes so that
  // resizing and drawing happen together, before the browser paints the canvas.
  new ResizeObserver(()=>{resizePending=true;}).observe(element);
  new MutationObserver(()=>{resizePending=true;}).observe(document.documentElement,{attributes:true,attributeFilter:['data-archive-overview']});
  const loaded = loader.loadAsync(modelUrl, event => {
    loading.textContent = event.total ? `불러오는 중 ${Math.min(100,Math.round(event.loaded/event.total*100))}%` : '스캔 데이터를 불러오는 중…';
  }).then(gltf => {
    const model=levelScan(THREE,gltf.scene,{yaw,targetSize,sex:element.id==='male-scene'?'male':'female'});
    model.traverse(n=>{if(n.isMesh){n.material.roughness=.95;n.material.metalness=0;n.material.map && (n.material.map.anisotropy=renderer.capabilities.getMaxAnisotropy());}});
    model.traverse(n=>{if(n.isMesh&&n.material.map)element.dataset.colorTextureResolution=`${n.material.map.image.width}x${n.material.map.image.height}`;});
    framing.bind(model);surface.bind(model);normalMap.bind(model);inspectionRoot.add(model);ready=true;resizePending=true;dirty=true;loading.style.opacity=0;loading.setAttribute('aria-hidden','true');loading.hidden=true;
    element.dataset.loaded='true';
  }).catch(error => {
    console.error(error);loading.textContent='모델을 불러오지 못했습니다. 새로고침해 주세요.';element.dataset.loaded='error';
  });
  function focus(index){goal=framing.focus(index);dirty=true;synchronizeOverview();}
  controls.addEventListener('start',()=>{goal=null;});
  function animate(now=performance.now()){
    requestAnimationFrame(animate);
    const elapsed=Math.max(0,(now-lastFrameAt)/1000);lastFrameAt=now;
    if(document.hidden)return;
    if(resizePending){resizePending=false;frame(now);}
    const buffer=viewportBuffer.consume(now);
    // Resize and redraw in the same task, after the changing layout settles.
    if(buffer){renderer.setSize(buffer.width,buffer.height,false);element.dataset.bufferCommits=String(Number(element.dataset.bufferCommits||0)+1);dirty=true;}
    if(goal){const blend=framingBlend(elapsed,reducedMotion.matches);camera.position.lerp(goal.position,blend);controls.target.lerp(goal.target,blend);dirty=true;if(camera.position.distanceTo(goal.position)<.002&&controls.target.distanceTo(goal.target)<.002){camera.position.copy(goal.position);controls.target.copy(goal.target);goal=null;}}
    if(controls.update())dirty=true;
    if(dirty){
      camera.updateMatrixWorld(true);
      inspectionRoot.matrix.copy(camera.matrixWorldInverse);
      inspectionRoot.matrixWorldNeedsUpdate=true;
      renderer.render(scene,renderCamera);
      element.dataset.viewDistance=camera.position.distanceTo(controls.target).toFixed(4);
      element.dataset.objectTransform=inspectionRoot.matrix.elements.map(n=>n.toFixed(4)).join(",");
      element.dataset.renderCamera=renderCamera.matrixWorld.elements.join(",");
      element.dataset.lightPositions=[key.position.toArray(),fill.position.toArray()].join(";");
      dirty=false;
    }
  }
  animate();return {focus,loaded,setColor(value){normalMap.setEnabled(false);surface.setColor(value);},setNormalMap:normalMap.setEnabled,setLightEnabled:inspectionLight.setEnabled,setLightAngle:inspectionLight.setAngle,framingHeight:framing.naturalFramingHeight,setFramingHeight(height){if(framing.setFramingHeight(height))resizePending=true;}};
}
const viewers = {
 male:createViewer({element:document.querySelector('#male-scene'),loading:document.querySelector('#male-loading'),modelUrl:'models/male-continuous.glb',targetSize:1.83,yaw:-3.902609*Math.PI/180}),
 female:createViewer({element:document.querySelector('#female-scene'),loading:document.querySelector('#female-loading'),modelUrl:'models/female-continuous.glb',targetSize:2.10,yaw:-140.445485*Math.PI/180,displayZoom:1.25})
};
const surfaceToggle=mountSurfaceToggle(viewers);
mountInspectionLight(viewers);
// Side panels follow the selected observation while preserving the overall view initially.
// Keep the local GLB projection settings above: the remote archive used different OBJ axes.
const detail = document.querySelector('.detail-card');
const panels = [...document.querySelectorAll('.info-panel')];
const overallPanels = new Map(panels.map(panel => [panel, {kicker:panel.querySelector('.panel-kicker').textContent, subtitle:panel.querySelector('.panel-subtitle').textContent, rows:panel.querySelector('.object-size-list').innerHTML, source:panel.querySelector('.panel-note').textContent}]));
function updatePanelContent(index) {
 panels.forEach(panel => {
  const kicker=panel.querySelector('.panel-kicker'), subtitle=panel.querySelector('.panel-subtitle'), list=panel.querySelector('.object-size-list'), source=panel.querySelector('.panel-note');
  let observation=panel.querySelector('.panel-observation');
  if (index === null) { const initial=overallPanels.get(panel); kicker.textContent=initial.kicker; subtitle.textContent=initial.subtitle; list.innerHTML=initial.rows; source.textContent=initial.source; observation?.remove(); panel.querySelector('.panel-content').scrollTop=0; return; }
  const note=measurements[index], column=panel.dataset.side==='left'?2:1;
  kicker.textContent=`${overallPanels.get(panel).kicker} · ${String(index+1).padStart(2,'0')} ${note.label}`;
  subtitle.textContent=note.label; list.replaceChildren();
  note.rows.forEach(row => {
   if (row[column] == null) return;
   const item=document.createElement('div'), term=document.createElement('dt'), value=document.createElement('dd');
   term.textContent=row[0]; value.textContent=row[column]; item.append(term,value); list.append(item);
  });
  if (!observation) { observation=document.createElement('p'); observation.className='panel-observation'; list.after(observation); }
  observation.textContent=note.text;
  panel.querySelector('.panel-content').scrollTop=0;
  source.textContent=sourceNote;
 });
}
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
 const content=panel.querySelector('.panel-content');
 content.inert=!open;
 content.setAttribute('aria-hidden',String(!open));
}
function showObservation(index, focus=false) {
 const note=measurements[index],point=String(index+1).padStart(2,'0');
 updatePanelContent(index);
 document.querySelectorAll('.hotspot').forEach(button=>{
  const selected=button.dataset.point===point;
  button.classList.toggle('is-active',selected);
  button.setAttribute('aria-pressed',String(selected));
 });
 detail.querySelector('.detail-kicker').textContent=`${point} · 두 개체 공통 시점`;
 detail.querySelector('h3').textContent=note.label;
 detail.querySelector('.detail-copy').textContent=descriptions[index];
 detail.querySelector('.detail-status').textContent=sourceNote;
 if(focus){viewers.male.focus(index);viewers.female.focus(index);}
}
// Start in the complete-object view with no numbered observation selected.
document.querySelectorAll('.hotspot').forEach(button=>{button.classList.remove('is-active');button.setAttribute('aria-pressed','false');});
panels.forEach(panel=>setPanelOpen(panel,false));
document.querySelectorAll('.hotspot').forEach(button=>button.addEventListener('click',()=>{
 if(button.classList.contains('is-active')){
  button.classList.remove('is-active');button.setAttribute('aria-pressed','false');
  updatePanelContent(null);panels.forEach(panel=>setPanelOpen(panel,false));
  viewers.male.focus(null);viewers.female.focus(null);surfaceToggle.setMode('color');return;
 }
 surfaceToggle.setMode('relief');
 showObservation(Number(button.dataset.point)-1,true);
 panels.forEach(panel=>setPanelOpen(panel,false));
}));
document.querySelectorAll('.panel-toggle').forEach(button=>button.addEventListener('click',()=>{
 const panel=button.closest('.info-panel'),wasOpen=panel.classList.contains('is-open');
 panels.forEach(item=>setPanelOpen(item,false));
 if(!wasOpen)setPanelOpen(panel,true);
}));

// Keep keyboard dismissal local to the open information panel.
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 const openPanel=panels.find(panel=>panel.classList.contains('is-open'));
 if(!openPanel)return;
 setPanelOpen(openPanel,false);
 openPanel.querySelector('.panel-toggle').focus();
});
