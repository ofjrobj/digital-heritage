// Low everyday objects outside the authored camera corridor; original architecture stays intact.
export function addVillageLife(root,T,tours){
 root.updateMatrixWorld(true);const floor=[];root.traverse(o=>{if(o.isMesh&&/continuous.ridges|courtyard|Main.village.street|Extension ground/.test(o.name))floor.push(o);});
 const ray=new T.Raycaster(),routePoints=tours.flatMap(r=>r.points),group=new T.Group();group.name='Village everyday life';root.add(group);
 const mat=c=>new T.MeshStandardMaterial({color:c,roughness:1});const wood=mat('#69553e'),clay=mat('#78644f'),soil=mat('#817657'),leaf=mat('#667750'),linen=mat('#bdb69c');
 const sites=[[-30,-17,0],[-20,-22,1],[-33,-18,2],[-31,-24,0],[-10,-24,1],[-34,-3,2],[-8,3,3],[-45,27,0],[-65,18,1],[-66,-15,2],[48,33,3],[59,-25,0],[34,51,1],[4,52,2],[-41,50,3]];
 for(const [x,z,kind]of sites){if(routePoints.some(p=>Math.hypot(p[0]-x,p[1]-z)<6))continue;ray.set(new T.Vector3(x,80,z),new T.Vector3(0,-1,0));const y=ray.intersectObjects(floor,false)[0]?.point.y??0;const site=new T.Group();site.position.set(x,y+.03,z);site.name=['Kitchen garden','Onggi jars','Firewood and bench','Market baskets'][kind];group.add(site);
 const mesh=(geo,m,px,py,pz)=>{const o=new T.Mesh(geo,m);o.position.set(px,py,pz);site.add(o);return o;};
 if(kind===0){mesh(new T.BoxGeometry(3.8,.10,2.5),soil,0,.05,0);for(let r=0;r<3;r++)for(let c=0;c<6;c++){const plant=mesh(new T.ConeGeometry(.2,.42,5),leaf,-1.5+c*.6,.28,-.8+r*.8);plant.rotation.z=(c%2-.5)*.2;}}
 if(kind===1){for(let i=0;i<4;i++){const h=.6+(i%2)*.23;mesh(new T.SphereGeometry(.38,10,7),clay,i*.85-1.2,h*.55,0).scale.set(1,h/.7,1);mesh(new T.CylinderGeometry(.3,.32,.07,12),clay,i*.85-1.2,h,0);}}
 if(kind===2){mesh(new T.BoxGeometry(2.5,.16,.8),wood,0,.65,0);for(const x of [-1,1])mesh(new T.BoxGeometry(.16,.6,.6),wood,x,.3,0);for(let i=0;i<9;i++){const log=mesh(new T.CylinderGeometry(.13,.13,1.3,7),wood,(i%3)*.3-.3,.15+Math.floor(i/3)*.22,1);log.rotation.z=Math.PI/2;}}
 if(kind===3){for(let i=0;i<3;i++){mesh(new T.CylinderGeometry(.4,.3,.38,10,1,true),wood,i*.85-1,.19,0);for(let j=0;j<4;j++)mesh(new T.SphereGeometry(.13,6,5),j%2?leaf:linen,i*.85-1+(j%2)*.18-.09,.35,Math.floor(j/2)*.18-.09);}}
 }
 root.updateMatrixWorld(true);return group;
}
