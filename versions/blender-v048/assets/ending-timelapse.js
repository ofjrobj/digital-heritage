// Source time 70–144 spans the fixed-camera, 60-second passage of time.
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function constructionAmount(time,kind,rank,offset=0){
 if(kind==='fixed')return 1;
 if(kind==='actor')return time<80?1:0;
 if(kind==='modern')return ease((time-122-rank*2-offset)/7);
 const demolish=1-ease((time-80-(2-rank)*2-offset)/5);
 const rebuild=ease((time-94-rank*2-offset)/6);
 const replace=1-ease((time-112-(2-rank)*2-offset)/7);
 return Math.max(demolish,rebuild)*replace;
}
export function prepareTimelapse(root,THREE){
 root.updateMatrixWorld(true);
 const parts=[];
 root.traverse(o=>{
  if(!o.isMesh)return;
  const name=o.name.replaceAll('_',' '),modern=name.startsWith('Present'),snow=name.startsWith('Season falling');
  if(snow)return;
  const tree=/pine|tree|trunk|crown|branch|foliage/i.test(name);
  const architecture=/wall|pillar|roof|eaves|rafter|beam|ridge|foundation|plinth|window|door|lattice|stair|coping/i.test(name)&&! /Cultivation|continuous ridges|exposed granite/i.test(name);
  let actor=false;for(let parent=o;parent;parent=parent.parent)if(/Merchant|Farmer|Cook|Trio|Woodcutter/i.test(parent.name))actor=true;
  const kind=actor?'actor':name.startsWith('Original')?'fixed':modern?'modern':tree||architecture?'historic':'fixed';
  const rank=/roof|eaves|rafter|crown|foliage/i.test(name)?2:/wall|window|door|lattice|branch/i.test(name)?1:0;
  const box=new THREE.Box3().setFromObject(o),center=box.getCenter(new THREE.Vector3());
  const offset=tree?(Math.sin(center.x*.2+center.z*.17)+1)*1.4:(Math.sin(center.x*.06+center.z*.04)+1)*.6;
  const plane=new THREE.Plane(new THREE.Vector3(0,-1,0),box.max.y+1);
  if(kind!=='fixed')for(const material of (Array.isArray(o.material)?o.material:[o.material]))material.clippingPlanes=[plane];
  parts.push({o,kind,rank,offset,plane,min:box.min.y,max:box.max.y});
 });
 return time=>{
  for(const p of parts){
   const amount=constructionAmount(time,p.kind,p.rank,p.offset);
   p.o.visible=amount>0.001;
   p.plane.constant=p.min-.03+(p.max-p.min+.06)*amount;
  }
 };
}
