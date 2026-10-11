// A quiet initial hold precedes attached blossoms, summer leaves and autumn leaf fall.
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function constructionAmount(time,kind,rank,offset=0){
 const t=(time-70)/74*72;
 if(kind==='fixed')return 1;
 if(kind==='actor')return 1-ease((t-4)/3);
 if(kind==='modern')return ease((t-43.2-Math.min(6,rank)*.18)/.32);
 if(kind==='sitework')return 1-ease((t-42.1)/.35);
 return 1-ease((t-(41.6-Math.min(6,rank)*.18)-offset*.3)/.28);
}
export function prepareTimelapse(root,THREE){
 root.updateMatrixWorld(true);const parts=[],children=[];
 root.traverse(o=>{
  if(o.userData.season_actor)children.push({o,d:o.userData});
  if(!o.isMesh)return;
  const name=o.name.replaceAll('_',' ');let d=o.userData;for(let ancestor=o.parent;ancestor;ancestor=ancestor.parent){if(ancestor.userData.historic_architecture){d={...ancestor.userData,...d};break;}}
  if(d.v069_full_scale)o.scale.set(d.v069_full_scale[0],d.v069_full_scale[2],d.v069_full_scale[1]);
  let actor=false,seasonChild=false;for(let p=o;p;p=p.parent){if(p.userData.ambient_kind||p.userData.narrative_index!==undefined)actor=true;if(p.userData.season_actor)seasonChild=true;}
  const tree=/pine.*crown|pine.*needles|foliage/i.test(name);
  const kind=seasonChild?'fixed':actor?'actor':d.present_era||name.startsWith('Present')?'modern':(d.historic_architecture||/fitted gable/.test(name))?'historic':d.historic_sitework?'sitework':'fixed';
  const rank=d.construction_rank??(/roof|tile|gable|ridge/i.test(name)?6:/wall|window|door/i.test(name)?4:/pillar|column|beam/i.test(name)?2:0),offset=d.building_id?[...d.building_id].reduce((n,c)=>n+c.charCodeAt(0),0)%7*.16:0;
  const materials=Array.isArray(o.material)?o.material:[o.material];
  if(d.season_effect)for(const m of materials){m.side=THREE.DoubleSide;m.transparent=true;if(d.season_effect==='blossom'){m.color.set('#f1cfca');m.emissive.set('#d6ada6');m.emissiveIntensity=.12;}if(d.season_effect==='snow'||d.season_effect==='snowcap'){m.color.set('#f5f6f2');m.emissive.set('#cdd9e0');m.emissiveIntensity=.18;}}
  o.updateWorldMatrix(true,false);const bounds=new THREE.Box3().setFromObject(o),cut=new THREE.Plane(new THREE.Vector3(0,-1,0),0);
  parts.push({bounds,cut,o,d,kind,rank,offset,tree,roof:/roof.*tile|roof.*thatch|heritage.*roof/i.test(name),materials,colors:materials.map(m=>m.color?.clone()),base:o.position.clone(),rotation:o.quaternion.clone()});
 });
 return time=>{
  const t=(time-70)/74*72,winter=ease((t-34)/3)*(1-ease((t-42)/3));
  for(const p of parts){
   const a=constructionAmount(time,p.kind,p.rank,p.offset);p.o.visible=a>.001;
   if(p.d.season_effect){
    const k=p.d.season_effect,start=p.d.season_start,end=p.d.season_end;
    p.o.visible=t>start&&t<end;p.o.position.copy(p.base);p.o.quaternion.copy(p.rotation);
    let opacity=ease((t-start)/1.2)*(1-ease((t-end+1)/1));
    if(k==='blossom')opacity=ease((t-3)/4)*(1-ease((t-9)/2));
    if(k==='attached_leaf'){
     const b=p.d.leaf_origin,c=p.d.leaf_landing,u=Math.max(0,Math.min(1,(t-p.d.fall_start)/p.d.fall_duration));
     const fall=u*u*(2-u);p.o.position.set(b[0]+(c[0]-b[0])*fall+Math.sin(u*Math.PI*4)*.13*Math.sin(u*Math.PI),b[2]+(c[2]-b[2])*fall,-(b[1]+(c[1]-b[1])*fall));
     p.o.rotateX(Math.sin(u*Math.PI*3)*.5*Math.sin(u*Math.PI));p.o.rotateY(u*Math.PI*1.6);
     p.materials.forEach(m=>m.color.set('#69834c').lerp(new THREE.Color('#b56e31'),ease((t-22)/3)));
    }
    if(k==='rain'||k==='snow'){const speed=k==='rain'?5:.65;p.o.position.y-=((t-start)*speed)%4;p.o.position.x+=k==='rain'?0:Math.sin(t)*.15;}
    if(k==='leaf'||k==='blossom')p.o.visible=false;
    if(k==='snowcap')opacity=ease((t-35)/3)*(1-ease((t-42)/2));
    p.materials.forEach(m=>{m.opacity=opacity;m.depthWrite=opacity>.5;});continue;
   }
   if(['historic','sitework','modern'].includes(p.kind)){
    p.o.position.copy(p.base);
    if(p.kind==='historic'&&a>0&&a<1)p.o.position.y+=(1-a)*.45;
    p.cut.constant=p.bounds.min.y+(p.bounds.max.y-p.bounds.min.y)*a;
    p.materials.forEach(m=>{m.transparent=false;m.opacity=1;m.depthWrite=true;m.clippingPlanes=a<.999?[p.cut]:[];});
   }else if(p.kind==='actor')p.materials.forEach(m=>{m.transparent=a<.999;m.opacity=a;m.depthWrite=a>.5;});
   // Evergreen pines retain their green; only the deciduous leaves turn orange.
   if(p.tree||p.roof)p.materials.forEach((m,i)=>{if(!m.color||!p.colors[i])return;m.color.copy(p.colors[i]).lerp(new THREE.Color('#e1e8e4'),winter*.88);});
  }
  for(const {o,d} of children){if(d.season_actor==='runtime_summer')continue;const u=(t-d.season_start)/(d.season_end-d.season_start);o.visible=u>=0&&u<=1;o.position.set(-38+20*u,1.43+.045*Math.abs(Math.sin(u*Math.PI*22)),-(12+(d.season_start-8)/.8*.7));}
 };
}
