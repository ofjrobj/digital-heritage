import {TRACE_FRAME,FEATURE_PATHS} from './feature-ink-paths.js?v=white-brush-1';

// Render a depth map once per feature, then lift the authored trace onto the scan.
// The resulting ribbon lives in scan coordinates and remains attached when rotated.
export function createFeatureInk(THREE,{renderer,root,framing,element,invalidate}){
 const sex=element.id==='male-scene'?'male':'female',cache=new Map(),group=new THREE.Group();
 group.name='surface-ink-guides';root.add(group);group.visible=false;
 const material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,depthTest:true,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 inkUV;').replace('#include <uv_vertex>','#include <uv_vertex>\ninkUV = uv;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 inkUV;').replace('#include <color_fragment>','#include <color_fragment>\nfloat edge = smoothstep(0.0, 0.12, inkUV.x) * smoothstep(0.0, 0.12, 1.0 - inkUV.x);\nfloat grain = 0.93 + 0.07 * sin(inkUV.y * 260.0 + inkUV.x * 39.0);\ndiffuseColor.a *= edge * grain;');
 };
 material.customProgramCacheKey=()=> 'surface-ink-brush-1';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let model=null,active=null,startAt=0,requested=null,generation=0;
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 function bind(scan){model=scan;if(requested!==null)play(requested);}
 function projectPaths(index){
  if(cache.has(index))return cache.get(index);
  const width=TRACE_FRAME.width,height=index===2?336.8515625:TRACE_FRAME.height;
  const camera=framing.reference(index,width,height),rw=Math.round(width*2),rh=Math.round(height*2);
  const target=new THREE.WebGLRenderTarget(rw,rh,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});
  target.texture.colorSpace=THREE.NoColorSpace;
  const depthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,blending:THREE.NoBlending});
  const depthScene=new THREE.Scene(),parent=model.parent,oldTarget=renderer.getRenderTarget(),oldColor=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha();
  const pixels=new Uint8Array(rw*rh*4);
  try{
   depthScene.overrideMaterial=depthMaterial;depthScene.add(model);model.updateMatrixWorld(true);
   renderer.setRenderTarget(target);renderer.setClearColor(0xffffff,1);renderer.clear();renderer.render(depthScene,camera);
   renderer.readRenderTargetPixels(target,0,0,rw,rh,pixels);
  }finally{
   parent.add(model);renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldColor,oldAlpha);target.dispose();depthMaterial.dispose();
  }
  const normalMatrix=new THREE.Matrix4().extractRotation(camera.matrixWorld),viewNormal=new THREE.Vector3(0,0,1).applyMatrix4(normalMatrix);
  function point(x,y){
   const px=Math.max(0,Math.min(rw-1,Math.floor(x/width*rw))),py=Math.max(0,Math.min(rh-1,Math.floor((1-y/height)*rh)));
   const o=(py*rw+px)*4;
   // unpackRGBAToDepth from Three's packing shader, in byte space.
   const depth=pixels[o]/256+pixels[o+1]/65536+pixels[o+2]/16777216+pixels[o+3]/(255*16777216);
   if(depth>=.999999)return null;
   return new THREE.Vector3((px+.5)/rw*2-1,(py+.5)/rh*2-1,depth*2-1).unproject(camera);
  }
  const strokes=FEATURE_PATHS[sex][index].map((path,strokeIndex)=>{
   const curve=new THREE.CatmullRomCurve3(path.map(([x,y])=>new THREE.Vector3(x-TRACE_FRAME.left[sex],y-TRACE_FRAME.top,0)),false,'centripetal');
   const samples=72,points=[];
   for(let i=0;i<=samples;i++){
    const p=curve.getPoint(i/samples),world=point(p.x,p.y);
    if(!world){points.push(null);continue;}
    const dx=point(p.x+.8,p.y),dy=point(p.x,p.y+.8);
    let normal=dx&&dy?dx.sub(world).cross(dy.sub(world)).normalize():viewNormal.clone();
    if(normal.dot(viewNormal)<0)normal.negate();
    if(normal.lengthSq()<.1)normal=viewNormal.clone();
    const pixelWorld=2*world.distanceTo(camera.position)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/camera.zoom/height;
    points.push({world:world.addScaledVector(normal,pixelWorld*.3),normal,pixelWorld});
   }
   const vertices=[],uv=[],indices=[];
   for(let i=0;i<=samples;i++){
    const p=points[i];if(!p){vertices.push(0,0,0,0,0,0);uv.push(0,0,1,0);continue;}
    const before=points[Math.max(0,i-1)]??p,after=points[Math.min(samples,i+1)]??p;
    const tangent=after.world.clone().sub(before.world).normalize(),across=p.normal.clone().cross(tangent).normalize();
    const t=i/samples,taper=Math.pow(Math.sin(Math.PI*t),.58),pressure=.69+.22*Math.sin(t*8+strokeIndex*.7)+.09*Math.sin(t*31+strokeIndex);
    const radius=p.pixelWorld*(.12+1.6*taper*pressure);
    vertices.push(...p.world.clone().addScaledVector(across,-radius).toArray(),...p.world.clone().addScaledVector(across,radius).toArray());
    uv.push(0,t,1,t);
    if(i&&points[i-1]){const a=(i-1)*2,b=i*2;indices.push(a,b,a+1,a+1,b,b+1);}
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.setDrawRange(0,0);
   const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=2;mesh.visible=false;group.add(mesh);
   return {mesh,total:indices.length};
  });
  cache.set(index,strokes);element.dataset.inkMappedStrokes=String(strokes.filter(s=>s.total>0).length);return strokes;
 }
 function stop(){
  generation++;requested=null;active=null;group.visible=false;material.opacity=0;
  element.dataset.inkState='idle';element.dataset.inkCount='0';invalidate();
 }
 function play(index){
  stop();if(!Number.isInteger(index))return;
  requested=index;const token=generation;
  // Let the information panel settle before preparing a feature, so opening remains responsive.
  setTimeout(()=>{
   if(token!==generation||!model)return;
   const strokes=projectPaths(index);if(token!==generation)return;
   for(const entries of cache.values())entries.forEach(s=>{s.mesh.visible=false;s.mesh.geometry.setDrawRange(0,0);});
   strokes.forEach(s=>s.mesh.visible=true);active=strokes;group.visible=true;startAt=performance.now()+120;
   element.dataset.inkFeature=String(index+1);element.dataset.inkTotal=String(strokes.length);element.dataset.inkState='drawing';requested=null;invalidate();
  },360);
 }
 function update(now){
  if(!active)return false;
  const elapsed=(now-startAt)/1000,drawSeconds=reduced.matches?0:1.95;
  let count=0;
  active.forEach((stroke,i)=>{
   const p=drawSeconds?smooth((elapsed-i*drawSeconds/active.length)/(drawSeconds/active.length*.93)):1;
   stroke.mesh.geometry.setDrawRange(0,Math.floor(stroke.total*p/6)*6);if(p>=.999)count++;
  });
  material.opacity=.88*(1-smooth((elapsed-3)/.85));
  element.dataset.inkCount=String(count);element.dataset.inkState=elapsed<drawSeconds?'drawing':elapsed<3?'holding':'fading';
  if(elapsed>=3.85){active=null;group.visible=false;material.opacity=0;element.dataset.inkState='finished';}
  return true;
 }
 return {bind,play,stop,update};
}
