
import {scenicClearance} from './scenic-clearance.js?v=89';
import {addVillageLife} from './village-life.js?v=69';
import {extendVillage} from './test-village-layout.js?v=66';
const cameraTest=document.body.dataset.cameraTest==='village';
const authoredTour=cameraTest?await fetch('./downloads/space-atlas/camera-tour-65.json?v=85').then(r=>r.json()):null;
import {prepareTimelapse} from './ending-timelapse.js?v=66';
import {bytes,json as loadJSON} from './asset-transport.js';
import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
// Geometry and every route sample originate in the saved Blender files.
const host=document.createElement('div');host.id='blenderSpatialView';host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2;display:none';document.body.append(host);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.localClippingEnabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;host.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#b6bcb5');scene.fog=new THREE.Fog('#b6bcb5',90,230);scene.add(new THREE.HemisphereLight(0xf5f1df,0x64715b,1.1));const sun=new THREE.DirectionalLight(0xfff1dc,2.3);sun.position.set(-30,70,30);scene.add(sun);
const camera=new THREE.PerspectiveCamera(35,1,.05,900),loader=new GLTFLoader();const endingWalkers=[],endingGround=[],passageTrees=[];let endingCat;
const floorRay=new THREE.Raycaster();
function floorHeight(x,z){floorRay.set(new THREE.Vector3(x,60,z),new THREE.Vector3(0,-1,0));return floorRay.intersectObjects(endingGround,false).find(hit=>hit.object.visible&&(Array.isArray(hit.object.material)?hit.object.material:[hit.object.material]).every(m=>(m.clippingPlanes??[]).every(plane=>plane.distanceToPoint(hit.point)>=0)))?.point.y??0;}let village,ending,route=0,time=0,mode='route',lastEvent=null;
const [bakedCamera,bakedPaths]=await Promise.all(['camera-precomputed.json','paths-precomputed.json'].map(n=>fetch('./assets/'+n).then(r=>{if(!r.ok)throw Error(n);return r.json();})));
const nativeCamera=await fetch('./assets/camera-v053.json').then(r=>r.json());
const routes=await fetch('./assets/blender-routes-v048.json').then(r=>r.json());
const css=document.createElement('style');css.textContent=`body[data-stage=terrain] #terrain,body[data-stage=terrain] .terrain-stage{background:transparent!important}body[data-stage=terrain] #terrain svg,#villageCanvas,#episodeFilm,#villageInkBackdrop,#terrainTransitionFilm{display:none!important}body[data-stage=village] #village,body[data-stage=overview] #village,body[data-stage=memory] #memory{background:transparent!important;z-index:3}body[data-stage=terrain] #terrain{z-index:3}body[data-stage=village] .episode-panel{left:3vw!important;right:auto!important;top:auto!important;bottom:7vh!important;width:28vw!important;max-width:350px!important;max-height:55vh;overflow:auto;box-sizing:border-box;padding:20px!important}body[data-stage=village] .episode-panel h2{font-size:21px!important}body[data-stage=village] .episode-panel p{font-size:15px!important;line-height:1.8!important}body[data-stage=memory] #endingFilm,body[data-stage=memory] #endingPlay,body[data-stage=memory] #restartStory{display:none!important}#spatialClosing{position:fixed;inset:0;background:#090c09;color:#d4d8c9;z-index:12;display:none;align-items:center;justify-content:center;text-align:center;font-family:'Gowun Batang',serif}#spatialClosing p{line-height:2;font-size:clamp(20px,3vw,34px)}#spatialClosing a{display:inline-block;color:inherit;border-bottom:1px solid #8e9b87;padding:12px;text-decoration:none;font-size:16px}@media(max-width:700px){body[data-stage=village] .episode-panel{left:5vw!important;bottom:5vh!important;width:90vw!important;max-width:none!important;max-height:25vh!important;padding:12px!important}body[data-stage=village] .episode-panel h2{font-size:16px!important}body[data-stage=village] .episode-panel p{font-size:12px!important;margin:6px 0!important}}`;document.head.append(css);
const closing=document.createElement('div');closing.id='spatialClosing';closing.innerHTML='<div><p>사람은 지나가고, 풍경은 달라져도<br>돌에 새겨진 시간은 남아 있습니다.</p><a href="./chapters.html">서책에서 이야기를 이어 읽기 →</a></div>';document.body.append(closing);
const cv=v=>new THREE.Vector3(v[0],v[2],-v[1]);
function size(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<700?52:35;camera.updateProjectionMatrix();render();}window.addEventListener('resize',size);
// Soft depth haze plus a feathered veil, confined to transitions.
const mist=document.createElement('div');mist.id='transitionMist';mist.setAttribute('aria-hidden','true');mist.style.cssText='position:absolute;inset:-10%;pointer-events:none;opacity:0;background:radial-gradient(ellipse at 18% 62%,rgba(222,226,213,.66),transparent 66%),radial-gradient(ellipse at 84% 35%,rgba(222,226,213,.48),transparent 72%);filter:blur(28px)';host.append(mist);
function transitionHaze(strength,phase){const q=THREE.MathUtils.clamp(strength,0,1);mist.style.opacity=String(q*.62);mist.style.transform=`translateX(${Math.sin(phase*.12)*2}%)`;scene.fog.near=90-60*q;scene.fog.far=230-100*q;}
let stageClearance=null,clearanceStrength=0;
let renderPending=false;function render(){if(renderPending)return;renderPending=true;requestAnimationFrame(()=>{renderPending=false;if(host.style.display!=='none'&&!document.hidden&&!document.body.classList.contains('archive-active')&&!document.body.classList.contains('higgsfield-active')){if(stageClearance)stageClearance(camera,clearanceStrength);renderer.render(scene,camera);}});}
const easeMotion=v=>{v=THREE.MathUtils.clamp(v,0,1);return v*v*v*(10+v*(-15+6*v));};
// Keep dialogue on its arrival axis; retreat opens distance on that same axis.
function sampleRoute(index,seconds){if(cameraTest){nativePose(index,seconds/150,seconds>=150);return;}const storySeconds=seconds;seconds=seconds>150?150:150*easeMotion(seconds/150);const r=routes[index],samples=r.samples,frame=seconds*24+1;let lo=0,hi=samples.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(samples[mid].frame<=frame)lo=mid;else hi=mid;}const i=Math.min(samples.length-2,lo);const a=samples[i],b=samples[i+1],t=THREE.MathUtils.clamp((frame-a.frame)/(b.frame-a.frame),0,1);camera.position.copy(cv(a.position).lerp(cv(b.position),t));const target=cv(a.target).lerp(cv(b.target),t);
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
function update(detail){clearanceStrength=0;pendingTransfer=null;lastEvent=detail;if(!village)return;route=detail.index??route;time=detail.time??time;mode='route';for(const person of endingWalkers)person.visible=false;if(endingCat)endingCat.visible=false;for(const tree of passageTrees)tree.visible=false;scene.background.set('#b6bcb5');sun.color.set(0xfff1dc);host.style.filter='none';village.visible=true;if(ending)ending.visible=false;host.style.display='block';host.style.opacity=String(detail.opacity??1);if(cameraTest&&time<150){applyTransfer(buildTransfer(-1,0),time/150);}else sampleRoute(route,time);if(detail.dialogue&&!cameraTest){const forward=new THREE.Vector3();camera.getWorldDirection(forward);const distance=[.75,.35,.75,.45,.35][route]??.5;camera.position.addScaledVector(forward,distance);camera.position.y+=route===1?.25:route===4?.12:0;if(route===3)camera.position.add(new THREE.Vector3(.55,0,0).applyQuaternion(camera.quaternion));camera.updateMatrixWorld(true);}transitionHaze((1-THREE.MathUtils.smoothstep(time,0,22))*.75+THREE.MathUtils.smoothstep(time,192,204)*.45,time);host.dataset.route=String(route);host.dataset.time=time.toFixed(3);closing.style.display='none';render();}
document.addEventListener('blender-route-frame',e=>update(e.detail));
document.addEventListener('prototype-episode',e=>{if(e.detail.active&&!document.body.classList.contains('cinema-running'))update({index:e.detail.index,time:150+Math.min(1,e.detail.progress/2.5)*24});});
document.addEventListener('story-home',()=>{host.style.display='none';closing.style.display='none';});
// Compressed transport preserves the original geometry and halves cold-download size.
let gltf;
if('DecompressionStream' in window){
 const response=await fetch('./assets/blender-village-v046.glb.gz',{signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error('마을 다운로드 실패: '+response.status);
 const buffer=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 gltf=await loader.parseAsync(buffer,'./assets/');
}else gltf=await loader.loadAsync('./assets/blender-village-v046.glb?v=46');
village=gltf.scene;scene.add(village);if(cameraTest){extendVillage(village,THREE);addVillageLife(village,THREE,authoredTour);village.traverse(o=>{if(/Original.unchanged|Forecourt/.test(o.name))o.visible=false;});}size();
if(nativeCamera.hillsideTrail){const trail=nativeCamera.hillsideTrail,geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(trail.vertices.flatMap(v=>[v[0],v[2],-v[1]]),3));geo.setIndex(trail.faces.flatMap(f=>[f[0],f[1],f[2],f[0],f[2],f[3]]));geo.computeVertexNormals();const path=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xb8ad8b,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1}));path.name='v053 hillside footpath';village.add(path);}
stageClearance=scenicClearance(village,THREE);
// Formation animation and closing camera are authored in the v043 Blender file.
let endingBridge=null,endingPath=null;
const endingFixedPosition=new THREE.Vector3(-18.8,2.7,-9.3),endingFixedTarget=new THREE.Vector3(-22.275,.62,-15.5);
let animateTimelapse;
let endingLoad,endingMixer,endingCamera,endingDuration=144,endingProgress=0;
async function loadEnding(){if(endingLoad)return endingLoad;endingLoad=(async()=>{const g=await bytes('./assets/blender-ending-v046.glb').then(b=>loader.parseAsync(b,'./assets/'));ending=g.scene;scene.add(ending);if(cameraTest){extendVillage(ending,THREE);addVillageLife(ending,THREE,authoredTour);}
 ending.traverse(o=>{if(o.isMesh){if(/continuous ridges|Forecourt sand|courtyard|connecting lane|Main village street|approach stairs/.test(o.name.replaceAll('_',' '))&&!o.name.startsWith('Present'))endingGround.push(o);o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}});
 animateTimelapse=prepareTimelapse(ending,THREE);
 const people=[];village.traverse(o=>{if(o.userData.ambient_kind==='resident')people.push(o);});
 for(let k=0;k<3&&people.length;k++){const person=people[k%people.length].clone(true);person.name='Ending passer '+k;person.userData={};scene.add(person);people[k%people.length].updateWorldMatrix(true,false);people[k%people.length].matrixWorld.decompose(person.position,person.quaternion,person.scale);person.position.set(-34,1,-20-k*2);person.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(person);person.position.y-=box.min.y;person.userData.footOffset=person.position.y;person.visible=false;endingWalkers.push(person);}
ending.visible=false;endingMixer=new THREE.AnimationMixer(ending);for(const clip of g.animations){endingDuration=Math.max(endingDuration,clip.duration);const action=endingMixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();}let catSource;village.traverse(o=>{if(!catSource&&o.userData.ambient_kind==='cat')catSource=o;});if(catSource){endingCat=catSource.clone(true);scene.add(endingCat);catSource.updateWorldMatrix(true,false);catSource.matrixWorld.decompose(endingCat.position,endingCat.quaternion,endingCat.scale);endingCat.position.set(-13,0,-18);endingCat.updateMatrixWorld(true);endingCat.position.y-=new THREE.Box3().setFromObject(endingCat).min.y;endingCat.userData.footOffset=endingCat.position.y;endingCat.visible=false;}
for(const [px,pz] of [[-14.5,-11],[-9,-10]]){const tree=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.17,.25,3.2,7),new THREE.MeshStandardMaterial({color:0x615037}));trunk.position.y=1.6;tree.add(trunk);for(let k=0;k<3;k++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:0x334735}));crown.position.set((k%2?1:-1)*.35,2.5+k*.7,0);crown.scale.set(1.45-k*.18,.48,1.1-k*.12);tree.add(crown);}tree.position.set(px,0,pz);tree.visible=false;scene.add(tree);passageTrees.push(tree);}
endingCamera=await fetch('./assets/blender-ending-camera-v045.json').then(r=>r.json());document.body.dataset.endingReady='true';})();return endingLoad;}
async function showEnding(p){endingProgress=p;await loadEnding();if(p!==endingProgress||document.body.dataset.stage!=='memory')return;if(mode!=='ending'){
 endingBridge={rotation:camera.quaternion.clone(),position:camera.position.clone(),target:camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(8))};
 endingPath=new THREE.CatmullRomCurve3([endingBridge.position,new THREE.Vector3(-28,5.3,-23),new THREE.Vector3(-28,4,-18),new THREE.Vector3(-34,2,-13),new THREE.Vector3(-43,1.8,-7),new THREE.Vector3(-46,2.7,8),new THREE.Vector3(-50,2.7,20),new THREE.Vector3(-50,2.7,28),new THREE.Vector3(-40,2.7,36),new THREE.Vector3(-28,2.7,32),new THREE.Vector3(-15,2.7,29),new THREE.Vector3(0,2.7,26),new THREE.Vector3(14,2.9,22),new THREE.Vector3(6,2.7,19),new THREE.Vector3(-6,2.7,17),new THREE.Vector3(-6,2.7,12),new THREE.Vector3(-12,2.7,10),new THREE.Vector3(-15,2.7,0),new THREE.Vector3(-16,2.7,-7),endingFixedPosition],false,'centripetal');
 }mode='ending';village.visible=false;ending.visible=true;host.style.display='block';const f=THREE.MathUtils.clamp(p,0,1)*144,i=Math.min(143,Math.floor(f)),u=f-i,a=endingCamera[i],b=endingCamera[i+1];endingMixer.setTime(Math.max(70,f));animateTimelapse(f);ending.traverse(o=>{if(!o.isMesh||!/^Season[ _]falling/.test(o.name))return;o.visible=f>=99&&f<114;if(o.userData.snowY===undefined)o.userData.snowY=o.position.y;o.position.y=((o.userData.snowY-(f-99)*.35)%4+4)%4;});
