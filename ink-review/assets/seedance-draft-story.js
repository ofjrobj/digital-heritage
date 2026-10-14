import {createEntryDraft} from './seedance-entry-draft.js';
import {createMusicFade} from "./story-audio-mix.js?v=quiet-2";
import {createStoryVoices} from "./story-voices.js?v=voices-timing-3";
import {assetURL} from './asset-url.js';
import {createScrollFootsteps} from './scroll-footsteps.js?v=slow-steps-2';
import * as THREE from '../../assets/vendor/three.module.js';
import {dialogueCopy} from './dialogue-copy.js?v=dialogue-final-20261014';
import {createOpening,openingPhase} from './seedance-draft-opening.js?v=edge-1';
import {createVideoActor} from './spatial-video-actor.js?v=background-ui-1';
import {createRouteFilm,createDialogueMist} from './spatial-route-film.js?v=background-ui-1';
import {createPlateOccluder} from './spatial-occlusion.js?v=background-ui-1';
import {createFrontActor} from './spatial-front-actor.js?v=background-ui-1';
import {createEnding} from './seedance-draft-ending.js?v=1';

const $=id=>document.getElementById(id),base=assetURL('./spatial-test/',import.meta.url);
const panel=$('cinemaDialogue'),loading=$('loading'),stage=$('stage');
const renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const loader=new THREE.TextureLoader(),clamp=(v,lo=0,hi=1)=>THREE.MathUtils.clamp(v,lo,hi);
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const tex=name=>loader.loadAsync(assetURL(name,base).href).then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;});
const read=name=>fetch(assetURL(name,base)).then(r=>{if(!r.ok)throw Error(name);return r.json();});
const vFov=(h,aspect)=>THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(h/2))/aspect));
// The film fills the viewport with a centered 16:9 cover crop. Use the same
// visible horizontal angle on the registered final plate, including 4:3 panes.
const coverHFov=(h,aspect)=>THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(h/2))*Math.min(1,aspect/(16/9))));
const setPose=(camera,pose)=>{camera.position.fromArray(pose.p);camera.quaternion.set(pose.q[1],pose.q[2],pose.q[3],pose.q[0]);camera.updateMatrixWorld();};
// A registered plate has finite angular coverage. Fit the view to its actual
// 14m shell instead of exposing blank borders when the source camera turns.
const plateBoundary=[];for(let n=0;n<=12;n++){const t=-1+n/6;plateBoundary.push([t,-1],[t,1],[-1,t],[1,t]);}
const plateRay=new THREE.Vector3(),plateOffset=new THREE.Vector3(),plateHit=new THREE.Vector3();
function fitPlateCoverage(e){
 const c=e.camera,r=e.reference,halfH=Math.tan(THREE.MathUtils.degToRad(e.manifest.projectionHFov/2)),halfV=halfH/(16/9);
 plateOffset.copy(c.position).sub(r.position);const offsetSquared=plateOffset.lengthSq();
 // No FOV change at the film handoff; introduce a subpixel tessellation inset
 // smoothly as translation/rotation begins, not as a visible framing jump.
 const moved=Math.min(1,Math.sqrt(offsetSquared)*20+c.quaternion.angleTo(r.quaternion)*20),limit=1-.0008*moved;
 function coverage(){let extent=0;
  for(const [x,y] of plateBoundary){
   plateRay.set(x,y,.5).unproject(c).sub(c.position).normalize();
   const b=plateOffset.dot(plateRay),disc=b*b+196-offsetSquared;if(disc<=0)return Infinity;
   plateHit.copy(c.position).addScaledVector(plateRay,-b+Math.sqrt(disc)).applyMatrix4(r.matrixWorldInverse);
   if(plateHit.z>=0)return Infinity;
   extent=Math.max(extent,Math.abs(plateHit.x/plateHit.z)/halfH,Math.abs(plateHit.y/plateHit.z)/halfV);
  }return extent;
 }
 c.fov=e.baseVFov;c.updateProjectionMatrix();
 if(coverage()>limit+1e-9){let lo=2,hi=e.baseVFov;for(let n=0;n<16;n++){c.fov=(lo+hi)/2;c.updateProjectionMatrix();if(coverage()<=limit)lo=c.fov;else hi=c.fov;}c.fov=lo;c.updateProjectionMatrix();}
 e.plateCoverage=coverage();e.effectiveHFov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(c.fov/2))*c.aspect));
}
let target=0,progress=0,auto=false,ambient=true,elapsed=0,last=performance.now(),showGuide=false,currentSpeaker=-1;
const openingSeconds=30,merchantSeconds=15.272727,FOG=2.4,CUT=.48;
let openingEnd=0,stops=[],chapters=[],totalSeconds=1;
const labels=['시작 화면','먹 번짐 · 산과 안개','마을 부감','마을 입구','장사꾼에게 다가가기','장사꾼의 이야기','농민에게 다가가기','농민의 이야기','찬모에게 다가가기','찬모의 이야기','주민 삼총사에게 다가가기','주민 삼총사의 이야기','나무꾼에게 다가가기','나무꾼의 이야기','석사자에게 돌아가기','사계절의 흐름','옛 건물이 걷히는 시간','현대 · 밤에서 아침으로','여정의 끝'];
const names=['장사꾼','농민','찬모','주민 삼총사','나무꾼'],opening=createOpening(stage),mist=createDialogueMist(stage);
const handoffDuration=.24;let handoffComplete=false,handoffElapsed=0;
const voices=createStoryVoices(stage);
const music=$('music');let soundOn=false;music.volume=0;const fadeMusic=createMusicFade(music);let footsteps;
const footAudio=document.createElement('audio');footAudio.id='scrollFootsteps';footAudio.preload='auto';footAudio.src=assetURL('./footstep-single-v2.mp3',import.meta.url).href;stage.append(footAudio);
addEventListener('visibilitychange',()=>{if(document.hidden){footsteps?.stop();music.pause();music.volume=0;}else if(soundOn)music.play().catch(()=>{});});addEventListener('pagehide',()=>{footsteps?.stop();music.pause();});
$('soundToggle').onclick=()=>{soundOn=!soundOn;voices.setEnabled(soundOn);if(!soundOn){footsteps?.stop();music.pause();music.volume=0;}$('soundToggle').setAttribute('aria-label',soundOn?'소리 끄기':'소리 켜기');$('soundToggle').title=soundOn?'소리 끄기':'소리 켜기';$('soundToggle').querySelector('img').src=new URL(soundOn?'./icons8-voice-50.png':'./icons8-mute-50.png',import.meta.url).href;$('soundToggle').setAttribute('aria-pressed',String(soundOn));if(soundOn)music.play().catch(()=>{});};
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const asset=name=>assetURL('./film-third/'+name,import.meta.url).href;
const endingAsset=name=>assetURL('./film-ending/'+name,import.meta.url).href;
const mediaFolder=kind=>['trio','woodcutter','return'].includes(kind)?'film-ending':'film-third';

