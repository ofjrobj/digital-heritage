// Untextured inspection uses scan geometry only; original materials stay available in color mode.
export function createSurfaceView(THREE, scene, element, redraw) {
  let color = true;
  const pairs = [];
  const lights = scene.children.filter(n=>n.isLight).map(light=>({light,intensity:light.intensity}));
  function setColor(enabled) {
    color = enabled;
    for (const {mesh, original, relief} of pairs) mesh.material = color ? original : relief;
    // Directions remain screen-fixed; subdued fill reveals relief in the untextured scan.
    let directional=0;
    for(const saved of lights){
      const reliefIntensity=saved.light.isHemisphereLight ? .60 : (directional++===0?2.4:.65);
      saved.light.intensity=color?saved.intensity:reliefIntensity;
    }
    element.dataset.surfaceMode = color ? 'color' : 'relief';
    element.dataset.textureCount = String(pairs.reduce((sum,{mesh}) => sum + (Array.isArray(mesh.material)?mesh.material:[mesh.material]).reduce((n,m)=>n+Object.values(m).filter(value=>value?.isTexture).length,0),0));
    redraw();
  }
  function bind(model) {
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      const original = mesh.material;
      const make = material => {
        // A fresh material deliberately inherits no color, normal, bump,
        // displacement, AO, roughness or environment texture from the scan.
        const relief = new THREE.MeshStandardMaterial({
          color:0x737373, metalness:0, roughness:1,
          vertexColors:false, side:material.side
        });
        return relief;
      };
      pairs.push({mesh, original, relief:Array.isArray(original) ? original.map(make) : make(original)});
    });
    setColor(color);
  }
  setColor(true);
  return {bind, setColor};
}
export function mountSurfaceToggle(viewers, root = document) {
  const button = root.createElement('button');
  button.type = 'button'; button.className = 'surface-toggle';
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path data-mode="color" d="M12 12V3a9 9 0 0 1 7.794 13.5Z"/><path data-mode="relief" d="M12 12l7.794 4.5a9 9 0 0 1-15.588 0Z"/><path data-mode="normal-map" d="M12 12l-7.794 4.5A9 9 0 0 1 12 3Z"/></svg>';
  root.querySelector('.global-hotspot-set p').after(button);
  const modes = ['color', 'relief', 'normal-map'];
  const labels = {color:'컬러맵', relief:'흑백맵', 'normal-map':'노멀맵'};
  const pair = Object.values(viewers);
  const scenes = [...(root.querySelectorAll?.('.scene') || [])];
  const window = root.defaultView;
  let mode = 'color', stableMode = 'color', request = 0, initialized = false;
  let scans = [];
  const clearScan = () => {
    scans.forEach(({canvas, animation}) => { animation?.cancel(); canvas.remove(); });
    scans = [];
  };
  function captureScans() {
    clearScan();
    if (window?.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    scenes.forEach((scene, index) => {
      const canvas = pair[index]?.snapshot?.();
      if (!canvas) return;
      canvas.className = 'surface-scan-snapshot';
      canvas.setAttribute('aria-hidden', 'true');
      scene.append(canvas);
      scans.push({canvas, animation:null});
    });
  }
  async function revealScan(token) {
    // Give the freshly selected material a render before exposing it. The old
    // render remains above it while a normal map downloads.
    if (window?.requestAnimationFrame) await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    if (token !== request) return;
    const current = scans;
    const finishes = current.map(item => {
      if (!item.canvas.animate) return Promise.resolve();
      item.animation = item.canvas.animate(
        [{clipPath:'inset(0% 0 0 0)'}, {clipPath:'inset(100% 0 0 0)'}],
        {duration:740, easing:'cubic-bezier(.3,.08,.3,1)', fill:'forwards'}
      );
      return item.animation.finished;
    });
    await Promise.allSettled(finishes);
    if (token === request) clearScan();
  }
  scenes.forEach(scene => {
    scene.addEventListener('pointerdown', clearScan, {passive:true});
    scene.addEventListener('wheel', clearScan, {passive:true});
  });
  function updateButton() {
    button.dataset.mode = mode;
    button.setAttribute('aria-label', labels[mode]);
    button.dataset.tooltip = labels[mode];
    button.querySelectorAll('[data-mode]').forEach(sector => sector.classList.toggle('is-selected', sector.dataset.mode === mode));
  }
  async function setMode(value) {
    if (!modes.includes(value)) return;
    mode = value; const token = ++request;
    button.removeAttribute('aria-busy'); updateButton();
    if (initialized) captureScans();
    initialized = true;
    if (mode !== 'normal-map') {
      stableMode = mode;
      // Also cancels any pending normal texture request before changing materials.
      pair.forEach(viewer => viewer.setColor(mode === 'color'));
      await revealScan(token);
      return;
    }
    button.setAttribute('aria-busy', 'true');
    const results = await Promise.all(pair.map(viewer => Promise.resolve(viewer.setNormalMap(true)).catch(() => false)));
    if (token !== request) return;
    button.removeAttribute('aria-busy');
    if (results.some(ok => !ok)) {
      mode = stableMode;
      pair.forEach(viewer => viewer.setColor(mode === 'color'));
      updateButton();
    }
    await revealScan(token);
  }
  button.addEventListener('click', () => setMode(modes[(modes.indexOf(mode) + 1) % modes.length]));
  setMode('color');
  return {button, setMode};
}
