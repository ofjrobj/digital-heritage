import {patternHighlightData} from './pattern-highlight-data.js?v=surface-traces-20261026';

// Selected, manually checked grooves from the original scan. The data contains
// vertex IDs, not screen-space decorations or an inferred complete motif.
// Call bind AFTER createSurfaceView.bind so these white meshes retain their own material.
export function createPatternHighlight(THREE, {sex, element, redraw = () => {}}) {
  const data = patternHighlightData.models[sex];
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const strokes = [];
  let enabled = true, activePoint = -1, startedAt = null, available = false;
  let material = null, state = 'unbound';
  const timing = {delay:850, draw:1700, stagger:110, hold:650, fade:1100};
  const clock = () => globalThis.performance?.now() ?? Date.now();
  function setState(value) {
    if (state === value) return;
    state = value;
    if (element?.dataset) element.dataset.patternState = value;
  }
  function hide() {
    for (const stroke of strokes) stroke.visible = false;
    if (material) material.opacity = 0;
    startedAt = null;
    setState(available ? 'hidden' : 'unavailable');
    redraw();
  }
  function clear() {
    for (const stroke of strokes) {
      stroke.removeFromParent();
      stroke.geometry.dispose();
    }
    strokes.length = 0;
    material?.dispose(); material = null;
    available = false; startedAt = null;
  }
  function makeStroke(mesh, ids, radius, offset) {
    const source = mesh.geometry.attributes;
    const centres = ids.map(id => new THREE.Vector3().fromBufferAttribute(source.position, id));
    const normals = ids.map(id => new THREE.Vector3().fromBufferAttribute(source.normal, id).normalize());
    const radial = 8, vertices = [], indices = [];
    const tangent = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3();
    // Small closed tubes use reliable triangle width on every WebGL platform.
    // Their centreline is embedded slightly in the surface; depth testing hides
    // them when the original scan occludes them as the object turns.
    for (let i = 0; i < centres.length; i++) {
      tangent.subVectors(centres[Math.min(i + 1, centres.length - 1)], centres[Math.max(0, i - 1)]).normalize();
      side.crossVectors(tangent, normals[i]).normalize();
      up.crossVectors(side, tangent).normalize();
      if (up.dot(normals[i]) < 0) up.negate();
      for (let j = 0; j < radial; j++) {
        const angle = j / radial * Math.PI * 2;
        const p = centres[i].clone().addScaledVector(normals[i], offset)
          .addScaledVector(up, Math.cos(angle) * radius)
          .addScaledVector(side, Math.sin(angle) * radius);
        vertices.push(p.x, p.y, p.z);
      }
      if (i) for (let j = 0; j < radial; j++) {
        const a = (i - 1) * radial + j, b = (i - 1) * radial + (j + 1) % radial;
        const c = i * radial + j, d = i * radial + (j + 1) % radial;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    geometry.setDrawRange(0, 0);
    const stroke = new THREE.Mesh(geometry, material);
    stroke.name = 'observed-pattern-trace';
    stroke.visible = false;
    stroke.renderOrder = 2;
    stroke.userData.patternHighlight = true;
    stroke.userData.ringIndexCount = radial * 6;
    stroke.userData.segmentCount = ids.length - 1;
    // Parent to the actual mesh, so scan levelling, inspection transforms and
    // arbitrary OrbitControls rotation remain identical without reprojection.
    mesh.add(stroke);
    return stroke;
  }
  function bind(model) {
    clear();
    let scan = null;
    model.traverse(node => {
      if (!scan && node.isMesh && node.geometry.attributes.position?.count === data?.vertexCount &&
          node.geometry.attributes.normal?.count === data?.vertexCount) scan = node;
    });
    // Fail closed if a new scan/reordering no longer matches the recorded IDs.
    if (!scan || !data.guards.every(({index, position}) => {
      const p = scan.geometry.attributes.position;
      return Math.abs(p.getX(index) - position[0]) < 2e-6 &&
        Math.abs(p.getY(index) - position[1]) < 2e-6 &&
        Math.abs(p.getZ(index) - position[2]) < 2e-6;
    }) || !data.paths.every(path => path.length > 1 && path.every(id => Number.isInteger(id) && id >= 0 && id < data.vertexCount))) {
      if (element?.dataset) element.dataset.patternTrace = 'unmatched-scan';
      hide(); return false;
    }
    const geometry = scan.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z);
    material = new THREE.MeshBasicMaterial({
      color:0xffffff, transparent:true, opacity:0, depthTest:true, depthWrite:false,
      toneMapped:false, side:THREE.DoubleSide
    });
    for (const ids of data.paths) strokes.push(makeStroke(scan, ids, span * .0045, span * .001));
    available = true;
    if (element?.dataset) {
      element.dataset.patternTrace = 'scan-vertices';
      element.dataset.patternSamples = String(data.paths.reduce((sum, path) => sum + path.length, 0));
    }
    focus(activePoint);
    return true;
  }
  function focus(index, now = clock()) {
    activePoint = index;
    hide();
    if (!available || !enabled || index !== patternHighlightData.part) return;
    for (const stroke of strokes) stroke.geometry.setDrawRange(0, 0);
    startedAt = now;
    setState('waiting');
  }
  function update(now = clock()) {
    if (startedAt === null || !available || !enabled) return false;
    const elapsed = now - startedAt - timing.delay;
    if (elapsed < 0) return false;
    const reduce = reducedMotion?.matches;
    const drawTime = reduce ? 0 : timing.draw;
    const stagger = reduce ? 0 : timing.stagger;
    const endDrawing = drawTime + (strokes.length - 1) * stagger;
    const fadeAt = endDrawing + timing.hold;
    const endAt = fadeAt + timing.fade;
    if (elapsed >= endAt) { hide(); return true; }
    setState(elapsed < endDrawing ? 'drawing' : elapsed < fadeAt ? 'holding' : 'fading');
    const fade = Math.max(0, Math.min(1, (elapsed - fadeAt) / timing.fade));
    material.opacity = 1 - fade * fade * (3 - 2 * fade);
    strokes.forEach((stroke, i) => {
      const progress = drawTime ? Math.max(0, Math.min(1, (elapsed - i * stagger) / drawTime)) : 1;
      const eased = 1 - (1 - progress) * (1 - progress);
      const segments = Math.floor(stroke.userData.segmentCount * eased);
      stroke.geometry.setDrawRange(0, segments * stroke.userData.ringIndexCount);
      stroke.visible = segments > 0;
    });
    return true;
  }
  function setEnabled(value) {
    enabled = Boolean(value);
    if (enabled) focus(activePoint); else hide();
  }
  function dispose() { clear(); setState('disposed'); redraw(); }
  return {bind, focus, update, setEnabled, dispose, get available() { return available; }};
}
