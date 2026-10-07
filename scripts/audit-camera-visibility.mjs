import fs from 'node:fs';import * as T from '../versions/blender-v048/assets/vendor/three.module.js';
import {extendVillage,tourGates} from '../versions/blender-v048/assets/test-village-layout.js';
import {tourCurve,transferObstacles} from '../versions/blender-v048/assets/camera-transfer.js';
const root=new URL('../versions/blender-v048/',import.meta.url).pathname;
const b=fs.readFileSync(root+'assets/blender-village-v046.glb'),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
const binOffset=28+b.readUInt32LE(12);
function attribute(id){const a=j.accessors[id],v=j.bufferViews[a.bufferView],count={SCALAR:1,VEC3:3}[a.type],bytes={5126:4,5125:4,5123:2,5121:1}[a.componentType],read={5126:'readFloatLE',5125:'readUInt32LE',5123:'readUInt16LE',5121:'readUInt8'}[a.componentType],values=[];for(let i=0;i<a.count;i++)for(let k=0;k<count;k++)values.push(b[read](binOffset+(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??count*bytes)+k*bytes));return values;}
const objs=j.nodes.map(n=>{let o;if(n.mesh!==undefined){const box=new T.Box3();for(const p of j.meshes[n.mesh].primitives){const a=j.accessors[p.attributes.POSITION];box.union(new T.Box3(new T.Vector3(...a.min),new T.Vector3(...a.max)));}let geo=new T.BoxGeometry();if(/continuous.ridges|courtyard|connecting.lane|Main.village.street|approach.stairs/.test(n.name)){const primitive=j.meshes[n.mesh].primitives[0];geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(attribute(primitive.attributes.POSITION),3));if(primitive.indices!==undefined)geo.setIndex(attribute(primitive.indices));}geo.boundingBox=box;o=new T.Mesh(geo,new T.MeshBasicMaterial());}else o=new T.Object3D();o.name=n.name??'';if(n.matrix)o.matrix.fromArray(n.matrix).decompose(o.position,o.quaternion,o.scale);else{o.position.fromArray(n.translation??[0,0,0]);o.quaternion.fromArray(n.rotation??[0,0,0,1]);o.scale.fromArray(n.scale??[1,1,1]);}return o;});j.nodes.forEach((n,i)=>(n.children??[]).forEach(c=>objs[i].add(objs[c])));const scene=new T.Group();for(const i of j.scenes[j.scene??0].nodes)scene.add(objs[i]);scene.updateMatrixWorld(true);extendVillage(scene,T);
const positions=[[21.3004,3.5968,21.4486],[30,4.52,-33.9012],[-27,5.52,-25.5514],[-19.879,2.52,36.189],[65.3004,15.3199,-48.9012],[-18.8,2.7,-9.3]].map(p=>new T.Vector3(...p));
const floors=[];scene.traverse(o=>{if(o.isMesh&&/continuous.ridges|courtyard|connecting.lane|Main.village.street|approach.stairs|Extension ground/.test(o.name))floors.push(o);});const ray=new T.Raycaster();const groundAt=p=>{ray.set(new T.Vector3(p.x,80,p.z),new T.Vector3(0,-1,0));return ray.intersectObjects(floors,false)[0]?.point.y??0;};

const easeMotion=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x));};
const camera=new T.PerspectiveCamera(35,16/9,.05,1000);
const heroes=[[22,3.1568,19],[30,4.08,-36],[-27,5.08,-28],[-22.15,2.08,34],[66,14.8799,-51],[-22.275,.62,-15.5]].map(p=>new T.Vector3(...p));
const buildings=[];scene.traverse(o=>{if(o.isMesh&&/wall|paper.door|roof/i.test(o.name)&&!/Compound|passage/i.test(o.name))buildings.push({box:new T.Box3().setFromObject(o),name:o.name});});
const routes=JSON.parse(fs.readFileSync(root+'downloads/space-atlas/camera-tour-65.json'));
const report=[];
for(const r of routes){
const from=r.from,start=from<0?new T.Vector3(12,2,44):positions[from],end=positions[from+1];camera.position.copy(start);camera.lookAt(from<0?new T.Vector3(20,2,32):heroes[from]);const startRotation=camera.quaternion.clone(),startFocus=start.clone().add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(3));camera.position.copy(end);camera.lookAt(heroes[from+1]);const endRotation=camera.quaternion.clone(),endFocus=end.clone().add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(from===4?7:3));
const curve=new T.CatmullRomCurve3(r.points.map(([x,z])=>new T.Vector3(x,0,z)),false,'centripetal');let heights=curve.getSpacedPoints(1200).map(p=>groundAt(p)+1.75),raw=heights.slice();for(let pass=0;pass<5;pass++){const c=heights.slice();for(let i=2;i<1199;i++)heights[i]=(c[i-2]+c[i-1]+c[i]*2+c[i+1]+c[i+2])/6;}heights=heights.map((h,i)=>Math.max(h,raw[i]-.2));const pace=[0];let last=curve.getTangentAt(0);for(let i=1;i<=1200;i++){const d=curve.getTangentAt(i/1200);pace.push(pace.at(-1)+1+last.angleTo(d)*35);last=d;}const total=pace.at(-1);for(let i=0;i<pace.length;i++)pace[i]/=total;const data={from,start,end,startRotation,endRotation,startFocus,endFocus,curve,heights,pace};