const seasonKeys=[70,80,91,103,117,136],seasonColors=[0xfff1dc,0xffecd4,0xe2efff,0xffcf99,0xd7e5ff,0xfff1dc];
let season=0;while(season<4&&f>seasonKeys[season+1])season++;
const seasonalBlend=THREE.MathUtils.smoothstep(f,seasonKeys[season],seasonKeys[season+1]);
sun.color.set(seasonColors[season]).lerp(new THREE.Color(seasonColors[season+1]),seasonalBlend);
const winter=THREE.MathUtils.smoothstep(f,98,105)*(1-THREE.MathUtils.smoothstep(f,114,125));
scene.background.set('#b6bcb5').lerp(new THREE.Color('#ccd5d8'),winter);
transitionHaze(0,f);host.style.filter='none';
// Cut the old terrain beneath the completed gravel bed instead of overlapping coplanar surfaces.
const bedBuild=easeMotion((f-122)/7);for(const ground of endingGround){if(/Forecourt/.test(ground.name))continue;for(const material of (Array.isArray(ground.material)?ground.material:[ground.material])){material.clipIntersection=true;material.clippingPlanes=bedBuild>0?[
 new THREE.Plane(new THREE.Vector3(-1,0,0),-22.275-1.66*bedBuild),new THREE.Plane(new THREE.Vector3(1,0,0),22.275-1.66*bedBuild),new THREE.Plane(new THREE.Vector3(0,0,-1),-15.5-1.31*bedBuild),new THREE.Plane(new THREE.Vector3(0,0,1),15.5-1.31*bedBuild)]:[];}}

