// Added districts reuse the original house geometry and materials at their original scale.
export const additions=[[-78,40],[-78,18],[-78,-4],[-78,-26],[-78,-48],[-48,-78],[-24,-78],[0,-78],[24,-78],[48,-78],[94,-24],[94,0],[94,24],[72,60],[48,60],[24,60],[0,60],[-24,60],[-48,60]];
export const tourGates=[[[52,24],[78,8],[78,-38],[44,-64],[44,-45],[40,-32]],[[40,-32],[44,-45],[44,-64],[-10,-68],[-58,-60],[-58,-32]],[[-58,-30],[-60,0],[-60,42],[-28,48]],[[0,44],[60,44],[82,20],[82,-28]],[[80,-35],[82,10],[60,40],[0,44],[-54,40],[-54,-4],[-36,-10],[-18.8,-9.3]]];
export function extendVillage(root,T){
 root.updateMatrixWorld(true);const terrain=[];root.traverse(o=>{if(o.isMesh&&/continuous.ridges|courtyard|Main.village.street/.test(o.name))terrain.push(o);});const ray=new T.Raycaster();const groundHeight=(x,z)=>{ray.set(new T.Vector3(x,80,z),new T.Vector3(0,-1,0));return ray.intersectObjects(terrain,false)[0]?.point.y??0;};const original=[];root.traverse(o=>{if(o.isMesh&&/^Village_home_00|^Village home 00/.test(o.name))original.push(o);});
 const box=new T.Box3();for(const o of original)box.union(new T.Box3().setFromObject(o));const center=box.getCenter(new T.Vector3());
 const group=new T.Group();group.name='Expanded village districts';root.add(group);
 for(let i=0;i<additions.length;i++){const [x,z]=additions[i],home=new T.Group();home.name='Extension house '+i;home.position.y=groundHeight(x,z)+.02;group.add(home);
  for(const source of original){const mesh=source.clone();source.matrixWorld.decompose(mesh.position,mesh.quaternion,mesh.scale);mesh.position.x+=x-center.x;mesh.position.z+=z-center.z;mesh.position.y-=box.min.y;mesh.name='Extension '+i+' '+source.name;home.add(mesh);}
 }
 const ground=new T.Mesh(new T.PlaneGeometry(260,240),new T.MeshStandardMaterial({color:0xb8b69c,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.06;ground.name='Extension ground';group.add(ground);
 for(let i=0;i<additions.length;i++)for(const side of [-1,1]){const [x,z]=additions[i],tree=new T.Group();tree.name='Extension tree '+i+' '+side;const trunk=new T.Mesh(new T.CylinderGeometry(.2,.3,3.6,7),new T.MeshStandardMaterial({color:0x635640}));trunk.position.y=1.8;trunk.name='Extension trunk';tree.add(trunk);for(let k=0;k<3;k++){const crown=new T.Mesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:0x3e5141}));crown.scale.set(2-k*.3,.7,1.6-k*.2);crown.position.set(k%2*.5,3+k*.7,0);tree.add(crown);}tree.position.set(x+side*7,groundHeight(x+side*7,z+7),z+7);group.add(tree);}
 // The extended loop has a north passage, avoiding a forced return to the south gate.
 const opening=[];root.traverse(o=>{if(!o.isMesh||!/Compound.white.wall|Compound.wall.coping/.test(o.name))return;const b=new T.Box3().setFromObject(o);if(b.max.z<-53&&b.min.x<0&&b.max.x>40)opening.push([o,b]);});
 for(const [o,b]of opening){o.parent.remove(o);for(const [left,right]of [[b.min.x,35],[46,b.max.x]]){const m=new T.Mesh(new T.BoxGeometry(right-left,b.max.y-b.min.y,b.max.z-b.min.z),o.material.clone());m.position.set((left+right)/2,(b.min.y+b.max.y)/2,(b.min.z+b.max.z)/2);m.name='Extension north passage wall';group.add(m);}}
 root.updateMatrixWorld(true);return group;
}
