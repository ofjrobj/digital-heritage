// Decode the supplied tangent-space normal map on the scan's verified UVs.
// Neighbouring UV islands have different tangent bases, so painting raw atlas
// RGB as albedo creates false seams. Decode to view space for lighting, then
// express the map's detail in a continuous surface-local frame for its colour.
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
     normal.name='mapped-surface-normal';
     normal.toneMapped=false;
     normal.onBeforeCompile=shader=>{
      // Keep the standard material white while it measures illumination from
      // the actual perturbed normal. Normal RGB is a diagnostic encoding, not
      // albedo: BRDF, exposure and gamma must not recolour that encoding.
      shader.fragmentShader=shader.fragmentShader
       .replace('#include <opaque_fragment>', `
        // Shortest rotation from the unperturbed surface normal to +Z. This
        // removes the sculpture's broad orientation from the diagnostic RGB,
        // retaining the actual baked detail without UV-island colour seams.
        vec3 inspectionBase = normalize(nonPerturbedNormal);
        vec3 inspectionDetail = inspectionBase.z > -0.999
         ? normalize(vec3(normal.xy - inspectionBase.xy * (normal.z + dot(inspectionBase.xy, normal.xy) / (1.0 + inspectionBase.z)), dot(inspectionBase, normal)))
         : normal * vec3(1.0, -1.0, -1.0);
        float inspectionIllumination = clamp(dot(totalDiffuse, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
        float inspectionShade = mix(0.72, 1.0, inspectionIllumination);
        outgoingLight = packNormalToRGB(inspectionDetail) * inspectionShade;
        #include <opaque_fragment>`)
       .replace('#include <tonemapping_fragment>', '')
       .replace('#include <colorspace_fragment>', '');
     };
     normal.customProgramCacheKey=()=> 'mapped-surface-normal-v4-local-detail';
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