ending.updateMatrixWorld(true);if(endingCat){endingCat.visible=f<114;endingCat.position.y=floorHeight(endingCat.position.x,endingCat.position.z)+endingCat.userData.footOffset;}for(const tree of passageTrees){tree.visible=f<114;tree.position.y=floorHeight(tree.position.x,tree.position.z);}
for(let k=0;k<endingWalkers.length;k++){const person=endingWalkers[k];person.visible=f<114;const phase=((f/18+k*.36)%1+1)%1;person.position.x=f<70?-10+k*1.1:-38+phase*30;person.position.z=f<70?-24-k*2:-21-k*.7;person.position.y=floorHeight(person.position.x,person.position.z)+person.userData.footOffset;}
if(f<70&&endingPath){const k=f/70,e=k*k*k*(10+k*(-15+6*k));camera.position.copy(endingPath.getPointAt(e));const groundClearance=floorHeight(camera.position.x,camera.position.z)+1.65;camera.position.y=Math.max(camera.position.y,groundClearance);const ahead=endingPath.getPointAt(Math.min(1,e+.035));ahead.y=camera.position.y-.12;const aim=new THREE.PerspectiveCamera();aim.position.copy(camera.position);aim.lookAt(ahead);const pathRotation=aim.quaternion.clone();aim.lookAt(endingFixedTarget);pathRotation.slerp(aim.quaternion,easeMotion((k-.88)/.12));camera.quaternion.copy(endingBridge.rotation).slerp(pathRotation,easeMotion(k/.08));}else{camera.position.copy(endingFixedPosition);camera.lookAt(endingFixedTarget);}const fade=cameraTest?0:THREE.MathUtils.smoothstep(p,.975,1);host.style.opacity=String(1-fade);closing.style.display=p>=.999?'flex':'none';host.dataset.ending=p.toFixed(4);render();}
document.addEventListener('blender-ending-frame',e=>showEnding(e.detail));

