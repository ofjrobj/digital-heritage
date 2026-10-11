import {prepareEndingDaylight} from './ending-daylight.js?v=71-43';
import {prepareSummerChildren} from './summer-children.js?v=71-43';
let summerWalk=null;
function animateSummerChildren(t){summerWalk?.update(t);}
import {syncCinemaFrame,FILM_ASPECT} from './cinema-frame.js?v=71-43';
import {sampleResident,footPose,clamp,smooth} from './resident-walking.js?v=71-43';
import {cumulativeDistances,distanceFrame} from './travel-distance.js?v=71-43';

import {scenicClearance} from './scenic-clearance.js?v=71-43';
import {addVillageLife} from './village-life.js?v=71-43';
import {extendVillage} from './test-village-layout.js?v=71-43';
const cameraTest=document.body.dataset.cameraTest==='village';
const authoredTour=cameraTest?await fetch('./downloads/space-atlas/camera-tour-65.json?v=71-43').then(r=>r.json()):null;
import {prepareTimelapse} from './ending-timelapse.js?v=71-43';
import {bytes,json as loadJSON} from './asset-transport.js?v=71-43';
import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js?v=71-43';
// Geometry and every route sample originate in the saved Blender files.
const host=document.createElement('div');host.id='blenderSpatialView';host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2;display:none';document.body.append(host);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.localClippingEnabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;host.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#b6bcb5');scene.fog=new THREE.Fog('#b6bcb5',90,230);const skyLight=new THREE.HemisphereLight(0xf5f1df,0x64715b,1.1);scene.add(skyLight);const sun=new THREE.DirectionalLight(0xfff1dc,1.65);sun.position.set(-30,70,30);scene.add(sun);
const camera=new THREE.PerspectiveCamera(35,1,.05,900),loader=new GLTFLoader();const endingWalkers=[],endingGround=[],passageTrees=[];let endingCat;
const floorRay=new THREE.Raycaster();
function floorHeight(x,z){floorRay.set(new THREE.Vector3(x,60,z),new THREE.Vector3(0,-1,0));return floorRay.intersectObjects(endingGround,false).find(hit=>hit.object.visible&&(Array.isArray(hit.object.material)?hit.object.material:[hit.object.material]).every(m=>(m.clippingPlanes??[]).every(plane=>plane.distanceToPoint(hit.point)>=0)))?.point.y??0;}let village,ending,route=0,time=0,mode='route',lastEvent=null;
const [bakedCamera,bakedPaths]=await Promise.all(['camera-precomputed.json','paths-precomputed.json'].map(n=>fetch('./assets/'+n).then(r=>{if(!r.ok)throw Error(n);return r.json();})));
const nativeCamera=await fetch('./assets/camera-v058.json?v=71-43').then(r=>r.json());
const mountainEntry=await fetch('./assets/mountain-entry.json?v=71-43').then(r=>r.json());
const routes=await fetch('./assets/blender-routes-v048.json?v=71-43').then(r=>r.json());
const css=document.createElement('style');css.textContent=`body[data-stage=terrain] #terrain,body[data-stage=terrain] .terrain-stage{background:transparent!important}body[data-stage=terrain] #terrain svg,#villageCanvas,#episodeFilm,#villageInkBackdrop,#terrainTransitionFilm{display:none!important}body[data-stage=village] #village,body[data-stage=overview] #village,body[data-stage=memory] #memory{background:transparent!important;z-index:3}body[data-stage=terrain] #terrain{z-index:3}body[data-stage=village] .episode-panel{left:3vw!important;right:auto!important;top:auto!important;bottom:7vh!important;width:28vw!important;max-width:350px!important;max-height:55vh;overflow:auto;box-sizing:border-box;padding:20px!important}body[data-stage=village] .episode-panel h2{font-size:21px!important}body[data-stage=village] .episode-panel p{font-size:15px!important;line-height:1.8!important}body[data-stage=memory] #endingFilm,body[data-stage=memory] #endingPlay,body[data-stage=memory] #restartStory{display:none!important}#spatialClosing{position:fixed;inset:0;background:#090c09;color:#d4d8c9;z-index:12;display:none;align-items:center;justify-content:center;text-align:center;font-family:'Gowun Batang',serif}#spatialClosing p{line-height:2;font-size:clamp(20px,3vw,34px)}#spatialClosing a{display:inline-block;color:inherit;border-bottom:1px solid #8e9b87;padding:12px;text-decoration:none;font-size:16px}@media(max-width:700px){body[data-stage=village] .episode-panel{left:5vw!important;bottom:5vh!important;width:90vw!important;max-width:none!important;max-height:25vh!important;padding:12px!important}body[data-stage=village] .episode-panel h2{font-size:16px!important}body[data-stage=village] .episode-panel p{font-size:12px!important;margin:6px 0!important}}`;document.head.append(css);
const closing=document.createElement('div');closing.id='spatialClosing';closing.innerHTML='<div><p>사람은 지나가고, 풍경은 달라져도<br>돌에 새겨진 시간은 남아 있습니다.</p><a href="./chapters.html">서책에서 이야기를 이어 읽기 →</a></div>';document.body.append(closing);
const cv=v=>new THREE.Vector3(v[0],v[2],-v[1]);
function size(){const frame=syncCinemaFrame();renderer.setSize(frame.width,frame.height);camera.aspect=frame.width/frame.height;camera.updateProjectionMatrix();host.dataset.cameraAspect=String(camera.aspect);render();}window.addEventListener('resize',size);
// Soft depth haze plus a feathered veil, confined to transitions.
const mist=document.createElement('div');mist.id='transitionMist';mist.setAttribute('aria-hidden','true');mist.style.cssText='position:absolute;inset:-10%;pointer-events:none;opacity:0;background:radial-gradient(ellipse at 18% 62%,rgba(222,226,213,.66),transparent 66%),radial-gradient(ellipse at 84% 35%,rgba(222,226,213,.48),transparent 72%);filter:blur(28px)';host.append(mist);
function transitionHaze(strength,phase){const q=THREE.MathUtils.clamp(strength,0,1);mist.style.opacity=String(q*.62);mist.style.transform=`translateX(${Math.sin(phase*.12)*2}%)`;scene.fog.near=90-60*q;scene.fog.far=230-100*q;}
let stageClearance=null,clearanceStrength=0;
let renderPending=false,displayCamera=null,displayKey='',displayTime=0;
function render(){if(renderPending)return;renderPending=true;requestAnimationFrame(now=>{
 renderPending=false;
 if(host.style.display==='none'||document.hidden||document.body.classList.contains('archive-active')||document.body.classList.contains('higgsfield-active'))return;
 if(stageClearance)stageClearance(camera,clearanceStrength);
 const shot=document.body.dataset.storyShot,key=shot+':'+route;
 const smooth=['travel','transfer'].includes(shot);
 const dt=Math.min(.05,Math.max(.001,(now-displayTime)/1000));displayTime=now;
 if(!displayCamera)displayCamera=camera.clone();
 const p=displayCamera.position.clone(),q=displayCamera.quaternion.clone();displayCamera.copy(camera);
 if(smooth&&key===displayKey){const blend=1-Math.exp(-dt/0.16);displayCamera.position.copy(p).lerp(camera.position,blend);displayCamera.quaternion.copy(q).slerp(camera.quaternion,blend);}
 displayKey=key;renderer.render(scene,displayCamera);
 if(smooth&&(displayCamera.position.distanceTo(camera.position)>.002||displayCamera.quaternion.angleTo(camera.quaternion)>.0005))render();
});}
const easeMotion=v=>{v=THREE.MathUtils.clamp(v,0,1);return v*v*v*(10+v*(-15+6*v));};
// Keep dialogue on its arrival axis; retreat opens distance on that same axis.
function sampleRoute(index,seconds){{nativePose(index,seconds/150,seconds>=150);return;}const storySeconds=seconds;seconds=seconds>150?150:150*easeMotion(seconds/150);const r=routes[index],samples=r.samples,frame=seconds*24+1;let lo=0,hi=samples.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(samples[mid].frame<=frame)lo=mid;else hi=mid;}const i=Math.min(samples.length-2,lo);const a=samples[i],b=samples[i+1],t=THREE.MathUtils.clamp((frame-a.frame)/(b.frame-a.frame),0,1);camera.position.copy(cv(a.position).lerp(cv(b.position),t));const target=cv(a.target).lerp(cv(b.target),t);
 const smooth=v=>{v=THREE.MathUtils.clamp(v,0,1);return v*v*v*(10+v*(-15+6*v));};
 const close=smooth((seconds-115)/35)*(1-smooth((seconds-174)/24));
 if(close>0){
  const upper=target.clone().add(new THREE.Vector3(0,.32,0));
  const offset=camera.position.clone().sub(target);offset.y=0;
  offset.multiplyScalar(index===3?.72:.53);offset.y=.12;
  camera.position.lerp(upper.clone().add(offset),close);
  target.lerp(upper,close);
  const right=new THREE.Vector3().crossVectors(target.clone().sub(camera.position).normalize(),new THREE.Vector3(0,1,0));
  target.addScaledVector(right,-.32*close);
 }
 if(storySeconds>174){const retreat=easeMotion((storySeconds-174)/30);const axis=camera.position.clone().sub(target);axis.y=0;axis.normalize();camera.position.addScaledVector(axis,retreat*24);camera.position.y+=retreat*10;}
 camera.lookAt(target);}