const bad=[];for(let step=10;step<=90;step+=.5){applyTransfer(data,step/100);camera.updateMatrixWorld(true);let hits=0;const names={};for(let y=0;y<12;y++)for(let x=0;x<21;x++){ray.setFromCamera(new T.Vector2((x+.5)/21*2-1,(y+.5)/12*2-1),camera);let best=Infinity,name='';for(const b of buildings){const hit=ray.ray.intersectBox(b.box,new T.Vector3());if(hit){const distance=hit.distanceTo(camera.position);if(distance<best){best=distance;name=b.name;}}}if(best<12){hits++;names[name]=(names[name]||0)+1;}}
if(hits/252>1/3)bad.push({p:step/100,position:camera.position.toArray(),coverage:Math.round(hits/252*100),name:Object.entries(names).sort((a,b)=>b[1]-a[1])[0]?.[0]});}
report.push({from,bad});console.log(JSON.stringify(report.at(-1)));}
fs.writeFileSync('/tmp/camera-visibility.json',JSON.stringify(report,null,2));
function applyTransfer(data,progress){
 const clock=easeMotion(progress);let lo=0,hi=1200;while(lo+1<hi){const m=(lo+hi)>>1;if(data.pace[m]<clock)lo=m;else hi=m;}const u=(lo+(clock-data.pace[lo])/(data.pace[hi]-data.pace[lo]))/1200,point=data.curve.getPointAt(u);camera.position.copy(point);
 const sample=u*1200,i=Math.min(1199,Math.floor(sample));camera.position.y=T.MathUtils.lerp(data.heights[i],data.heights[i+1],sample-i);
 camera.position.y=T.MathUtils.lerp(data.start.y,camera.position.y,easeMotion(progress/.14));camera.position.y=T.MathUtils.lerp(camera.position.y,data.end.y,easeMotion((progress-.86)/.14));
 const ahead=data.curve.getPointAt(Math.min(1,u+Math.min(data.from===2?.045:.025,(data.from===2?8:5)/data.curve.getLength())));ahead.y=camera.position.y;
 const aim=new T.PerspectiveCamera();aim.position.copy(camera.position);if(ahead.distanceTo(camera.position)>.001)aim.lookAt(ahead);else aim.quaternion.copy(data.endRotation);
 const forward=aim.quaternion.clone();aim.lookAt(data.startFocus);camera.quaternion.copy(aim.quaternion).slerp(forward,easeMotion(data.from===1?(progress-.02)/.10:(progress-.2)/.2));
 // Leave the residents by turning through the open southern lane, not across their house front.
 if(data.from===3&&progress<.4){const a=data.startFocus.clone().sub(camera.position),b=ahead.clone().sub(camera.position);const first=Math.atan2(a.x,a.z);let delta=Math.atan2(b.x,b.z)-first;while(delta<0)delta+=Math.PI*2;while(delta>Math.PI*2)delta-=Math.PI*2;const blend=easeMotion((progress-.2)/.08),heading=first+delta*blend;camera.lookAt(camera.position.clone().add(new T.Vector3(Math.sin(heading),a.y/Math.max(1,Math.hypot(a.x,a.z))*(1-blend),Math.cos(heading))));}
 aim.lookAt(data.endFocus);camera.quaternion.slerp(aim.quaternion,easeMotion((progress-.78)/.22));
}
