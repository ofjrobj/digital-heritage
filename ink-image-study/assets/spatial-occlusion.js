// Depth-only foreground drawn in the exact video crop. It masks sprites, never
// paints over the illustration. Coordinates are measured in the decoded plate.
export async function createPlateOccluder(THREE,url,scene){
 const response=await fetch(url);if(!response.ok)throw Error('Foreground mask '+response.status);
 const data=await response.json(),material=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,depthTest:true,depthFunc:THREE.AlwaysDepth,side:THREE.DoubleSide});
 material.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <project_vertex>','gl_Position=vec4(position.xy,-.999,1.);');};
 const mesh=new THREE.Mesh(new THREE.BufferGeometry(),material);mesh.renderOrder=-500;mesh.frustumCulled=false;scene.add(mesh);
 let previous='';
 return {update(u,aspect){
  const f=Math.min(data.frames.length-1,Math.max(0,u*(data.frames.length-1))),a=data.frames[Math.floor(f)],b=data.frames[Math.min(data.frames.length-1,Math.ceil(f))],mix=f-Math.floor(f);
  const signature=f.toFixed(3)+':'+aspect;if(signature===previous)return;previous=signature;
  const crop=aspect>16/9?[1,(16/9)/aspect]:[aspect/(16/9),1],positions=[];
  for(let i=0;i<a.polygons.length;i++){
   const poly=a.polygons[i],other=b.polygons.length===a.polygons.length?b.polygons[i]:null;
   const points=poly.map(([x,y],j)=>{if(other?.length===poly.length){x+=(other[j][0]-x)*mix;y+=(other[j][1]-y)*mix;}return new THREE.Vector2((x/data.width*2-1)/crop[0],(1-y/data.height*2)/crop[1]);});
   for(const triangle of THREE.ShapeUtils.triangulateShape(points,[]))for(const j of triangle)positions.push(points[j].x,points[j].y,0);
  }
  mesh.geometry.dispose();mesh.geometry=new THREE.BufferGeometry();mesh.geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));mesh.visible=positions.length>0;
 },proof(){return {kind:'decoded-plate-foreground',visible:mesh.visible};}};
}