let pendingTransfer=null;document.addEventListener('blender-transfer-frame',e=>{pendingTransfer=e.detail;});
function resetReferenceCanopy(){endingDaylight.reset();if(!village)return;village.traverse(o=>{if(o.userData.reference_ending_foliage){o.visible=true;if(o.userData.canopyBaseScale)o.scale.copy(o.userData.canopyBaseScale);if(o.isMesh)o.material.color.set('#527261');}});}
function update(detail){resetReferenceCanopy();summerWalk?.hide();if(animateTimelapse)animateTimelapse(70);placePair(70);clearanceStrength=0;pendingTransfer=null;lastEvent=detail;if(!village)return;route=detail.index??route;time=detail.time??time;mode='route';for(const person of endingWalkers)person.visible=false;if(endingCat)endingCat.visible=false;for(const tree of passageTrees)tree.visible=false;scene.background.set('#b6bcb5');sun.color.set(0xfff1dc);sun.position.set(-30,70,30);sun.intensity=1.65;host.style.filter='none';village.visible=true;if(ending)ending.visible=false;host.style.display='block';host.style.opacity=String(detail.opacity??1);sampleRoute(route,time);if(false&&detail.dialogue&&!cameraTest){const forward=new THREE.Vector3();camera.getWorldDirection(forward);const distance=[.75,.35,.75,.45,.35][route]??.5;camera.position.addScaledVector(forward,distance);camera.position.y+=route===1?.25:route===4?.12:0;if(route===3)camera.position.add(new THREE.Vector3(.55,0,0).applyQuaternion(camera.quaternion));camera.updateMatrixWorld(true);}transitionHaze(cameraTest&&route===0?0:(1-THREE.MathUtils.smoothstep(time,0,22))*.75+THREE.MathUtils.smoothstep(time,192,204)*.45,time);host.dataset.route=String(route);host.dataset.time=time.toFixed(3);closing.style.display='none';render();}
document.addEventListener('blender-route-frame',e=>update(e.detail));
document.addEventListener('prototype-episode',e=>{if(e.detail.active&&!document.body.classList.contains('cinema-running'))update({index:e.detail.index,time:150+Math.min(1,e.detail.progress/2.5)*24});});
document.addEventListener('story-home',()=>{host.style.display='none';closing.style.display='none';});
// Compressed transport preserves the original geometry and halves cold-download size.
let gltf;
const compressed=await bytes('./assets/blender-village-v067.glb.gz');
const buffer='DecompressionStream' in window
 ? await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
 : (await import('./vendor/fflate.js')).gunzipSync(new Uint8Array(compressed)).buffer;
