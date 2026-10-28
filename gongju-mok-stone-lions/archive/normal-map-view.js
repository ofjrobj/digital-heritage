// Decode the supplied tangent-space normal map on the scan's verified UVs.
// Colour the resulting view-space normal, not the raw atlas pixels: neighbouring
// UV islands have different tangent bases, so painting those pixels as albedo
// creates false coloured seams even when the mapping is correct.
export function createNormalMapView(THREE,{element,textureUrl,redraw=()=>{}}){
 const meshes=[];let texture=null,pending=null,wanted=false,active=false,previousMode='relief';
 function restore(){
  if(!active)return;
  for(const pair of meshes)pair.mesh.material=pair.previous;
  active=false;element.dataset.surfaceMode=previousMode;redraw();
 }
 function apply(){
  if(!wanted||!texture||active||!meshes.length)return;
  previousMode=element.dataset.surfaceMode;
  for(const pair of meshes){
   pair.previous=pair.mesh.material;
   if(!pair.normal){
    const make=material=>{
     // OBJ → glTF flips the UV V axis. Preserve the source normal map's
     // bitangent direction as well as its image placement. Duplicate vertices
     // on atlas seams agree only with this Y sign (normal-handedness.json).
     const normal=new THREE.MeshStandardMaterial({normalMap:texture,normalScale:new THREE.Vector2(1,-1),color:0xffffff,roughness:1,metalness:0,side:material.side});
     // The GLB converter flipped OBJ V, reversing the tangent bitangent. The
     // original bake is unchanged, so invert its green component when decoding.
     // Matching UV-seam vertices confirm this restores normal continuity.
     normal.normalScale.set(1,-1);
     normal.name='mapped-surface-normal';
     normal.onBeforeCompile=shader=>{
      // Three's normal_fragment_maps transforms the source map through the
      // local tangent basis first. Both colour and the existing directional
      // light therefore use the same continuous, perturbed surface normal.
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',
       '#include <normal_fragment_maps>\n diffuseColor.rgb = normal * 0.5 + 0.5;');
     };
     normal.customProgramCacheKey=()=> 'mapped-surface-normal-v2';
     return normal;
    };
    pair.normal=Array.isArray(pair.previous)?pair.previous.map(make):make(pair.previous);
   }
   pair.mesh.material=pair.normal;
  }
  active=true;element.dataset.surfaceMode='normal-map';redraw();
 }
 function load(){
  if(texture)return Promise.resolve(texture);
  if(!pending){
   element.dataset.normalMap='loading';
   pending=new THREE.TextureLoader().loadAsync(textureUrl).then(loaded=>{
    // GLB uses v = 1 - OBJ.v. Match the existing glTF colour texture convention.
    loaded.flipY=false;loaded.colorSpace=THREE.NoColorSpace;loaded.needsUpdate=true;
    texture=loaded;element.dataset.normalMap='ready';return loaded;
   }).catch(error=>{pending=null;element.dataset.normalMap='error';throw error;});
  }
  return pending;
 }
 function bind(model){
  model.traverse(mesh=>{if(mesh.isMesh&&mesh.geometry.attributes.uv)meshes.push({mesh,previous:null,normal:null});});
  apply();
 }
 async function setEnabled(value){
  wanted=!!value;
  if(!wanted){restore();return true;}
  try{await load();apply();return true;}catch{return false;}
 }
 return {bind,setEnabled};
}

