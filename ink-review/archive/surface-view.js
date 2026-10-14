// Untextured inspection uses scan geometry only; original materials stay available in color mode.
export function createSurfaceView(THREE, scene, element, redraw) {
  let color = false;
  const pairs = [];
  const lights = scene.children.filter(n => n.isLight).map(light => ({light, color:light.color.clone(), ground:light.groundColor?.clone(), intensity:light.intensity, position:light.position.clone()}));
  function setColor(enabled) {
    color = enabled;
    for (const {mesh, original, relief} of pairs) mesh.material = color ? original : relief;
    let directional = 0;
    for (const saved of lights) {
      saved.light.color.copy(color ? saved.color : new THREE.Color(0xffffff));
      if (saved.ground) saved.light.groundColor.copy(color ? saved.ground : new THREE.Color(0x303030));
      if(color){saved.light.intensity=saved.intensity;saved.light.position.copy(saved.position);}
      else if(saved.light.isHemisphereLight){saved.light.intensity=1.15;}
      else if(saved.light.isDirectionalLight){
        const key=directional++===0;saved.light.intensity=key?2.2:.4;
        if(key)saved.light.position.set(-4,2.5,3);
      }
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
          color:0x929292, metalness:0, roughness:1,
          vertexColors:false, side:material.side
        });
        return relief;
      };
      pairs.push({mesh, original, relief:Array.isArray(original) ? original.map(make) : make(original)});
    });
    setColor(color);
  }
  setColor(false);
  return {bind, setColor};
}
export function mountSurfaceToggle(viewers) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'surface-toggle';
  button.innerHTML = '<i aria-hidden="true">◐</i>';
  document.querySelector('.global-hotspot-set p').after(button);
  let color = false;
  function setColor(value) {
    color = value;
    for (const viewer of Object.values(viewers)) viewer.setColor(color);
    button.setAttribute('aria-pressed', String(color));
    button.setAttribute('aria-label', color ? '흑백' : '컬러');
  }
  button.addEventListener('click', () => setColor(!color));
  document.querySelectorAll('.hotspot').forEach(button => button.addEventListener('click', () => setColor(false)));
  setColor(false);
}