gltf=await loader.parseAsync(buffer,'./assets/');
village=gltf.scene;
// FBX reference materials use opacity layers and tangent normals that sort poorly after glTF conversion.
// Keep the colour texture and modelled straw detail; render structural roof surfaces opaque.
village.traverse(root=>{if(root.userData.heritage_reference)root.traverse(o=>{if(!o.isMesh)return;const clean=m=>new THREE.MeshStandardMaterial({map:m.map,color:m.color.clone(),roughness:.9,metalness:0,side:THREE.DoubleSide});o.material=Array.isArray(o.material)?o.material.map(clean):clean(o.material);});});
scene.add(village);if(cameraTest){village.traverse(o=>{if(/Forecourt|Entry.ridge/.test(o.name))o.visible=false;});}size();
if(false&&nativeCamera.hillsideTrail){const trail=nativeCamera.hillsideTrail,geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(trail.vertices.flatMap(v=>[v[0],v[2],-v[1]]),3));geo.setIndex(trail.faces.flatMap(f=>[f[0],f[1],f[2],f[0],f[2],f[3]]));geo.computeVertexNormals();const path=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xb8ad8b,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1}));path.name='v053 hillside footpath';village.add(path);}
const architecture=await fetch('./assets/people-v060.json?v=71-43').then(r=>r.json());
const canonical=n=>n.replace(/[_ .]+/g,'').trim();
stageClearance=null;
// Formation animation and closing camera are authored in the v043 Blender file.
const approachLions=[];
const pairTracks=await fetch('./assets/ending-pair.json?v=71-43').then(r=>r.json());const closingPair=pairTracks.map(track=>{let o;village.traverse(a=>{if(canonical(a.name)===canonical(track.name))o=a;});return {o,track};}).filter(x=>x.o);
// Keep the original scan proportions; calibrate world height to the supplied approximate measurements.
for(const {o,track} of closingPair){delete o.userData.v069_full_scale;o.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(o);o.scale.multiplyScalar(track.targetHeight/bounds.getSize(new THREE.Vector3()).y);}
approachLions.push(...closingPair.map(x=>x.o));
function placePair(){for(const {o,track} of closingPair){o.position.copy(cv(track.start));const q=track.q;o.quaternion.set(q[1],q[3],-q[2],q[0]);}}
let endingBridge=null,endingPath=null;
summerWalk=prepareSummerChildren(village,THREE,await fetch('./assets/summer-children-paths.json?v=71-43').then(r=>r.json()));
for(const part of await fetch('./assets/modern-volume.json?v=71-43').then(r=>r.json())){
 if(village.getObjectByName(part.name.replaceAll(' ','_'))||village.getObjectByName(part.name))continue;
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(part.size[0],part.size[2],part.size[1]),new THREE.MeshStandardMaterial({color:part.color,roughness:.9}));
 mesh.name=part.name;mesh.position.copy(cv(part.p));mesh.userData={present_era:true,construction_rank:part.rank};mesh.visible=false;village.add(mesh);
}
const endingFixedPosition=new THREE.Vector3(-18.8,1.4,-9.3),endingFixedTarget=new THREE.Vector3(-22.275,.85,-15.5);
const endingDaylight=prepareEndingDaylight(scene,camera,sun,skyLight,THREE);
let animateTimelapse;
let endingLoad,endingMixer,endingCamera,endingDuration=144,endingProgress=0;
async function loadEnding(){if(endingLoad)return endingLoad;endingLoad=(async()=>{
 village.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});
 animateTimelapse=prepareTimelapse(village,THREE);animateTimelapse(70);document.body.dataset.endingReady='true';
})();return endingLoad;}
async function showEnding(p){
 mode='ending';pendingTransfer=null;lastEvent=null;village.visible=true;if(ending)ending.visible=false;
 nativePose(5,1,false);host.style.display='block';host.style.opacity='1';
 const f=Math.max(70,Math.min(144,p*144));if(animateTimelapse)animateTimelapse(f);else prepareEnding();document.body.dataset.timePassage=f.toFixed(2);placePair(f);
 const t=(f-70)/74*72;
 let canopyIndex=0;
 village.traverse(o=>{if(o.userData.reference_ending_foliage&&o.isMesh){
  const spring=THREE.MathUtils.smoothstep(t,1,4)*(1-THREE.MathUtils.smoothstep(t,7,9));
  const autumn=THREE.MathUtils.smoothstep(t,21,25)*(1-THREE.MathUtils.smoothstep(t,43,48));
  const bare=THREE.MathUtils.smoothstep(t,26,34)*(1-THREE.MathUtils.smoothstep(t,43,49));
  o.visible=bare<.98;o.material.color.set('#477b43').lerp(new THREE.Color('#e4b5c4'),spring*.85).lerp(new THREE.Color(canopyIndex++%3?'#d18b29':'#b74c28'),autumn);
  o.userData.canopyBaseScale??=o.scale.clone();o.scale.copy(o.userData.canopyBaseScale).multiplyScalar((1-bare*.94)*(1-spring*.12));
 }});
 animateSummerChildren(t);

 camera.position.copy(cv(nativeCamera.tracks[5].at(-1).p));
 const closeFocus=cv([-15.85,9.8,1.67]);const push=THREE.MathUtils.smoothstep(t,0,4);
 const closePosition=cv([-11.97,3.865,2.32]);camera.position.lerp(closePosition,push);
 const gaze=cv(nativeCamera.endingFraming.target).lerp(closeFocus,push);camera.lookAt(gaze);
 if(camera.aspect<1.2){const focus=cv(nativeCamera.endingFraming.target);camera.position.sub(focus).multiplyScalar(Math.min(2.2,1.2/camera.aspect)).add(focus);}
 const winter=THREE.MathUtils.smoothstep(t,34,37)*(1-THREE.MathUtils.smoothstep(t,42,45));
 const night=THREE.MathUtils.smoothstep(t,28,30)*(1-THREE.MathUtils.smoothstep(t,33,35));
 const rain=THREE.MathUtils.smoothstep(t,12,14)*(1-THREE.MathUtils.smoothstep(t,17,19));
 sun.position.set(Math.sin(t*.15)*65,45,Math.cos(t*.15)*50);sun.intensity=(1.9-rain*.9)*(1-night*.96);
 sun.color.set(0xfff1dc).lerp(new THREE.Color(0xd7e5ff),Math.max(winter,rain));
 scene.background.set('#b6bcb5').lerp(new THREE.Color('#5b6876'),rain*.65).lerp(new THREE.Color('#142139'),night).lerp(new THREE.Color('#ccd5d8'),winter);
 host.style.filter=night?'brightness('+String(1-night*.70)+')':'none';
 endingDaylight.update(t);if(t>=42)host.style.filter='none';
 document.body.dataset.season=t<3?'stillness':t<8?'spring':t<13?'summer':t<18?'rain':t<23?'sunshine':t<29?'autumn':t<34?'night':t<43?'winter':'museum';
 transitionHaze(0,f);scene.fog.near=14;scene.fog.far=60;closing.style.display='none';render();
}
document.addEventListener('blender-ending-frame',e=>showEnding(e.detail));

