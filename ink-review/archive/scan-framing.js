const LEVEL={male:[-.078247699,.032765705],female:[-.103479210,-.003594774]};
const PARTS=[
 {band:[.80,1],direction:[-.20,1,.10],key:[-4,2,4],fill:[3,-1,4]},
 {band:[.37,.79],direction:[1,-.08,.06],key:[-4,-1,4],fill:[3,2,4],width:.80,height:.80},
 {all:true,direction:[-.002,1,.00001],key:[-4,1,3],fill:[3,2,5],height:.9},
 {band:[.46,1],direction:[1,.025,.22],femaleDirection:[1,.025,-.10],key:[-3,3,5],fill:[3,-1,4],width:.80,height:.84},
 {band:[.64,.94],direction:[1,.015,.04],key:[-5,1,2],fill:[3,1,4]}
];
export function levelScan(THREE,scan,{yaw,targetSize,sex}){
 scan.rotation.y=yaw;
 const oldBox=new THREE.Box3().setFromObject(scan),oldCenter=oldBox.getCenter(new THREE.Vector3());
 const scale=targetSize/oldBox.getSize(new THREE.Vector3()).x;
 scan.scale.setScalar(scale);scan.position.sub(oldCenter.multiplyScalar(scale));
 const [a,b]=LEVEL[sex],root=new THREE.Group();root.add(scan);
 root.quaternion.setFromUnitVectors(new THREE.Vector3(-a,1,-b).normalize(),new THREE.Vector3(0,1,0));
 root.position.sub(new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3()));
 return root;
}
export function createInspectionFraming(THREE,{camera,controls,element,key,fill}){
 const up=new THREE.Vector3(0,1,0),zero=new THREE.Vector3(),all=[];
 let bounds=null,current=null,fitted=0,lastRect=null,pending=null,lightGoal=null;
 function view(index){
  const part=Number.isInteger(index)?PARTS[index]:null,size=bounds.getSize(new THREE.Vector3());
  const selected=part&&!part.all?all.filter(p=>p.x>=bounds.min.x+size.x*.65&&p.y>=bounds.min.y+size.y*part.band[0]&&p.y<=bounds.min.y+size.y*part.band[1]):all;
  const points=selected.length>20?selected:all;
  const target=part?new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3()):bounds.getCenter(new THREE.Vector3());
  const direction=new THREE.Vector3(...((element.id==='female-scene'&&part?.femaleDirection)||part?.direction||[2.7,1.15,3.6])).normalize();
  const rotation=new THREE.Matrix4().lookAt(direction,zero,up).transpose();
  return {index,part,target,direction,points:points.map(p=>p.clone().sub(target).applyMatrix4(rotation))};
 }
 function projected(spec,distance){
  const k=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/camera.zoom;
  let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
  for(const p of spec.points){const depth=distance-p.z,x=p.x/(depth*k*camera.aspect),y=p.y/(depth*k);left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);}
  return {width:right-left,height:top-bottom,left,right,bottom,top};
 }
 function distanceFor(spec,r){
  const width=r.width*(spec.part?(spec.part.width??(spec.part.all ? .78 : .83)):.76);
  const height=spec.part?r.height*(spec.part.height??.86):Math.min(r.height*.82,innerHeight*.42);
  let near=.05;for(const p of spec.points)near=Math.max(near,p.z+.05);let far=50;
  for(let i=0;i<22;i++){
   const d=(near+far)/2,b=projected(spec,d);
   if(b.width*r.width/2<=width&&b.height*r.height/2<=height&&Math.max(Math.abs(b.left),Math.abs(b.right),Math.abs(b.top),Math.abs(b.bottom))<=.94)far=d;else near=d;
  }
  return far;
 }
 function publish(r){
  controls.minDistance=Math.max(.08,fitted*.22);controls.maxDistance=fitted*3.2;
  const b=projected(current,fitted);
  element.dataset.framing=current.part?String(current.index+1).padStart(2,'0'):'overview';
  element.dataset.fitDistance=fitted.toFixed(4);
  element.dataset.framedPixels=[b.width*r.width/2,b.height*r.height/2].map(n=>n.toFixed(1)).join(',');
  element.dataset.focusTarget=current.target.toArray().map(n=>n.toFixed(4)).join(',');
 }
 function bind(model){
  model.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(model);
  model.traverse(mesh=>{
   const attr=mesh.isMesh&&mesh.geometry?.attributes.position;if(!attr)return;
   const step=Math.max(1,Math.floor(attr.count/8000));
   for(let i=0;i<attr.count;i+=step)all.push(new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld));
  });
  current=view(pending);fitted=0;
  element.dataset.rigidLevelQuaternion=model.quaternion.toArray().map(n=>n.toFixed(8)).join(',');
 }
 function resize(r,goal){
  lastRect=r;if(!current)return;const next=distanceFor(current,r);
  if(!fitted){controls.target.copy(current.target);camera.position.copy(current.target).addScaledVector(current.direction,next);}
  else{const ratio=next/fitted;camera.position.sub(controls.target).multiplyScalar(ratio).add(controls.target);if(goal)goal.position.sub(goal.target).multiplyScalar(ratio).add(goal.target);}
  fitted=next;publish(r);
 }
 function focus(index){
  pending=index;if(!bounds)return null;current=view(index);
  const r=lastRect??element.getBoundingClientRect();fitted=distanceFor(current,r);publish(r);
  lightGoal={key:new THREE.Vector3(...current.part.key),fill:new THREE.Vector3(...current.part.fill)};
  return {position:current.target.clone().addScaledVector(current.direction,fitted),target:current.target.clone()};
 }
 function updateLights(){
  if(!lightGoal)return false;key.position.lerp(lightGoal.key,.12);fill.position.lerp(lightGoal.fill,.12);
  if(key.position.distanceTo(lightGoal.key)<.002&&fill.position.distanceTo(lightGoal.fill)<.002){key.position.copy(lightGoal.key);fill.position.copy(lightGoal.fill);lightGoal=null;}
  return true;
 }
 return {bind,resize,focus,updateLights};
}
