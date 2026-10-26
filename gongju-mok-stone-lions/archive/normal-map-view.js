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

export function mountNormalMapToggle(viewers){
 const surface=document.querySelector('.surface-toggle');if(!surface)return;
 const button=document.createElement('button');button.type='button';button.className='normal-map-toggle';button.textContent='N';
 button.title='노멀맵';button.setAttribute('aria-label','노멀맵 보기');button.setAttribute('aria-pressed','false');surface.after(button);
 let wanted=false,request=0;
 function reset(){wanted=false;request++;button.removeAttribute('aria-busy');button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','노멀맵 보기');button.title='노멀맵';}
 button.addEventListener('click',async()=>{
  wanted=!wanted;const token=++request,enabled=wanted;
  button.setAttribute('aria-busy',String(enabled));
  const results=await Promise.all(Object.values(viewers).map(viewer=>viewer.setNormalMap(enabled)));
  if(token!==request)return;
  button.removeAttribute('aria-busy');
  if(enabled&&results.some(ok=>!ok)){
   wanted=false;for(const viewer of Object.values(viewers))viewer.setNormalMap(false);
   button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','노멀맵 다시 불러오기');button.title='노멀맵을 불러오지 못했습니다. 다시 시도';return;
  }
  button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'노멀맵 닫기':'노멀맵 보기');
 });
 surface.addEventListener('click',reset);
 document.querySelectorAll('.hotspot').forEach(node=>node.addEventListener('click',reset));
 return button;
}
