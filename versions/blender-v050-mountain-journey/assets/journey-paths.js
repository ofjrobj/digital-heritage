// Narrow earth paths only where a journey crosses bare terrain. Existing
// courtyards, stairs and streets retain their original surface.
export function addJourneyPaths(root,T,tours,ground){
 const group=new T.Group();group.name='Journey connecting footpaths';root.add(group);
 const ray=new T.Raycaster(),positions=[],colors=[];
 const earth=new T.Color('#c7c0a5'),edge=new T.Color('#b8b69c');
 const hitAt=(x,z)=>{ray.set(new T.Vector3(x,80,z),new T.Vector3(0,-1,0));return ray.intersectObjects(ground,false)[0];};
 const bare=h=>h&&/continuous.ridges|Extension ground/.test(h.object.name);
 for(const route of tours){
  const curve=new T.CatmullRomCurve3(route.points.map(([x,z])=>new T.Vector3(x,0,z)),false,'centripetal');
  const count=Math.ceil(curve.getLength()/1.1);let previous=null;
  for(let i=0;i<=count;i++){
   const p=curve.getPointAt(i/count),t=curve.getTangentAt(i/count),h=hitAt(p.x,p.z);
   if(!bare(h)){previous=null;continue;}
   const side=new T.Vector3(-t.z,0,t.x).normalize(),row=[];
   for(const width of [-1.65,-1.15,1.15,1.65]){const v=p.clone().addScaledVector(side,width),sample=hitAt(v.x,v.z);v.y=(sample?.point.y??h.point.y)+.018;row.push(v);}
   if(previous)for(let k=0;k<3;k++){
    const vertices=[previous[k],row[k],row[k+1],previous[k],row[k+1],previous[k+1]];
    for(const v of vertices){positions.push(v.x,v.y,v.z);const c=(v===previous[0]||v===row[0]||v===previous[3]||v===row[3])?edge:earth;colors.push(c.r,c.g,c.b);}
   }
   previous=row;
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
 const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));mesh.name='Bare terrain connecting paths';group.add(mesh);return group;
}