// Blender-authored background loops. Narrative heroes deliberately have no ambient_kind.
const ambient=[];village.traverse(o=>{if(o.userData.ambient_kind){o.userData.neutralPosition=o.position.clone();o.userData.neutralQuaternion=o.quaternion.clone();ambient.push(o);}});
const narrativeActors=[];village.traverse(o=>{if(Number.isInteger(o.userData.narrative_index)){narrativeActors.push({o,base:o.quaternion.clone(),index:o.userData.narrative_index,yaw:o.userData.work_yaw??0,facing:o.userData.dialogue_yaw??0});}});
const gestures=[];for(const spec of architecture.people){let person;village.traverse(o=>{if(canonical(o.name)===canonical(spec.name))person=o;});if(person&&!['authored','walking'].includes(person.userData.ambient_kind)&&!Number.isInteger(person.userData.narrative_index)){gestures.push({person,spec,base:person.quaternion.clone()});}}
const residentMotion=await fetch('./assets/resident-motion.json?v=71-43').then(r=>r.json());
const authoredJoints=residentMotion.map(track=>{let joint;village.traverse(o=>{if(canonical(o.name)===canonical(track.name))joint=o;});return {joint,track};}).filter(x=>x.joint);
const quietMotion=matchMedia('(prefers-reduced-motion: reduce)');let ambientElapsed=0,ambientLast=0;
const walkingData=await fetch('./assets/walking-residents.json?v=71-43').then(r=>r.json());
const byName=new Map();village.traverse(o=>byName.set(canonical(o.name),o));
const walkers=walkingData.map(d=>({d,o:byName.get(canonical(d.name)),legs:d.legs.map(group=>group.map(n=>byName.get(canonical(n)))),arms:d.arms.map(n=>byName.get(canonical(n))),body:byName.get(canonical(d.body)),head:byName.get(canonical(d.head)),distance:0,velocity:0,side:0,sideIndex:0,previous:null,gaitDistance:0})).filter(w=>w.o);
for(const w of walkers){w.o.position.copy(cv(w.d.samples[0].p));for(const leg of w.legs)if(leg[0])leg[0].position.y=.72;if(w.body)w.body.position.y=.73;}
const upAxis=new THREE.Vector3(0,1,0),jointAxis=new THREE.Vector3(1,0,0),camForward=new THREE.Vector3(),camRight=new THREE.Vector3();
const protectedPeople=narrativeActors.map(a=>a.o);
function advanceWalkers(t,dt){
 camera.getWorldDirection(camForward);camForward.y=0;camForward.normalize();camRight.crossVectors(camForward,upAxis).normalize();
 const offsets=[-2.15,-1.65,-1.05,-.55,.55,1.05,1.65,2.15];
 const atOffset=(sample,offset)=>{
  const p=cv(sample.p);if(Math.abs(offset)<.005)return p;
  const index=offsets.findIndex(v=>Math.abs(v-offset)<.01);
  if(index>=0)return sample.sides[index]?.safe?cv(sample.sides[index].p):null;
  const candidates=offsets.map((v,k)=>({v,k})).filter(a=>Math.sign(a.v)===Math.sign(offset)&&Math.abs(a.v)>=Math.abs(offset));
  for(const {v,k} of candidates.sort((a,b)=>Math.abs(a.v)-Math.abs(b.v)))if(sample.sides[k]?.safe)return p.lerp(cv(sample.sides[k].p),offset/v);
  return null;
 };
 const personClear=(q,w,radius=.8)=>!walkers.some(n=>n!==w&&Math.abs(q.y-n.o.position.y)<1.5&&Math.hypot(q.x-n.o.position.x,q.z-n.o.position.z)<radius);
 const heroClear=q=>!protectedPeople.some(h=>Math.abs(q.y-h.position.y)<2.3&&Math.hypot(q.x-h.position.x,q.z-h.position.z)<2.1);
 for(const w of walkers){
  const {d,o,legs,arms,body,head}=w;w.offset??=0;w.targetOffset??=0;
  let sample=sampleResident(d,w.distance),pos=cv(sample.p),delta=pos.clone().sub(camera.position),ahead=delta.dot(camForward),across=delta.dot(camRight);
  const lensYield=ahead>-1.5&&ahead<11&&Math.abs(across)<1.55&&Math.abs(delta.y)<3;
  const remaining=d.length-w.distance;
  const candidates=[0,...offsets].map(offset=>{
   let clear=true,gap=Infinity;
   for(const a of [0,.45,.9,1.5,2.1]){
    const q=atOffset(sampleResident(d,Math.min(d.length,w.distance+a)),offset);
    if(!q||!heroClear(q)||!personClear(q,w)){clear=false;break;}
   }
   const q=atOffset(sample,offset);if(!q)return null;
   // The sideways approach must also remain outside every neighbour's body.
   for(const f of [.25,.5,.75,1])if(!personClear(o.position.clone().lerp(q,f),w,.7))clear=false;
   let score=Math.abs(offset)+Math.abs(offset-w.targetOffset)*.4+(offset>0?.2:0);
   if(lensYield)score=-Math.abs(q.clone().sub(camera.position).dot(camRight))+Math.abs(offset-w.targetOffset)*.1;
   return {offset,clear,score};
  }).filter(Boolean).filter(c=>c.clear).sort((a,b)=>a.score-b.score);
  const plan=candidates[0];if(plan)w.targetOffset=plan.offset;
  const oldDistance=w.distance,oldOffset=w.offset;
  w.offset+=Math.max(-dt*.75,Math.min(dt*.75,w.targetOffset-w.offset));
  const aside=Math.abs(w.offset-w.targetOffset)>.08;
  const canAdvance=!!plan&&!lensYield&&!aside&&t>=d.start;
  const target=canAdvance?d.speed*Math.min(1,remaining/1.2):0;
  w.velocity+=Math.max(-dt*1.6,Math.min(dt*1.2,target-w.velocity));
  w.distance=Math.min(d.length,w.distance+w.velocity*dt);
  sample=sampleResident(d,w.distance);pos=atOffset(sample,w.offset);
  if(!pos){w.distance=oldDistance;w.offset=oldOffset;w.velocity=0;sample=sampleResident(d,w.distance);pos=atOffset(sample,w.offset)||o.position.clone();}
  if(w.previous){const step=pos.clone().sub(w.previous),limit=1.3*dt;if(step.length()>limit)pos.copy(w.previous).addScaledVector(step,limit/step.length());}
  if(w.previous&&walkers.some(n=>n!==w&&Math.abs(pos.y-n.o.position.y)<1.5&&Math.hypot(pos.x-n.o.position.x,pos.z-n.o.position.z)<.65&&pos.distanceToSquared(n.o.position)<w.previous.distanceToSquared(n.o.position))){w.distance=oldDistance;w.offset=oldOffset;w.velocity=0;pos.copy(w.previous);}
  const displacement=w.previous?pos.clone().sub(w.previous):new THREE.Vector3(),travel=displacement.length();w.gaitDistance+=travel/d.height;w.previous=pos.clone();o.position.copy(pos);w.side=Math.abs(w.offset)/2.15;
  const stepYaw=travel>.002?Math.atan2(displacement.x,displacement.z):sample.yaw;
  o.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(upAxis,stepYaw),1-Math.exp(-dt*4));
  const moving=Math.min(1,travel/Math.max(.001,dt*d.speed));
  for(let k=0;k<2;k++){const angles=footPose(w.gaitDistance,1,k,moving);legs[k].forEach((joint,j)=>{if(joint)joint.quaternion.setFromAxisAngle(jointAxis,angles[j]);});}
  const swing=Math.sin(w.gaitDistance/.88*Math.PI*2)*.19*moving;arms.forEach((arm,k)=>{if(arm)arm.quaternion.setFromAxisAngle(jointAxis,swing*(k?1:-1));});
  if(body)body.rotation.z=.013*Math.sin(w.gaitDistance/.88*Math.PI*2)*moving;
  if(head)head.rotation.y=lensYield?Math.max(-.25,Math.min(.25,across*.12)):0;
  o.userData.walkState=t<d.start?'waiting to depart':remaining<.03?'arrived':lensYield?'yielding to camera':!canAdvance?'giving way':Math.abs(w.offset)>.1?'passing':'walking';
 }
}
const qaMode=new URLSearchParams(location.search).has('qa');
let qaOutput=null,qaLast=0;
if(qaMode){qaOutput=document.createElement('pre');qaOutput.id='residentDiagnostics';qaOutput.style.cssText='position:fixed;top:8px;left:8px;z-index:100;background:#fffffff0;color:#223329;padding:10px;font:11px monospace;max-height:32vh;overflow:auto;pointer-events:none';document.body.append(qaOutput);}
let activeSpeaker=-1,walkingAccumulator=0,walkingClock=0;
document.addEventListener('village-camera-position',e=>{activeSpeaker=e.detail.dialogue?e.detail.route:-1;});
function livingFrame(now){requestAnimationFrame(livingFrame);const dt=ambientLast?Math.min(.15,(now-ambientLast)/1000):0;ambientLast=now;if(document.hidden||document.body.classList.contains('higgsfield-active')||host.style.display==='none'||mode!=='route'||quietMotion.matches)return;ambientElapsed+=dt;
 walkingAccumulator+=dt;while(walkingAccumulator>=1/30){walkingClock+=1/30;advanceWalkers(walkingClock,1/30);walkingAccumulator-=1/30;}
 if(qaOutput&&ambientElapsed-qaLast>.5){qaLast=ambientElapsed;qaOutput.textContent='RESIDENT CHECK '+ambientElapsed.toFixed(1)+'s\n'+walkers.map(w=>w.d.name.match(/resident (\d+)/)?.[1]+' '+w.o.userData.walkState+' distance='+w.distance.toFixed(1)+' side='+w.side.toFixed(2)+' position='+w.o.position.toArray().map(v=>v.toFixed(1)).join(',')).join('\n');}
 for(const {joint,track} of authoredJoints){if(track.hero!==undefined&&track.hero===activeSpeaker){joint.quaternion.identity();continue;}const u=(ambientElapsed%track.period)/track.period*(track.q.length-1),i=Math.floor(u),a=track.q[i],b=track.q[i+1];joint.quaternion.set(a[1],a[2],a[3],a[0]).slerp(new THREE.Quaternion(b[1],b[2],b[3],b[0]),u-i);}
 for(const {o,index,yaw,facing} of narrativeActors){const target=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),index===activeSpeaker?facing:yaw);o.quaternion.slerp(target,1-Math.exp(-dt*5));}
 for(const {person,spec,base} of gestures){person.quaternion.copy(base);person.rotateY(spec.amplitude*Math.sin(ambientElapsed/spec.period*Math.PI*2+spec.phase));}
 for(const o of ambient){if(o.userData.ambient_kind==='authored'||o.userData.ambient_kind==='walking'||gestures.some(g=>g.person===o))continue;const d=o.userData,a=2*Math.PI*ambientElapsed/d.ambient_period+d.ambient_phase,p=d.neutralPosition;o.position.copy(p);o.quaternion.copy(d.neutralQuaternion);
  if(d.ambient_kind==='child'){o.position.x+=d.ambient_amplitude*(Math.sin(a)-Math.sin(d.ambient_phase));o.position.y+=.025*(1-Math.cos(a*8));o.rotateY(.12*Math.sin(a));}
  else if(d.ambient_kind==='cat')o.rotateY(.12*Math.sin(a));
  else if(d.ambient_kind==='butterfly'){o.position.x+=.18*Math.sin(a);o.position.y+=.10*Math.cos(a*2);for(const part of o.children)if(part.name.includes('wing'))part.rotation.z=.4*Math.sin(ambientElapsed*9);}
  else{o.rotateY(.025*Math.sin(a));o.position.y+=.006*Math.sin(a*2);}
 }
 render();}
