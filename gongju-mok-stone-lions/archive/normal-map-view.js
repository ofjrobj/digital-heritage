// Display the supplied normal-map pixels on the scan's verified original UVs.
// This is a texture inspection view, not geometry-derived normal colouring.
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
    const make=material=>new THREE.MeshBasicMaterial({map:texture,color:0xffffff,side:material.side,toneMapped:false});
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
    loaded.flipY=false;loaded.colorSpace=THREE.SRGBColorSpace;loaded.needsUpdate=true;
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

