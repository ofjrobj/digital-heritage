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
const runtime=fs.readFileSync(root+'assets/blender-spatial-view.js','utf8');const startFn=runtime.indexOf('function applyTransferRaw'),endFn=runtime.indexOf('\nif(pendingTransfer)',startFn);
const applyTransfer=new Function('THREE','camera','easeMotion',runtime.slice(startFn,endFn)+';return applyTransfer')(T,camera,easeMotion);
const narrativeRoutes=JSON.parse(fs.readFileSync(root+'assets/blender-routes-v048.json'));
const sampleRoute=new Function('THREE','camera','routes','cv','easeMotion',runtime.slice(runtime.indexOf('function sampleRoute('),runtime.indexOf('let pendingTransfer='))+';return sampleRoute')(T,camera,narrativeRoutes,v=>new T.Vector3(v[0],v[2],-v[1]),easeMotion);
const report=[], cameraTracks=[];
for(const r of routes){
const from=r.from;
if(from<0){camera.position.set(12,2,44);camera.lookAt(20,2,32);}else sampleRoute(from,150);
const start=camera.position.clone(),startRotation=camera.quaternion.clone(),startFocus=start.clone().add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(3));
if(from===4){camera.position.copy(positions[5]);camera.lookAt(heroes[5]);}else sampleRoute(from+1,150);
const end=camera.position.clone(),endRotation=camera.quaternion.clone(),endFocus=end.clone().add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(from===4?7:3));

const curve=new T.CatmullRomCurve3(r.points.map(([x,z])=>new T.Vector3(x,0,z)),false,'centripetal');let heights=curve.getSpacedPoints(1200).map(p=>groundAt(p)+1.75),raw=heights.slice();for(let pass=0;pass<5;pass++){const c=heights.slice();for(let i=2;i<1199;i++)heights[i]=(c[i-2]+c[i-1]+c[i]*2+c[i+1]+c[i+2])/6;}heights=heights.map((h,i)=>Math.max(h,raw[i]-.2));const pace=[0];let last=curve.getTangentAt(0);for(let i=1;i<=1200;i++){const d=curve.getTangentAt(i/1200);pace.push(pace.at(-1)+1+last.angleTo(d)*35);last=d;}const total=pace.at(-1);for(let i=0;i<pace.length;i++)pace[i]/=total;const data={from,start,end,startRotation,endRotation,startFocus,endFocus,curve,heights,pace};

const samples=[];const seconds=from<0?50:from===4?100:90;
for(let f=0;f<=seconds*24;f+=3){applyTransfer(data,f/(seconds*24));const target=camera.position.clone().add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(8));samples.push({frame:f+1,position:[camera.position.x,-camera.position.z,camera.position.y],target:[target.x,-target.z,target.y]});}
cameraTracks.push({from,seconds,samples});

const bad=[];for(let step=10;step<=90;step+=.5){applyTransfer(data,step/100);camera.updateMatrixWorld(true);let hits=0;const names={};for(let y=0;y<12;y++)for(let x=0;x<21;x++){ray.setFromCamera(new T.Vector2((x+.5)/21*2-1,(y+.5)/12*2-1),camera);let best=Infinity,name='';for(const b of buildings){const hit=ray.ray.intersectBox(b.box,new T.Vector3());if(hit){const distance=hit.distanceTo(camera.position);if(distance<best){best=distance;name=b.name;}}}if(best<12){hits++;names[name]=(names[name]||0)+1;}}
if(hits/252>1/3&&camera.position.distanceTo(start)>4&&camera.position.distanceTo(end)>4)bad.push({p:step/100,position:camera.position.toArray(),coverage:Math.round(hits/252*100),name:Object.entries(names).sort((a,b)=>b[1]-a[1])[0]?.[0]});}
let maxStep=0,previous;for(let step=0;step<=1000;step++){applyTransfer(data,step/1000);if(previous)maxStep=Math.max(maxStep,previous.angleTo(camera.quaternion)*180/Math.PI);previous=camera.quaternion.clone();}
const terrainBlocked=[];for(const p of [.1,.2,.3,.4,.5,.6,.7,.8,.9]){applyTransfer(data,p);camera.updateMatrixWorld(true);let hits=0;for(let y=0;y<5;y++)for(let x=0;x<10;x++){ray.setFromCamera(new T.Vector2((x+.5)/10*2-1,(y+.5)/5),camera);const hit=ray.intersectObjects(floors,false)[0];if(hit&&hit.distance<14)hits++;}if(hits/50>1/3&&camera.position.distanceTo(start)>4&&camera.position.distanceTo(end)>4)terrainBlocked.push({progress:p,position:camera.position.toArray(),upperHalfCoverage:hits/50});}
report.push({from,bad,terrainBlocked,maxRotationStepDegrees:maxStep});console.log(JSON.stringify(report.at(-1)));}
fs.writeFileSync('/tmp/camera-visibility.json',JSON.stringify(report,null,2));

fs.writeFileSync('/tmp/gongju-camera-tracks.json',JSON.stringify(cameraTracks));