requestAnimationFrame(livingFrame);

const fixedDialogue=document.createElement('style');fixedDialogue.textContent=`body[data-stage=village] #episode.episode-panel{left:28px!important;right:auto!important;top:auto!important;bottom:48px!important;width:350px!important;min-width:350px!important;max-width:350px!important;height:278px!important;min-height:278px!important;max-height:278px!important;padding:24px!important;overflow:hidden!important;transform:none!important;box-sizing:border-box!important}body[data-stage=village] #episode h2{font-size:21px!important;line-height:1.5!important;letter-spacing:0!important;word-break:keep-all!important;margin:8px 0 22px!important}body[data-stage=village] #episode p{font-size:15px!important;line-height:1.8!important;letter-spacing:0!important;word-break:keep-all!important;margin:0!important}body[data-stage=village] #episode small{font-size:12px!important}`;document.head.append(fixedDialogue);

// Shared ending: approach the fixed pair, then 60 seconds of changing background.
let endStart=0;document.addEventListener('story-ending-autoplay',()=>{if(document.body.classList.contains('cinema-running'))return;endStart=performance.now();requestAnimationFrame(endingTick);});
function endingTick(now){if(document.body.classList.contains('cinema-running')){endStart=0;return;}if(!endStart||document.body.dataset.stage!=='memory')return;const t=(now-endStart)/1000;const source=t<195?t/195*70:t<198?70:70+Math.min(1,(t-198)/60)*74;showEnding(source/144);closing.style.display=t>=258?'flex':'none';closing.querySelector('a').style.visibility=t>=264?'visible':'hidden';if(t<264)requestAnimationFrame(endingTick);else endStart=0;}
closing.style.background='#000';closing.querySelector('a').textContent='서책 보기';
document.addEventListener('cinema-closing',e=>{closing.style.display=e.detail.visible?'flex':'none';closing.querySelector('a').style.visibility=e.detail.book?'visible':'hidden';});

