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
  let scans = [], scanFrame = 0, finishScan = null;
  const clearScan = () => {
    if (scanFrame) window?.cancelAnimationFrame(scanFrame);
    scanFrame = 0;
    scans.forEach(({canvas, particles}) => { canvas.remove(); particles?.remove(); });
    scans = [];
    finishScan?.(); finishScan = null;
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
      const rect=scene.getBoundingClientRect();
      scans.push({canvas, scene, particles:null, grains:[], width:rect.width, height:rect.height, pose:scene.dataset.objectTransform});
    });
  }
  function clearIfMoved() {
    const moved=scans.some(item=>{
      const rect=item.scene.getBoundingClientRect();
      return Math.abs(rect.width-item.width)>.5 || Math.abs(rect.height-item.height)>.5 || item.scene.dataset.objectTransform!==item.pose;
    });
    if(moved)clearScan();
    return moved;
  }
  async function revealScan(token) {
    // Give the freshly selected material a render before exposing it. The old
    // render remains above it while a normal map downloads.
    if (window?.requestAnimationFrame) await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    if (token !== request) return;
    if (!scans.length || !window?.requestAnimationFrame) { clearScan(); return; }
    // Sample only the scan silhouette: the page and controls never emit particles.
    for (const item of scans) {
      const probe = root.createElement('canvas');
      const scale = 180 / Math.max(item.canvas.width, item.canvas.height);
      probe.width = Math.max(1, Math.round(item.canvas.width * scale));
      probe.height = Math.max(1, Math.round(item.canvas.height * scale));
      const sample = probe.getContext('2d', {willReadFrequently:true});
      sample.drawImage(item.canvas, 0, 0, probe.width, probe.height);
      const pixels = sample.getImageData(0, 0, probe.width, probe.height).data;
      let seed = 17;
      const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let y=1; y<probe.height; y+=3) for (let x=1; x<probe.width; x+=3) {
        const i=(y*probe.width+x)*4;
        if (pixels[i+3]<150 || random()>.72) continue;
        const shade=Math.round(Math.max(68, Math.min(146, (pixels[i]+pixels[i+1]+pixels[i+2])/3)));
        item.grains.push({x:(x+random()*2)/probe.width, y:(y+random()*2)/probe.height, drift:(random()-.5)*14, rise:3+random()*8, size:.45+random()*.65, alpha:.35+random()*.35, shade});
      }
      const r=item.scene.getBoundingClientRect();
      const particles=root.createElement('canvas');
      particles.className='surface-scan-particles'; particles.setAttribute('aria-hidden','true');
      const ratio=Math.min(window.devicePixelRatio || 1, 1.5);
      particles.width=Math.max(1,Math.round(r.width*ratio)); particles.height=Math.max(1,Math.round(r.height*ratio));
      item.context=particles.getContext('2d'); item.ratio=ratio; item.particles=particles;
      item.scene.append(particles);
    }
    const current=scans;
    await new Promise(resolve => {
      finishScan=resolve;
      let started=null;
      const draw = now => {
        if (token!==request || clearIfMoved()) { resolve(); return; }
        started ??= now;
        const progress=Math.min(1,(now-started)/1180);
        const eased=progress*progress*(3-2*progress), front=-.08+eased*1.16;
        for (const item of current) {
          // A feathered boundary dissolves the old material into the new one.
          const mask=`linear-gradient(to bottom, transparent ${(front-.045)*100}%, #000 ${(front+.045)*100}%)`;
          item.canvas.style.maskImage=mask; item.canvas.style.webkitMaskImage=mask;
          item.canvas.dataset.scanProgress=progress.toFixed(3);
          const {context:ctx,particles:layer,ratio}=item;
          ctx.clearRect(0,0,layer.width,layer.height);
          for (const grain of item.grains) {
            const life=(front-grain.y+.025)/.16;
            if (life<=0 || life>=1) continue;
            const alpha=Math.sin(Math.PI*life)*grain.alpha;
            ctx.fillStyle=`rgba(${grain.shade},${grain.shade},${grain.shade},${alpha})`;
            const x=grain.x*layer.width+grain.drift*life*ratio;
            const y=grain.y*layer.height-grain.rise*life*ratio;
            ctx.beginPath();ctx.arc(x,y,grain.size*ratio*(1-.45*life),0,Math.PI*2);ctx.fill();
          }
        }
        if(progress<1) scanFrame=window.requestAnimationFrame(draw);
        else { finishScan=null; resolve(); }
      };
      scanFrame=window.requestAnimationFrame(draw);
    });
    if (token === request) clearScan();
  }

  scenes.forEach(scene => {
    scene.addEventListener('pointerdown', clearScan, {passive:true});
    scene.addEventListener('wheel', clearScan, {passive:true});
    // A still overlay cannot follow a camera move or a changing panel layout.
    if(window?.ResizeObserver)new window.ResizeObserver(clearIfMoved).observe(scene);
    if(window?.MutationObserver)new window.MutationObserver(clearIfMoved).observe(scene,{attributes:true,attributeFilter:['data-object-transform']});
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