try{
 const [merchantManifest,merchantPlate,merchantGuide,filmCamera,routeData,endingRouteData]=await Promise.all([
  read('scene.json'),tex('../image-sequence/merchant.webp'),tex('../film-first/guide-end.jpg'),read('../film-first/camera.json'),read('../film-third/routes.json'),read('../film-ending/routes.json')
 ]);
 const routes=['farmer','cook','trio','woodcutter'].map(kind=>({kind,...(routeData.routes[kind]??endingRouteData.routes[kind])}));
 const returnRoute={kind:'return',...endingRouteData.routes.return,duration:7};
 const ending=createEnding(stage,{children:[],camera:endingRouteData.endingCamera,pairRegistration:true,images:{pair:'ending-pair-ink.png',historicBare:'ending-historic-bare.webp'},masks:{branches:'ending-masks/branches.png'}});
 ending.root.style.zIndex='2';
 await ending.ready;
 const entryDraft=createEntryDraft(stage);await entryDraft.ready;
 const merchantStop=openingSeconds+merchantSeconds;
 let cursor=merchantStop;
 for(const r of routes){r.outStart=cursor;r.start=cursor+FOG;r.end=r.start+r.duration;r.inStart=r.end-FOG*CUT;r.stop=r.end+FOG*(1-CUT);cursor=r.stop;}
 returnRoute.outStart=cursor;returnRoute.start=cursor+FOG;returnRoute.end=returnRoute.start+returnRoute.duration;returnRoute.stop=returnRoute.end+FOG*(1-CUT);
 const endingStart=returnRoute.end-FOG*CUT;
 totalSeconds=returnRoute.stop+ending.duration;openingEnd=openingSeconds/totalSeconds;
 stops=[merchantStop,...routes.map(r=>r.stop)].map(t=>t/totalSeconds);
 chapters=[0,3.4,10.7,22,30,merchantStop,...routes.flatMap(r=>[r.start,r.stop]),returnRoute.start,returnRoute.stop+2.5,returnRoute.stop+11.2,returnRoute.stop+13,totalSeconds].map(t=>t/totalSeconds);
 $('chapter').replaceChildren(...labels.map((label,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=label;return option;}));
 await opening.ready;await opening.film.actorsReady;
 async function loadActor(kind){
  if(kind==='merchant'){
   const shared=opening.film.actor('merchant');
   if(shared?.video.src.includes('/film-third/'))return shared;
  }
  const folder=mediaFolder(kind),meta=await read('../'+folder+'/'+kind+'-loop.json');
  const actor=createVideoActor(THREE,assetURL('../'+folder+'/'+kind+'-loop.mp4',base).href,{...meta,kind,height:kind==='cook'?1.65:1.86,autoplay:ambient,loop:true});
  await actor.ready;return actor;
 }
 const actors=await Promise.all(['merchant','farmer','cook','trio','woodcutter'].map(loadActor));
 // Dialogue holds the card's frontal first frame. Guard the shared merchant
 // API too, so opening-film gesture/visibility retries cannot restart it.
 for(const [index,actor] of actors.entries()){
  const play=actor.play.bind(actor);
  const hold=()=>currentSpeaker===index||!ambient||document.hidden;
  actor.play=()=>{if(hold()){actor.pause();return Promise.resolve(false);}return play();};
  actor.video.addEventListener('play',()=>{if(hold())actor.pause();});
 }
 function syncActorMotion(resetDialogue=false){
  for(const [index,actor] of actors.entries()){
   if(index===currentSpeaker){
    actor.pause();
    if(resetDialogue){actor.video.currentTime=0;actor.texture.needsUpdate=true;}
   }else if(ambient&&!document.hidden)void actor.play();
   else actor.pause();
  }
 }
 const endCamera=filmCamera.samples.at(-1);
 const cloneActor=actor=>{const mesh=actor.mesh.clone();mesh.material=actor.mesh.material.clone();mesh.material.onBeforeCompile=actor.mesh.material.onBeforeCompile;mesh.material.customProgramCacheKey=actor.mesh.material.customProgramCacheKey;mesh.material.opacity=1;mesh.visible=true;return mesh;};
 function addActor(scene,actor,anchor,reference){
  const hero=cloneActor(actor);hero.position.fromArray(anchor);hero.up.set(0,0,1);hero.lookAt(reference.position.x,reference.position.y,hero.position.z);scene.add(hero);
  const c=document.createElement('canvas');c.width=384;c.height=128;const ctx=c.getContext('2d'),group=actor.mesh.name.startsWith('trio');
  for(const x of group?[64,192,320]:[192]){const g=ctx.createRadialGradient(x,64,3,x,64,60);g.addColorStop(0,'rgba(43,49,40,.30)');g.addColorStop(.45,'rgba(43,49,40,.14)');g.addColorStop(1,'rgba(43,49,40,0)');ctx.fillStyle=g;ctx.fillRect(x-62,0,124,128);}
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(group?2.65:1.7,.42),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));shadow.position.copy(hero.position);shadow.position.z+=.008;
  shadow.rotation.z=Math.atan2(reference.position.y-hero.position.y,reference.position.x-hero.position.x)+Math.PI/2;scene.add(shadow);
  return {hero,shadow};
 }
 function makeEncounter(manifest,plate,guide,actor,index){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#f0f1ed');const camera=new THREE.PerspectiveCamera(30,1,.08,700);camera.up.set(0,0,1);
  const reference=new THREE.PerspectiveCamera(vFov(manifest.projectionHFov,16/9),16/9,.08,700);setPose(reference,manifest.reference);
  const inverseProjector=new THREE.Matrix4().multiplyMatrices(reference.projectionMatrix,reference.matrixWorldInverse).invert();
  const uniforms={painting:{value:plate},guide:{value:guide},useGuide:{value:0},inverseProjector:{value:inverseProjector},referenceOrigin:{value:reference.position.clone()},plateBalance:{value:new THREE.Vector3(...(index===0?[.97318,1.02503,1.09690]:[1,1,1]))}};
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2,64,36),new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms,
   vertexShader:`uniform mat4 inverseProjector;uniform vec3 referenceOrigin;varying vec2 imageUV;void main(){imageUV=uv;vec4 p=inverseProjector*vec4(uv*2.-1.,.5,1.);p/=p.w;vec3 world=referenceOrigin+normalize(p.xyz-referenceOrigin)*14.;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
   fragmentShader:`uniform sampler2D painting;uniform sampler2D guide;uniform float useGuide;uniform vec3 plateBalance;varying vec2 imageUV;void main(){gl_FragColor=mix(texture2D(painting,imageUV),texture2D(guide,imageUV),useGuide);gl_FragColor.a=1.;\n#include <colorspace_fragment>\ngl_FragColor.rgb*=plateBalance;\n}`
  }));backdrop.frustumCulled=false;scene.add(backdrop);
  const {hero,shadow}=addActor(scene,actor,manifest.hero,reference),direction=new THREE.Vector3(reference.position.x-hero.position.x,reference.position.y-hero.position.y,0).normalize();
  const closeCamera=new THREE.PerspectiveCamera();closeCamera.up.set(0,0,1);
  return {manifest,scene,camera,reference,uniforms,hero,shadow,actor,direction,closeCamera,index,height:index===2?1.65:1.86};
 }
 const merchant=makeEncounter({...merchantManifest,projectionHFov:48,reference:{p:endCamera.p,q:endCamera.qWXYZ}},merchantPlate,merchantGuide,actors[0],0);
 const merchantFront=await createFrontActor(THREE,asset('merchant-front-hq.webp'),'merchant',1.86);
 merchant.frontHero=merchantFront.mesh;merchant.frontHero.position.copy(merchant.hero.position);merchant.frontHero.quaternion.copy(merchant.hero.quaternion);merchant.frontHero.visible=false;merchant.scene.add(merchant.frontHero);
 const encounters=[merchant];
 await Promise.all(routes.map(async(r,i)=>{
  const folder=mediaFolder(r.kind);
  const [plate,guide]=await Promise.all([tex('../'+folder+'/'+r.kind+'-dialogue.webp'),tex('../'+folder+'/'+r.kind+'-dialogue-guide.jpg')]);
  const portrait=r.kind==='farmer'?await createFrontActor(THREE,asset('farmer-front-hq.webp'),'farmer',1.86):['trio','woodcutter'].includes(r.kind)?await createFrontActor(THREE,endingAsset('front/'+r.kind+'.webp'),r.kind,1.86):actors[i+1];
  const encounter=makeEncounter({projectionHFov:48,viewHFov:48,reference:r.frontal,hero:r.hero,cameraSource:r.sourceCamera},plate,guide,portrait,i+1);encounter.actor=actors[i+1];encounters[i+1]=encounter;r.encounter=encounter;
  r.film=createRouteFilm(r.kind==='farmer'?'https://d8j0ntlcm91z4.cloudfront.net/user_3GnUBQ5Hr05qllQJ2NH8rbiaT3p/hf_20261013_025317_4d811a64-4117-41e8-802e-7bc98f0e8740.mp4':assetURL('../'+folder+'/'+r.kind+'-route.mp4',base).href,r);await r.film.ready;
  r.scene=new THREE.Scene();r.camera=new THREE.PerspectiveCamera(30,1,.05,700);r.camera.up.set(0,0,1);
  // One immutable decoded frame fills the viewport; no parallax wobble, image
  // deformation, or synthetic building motion is applied to the route video.
  const material=new THREE.MeshBasicMaterial({map:r.film.texture,depthTest:false,depthWrite:false,toneMapped:false});
  material.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <project_vertex>','gl_Position=vec4(position.xy,1.,1.);');};
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);backdrop.frustumCulled=false;backdrop.renderOrder=-1000;r.scene.add(backdrop);
  if(r.kind==='farmer')r.occluder=await createPlateOccluder(THREE,asset('farmer-foreground.json'),r.scene);
  const placed=addActor(r.scene,actors[i+1],r.hero,encounter.reference);r.heroMesh=placed.hero;r.shadow=placed.shadow;
 }));
 // The generated return camera drifted away from the source stair geometry.
 // Keep the complete painted scene and its lions in ONE registered projection.
 // A gentle plate approach preserves contact, relative size, and architecture.
 const allRoutes=routes;
 const qa=new THREE.Quaternion(),qb=new THREE.Quaternion(),pa=new THREE.Vector3(),pb=new THREE.Vector3();
 function resize(){const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);renderer.setSize(w,h,false);
  for(const e of encounters){e.camera.aspect=w/h;e.effectiveHFov=coverHFov(e.manifest.viewHFov,w/h);e.baseVFov=vFov(e.effectiveHFov,w/h);e.camera.fov=e.baseVFov;e.camera.updateProjectionMatrix();
   const visibleHeight=h<=500?1.48:1.36,distance=Math.max(2.55,visibleHeight*e.camera.aspect/(2*Math.tan(THREE.MathUtils.degToRad(e.effectiveHFov/2))));
   e.closeCamera.position.copy(e.hero.position).addScaledVector(e.direction,distance);e.closeCamera.position.z=e.hero.position.z+1.55;e.closeCamera.lookAt(e.hero.position.x,e.hero.position.y,e.closeCamera.position.z);e.closeCamera.updateMatrixWorld();
  }
  for(const r of allRoutes){r.camera.aspect=w/h;r.camera.fov=vFov(coverHFov(48,w/h),w/h);r.camera.updateProjectionMatrix();const crop=w/h>16/9?[1,(16/9)/(w/h)]:[(w/h)/(16/9),1];r.film.texture.repeat.set(...crop);r.film.texture.offset.set((1-crop[0])/2,(1-crop[1])/2);}
 }
 resize();addEventListener('resize',resize);
 function poseMerchant(local){
  const walk=clamp(local/12.768),close=smooth((local-12.768)/1.152),e=merchant,c=e.camera,path=e.manifest.path;
  const f=walk*(path.length-1),i=Math.min(path.length-2,Math.floor(f)),t=f-i,A=path[i],B=path[i+1];
  c.position.copy(pa.fromArray(A.p).lerp(pb.fromArray(B.p),t));qa.set(A.q[1],A.q[2],A.q[3],A.q[0]);qb.set(B.q[1],B.q[2],B.q[3],B.q[0]);c.quaternion.copy(qa.slerp(qb,t));
  if(walk===0&&close===0){c.position.copy(e.reference.position);c.quaternion.copy(e.reference.quaternion);}
  c.position.lerp(e.closeCamera.position,close);c.quaternion.slerp(e.closeCamera.quaternion,close);c.setViewOffset(innerWidth,innerHeight,0,innerHeight*.14*close,innerWidth,innerHeight);c.updateMatrixWorld();fitPlateCoverage(e);
  e.frontHero.visible=!showGuide&&local>=13.92;e.hero.visible=!showGuide&&!e.frontHero.visible;e.shadow.visible=!showGuide;e.hero.material.opacity=1;e.uniforms.useGuide.value=Number(showGuide);return e;
 }
 function poseFrontal(e){
  setPose(e.camera,e.manifest.reference);
  const distance=e.reference.position.distanceTo(new THREE.Vector3(e.hero.position.x,e.hero.position.y,e.reference.position.z));
  const visibleHeight=2*distance*Math.tan(THREE.MathUtils.degToRad(e.baseVFov/2)),headAboveEye=e.hero.position.z+e.height-e.reference.position.z;
  // Crop the registered background and actor by exactly the same projection.
  // Fit the entire head below nav; lift phone framing enough to expose the prop.
  const ratio=headAboveEye/visibleHeight,headMargin=innerHeight<=500?.16:.17,offset=clamp((.5-ratio-headMargin)/(1+2*ratio),0,innerHeight<=500?.20:.12);
  e.camera.setViewOffset(innerWidth,innerHeight,0,innerHeight*offset,innerWidth,innerHeight);e.camera.updateMatrixWorld();fitPlateCoverage(e);
  e.hero.visible=e.shadow.visible=!showGuide;e.hero.material.opacity=1;e.uniforms.useGuide.value=Number(showGuide);return e;
 }
 const projectedHead=new THREE.Vector3(),projectedFeet=new THREE.Vector3();
 function poseRoute(r,time,dt,active=true){
  r.film.update(time,{active,dt});setPose(r.camera,r.film.cameraAt());const u=r.film.sourceTime/r.duration;r.occluder?.update(u,r.camera.aspect);
  r.heroMesh.lookAt(r.camera.position.x,r.camera.position.y,r.heroMesh.position.z);
  projectedHead.set(0,r.encounter.height,0);r.heroMesh.localToWorld(projectedHead);projectedHead.project(r.camera);
  projectedFeet.copy(r.heroMesh.position).project(r.camera);
  const headY=(1-projectedHead.y)/2,feetY=(1-projectedFeet.y)/2;
  // Visibility follows the actual projected body, not an arbitrary last-20%
  // time gate. Preserve aspect and world height while entering/leaving frame.
  const safe=projectedHead.z<1&&projectedHead.z>-1&&projectedFeet.z<1&&Math.abs(projectedHead.x)<1.12&&headY<1.08&&feetY>-.08;
  const opacity=safe?1:0;
  r.heroMesh.visible=r.shadow.visible=!showGuide&&opacity>.001;r.heroMesh.material.opacity=opacity;r.shadow.material.opacity=opacity;
  return {scene:r.scene,camera:r.camera,hero:r.heroMesh,actor:r.encounter.actor,index:r.encounter.index,height:r.encounter.height,manifest:r.encounter.manifest,effectiveHFov:48,route:r.kind,actorSafe:safe,actorOpacity:opacity};
 }
 function poseReturn(time){
  ending.update(0,elapsed,1+.065*smooth(time/returnRoute.duration));
  return {scene:encounters.at(-1).scene,camera:encounters.at(-1).camera,height:0,manifest:{cameraSource:'Registered ending plate; deterministic 2.5D approach'},effectiveHFov:55,route:'return'};
 }
 let naturalPlayback=false,autoLimit=null,autoSegment=null,dialogueElapsed=0,dialogueTimed=-1,dialogueFinished=-1;
 const automaticGates=[{start:3.4,end:22,kind:'opening'},
  {start:42.768,end:merchantStop,kind:'dialogue-in'},
  ...routes.map(r=>({start:r.inStart,end:r.stop,kind:'dialogue-in'})),
  {start:returnRoute.end,end:totalSeconds,kind:'ending'}];
 function startAutomatic(kind,end){footsteps?.stop();autoSegment=kind;autoLimit=end/totalSeconds;auto=true;$('run').textContent='이동 멈춤';}
 const dialogueSeconds=i=>(voices.duration(i)||Math.max(10,dialogueCopy[i].testimony.length/5))+8;
 function stopAuto(){auto=false;autoSegment=null;$('run').textContent='이동 재생';}
 function snapMedia(){opening.film.command(clamp(progress*totalSeconds-13,0,17),{snap:true});for(const r of allRoutes)r.film.update(clamp(progress*totalSeconds-r.start,0,r.duration),{snap:true,active:false});}
 function go(value,play=false){footsteps?.stop();naturalPlayback=play;autoSegment=null;autoLimit=null;dialogueElapsed=0;dialogueTimed=-1;dialogueFinished=-1;target=clamp(value,0,1);if(!play){progress=target;handoffComplete=target>=openingEnd;handoffElapsed=handoffComplete?handoffDuration:0;snapMedia();}auto=play;$('run').textContent=auto?'이동 멈춤':'이동 재생';}
 function nextStopAfter(p){return stops.find(s=>p<s-1e-8)??1;}
 function resume(){if(target>.9999){go(0);}naturalPlayback=true;autoLimit=null;if(currentSpeaker>=0&&Math.abs(target-stops[currentSpeaker])<.0001){dialogueTimed=currentSpeaker;dialogueElapsed=0;dialogueFinished=-1;stopAuto();return;}change(.007);}
 // Only the three authored automatic zones own a clock. All other travel
 // is bounded by input; a large wheel event cannot skip a zone boundary.
 const change=delta=>{
  if(auto&&autoSegment!==null||dialogueTimed>=0)return;
  naturalPlayback=true;dialogueFinished=-1;stopAuto();
  const before=target*totalSeconds;
  let next=clamp(target+delta,0,1)*totalSeconds;
  if(delta>0){
   const gate=automaticGates.find(g=>before<g.end-.001&&next>=g.start-.001);
   if(gate){next=Math.max(before,gate.start);target=next/totalSeconds;startAutomatic(gate.kind,gate.end);return;}
  }
  target=next/totalSeconds;
 };
 $('run').onclick=()=>{if(auto||dialogueTimed>=0){naturalPlayback=false;dialogueTimed=-1;stopAuto();}else resume();};$('progress').oninput=e=>go(Number(e.target.value));$('chapter').onchange=e=>go(chapters[Number(e.target.value)]);
 $('dialogue').onclick=()=>go(stops.find(s=>s>=progress-.002)??1);
 $('next').onclick=()=>{if(currentSpeaker<0)return;const index=currentSpeaker;naturalPlayback=true;dialogueFinished=index;dialogueTimed=-1;dialogueElapsed=0;target=stops[index]+.000001;startAutomatic('dialogue-out',routes[index]?.start??returnRoute.start);};
 $('compare').onclick=()=>{showGuide=!showGuide;$('compare').setAttribute('aria-pressed',String(showGuide));$('compare').textContent=showGuide?'한국화 보기':'기준 구도 비교';};
 $('ambience').onclick=()=>{ambient=!ambient;opening.film.setAmbient?.(ambient);syncActorMotion();$('ambience').textContent=ambient?'인물 움직임 켜짐':'인물 움직임 꺼짐';$('ambience').setAttribute('aria-pressed',String(ambient));};
 footsteps=createScrollFootsteps(footAudio,()=>soundOn&&!document.hidden&&!auto&&dialogueTimed<0&&currentSpeaker<0&&progress*totalSeconds>=22&&target*totalSeconds>=22&&progress*totalSeconds<returnRoute.stop);
 function manualChange(delta){const before=target;change(delta);if(target!==before)footsteps.pulse();else footsteps.stop();}
 stage.addEventListener('pointerdown',()=>syncActorMotion(),{passive:true});
 stage.addEventListener('wheel',e=>{if(e.target.closest('#testTools,#cinemaDialogue,nav'))return;e.preventDefault();manualChange(clamp(e.deltaY,-100,100)/18000);},{passive:false});
 let drag=null;$('world').addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};$('world').setPointerCapture(e.pointerId);});
 $('world').addEventListener('pointermove',e=>{if(!drag)return;manualChange(((drag.y-e.clientY)+(e.clientX-drag.x)*.3)/6000);drag={x:e.clientX,y:e.clientY};});
 ['pointerup','pointercancel'].forEach(type=>$('world').addEventListener(type,()=>{drag=null;footsteps.stop();}));
 addEventListener('keydown',e=>{if(e.target.matches('input,button,a,summary,select'))return;if(['ArrowDown','ArrowRight','PageDown'].includes(e.key)){e.preventDefault();manualChange(.007);}if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();manualChange(-.007);}});
 function showDialogue(index){if(currentSpeaker===index)return;currentSpeaker=index;voices.select(index);syncActorMotion(index>=0);panel.hidden=index<0;if(index>=0){panel.querySelector('h2').textContent=names[index];panel.querySelector('p').textContent=dialogueCopy[index].testimony;$('next').textContent=index===names.length-1?'석사자에게 돌아가기':names[index+1]+'에게 이동';}}
 function rememberStory(){footsteps.stop();stopAuto();sessionStorage.setItem('spatial-test-resume-seconds',String(target*totalSeconds));sessionStorage.setItem('ink-pilot-return',location.pathname.endsWith('/play.html')?'play.html':'spatial-test.html');}
 $('storyLink').onclick=e=>{e.preventDefault();go(0);};$('indexLink').onclick=rememberStory;
 const saved=sessionStorage.getItem('spatial-test-resume-seconds'),legacy=sessionStorage.getItem('spatial-test-resume-v3');if(saved!==null||legacy!==null){go(clamp((saved!==null?Number(saved):Number(legacy)*79.234914)||0,0,totalSeconds)/totalSeconds);sessionStorage.removeItem('spatial-test-resume-seconds');sessionStorage.removeItem('spatial-test-resume-v3');}
 const finish=document.createElement('a');finish.id='endingIndex';finish.href=$('indexLink').href;finish.textContent='석사자 아카이브로';finish.hidden=true;finish.onclick=rememberStory;stage.append(finish);
 addEventListener('visibilitychange',()=>syncActorMotion());
 if(matchMedia('(pointer:coarse) and (orientation:portrait)').matches){$('rotate').hidden=false;setTimeout(()=>$('rotate').hidden=true,3000);}
 loading.hidden=true;document.body.dataset.ready='true';
 function frame(now){
  if(!innerWidth||!innerHeight||!stage.clientWidth||!stage.clientHeight){last=now;requestAnimationFrame(frame);return;}
  const dt=Math.min(.05,(now-last)/1000);last=now;if(ambient)elapsed+=dt;
  if(auto){const next=autoLimit??nextStopAfter(target);target=Math.min(next,target+dt/totalSeconds);if(!handoffComplete)target=Math.min(target,openingEnd);if(target===next){stopAuto();autoLimit=null;}}
  const previous=progress;progress=THREE.MathUtils.lerp(progress,target,1-Math.exp(-dt/(reduced?.05:.12)));if(Math.abs(progress-target)<.00001)progress=target;
  if(progress<openingEnd-.001){handoffComplete=false;handoffElapsed=0;}
  let holdingFilm=false;
  if(!handoffComplete&&target>=openingEnd&&progress>=openingEnd-.001){progress=openingEnd;holdingFilm=true;if(opening.film.sourceTime>=opening.film.duration-.055&&!opening.film.video.seeking)handoffElapsed=Math.min(handoffDuration,handoffElapsed+dt);if(handoffElapsed>=handoffDuration){handoffComplete=true;holdingFilm=false;}}
  // A route must decode its final frame before the fog-covered frontal cut.
  // Large explicit chapter/slider seeks are allowed; ordinary playback waits.
  let time=progress*totalSeconds,heldRoute=null;
  for(const r of allRoutes){if(previous*totalSeconds<=r.end+.01&&time>=r.end&&time<r.stop&&!r.film.ended){time=r.end;progress=time/totalSeconds;heldRoute=r;}}
  let active=poseMerchant(clamp(time-openingSeconds,0,merchantSeconds)),speaker=-1,chapter=time<.16?0:time<9?1:time<13?2:time<30?3:time<42.868?4:5;
  mist.clear();
  if(time>=42.768&&time<45.168)mist.draw('dialogue-in',(time-42.768)/2.4);
  for(const r of allRoutes)if(time<r.start||time>r.end)r.film.update(clamp(time-r.start,0,r.duration),{active:false,dt});
  if(time>=45.168&&time<=merchantStop+.001)speaker=0;
  for(let i=0;i<routes.length;i++){
   const r=routes[i];if(time<r.outStart-.001)break;
   if(time<=r.outStart+.001){active=i===0?poseMerchant(merchantSeconds):poseFrontal(encounters[i]);speaker=i;chapter=5+i*2;break;}
   chapter=6+i*2;speaker=-1;
   if(time<r.start){const p=(time-r.outStart)/FOG;active=p<CUT?(i===0?poseMerchant(merchantSeconds):poseFrontal(encounters[i])):poseRoute(r,0,dt,false);mist.draw('dialogue-out',r.kind==='woodcutter'?Math.min(p,CUT):p);break;}
   if(time<r.end||heldRoute===r){active=poseRoute(r,clamp(time-r.start,0,r.duration),dt,true);if(r.kind==='woodcutter'&&time-r.start<1.9)mist.draw('dialogue-out',CUT+(1-CUT)*(time-r.start)/1.9);if(time>=r.inStart)mist.draw('dialogue-in',(time-r.inStart)/FOG);break;}
   active=poseFrontal(r.encounter);
   if(time<r.stop){mist.draw('dialogue-in',(time-r.inStart)/FOG);if(time>r.stop-.06)speaker=i+1;break;}
   chapter=7+i*2;speaker=i+1;
  }
  let endingVisible=false;
  if(time>returnRoute.outStart+.001){
   speaker=-1;chapter=14;
   if(time<returnRoute.start){const p=(time-returnRoute.outStart)/FOG;endingVisible=p>=CUT;active=p<CUT?poseFrontal(encounters.at(-1)):poseReturn(0);mist.draw('dialogue-out',p);}
   else if(time<returnRoute.end){endingVisible=true;active=poseReturn(clamp(time-returnRoute.start,0,returnRoute.duration));}
   else {active=poseReturn(returnRoute.duration,dt,false);endingVisible=true;ending.update(Math.max(0,time-returnRoute.stop),elapsed);const local=time-returnRoute.stop;chapter=local<10.6?15:local<11.6?16:local<ending.duration-.01?17:18;}
  }
  if(!endingVisible)ending.hide();
  finish.hidden=!endingVisible||!ending.finished;
  renderer.setRenderTarget(null);renderer.render(active.scene,active.camera);
  const openingVisible=progress<openingEnd||holdingFilm;
  if(openingVisible){opening.update(holdingFilm?1:progress/openingEnd,elapsed,holdingFilm?1-smooth(handoffElapsed/handoffDuration):1);speaker=-1;}else opening.hide();
  document.body.dataset.openingPhase=openingVisible?openingPhase(progress/openingEnd):'encounter';const navigationVisible=1;$('storyIndexBar').style.opacity=String(navigationVisible);$('storyIndexBar').style.visibility=navigationVisible>.001?'visible':'hidden';
  entryDraft.update(time,dt);
  showDialogue(speaker);voices.tick(dt);footsteps.tick();
  const voiceState=voices.proof();
  const dialogueDucking=speaker>=0&&!voiceState.ended;
  const musicTarget=soundOn&&!document.hidden&&progress>.002&&!dialogueDucking?.045*(endingVisible?ending.musicGain:1):0;
  fadeMusic(musicTarget,dt);if(endingVisible&&ending.finished)music.volume=0;
  if(naturalPlayback&&speaker>=0&&Math.abs(progress-stops[speaker])<.00002&&dialogueFinished!==speaker){
   if(dialogueTimed!==speaker){dialogueTimed=speaker;dialogueElapsed=0;$('run').textContent='이동 멈춤';}
   if(!document.hidden)dialogueElapsed+=dt;
   if(dialogueElapsed>=dialogueSeconds(speaker)&&voices.canFinish()){
    dialogueFinished=speaker;dialogueTimed=-1;target=stops[speaker]+.000001;startAutomatic('dialogue-out',routes[speaker]?.start??returnRoute.start);
   }
  }
  $('hint').hidden=speaker>=0||auto||holdingFilm||!!heldRoute||ending.finished&&endingVisible||Math.abs(progress-target)>.0001;$('hint').textContent='Scroll';
  $('progress').value=String(progress);$('chapter').value=String(chapter);
  const head=new THREE.Vector3(0,active.height,0);if(active.hero){active.hero.localToWorld(head);head.project(active.camera);}
  document.body.dataset.proof=JSON.stringify({voice:voices.proof(),entryDraft:entryDraft.proof(),automatic:{segment:autoSegment,enabled:naturalPlayback,running:auto,limit:autoLimit,dialogueIndex:dialogueTimed,dialogueElapsed,dialogueDuration:speaker>=0?dialogueSeconds(speaker):0},progress,target,timelineSeconds:time,totalSeconds,opening:openingVisible?openingPhase(progress/openingEnd):null,handoff:{holdingFilm,complete:handoffComplete,fade:handoffElapsed/handoffDuration},chapter:labels[chapter],speaker,ambientSeconds:elapsed,camera:active.camera.matrixWorld.toArray(),effectiveHFov:active.effectiveHFov,plateCoverage:active.plateCoverage,headTopScreenY:active.hero?(1-head.y)/2:null,actor:active.actor?.proof(),actorWorldPosition:active.hero?.position.toArray(),actorSafe:active.actorSafe,actorOpacity:active.actorOpacity,renderMethod:'registered-illustrated-story-with-fixed-proportion-actors',film:opening.film.proof(),routes:allRoutes.map(r=>({kind:r.kind,...r.film.proof()})),ending:ending.proof(),musicVolume:music.volume,musicTarget,footsteps:{active:footAudio.dataset.active,starts:Number(footAudio.dataset.starts||0),intervalMs:720},cameraSource:active.manifest.cameraSource,transition:mist.proof(),drawCalls:renderer.info.render.calls});
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}catch(error){loading.innerHTML='풍경을 불러오지 못했습니다. <a href="https://ofjrobj.github.io/digital-heritage/ink-pilot/spatial-test.html">공유 페이지에서 열기</a>';document.body.dataset.error=String(error);console.error(error);}