// Only the separate camera-test page emits these inter-person connections.
const transferCache=new Map();
const transferGround=[];village.traverse(o=>{if(o.isMesh&&/continuous.ridges|courtyard|connecting.lane|Main.village.street|approach.stairs|Extension ground/.test(o.name))transferGround.push(o);});
if(false&&authoredTour){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(bakedPaths.positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(bakedPaths.colors,3));geometry.computeVertexNormals();const paths=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));paths.name='Bare terrain connecting paths';village.add(paths);}
function groundAt(x,z){floorRay.set(new THREE.Vector3(x,80,z),new THREE.Vector3(0,-1,0));return floorRay.intersectObjects(transferGround,false)[0]?.point.y??0;}
function buildTransfer(from,to){
 const key=from+':'+to;if(transferCache.has(key))return transferCache.get(key);
 if(from<0){camera.position.set(12,2,44);camera.lookAt(20,2,32);}else sampleRoute(from,150);const start=camera.position.clone(),startRotation=camera.quaternion.clone(),startFocus=camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3));
 if(to===5){camera.position.copy(endingFixedPosition);camera.lookAt(endingFixedTarget);}else sampleRoute(to,150);
 const end=camera.position.clone(),endRotation=camera.quaternion.clone(),endFocus=camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(to===5?7:3));
 const routeData=authoredTour.find(r=>r.from===from);const curve=new THREE.CatmullRomCurve3(routeData.points.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');

 const baked=bakedCamera.find(r=>r.from===from);const {heights,pace,viewPace}=baked;const rotations=baked.rotations.map(q=>new THREE.Quaternion().fromArray(q));
 const data={from,start,end,startRotation,endRotation,startFocus,endFocus,curve,heights,pace,rotations,viewPace};transferCache.set(key,data);return data;
}
document.addEventListener('blender-transfer-frame',e=>{
 const {from,to,progress}=e.detail;if(!village)return;
 const data=cameraTest?{from}:buildTransfer(from,to);
 entryVignette.style.display='none';
 mode='route';resetReferenceCanopy();summerWalk?.hide();if(animateTimelapse)animateTimelapse(70);village.visible=true;if(ending)ending.visible=false;for(const person of endingWalkers)person.visible=false;if(endingCat)endingCat.visible=false;for(const tree of passageTrees)tree.visible=false;closing.style.display='none';host.style.display='block';host.style.opacity='1';
 // Reveal the forecourt only on the last approach, never between the five speakers.
 village.traverse(o=>{if(/Forecourt|Entry.ridge/.test(o.name))o.visible=false;});
 clearanceStrength=easeMotion(progress/.08)*(1-easeMotion((progress-.92)/.08));
 applyTransfer(data,progress);
 transitionHaze(0,0);if(to===5){scene.fog.near=THREE.MathUtils.lerp(90,14,progress);scene.fog.far=THREE.MathUtils.lerp(230,60,progress);}render();
});

