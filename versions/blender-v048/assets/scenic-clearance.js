// Cinematic staging: move whole foreground buildings, never individual roof pieces.
export function scenicClearance(root,T){
 root.updateMatrixWorld(true);const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
 const groups=[],used=new Set();
 for(const wall of meshes){const name=wall.name.replaceAll('_',' ');const wallMatch=/ wall(?:[ .]?\d+)?$/.exec(name);if(!wallMatch||/Compound|Domestic/.test(name))continue;
  const prefix=name.slice(0,wallMatch.index);if(used.has(prefix))continue;used.add(prefix);
  const parts=meshes.filter(o=>o.name.replaceAll('_',' ').startsWith(prefix+' '));
  const box=new T.Box3();for(const o of parts)box.union(new T.Box3().setFromObject(o));
  groups.push({parts:parts.map(o=>({o,base:o.position.clone(),inverse:new T.Matrix3().setFromMatrix4(o.parent.matrixWorld.clone().invert())})),box,center:box.getCenter(new T.Vector3())});
 }
 const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b),right=new T.Vector3(),forward=new T.Vector3(),local=new T.Vector3(),offset=new T.Vector3();
 return function(camera,strength){
  camera.updateMatrixWorld(true);right.setFromMatrixColumn(camera.matrixWorld,0);camera.getWorldDirection(forward);
  for(const g of groups){
   const rel=g.center.clone().sub(camera.position),depth=rel.dot(forward),side=rel.dot(right);
   const size=g.box.getSize(new T.Vector3()),radius=Math.hypot(size.x,size.z)/2;
   const halfWidth=Math.max(1,depth*Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.aspect);
   const area=(Math.min(2,radius/halfWidth)*Math.min(2,size.y/Math.max(1,depth*Math.tan(T.MathUtils.degToRad(camera.fov/2)))))/4;
   const proximity=1-smooth(22,42,depth),inView=1-smooth(halfWidth+radius*.3,halfWidth+radius,Math.abs(side));
   const amount=strength*smooth(.10,.26,area)*proximity*inView*(depth>0?1:0);
   if(strength===0)g.direction=null;if(amount>.001&&g.direction==null)g.direction=side>=0?1:-1;
   const direction=g.direction??(side>=0?1:-1);offset.copy(right).multiplyScalar((direction*(halfWidth+radius+2)-side)*amount);
   for(const {o,base,inverse}of g.parts){local.copy(offset).applyMatrix3(inverse);o.position.copy(base).add(local);}
  }
  root.updateMatrixWorld(true);
 };
}
