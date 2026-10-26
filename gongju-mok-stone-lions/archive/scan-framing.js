const LEVEL={male:[-.078247699,.032765705],female:[-.103479210,-.003594774]};
const PARTS=[
 {band:[.80,1],direction:[-.20,1,.10]},
 {band:[.37,.79],direction:[1,-.08,.06],width:.80,height:.80},
 {all:true,direction:[-.002,1,.00001],height:.9},
 {band:[.46,1],direction:[1,.025,.22],femaleDirection:[1,.025,-.10],width:.80,height:.84},
 {band:[.64,.94],direction:[1,.015,.04]}
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
export function createInspectionFraming(THREE,{camera,controls,element}){
 const up=new THREE.Vector3(0,1,0),zero=new THREE.Vector3(),all=[];
 let bounds=null,current=null,overview=null,overviewHeight=null,fitted=0,lastRect=null,pending=null;
 function view(index){
  const part=Number.isInteger(index)?PARTS[index]:null,size=bounds.getSize(new THREE.Vector3());
  const selected=part&&!part.all?all.filter(p=>p.x>=bounds.min.x+size.x*.65&&p.y>=bounds.min.y+size.y*part.band[0]&&p.y<=bounds.min.y+size.y*part.band[1]):all;
  const points=selected.length>20?selected:all;
  const target=part?new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3()):bounds.getCenter(new THREE.Vector3());
  const direction=new THREE.Vector3(...((element.id==='female-scene'&&part?.femaleDirection)||part?.direction||[2.7,1.15,3.6])).normalize();
  const rotation=new THREE.Matrix4().lookAt(direction,zero,up).transpose();
  return {index,part,target,direction,points:points.map(p=>p.clone().sub(target).applyMatrix4(rotation))};
 }
 function projected(spec,distance,aspect=camera.aspect){
  const k=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/camera.zoom;
  let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
  for(const p of spec.points){const depth=distance-p.z,x=p.x/(depth*k*aspect),y=p.y/(depth*k);left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);}
  return {width:right-left,height:top-bottom,left,right,bottom,top};
 }
 function distanceFor(spec,r,matchOverview=true){
  const expanded=document.documentElement.dataset.archiveOverview==='expanded';
  const width=r.width*(spec.part?(spec.part.width??(spec.part.all ? .78 : .83)):expanded?.88:.76);
  const height=spec.part?r.height*(spec.part.height??.86):Math.min(r.height*(expanded?.90:.82),innerHeight*(expanded?.57:.42),matchOverview&&overviewHeight>0?overviewHeight:Infinity);
  let near=.05;for(const p of spec.points)near=Math.max(near,p.z+.05);let far=50;
  for(let i=0;i<22;i++){
   const d=(near+far)/2,b=projected(spec,d,r.width/r.height);
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
  overview=view(null);current=Number.isInteger(pending)?view(pending):overview;fitted=0;
  element.dataset.rigidLevelQuaternion=model.quaternion.toArray().map(n=>n.toFixed(8)).join(',');
 }
 function resize(r,goal){
  lastRect=r;if(!current)return;const next=distanceFor(current,r);
  if(!fitted){controls.target.copy(current.target);camera.position.copy(current.target).addScaledVector(current.direction,next);}
  else if(Math.abs(next-fitted)>.00001){
   // Resize the destination rather than jumping the displayed camera. Reusing
   // that destination through the layout transition preserves any user zoom.
   const ratio=next/fitted;
   if(!goal)goal={position:camera.position.clone(),target:controls.target.clone()};
   goal.position.sub(goal.target).multiplyScalar(ratio).add(goal.target);
  }
  fitted=next;publish(r);
  return goal;
 }
 function naturalOverviewHeight(){
  if(!overview||!lastRect)return null;
  const distance=distanceFor(overview,lastRect,false);
  return projected(overview,distance,lastRect.width/lastRect.height).height*lastRect.height/2;
 }
 function setOverviewHeight(height){
  if(!Number.isFinite(height)||height<=0||overviewHeight!==null&&Math.abs(overviewHeight-height)<.1)return false;
  overviewHeight=height;element.dataset.overviewHeight=height.toFixed(1);return true;
 }
 function focus(index){
  pending=index;if(!bounds)return null;current=view(index);
  const r=lastRect??element.getBoundingClientRect();fitted=distanceFor(current,r);publish(r);
  return {position:current.target.clone().addScaledVector(current.direction,fitted),target:current.target.clone()};
 }
 function reference(index,width,height){
  if(!bounds)return null;
  const spec=view(index),referenceCamera=new THREE.PerspectiveCamera(camera.fov,width/height,camera.near,camera.far);
  referenceCamera.zoom=camera.zoom;referenceCamera.updateProjectionMatrix();
  referenceCamera.position.copy(spec.target).addScaledVector(spec.direction,distanceFor(spec,{width,height}));
  referenceCamera.lookAt(spec.target);referenceCamera.updateMatrixWorld(true);
  return referenceCamera;
 }
 return {bind,resize,focus,reference,naturalOverviewHeight,setOverviewHeight};
}