function applyTransferRaw(data,progress){
 const clock=THREE.MathUtils.clamp(easeMotion(progress),0,1);let lo=0,hi=1200;while(lo+1<hi){const m=(lo+hi)>>1;if(data.pace[m]<clock)lo=m;else hi=m;}const u=(lo+(clock-data.pace[lo])/(data.pace[hi]-data.pace[lo]))/1200,point=data.curve.getPointAt(u);camera.position.copy(point);
 const sample=u*1200,i=Math.min(1199,Math.floor(sample));camera.position.y=THREE.MathUtils.lerp(data.heights[i],data.heights[i+1],sample-i);
 camera.position.y=THREE.MathUtils.lerp(data.start.y,camera.position.y,easeMotion(progress/.14));camera.position.y=THREE.MathUtils.lerp(camera.position.y,data.end.y,easeMotion((progress-.86)/.14));
 // Follow the open route immediately; never keep looking back through the terrain at a departed speaker.
 const aheadU=Math.min(1,u+Math.min(.07,11/data.curve.getLength())),ahead=data.curve.getPointAt(aheadU);ahead.y=data.heights[Math.min(1200,Math.round(aheadU*1200))];
 const aim=new THREE.PerspectiveCamera();aim.position.copy(camera.position);
 if(ahead.distanceTo(camera.position)>.001)aim.lookAt(ahead);else aim.quaternion.copy(data.endRotation);
 camera.quaternion.copy(data.startRotation).slerp(aim.quaternion,easeMotion(progress/.18));

 camera.quaternion.slerp(data.endRotation,easeMotion((progress-.80)/.20));

}

function applyTransfer(data,progress){{nativePose(data.from+1,progress,false);return;}
 if(!data.rotations){
  const rotations=[];for(let i=0;i<=1000;i++){applyTransferRaw(data,i/1000);rotations.push(camera.quaternion.clone());}
  // A symmetric orientation filter is deterministic when scrubbing and removes fast waypoint yaw changes.
  for(let pass=0;pass<3;pass++){
   const source=rotations.map(q=>q.clone());
   for(let i=1;i<1000;i++){const center=source[i],sum=new THREE.Vector4(0,0,0,0);let weight=0;
    for(let j=Math.max(0,i-16);j<=Math.min(1000,i+16);j++){const w=17-Math.abs(i-j),q=source[j],sign=center.dot(q)<0?-1:1;sum.add(new THREE.Vector4(q.x,q.y,q.z,q.w).multiplyScalar(w*sign));weight+=w;}
    rotations[i].set(sum.x/weight,sum.y/weight,sum.z/weight,sum.w/weight).normalize();
   }
  }
  data.rotations=rotations;
  const viewPace=[0];for(let i=1;i<=1000;i++)viewPace.push(viewPace[i-1]+1+rotations[i-1].angleTo(rotations[i])*200);
  const total=viewPace[1000];data.viewPace=viewPace.map(v=>v/total);
 }
 const clock=THREE.MathUtils.clamp(easeMotion(progress),0,1);let lo=0,hi=1000;while(lo+1<hi){const mid=(lo+hi)>>1;if(data.viewPace[mid]<clock)lo=mid;else hi=mid;}
 const mapped=THREE.MathUtils.clamp((lo+(clock-data.viewPace[lo])/(data.viewPace[hi]-data.viewPace[lo]))/1000,0,1);
 applyTransferRaw(data,mapped);
 const p=THREE.MathUtils.clamp(mapped,0,1)*1000,i=Math.min(999,Math.floor(p));camera.quaternion.copy(data.rotations[i]).slerp(data.rotations[i+1],p-i);
}

if(pendingTransfer)document.dispatchEvent(new CustomEvent('blender-transfer-frame',{detail:pendingTransfer}));else if(lastEvent)update(lastEvent);

let endingFailed=false;
function prepareEnding(){if(endingFailed)return;loadEnding().catch(error=>{endingLoad=null;endingFailed=true;console.error(error);const status=document.querySelector('#villageLoadStatus');status.hidden=false;status.textContent='마지막 장면을 불러오지 못했습니다. ';const retry=document.createElement('button');retry.textContent='다시 불러오기';retry.onclick=()=>{endingFailed=false;status.hidden=true;prepareEnding();};status.append(retry);});}
// Load the existing authored time-passage assets before the final approach.
document.body.dataset.endingReady='false';document.addEventListener('ending-preload',prepareEnding);prepareEnding();

// Full-page prologue: the village is first read as a landscape, then joins the tested route.
document.addEventListener('blender-establishing-frame',e=>{
 if(!village||document.body.dataset.fullStory!=='true')return;
 const data=buildTransfer(-1,0),u=easeMotion(e.detail.progress);
 const origin=new THREE.Vector3(80,62,104),look=new THREE.Vector3(0,1,0);
 camera.position.copy(origin).lerp(data.start,u);const aim=new THREE.PerspectiveCamera();aim.position.copy(origin);aim.lookAt(look);
 camera.quaternion.copy(aim.quaternion).slerp(data.startRotation,u);host.style.display='block';host.style.opacity='1';render();
});

