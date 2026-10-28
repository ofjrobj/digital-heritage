import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {levelScan, createInspectionFraming} from './scan-framing.js?v=scan-compare-20261029';
import {createSurfaceView} from './surface-view.js?v=scan-compare-20261029';
import {createViewportBuffer, createFramingTransition} from './viewer-motion.js?v=scan-compare-20261029';

const sex = new URLSearchParams(location.search).get('model') === 'female' ? 'female' : 'male';
const name = sex === 'male' ? '수사자' : '암사자';
const element = document.querySelector('.model-scene');
const status = document.querySelector('.model-status');
const message = status.querySelector('p');
const retry = status.querySelector('button');
element.id = `${sex}-scene`;
element.setAttribute('aria-label', `${name} 3D 모델`);
document.title = `${name} 3D 모델 — 봉황동 석사자`;
retry.addEventListener('click', () => location.reload());

function fail() {
  element.dataset.loaded = 'error';
  status.hidden = false;
  message.textContent = '3D 모델을 불러오지 못했습니다.';
  retry.hidden = false;
}

try {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .01, 100);
  camera.position.set(2.7, 1.15, 3.6);
  camera.zoom = sex === 'female' ? 1.25 : 1;
  const renderCamera = new THREE.PerspectiveCamera(34, 1, .01, 100);
  renderCamera.zoom = camera.zoom;
  const modelRoot = new THREE.Group();
  modelRoot.matrixAutoUpdate = false;
  scene.add(modelRoot);

  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .9;
  element.append(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', `${name}. 드래그로 회전하고 마우스 휠이나 두 손가락으로 확대할 수 있습니다.`);
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(); });

  // Input stays inside this canvas; the containing page retains normal scrolling.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .08;
  controls.enablePan = false;
  controls.zoomSpeed = .65;
  controls.minPolarAngle = .001;
  controls.maxPolarAngle = 2.4;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, .8));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, .65);
  fill.position.set(3, -3, 4);
  scene.add(fill);

  let dirty = true, resizePending = true, goal = null, cameraTransition = null, lastFrameAt = performance.now();
  const framing = createInspectionFraming(THREE, {camera, controls, element});
  const buffer = createViewportBuffer();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const surface = createSurfaceView(THREE, scene, element, () => { dirty = true; });
  surface.setColor(true);
  controls.addEventListener('change', () => { dirty = true; });
  function useOrbitUp(up) {
    camera.up.copy(up);
    controls._quat.setFromUnitVectors(camera.up, new THREE.Vector3(0, 1, 0));
    controls._quatInverse.copy(controls._quat).invert();
  }
  function beginTransition() {
    return createFramingTransition(THREE, camera.position, controls.target, {quaternion: camera.quaternion, up: camera.up});
  }
  function focusPart(index) {
    const destination = framing.focus(index);
    // The standalone comparison needs the muzzle's surrounding face as context.
    // Keep framing's own fitted baseline so resize carries this 1.35 ratio (and
    // any later user zoom) forward instead of applying the margin again.
    if (index === 1 && destination) destination.position.sub(destination.target).multiplyScalar(1.35).add(destination.target);
    return destination;
  }
  controls.addEventListener('start', () => {
    const distance = camera.position.distanceTo(controls.target);
    controls.minDistance = Math.min(controls.minDistance, distance);
    controls.maxDistance = Math.max(controls.maxDistance, distance);
    useOrbitUp(camera.up); goal = cameraTransition = null;
  });
  focusPart(2);
  document.querySelectorAll('[data-part]').forEach(button => button.addEventListener('click', () => {
    const displayedUp = camera.up.clone();
    goal = focusPart(Number(button.dataset.part));
    if (goal) {
      goal.up = camera.up.clone(); useOrbitUp(displayedUp);
      cameraTransition = beginTransition();
    }
    document.querySelectorAll('[data-part]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    dirty = true;
  }));
  document.querySelectorAll('[data-surface]').forEach(button => button.addEventListener('click', () => {
    surface.setColor(button.dataset.surface === 'color');
    document.querySelectorAll('[data-surface]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
  new ResizeObserver(() => { resizePending = true; }).observe(element);

  const decoder = new DRACOLoader().setDecoderPath('./vendor/draco/').setWorkerLimit(1);
  const loader = new GLTFLoader().setDRACOLoader(decoder);
  loader.loadAsync(`./models/${sex}-continuous.glb`, event => {
    message.textContent = event.total ? `Loading... ${Math.min(100, Math.round(event.loaded / event.total * 100))}%` : 'Loading...';
  }).then(gltf => {
    const model = levelScan(THREE, gltf.scene, {
      sex,
      targetSize: sex === 'male' ? 1.83 : 2.10,
      yaw: (sex === 'male' ? -3.902609 : -140.445485) * Math.PI / 180
    });
    model.traverse(node => {
      if (!node.isMesh) return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        material.roughness = .95;
        material.metalness = 0;
        if (material.map) material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
    });
    framing.bind(model);
    surface.bind(model);
    modelRoot.add(model);
    element.dataset.loaded = 'true';
    status.hidden = true;
    document.querySelectorAll('.compare-toolbar button').forEach(button => { button.disabled = false; });
    resizePending = dirty = true;
    decoder.dispose();
  }).catch(fail);

  function animate(now) {
    requestAnimationFrame(animate);
    const elapsed = Math.max(0, (now - lastFrameAt) / 1000);
    lastFrameAt = now;
    if (document.hidden || element.dataset.loaded === 'error') return;
    if (resizePending) {
      resizePending = false;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      camera.aspect = renderCamera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderCamera.updateProjectionMatrix();
      buffer.request(rect.width, rect.height, now);
      goal = framing.resize(rect, goal);
      dirty = true;
    }
    const size = buffer.consume(now);
    if (size) { renderer.setSize(size.width, size.height, false); dirty = true; }
    const travelling = !!goal;
    if (goal) {
      goal.up ??= camera.up.clone();
      cameraTransition ??= beginTransition();
      const pose = cameraTransition.sample(goal, elapsed, reducedMotion.matches);
      camera.position.copy(pose.position); controls.target.copy(pose.target);
      camera.quaternion.copy(pose.quaternion); camera.up.copy(pose.up);
      if (pose.done) { useOrbitUp(goal.up); controls.update(); goal = cameraTransition = null; }
      dirty = true;
    }
    if (!travelling && controls.update()) dirty = true;
    if (!dirty) return;
    camera.updateMatrixWorld(true);
    modelRoot.matrix.copy(camera.matrixWorldInverse);
    modelRoot.matrixWorldNeedsUpdate = true;
    renderer.render(scene, renderCamera);
    dirty = false;
  }
  requestAnimationFrame(animate);
} catch {
  fail();
}