// Blender-authored background loops. Narrative heroes deliberately have no ambient_kind.
const ambient=[];village.traverse(o=>{if(o.userData.ambient_kind){o.userData.neutralPosition=o.position.clone();o.userData.neutralQuaternion=o.quaternion.clone();ambient.push(o);}});
const quietMotion=matchMedia('(prefers-reduced-motion: reduce)');let ambientElapsed=0,ambientLast=0;
function livingFrame(now){requestAnimationFrame(livingFrame);const dt=ambientLast?Math.min(.05,(now-ambientLast)/1000):0;ambientLast=now;if(document.hidden||document.body.classList.contains('higgsfield-active')||host.style.display==='none'||mode!=='route'||quietMotion.matches)return;ambientElapsed+=dt;
 for(const o of ambient){const d=o.userData,a=2*Math.PI*ambientElapsed/d.ambient_period+d.ambient_phase,p=d.neutralPosition;o.position.copy(p);o.quaternion.copy(d.neutralQuaternion);
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
if(authoredTour){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(bakedPaths.positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(bakedPaths.colors,3));geometry.computeVertexNormals();const paths=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));paths.name='Bare terrain connecting paths';village.add(paths);}
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
 const data=buildTransfer(from,to);
 mode='route';village.visible=true;if(ending)ending.visible=false;for(const person of endingWalkers)person.visible=false;if(endingCat)endingCat.visible=false;for(const tree of passageTrees)tree.visible=false;closing.style.display='none';host.style.display='block';host.style.opacity='1';
 // Reveal the forecourt only on the last approach, never between the five speakers.
 village.traverse(o=>{if(/Original.unchanged|Forecourt/.test(o.name))o.visible=to===5;});
 clearanceStrength=easeMotion(progress/.08)*(1-easeMotion((progress-.92)/.08));
 applyTransfer(data,progress);
 transitionHaze(0,0);render();
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

