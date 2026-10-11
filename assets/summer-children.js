// Two children follow the open rear edge of the forecourt, only during summer.
export function prepareSummerChildren(village,THREE,paths){
 let source;village.traverse(o=>{if(o.name.replaceAll('_',' ')==='v064 child with bundle')source=o;});
 if(!source)return {update(){},hide(){}};
 const children=paths.map((path,index)=>{
  const root=source.clone(true);root.name='Summer passing child '+index;
  root.position.set(0,0,0);root.quaternion.identity();root.scale.setScalar(1);
  root.traverse(o=>{o.name=o.name.replaceAll("_"," ");o.userData={};if(o.isMesh){o.material=o.material.clone();if(/tailored jacket|sleeve/.test(o.name))o.material.color.set(index?'#607c8f':'#c99b72');}});
  const removed=[];root.traverse(o=>{if(/tied cloth bundle|bundle knot/.test(o.name))removed.push(o);});removed.forEach(o=>o.removeFromParent());
  root.userData.season_actor='runtime_summer';root.userData.season_start=8;root.userData.season_end=13;
  const legs=[new THREE.Group(),new THREE.Group()];legs.forEach((p,i)=>{p.position.set(i?.12:-.12,.68,0);root.add(p);});root.updateMatrixWorld(true);
  const meshes=[];root.traverse(o=>{if(o.isMesh&&/trouser|shoe/.test(o.name))meshes.push(o);});
  for(const mesh of meshes){mesh.geometry.computeBoundingBox();const c=mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);legs[c.x>0?1:0].attach(mesh);}
  const arms=[];root.traverse(o=>{if(/left arm|right arm/.test(o.name))arms.push({o,q:o.quaternion.clone()});});
  root.scale.setScalar(index?.64:.69);root.rotation.y=-Math.PI/2;root.visible=false;village.add(root);
  return {root,legs,arms,path,index};
 });
 return {hide(){children.forEach(c=>c.root.visible=false);},update(t){for(const c of children){
  const u=(t-8-c.index*.55)/4.2;c.root.visible=u>=0&&u<=1;if(!c.root.visible)continue;
  const f=u*(c.path.length-1),i=Math.min(c.path.length-2,Math.floor(f)),a=c.path[i],b=c.path[i+1],v=f-i;
  const stride=Math.sin(u*Math.PI*24+c.index*.5);
  c.root.position.set(a[0]+(b[0]-a[0])*v,a[2]+(b[2]-a[2])*v+.025*Math.abs(stride),-(a[1]+(b[1]-a[1])*v));
  c.legs.forEach((leg,j)=>leg.rotation.x=(j?1:-1)*stride*.55);
  c.arms.forEach(({o,q},j)=>{o.quaternion.copy(q);o.rotateX((j?-1:1)*stride*.38);});
 }}};
}
