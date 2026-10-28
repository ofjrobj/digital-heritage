const LEVEL={male:[-.078247699,.032765705],female:[-.103479210,-.003594774]};
// The scans' body axes are aligned, but their carved faces are not parallel.
// These camera angles follow each face's frontal surface, without changing vertices.
const FACE={male:{yaw:5,pitch:4},female:{yaw:-10,pitch:4}};
// Measured centreline from the support to the upper back (middle body bands).
// Only the back camera follows this small lean; scan placement stays unchanged.
const BACK_ROLL={male:-.37,female:-3.63};
const PARTS=[
 {band:[.80,1],direction:[-.20,1,.10]},
 {band:[.46,.66],front:.78,face:true,width:.88,height:.82},
 {all:true,direction:[-.002,1,.00001],height:.9},
 {band:[.47,1],face:true,width:.86,height:.88},
 {band:[.70,.84],front:.74,face:true,width:.9,height:.82}
];
export function levelScan(THREE,scan,{yaw,targetSize,sex}){
 scan.rotation.y=yaw;
 const oldBox=new THREE.Box3().setFromObject(scan,true),oldCenter=oldBox.getCenter(new THREE.Vector3());
 const scale=targetSize/oldBox.getSize(new THREE.Vector3()).x;
 scan.scale.setScalar(scale);scan.position.sub(oldCenter.multiplyScalar(scale));
 const [a,b]=LEVEL[sex],root=new THREE.Group();root.add(scan);
 root.quaternion.setFromUnitVectors(new THREE.Vector3(-a,1,-b).normalize(),new THREE.Vector3(0,1,0));
 root.position.sub(new THREE.Box3().setFromObject(root,true).getCenter(new THREE.Vector3()));
 return root;
}
export function createInspectionFraming(THREE,{camera,controls,element}){
 const up=new THREE.Vector3(0,1,0),zero=new THREE.Vector3(),all=[];
 const comparisonHeights=new Map();
 let bounds=null,current=null,overview=null,overviewHeight=null,overviewLimit=null,fitted=0,lastRect=null,pending=null;
 function view(index){
  const part=Number.isInteger(index)?PARTS[index]:null,size=bounds.getSize(new THREE.Vector3());
  const selected=part&&!part.all?all.filter(p=>p.x>=bounds.min.x+size.x*(part.front??.65)&&p.y>=bounds.min.y+size.y*part.band[0]&&p.y<=bounds.min.y+size.y*part.band[1]):all;
  const points=selected.length>20?selected:all;
  const target=part?new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3()):bounds.getCenter(new THREE.Vector3());
  const sex=element.id==='female-scene'?'female':'male',face=FACE[sex];
  let direction,viewUp=up.clone();
  if(part?.face){
   const yaw=THREE.MathUtils.degToRad(face.yaw+(part.angle||0)*(sex==='female'?-1:1)),pitch=THREE.MathUtils.degToRad(face.pitch);
   direction=new THREE.Vector3(Math.cos(pitch)*Math.cos(yaw),Math.sin(pitch),Math.cos(pitch)*Math.sin(yaw));
  }else{
   direction=new THREE.Vector3(...(part?.direction||[2.7,1.15,3.6])).normalize();
   // Body axes are already aligned by levelScan. Face-specific yaw belongs
   // only to frontal face views; applying it here tilts the pair differently
   // in the overview, crown and back comparisons.
   if(index===2){
    const roll=THREE.MathUtils.degToRad(BACK_ROLL[sex]);
    viewUp.set(0,Math.cos(roll),Math.sin(roll));
    direction.copy(viewUp).add(new THREE.Vector3(-.002,0,0)).normalize();
   }
  }
  const rotation=new THREE.Matrix4().lookAt(direction,zero,viewUp).transpose();
  const right=new THREE.Vector3().crossVectors(viewUp,direction).normalize(),vertical=new THREE.Vector3().crossVectors(direction,right);
  return {index,part,target,direction,up:viewUp,right,vertical,points:points.map(p=>p.clone().sub(target).applyMatrix4(rotation))};
 }
 function useViewUp(spec){
  camera.up.copy(spec.up);
  // This pinned OrbitControls caches its up-axis conversion at construction.
  // Keep that conversion in sync so orbiting and the camera share one up axis.
  if(controls._quat&&controls._quatInverse){
   controls._quat.setFromUnitVectors(camera.up,up);
   controls._quatInverse.copy(controls._quat).invert();
  }
 }
 function projected(spec,distance,aspect=camera.aspect){
  const k=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/camera.zoom;
  let offsetX=0,offsetY=0,left,right,bottom,top;
  // A world-space box centre is not the centre of its perspective silhouette.
  // Translate only the viewpoint plane so crown/feet share the same baseline.
  for(let pass=0;pass<5;pass++){
   left=bottom=Infinity;right=top=-Infinity;let l,r,b,t;
   for(const p of spec.points){
    const depth=distance-p.z,x=(p.x-offsetX)/depth,y=(p.y-offsetY)/depth;
    if(x<left){left=x;l=p;}if(x>right){right=x;r=p;}
    if(y<bottom){bottom=y;b=p;}if(y>top){top=y;t=p;}
   }
   if(pass===4||Math.max(Math.abs(left+right),Math.abs(top+bottom))<1e-9)break;
   const ld=distance-l.z,rd=distance-r.z,bd=distance-b.z,td=distance-t.z;
   offsetX=(l.x*rd+r.x*ld)/(ld+rd);offsetY=(b.y*td+t.y*bd)/(bd+td);
  }
  left/=k*aspect;right/=k*aspect;bottom/=k;top/=k;
  return {width:right-left,height:top-bottom,left,right,bottom,top,offsetX,offsetY};
 }
 function distanceFor(spec,r,matchOverview=true){
  const width=r.width*(spec.part?(spec.part.width??(spec.part.all ? .78 : .83)):.76);
  const sharedHeight=matchOverview?(spec.part?comparisonHeights.get(spec.index):overviewHeight):null;
  const height=Math.min(spec.part?r.height*(spec.part.height??.86):Math.min(r.height*.82,innerHeight*.42),sharedHeight>0?sharedHeight:Infinity);
  let near=.05;for(const p of spec.points)near=Math.max(near,p.z+.05);let far=50;
  for(let i=0;i<22;i++){
   const d=(near+far)/2,b=projected(spec,d,r.width/r.height);
   if(b.width*r.width/2<=width&&b.height*r.height/2<=height&&Math.max(Math.abs(b.left),Math.abs(b.right),Math.abs(b.top),Math.abs(b.bottom))<=.94)far=d;else near=d;
  }
  return far;
 }
 function goalFor(spec,distance){
  const b=projected(spec,distance),target=spec.target.clone().addScaledVector(spec.right,b.offsetX).addScaledVector(spec.vertical,b.offsetY);
  return {position:target.clone().addScaledVector(spec.direction,distance),target};
 }
 function publish(r){
  controls.minDistance=Math.max(.08,fitted*.22);controls.maxDistance=fitted*3.2;
  const b=projected(current,fitted);
  element.dataset.framing=current.part?String(current.index+1).padStart(2,'0'):'overview';
  element.dataset.fitDistance=fitted.toFixed(4);
  element.dataset.framedPixels=[b.width*r.width/2,b.height*r.height/2].map(n=>n.toFixed(1)).join(',');
  element.dataset.focusTarget=goalFor(current,fitted).target.toArray().map(n=>n.toFixed(4)).join(',');
 }
 function bind(model){
  model.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(model,true);
  model.traverse(mesh=>{
   const attr=mesh.isMesh&&mesh.geometry?.attributes.position;if(!attr)return;
   const step=Math.max(1,Math.floor(attr.count/8000));
   for(let i=0;i<attr.count;i+=step)all.push(new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld));
  });
  overview=view(null);current=Number.isInteger(pending)?view(pending):overview;fitted=0;
  useViewUp(current);
  element.dataset.rigidLevelQuaternion=model.quaternion.toArray().map(n=>n.toFixed(8)).join(',');
 }
 function resize(r,goal){
  lastRect=r;if(!current)return;const next=distanceFor(current,r);
  if(!fitted){const initial=goalFor(current,next);controls.target.copy(initial.target);camera.position.copy(initial.position);}
  else if(Math.abs(next-fitted)>.00001){
   // Resize the destination rather than jumping the displayed camera. Reusing
   // that destination through the layout transition preserves any user zoom.
   const ratio=next/fitted;
   const shift=goalFor(current,next).target.sub(goalFor(current,fitted).target);
   if(!goal)goal={position:camera.position.clone(),target:controls.target.clone()};
   goal.position.sub(goal.target).multiplyScalar(ratio);goal.target.add(shift);goal.position.add(goal.target);
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
  if(!Number.isFinite(height)||height<=0)return false;
  overviewLimit??={height,viewportHeight:innerHeight};
  height=Math.min(height,overviewLimit.height*innerHeight/overviewLimit.viewportHeight);
  if(overviewHeight!==null&&Math.abs(overviewHeight-height)<.1)return false;
  overviewHeight=height;element.dataset.overviewHeight=height.toFixed(1);return true;
 }
 function naturalFramingHeight(){
  if(!current||!lastRect)return null;
  const distance=distanceFor(current,lastRect,false);
  return projected(current,distance,lastRect.width/lastRect.height).height*lastRect.height/2;
 }
 function setFramingHeight(height){
  if(!current?.part)return setOverviewHeight(height);
  if(!Number.isFinite(height)||height<=0||Math.abs((comparisonHeights.get(current.index)||0)-height)<.1)return false;
  comparisonHeights.set(current.index,height);return true;
 }
 function focus(index){
  // A preset is an explicit new viewpoint. OrbitControls keeps drag inertia
  // after pointer-up; letting it run during this transition would move the
  // two cameras by different amounts after the same numbered selection.
  controls._sphericalDelta?.set(0,0,0);
  controls._panOffset?.set(0,0,0);
  if('_scale' in controls)controls._scale=1;
  if('_performCursorZoom' in controls)controls._performCursorZoom=false;
  pending=index;if(!bounds)return null;current=view(index);useViewUp(current);
  const r=lastRect??element.getBoundingClientRect();fitted=distanceFor(current,r);publish(r);
  return goalFor(current,fitted);
 }
 function reference(index,width,height){
  if(!bounds)return null;
  const spec=view(index),referenceCamera=new THREE.PerspectiveCamera(camera.fov,width/height,camera.near,camera.far);
  referenceCamera.zoom=camera.zoom;referenceCamera.updateProjectionMatrix();
  referenceCamera.up.copy(spec.up);
  const goal=goalFor(spec,distanceFor(spec,{width,height}));referenceCamera.position.copy(goal.position);
  referenceCamera.lookAt(goal.target);referenceCamera.updateMatrixWorld(true);
  return referenceCamera;
 }
 return {bind,resize,focus,reference,naturalOverviewHeight,setOverviewHeight,naturalFramingHeight,setFramingHeight};
}