// One continuous village camera trajectory across reveal, entry and the first speaker.
const routeDistances=nativeCamera.tracks.map(cumulativeDistances);
const nativeRotations=nativeCamera.tracks.map(track=>track.map(a=>new THREE.Quaternion(a.q[1],a.q[2],a.q[3],a.q[0])));
function nativePose(index,progress,dialogue=false){
 if(mode!=='ending'&&animateTimelapse)animateTimelapse(70);
 for(const lion of approachLions)lion.visible=index===5;
 const list=nativeCamera.tracks[index],u=distanceFrame(routeDistances[index],progress),i=Math.min(list.length-2,Math.floor(u)),t=u-i;
 const a=dialogue?nativeCamera.dialogues[index]:list[i],b=dialogue?a:list[i+1];
 camera.position.copy(cv(a.p).lerp(cv(b.p),t));
 const q1=dialogue?new THREE.Quaternion(a.q[1],a.q[2],a.q[3],a.q[0]):nativeRotations[index][i].clone(),q2=dialogue?q1:nativeRotations[index][i+1];
 const conversion=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
 camera.quaternion.copy(conversion).multiply(q1.slerp(q2,t));

 camera.fov=Math.min(44,2*Math.atan(Math.tan(24*Math.PI/180)/camera.aspect)*180/Math.PI);camera.updateProjectionMatrix();
 if(dialogue&&(innerHeight<=500||camera.aspect>1.85)&&camera.aspect>1.3){
  const distance=camera.position.distanceTo(cv(a.target));
  camera.position.addScaledVector(camera.getWorldDirection(new THREE.Vector3()),-distance*Math.min(.5,Math.max(.3,.25+(camera.aspect-1.5)*.3)));
 }
 // Portrait composition preserves the authored horizontal field around the speaker.
 // Retreat along the optical axis instead of widening the lens and stretching faces.
 if(dialogue&&camera.aspect<1.2){
  const focus=cv(a.target),distance=camera.position.distanceTo(focus);
  const portraitScale=Math.min(index===3?2.2:1.5,1.2/camera.aspect);
  camera.position.add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(-distance*(portraitScale-1)));
 }
 // Keep an eye-level dialogue lens while framing the eyes above the caption panel.
 if(dialogue){camera.projectionMatrix.elements[9]=innerHeight<=500?-.38:-.30;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();}
 document.dispatchEvent(new CustomEvent('village-camera-position',{detail:{x:camera.position.x,route:index,dialogue}}));
}
// A distant, mountain-framed approach ends at the exact road-camera pose.
const entryVignette=document.createElement('div');entryVignette.style.cssText='position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 48%,transparent 36%,#f6f5ef 76%);display:none';host.append(entryVignette);
const entryLandscape=new THREE.Group();entryLandscape.name='Mountain entry framing';scene.add(entryLandscape);
const surround=new THREE.Mesh(new THREE.CircleGeometry(440,64),new THREE.MeshStandardMaterial({color:0xb7b7a0,roughness:1}));surround.rotation.x=-Math.PI/2;surround.position.y=-3.1;entryLandscape.add(surround);
const entryMountains=[
 {x:-157,z:124,rx:63,rz:65,h:52,color:0x7d8d82,seed:.3},
 {x:25,z:136,rx:60,rz:65,h:38,color:0x8d9b8e,seed:1.4},
 {x:-138,z:216,rx:65,rz:46,h:32,color:0x829083,seed:2.2},
 {x:160,z:60,rx:48,rz:76,h:34,color:0x9aa698,seed:3.1}
];
for(const m of entryMountains){
 const geo=new THREE.PlaneGeometry(m.rx*2,m.rz*2,38,34);geo.rotateX(-Math.PI/2);
 const pos=geo.attributes.position;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i)/m.rx,z=pos.getZ(i)/m.rz,r=Math.min(1,Math.hypot(x,z));const envelope=Math.pow(Math.max(0,1-r*r),1.65);const detail=1+.16*Math.sin(x*5.7+m.seed)*Math.cos(z*4.8)+.065*Math.sin(x*13+z*7+m.seed);pos.setY(i,m.h*envelope*detail-3);}
 geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:m.color,roughness:1}));mesh.position.set(m.x,0,m.z);entryLandscape.add(mesh);
}
function resetEntryAtmosphere(){entryVignette.style.display='none';entryLandscape.visible=false;scene.fog.near=90;scene.fog.far=230;}
document.addEventListener('blender-entry-frame',e=>{
 if(!village)return;const p=THREE.MathUtils.clamp(e.detail.progress,0,1),u=easeMotion(p);
 entryVignette.style.display='none';
 mode='route';resetReferenceCanopy();summerWalk?.hide();if(animateTimelapse)animateTimelapse(70);placePair(70);clearanceStrength=0;entryLandscape.visible=true;village.visible=true;if(ending)ending.visible=false;
 const frame=p*(mountainEntry.frames.length-1),i=Math.min(mountainEntry.frames.length-2,Math.floor(frame)),f=frame-i,a=mountainEntry.frames[i],b=mountainEntry.frames[i+1];camera.position.fromArray(a.position).lerp(new THREE.Vector3(...b.position),f);camera.lookAt(new THREE.Vector3(...a.target).lerp(new THREE.Vector3(...b.target),f));camera.fov=Math.min(44,2*Math.atan(Math.tan(24*Math.PI/180)/camera.aspect)*180/Math.PI);camera.updateProjectionMatrix();
 // Project the actual mountain silhouettes into the illustration overlay.
 camera.updateMatrixWorld(true);
 if(p<.43){
  const contours=entryLandscape.children.filter(o=>o!==surround).map(o=>{
   o.updateMatrixWorld(true);const bins=Array.from({length:65},()=>900),pos=o.geometry.attributes.position;
   for(let j=0;j<pos.count;j++){const v=new THREE.Vector3().fromBufferAttribute(pos,j).applyMatrix4(o.matrixWorld).project(camera);if(v.z>1||v.z< -1)continue;const x=(v.x+1)*800,y=(1-v.y)*450,k=Math.round(x/25);if(k>=0&&k<65)bins[k]=Math.min(bins[k],y);}
   const valid=bins.map((y,k)=>({x:k*25,y})).filter(a=>a.y<900);if(valid.length<2)return null;
   return Array.from({length:33},(_,j)=>{const x=valid[0].x+(valid.at(-1).x-valid[0].x)*j/32,k=Math.min(63,Math.max(0,Math.floor(x/25))),f=x/25-k;return [x,bins[k]*(1-f)+bins[k+1]*f];});
  });document.dispatchEvent(new CustomEvent('entry-ridge-contours',{detail:contours}));
 }
 const clear=THREE.MathUtils.smoothstep(p,.12,.85);scene.fog.near=THREE.MathUtils.lerp(145,145,clear);scene.fog.far=THREE.MathUtils.lerp(510,440,clear);
 host.style.display='block';host.style.opacity='1';transitionHaze((1-clear)*.10,p*12);scene.fog.near=145;scene.fog.far=THREE.MathUtils.lerp(510,440,clear);render();
});
document.addEventListener('blender-route-frame',resetEntryAtmosphere);
document.addEventListener('blender-transfer-frame',()=>{entryVignette.style.display='none';entryLandscape.visible=false;});
document.addEventListener('blender-ending-frame',()=>{entryVignette.style.display='none';entryLandscape.visible=false;});
// Stone lions are revealed only in the ending, after the five village encounters.
document.body.dataset.spatialReady='true';document.dispatchEvent(new CustomEvent('spatial-ready'));
document.addEventListener('archive-open',()=>{host.style.display='none';});

window.addEventListener('resize',()=>{if(mode==='route'&&lastEvent){sampleRoute(route,time);render();}else if(mode==='ending')showEnding(Number(document.body.dataset.timePassage||70)/144);});
