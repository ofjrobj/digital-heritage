// Foreground clearance for natural objects only. Buildings never move.
export function scenicClearance(root,T){
 root.updateMatrixWorld(true);
 const groups=[];
 // Architecture is permanently fixed; only explicitly tagged trees can move.
 // Keep each added tree intact, including its trunk and every crown.
 root.traverse(o=>{if(!/^Extension tree /.test(o.name))return;const box=new T.Box3().setFromObject(o);groups.push({parts:[{o,base:o.position.clone(),inverse:new T.Matrix3().setFromMatrix4(o.parent.matrixWorld.clone().invert())}],box,center:box.getCenter(new T.Vector3())});});
 // Screen-space coverage is measured against the original placement, not the
 // displaced object, so a tree cannot oscillate between hidden and visible.
 const right=new T.Vector3(),forward=new T.Vector3(),local=new T.Vector3(),offset=new T.Vector3();
 const ray=new T.Raycaster(),hit=new T.Vector3();let last=0;
 for(const g of groups){g.offset=new T.Vector3();g.direction=null;}
 return function(camera,strength){
  const now=performance.now(),dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;
  camera.updateMatrixWorld(true);right.setFromMatrixColumn(camera.matrixWorld,0);camera.getWorldDirection(forward);
  for(const g of groups){
   const rel=g.center.clone().sub(camera.position),depth=rel.dot(forward),side=rel.dot(right);
   const size=g.box.getSize(new T.Vector3()),radius=Math.hypot(size.x,size.z)/2;
   let coverage=0;
   if(strength>0&&depth+radius>0&&depth-radius<18){
    // Count viewport samples actually covered by this foreground assembly.
    let covered=0;for(let y=0;y<9;y++)for(let x=0;x<15;x++){
     ray.setFromCamera(new T.Vector2((x+.5)/15*2-1,(y+.5)/9*2-1),camera);
     if(ray.ray.intersectBox(g.box,hit)&&hit.distanceTo(camera.position)<24)covered++;
    }coverage=covered/135;
   }
   if(coverage>1/3&&g.direction===null)g.direction=side<0?-1:1;
   const obstructs=coverage>1/3;
   const halfWidth=Math.max(1,depth*Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.aspect);
   const amount=obstructs?strength:0;
   offset.copy(right).multiplyScalar(((g.direction??1)*(halfWidth+radius+1.5)-side)*amount);
   g.offset.lerp(offset,1-Math.exp(-dt*3.5));
   if(!obstructs&&g.offset.length()<.015){g.offset.set(0,0,0);g.direction=null;}
   for(const {o,base,inverse}of g.parts){local.copy(g.offset).applyMatrix3(inverse);o.position.copy(base).add(local);}
  }
  root.updateMatrixWorld(true);
 };
}