function applyTransfer(data,progress){if(cameraTest){nativePose(data.from+1,progress,false);return;}
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
document.addEventListener('ending-preload',prepareEnding);

// Full-page prologue: the village is first read as a landscape, then joins the tested route.
document.addEventListener('blender-establishing-frame',e=>{
 if(!village||document.body.dataset.fullStory!=='true')return;
 const data=buildTransfer(-1,0),u=easeMotion(e.detail.progress);
 const origin=new THREE.Vector3(80,62,104),look=new THREE.Vector3(0,1,0);
 camera.position.copy(origin).lerp(data.start,u);const aim=new THREE.PerspectiveCamera();aim.position.copy(origin);aim.lookAt(look);
 camera.quaternion.copy(aim.quaternion).slerp(data.startRotation,u);host.style.display='block';host.style.opacity='1';render();
});

// One continuous village camera trajectory across reveal, entry and the first speaker.
function nativePose(index,progress,dialogue=false){
 const list=nativeCamera.tracks[index],u=THREE.MathUtils.clamp(progress,0,1)*(list.length-1),i=Math.min(list.length-2,Math.floor(u)),t=u-i;
 const a=dialogue?nativeCamera.dialogues[index]:list[i],b=dialogue?a:list[i+1];
 camera.position.copy(cv(a.p).lerp(cv(b.p),t));
 const q1=new THREE.Quaternion(a.q[1],a.q[2],a.q[3],a.q[0]),q2=new THREE.Quaternion(b.q[1],b.q[2],b.q[3],b.q[0]);
 const conversion=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
 camera.quaternion.copy(conversion).multiply(q1.slerp(q2,t));
 camera.fov=dialogue?46:54;camera.updateProjectionMatrix();
}
document.addEventListener('blender-entry-frame',e=>{
 if(!village)return;const p=THREE.MathUtils.clamp(e.detail.progress,0,1);
 mode='route';clearanceStrength=0;village.visible=true;if(ending)ending.visible=false;
 if(p<.375){
  const u=easeMotion(p/.375),end=cv(nativeCamera.tracks[0][0].p);
  camera.position.copy(new THREE.Vector3(105,65,150)).lerp(end,u);
  const target=new THREE.Vector3(0,3,0).lerp(cv(nativeCamera.tracks[0][0].target),u);
  camera.lookAt(target);camera.fov=54;camera.updateProjectionMatrix();
 }else nativePose(0,(p-.375)/.625);
 host.style.display='block';host.style.opacity='1';transitionHaze(0,0);render();
});
// Stone lions are revealed only in the ending, after the five village encounters.
document.body.dataset.spatialReady='true';document.dispatchEvent(new CustomEvent('spatial-ready'));
document.addEventListener('archive-open',()=>{host.style.display='none';});
