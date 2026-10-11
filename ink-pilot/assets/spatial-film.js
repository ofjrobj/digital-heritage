import * as THREE from '../../assets/vendor/three.module.js';
import {createVideoActor} from './spatial-video-actor.js';

const clamp=(v,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const asset=path=>new URL(path,import.meta.url).href;
const SAFE_WINDOWS=Object.freeze({
 'v064 laundry hanger':[[.15,5.85],[6.9,10.75]],
 'v064 courtyard sweeper':[[.15,3.95]],
 'v064 cloth folder':[[.15,5.85],[6.9,11.1]],
 'v071 resident 15 grain provisions':[[.15,5.7],[6.8,10.6]],
 'v068 town 03 v064 courtyard sweeper':[]
});
// Extras occupy fixed roadside work positions registered to the painted plate.
// The center lane is clear; preserve original source roots for comparison.
const PLATE_ACTOR_REGISTRATION=Object.freeze({
 'v064 cloth folder':{p:[-38,-25.4,.2],windows:[[.15,5.85],[6.9,10.65]]},
 'v071 resident 15 grain provisions':{p:[-45,-29,.2],windows:[[.15,5.7],[6.8,10.4]]}
});

/**
 * A scroll-controlled continuous background film with independently playing
 * recorded actors. Times are SOURCE seconds (0..17), not normalized progress.
 *
 * const film=createSpatialFilm({actors:[{url,anchor:'v064 laundry hanger',
 *   kind:'laundry',height:1.6,bounds:{left,top,right,bottom}}]});
 * await film.ready; film.command(targetSeconds); film.draw(ctx,rect);
 *
 * draw(ctx,{x,y,width,height},targetSeconds?) updates the travel controller and
 * draws the most recently decoded background frame. Rect uses canvas pixels.
 * It always uses one centered 16:9 crop for BOTH film and projected actors.
 * Actors are never sought by command(), draw(), or cameraAt(). Their video
 * time continues while the background is paused; setAmbient(false) is explicit.
 * cameraAt() returns native Blender Z-up p and WXYZ quaternion for source time.
 * Visibility windows were inspected against the source and generated plate;
 * this is compositing, with no runtime depth/occlusion reconstruction.
 */
export function createSpatialFilm(options={}){
 const video=document.createElement('video');
 video.crossOrigin='anonymous';video.preload='auto';video.muted=true;video.defaultMuted=true;
 video.playsInline=true;video.loop=false;video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');
 let disposed=false,loaded=false,data=null,duration=17,target=0,presentedMediaTime=0,hasPresented=false;
 let decodedFrames=0,frameRequest=null,lastTick=performance.now(),lastCommandAt=0,lastCommand=0;
 let targetVelocity=0,rate=1,playPending=false,lastPlayAttempt=-Infinity,lastError='',pendingSeek=null;
 let seeks=0,forwardSeeks=0,reverseSeeks=0,playCalls=0,ambientEnabled=options.ambient!==false;
 let mode='loading',lastDrawTime=0,lastRect=null;
 const actors=[],actorErrors=[];
 let renderer=null,actorScene=null,actorCamera=null;
 const timeline=()=>Math.max(.001,duration);
 const mediaDuration=()=>Number.isFinite(video.duration)&&video.duration>0?video.duration:timeline();
 const toMedia=t=>clamp(t,0,timeline())/timeline()*mediaDuration();
 const fromMedia=t=>clamp(t/mediaDuration()*timeline(),0,timeline());
 const sourceTime=()=>fromMedia(hasPresented?presentedMediaTime:video.currentTime||0);
 const controllerTime=()=>fromMedia(video.currentTime||0);

 function onFrame(_now,metadata){
  if(disposed)return;presentedMediaTime=metadata.mediaTime;decodedFrames=metadata.presentedFrames;hasPresented=true;
  frameRequest=video.requestVideoFrameCallback(onFrame);
 }
 async function play(){
  if(disposed||playPending||!loaded||performance.now()-lastPlayAttempt<250)return false;
  playPending=true;lastPlayAttempt=performance.now();playCalls++;
  try{await video.play();lastError='';return true;}catch(e){lastError=e?.message||String(e);return false;}finally{playPending=false;}
 }
 function seek(t,reason){
  const source=clamp(t,0,timeline());video.pause();
  if(video.seeking){pendingSeek={time:source,reason};return;}
  if(Math.abs(controllerTime()-source)<1/120)return;
  pendingSeek=null;seeks++;if(reason==='reverse')reverseSeeks++;else forwardSeeks++;
  video.currentTime=Math.min(toMedia(source),Math.max(0,mediaDuration()-.001));
 }
 function onSeeked(){
  // A seek updates the visible frame even in engines without frame callbacks.
  if(!video.requestVideoFrameCallback){presentedMediaTime=video.currentTime;hasPresented=true;}
  if(pendingSeek){const next=pendingSeek;pendingSeek=null;seek(next.time,next.reason);}
 }
 video.addEventListener('seeked',onSeeked);
 function command(time,{snap=false}={}){
  if(disposed||!Number.isFinite(time))return;
  const now=performance.now(),next=clamp(time,0,timeline()),dt=(now-lastCommandAt)/1000;
  if(dt>0&&dt<.3){const velocity=(next-lastCommand)/dt;targetVelocity=targetVelocity*.65+clamp(velocity,-6,6)*.35;}
  else targetVelocity=0;
  lastCommand=next;lastCommandAt=now;target=next;
  if(snap&&loaded){mode='seek';seek(target,'jump');}
 }
 function tick(now){
  const dt=clamp((now-lastTick)/1000,.001,.1);lastTick=now;
  if(!loaded||disposed)return;
  if(document.hidden){video.pause();mode='hidden';return;}
  const actual=controllerTime(),remaining=target-actual;
  if(remaining<-.045){mode='reverse';seek(target,'reverse');return;}
  if(video.seeking){mode='seeking';return;}
  if(remaining<=.024||target===0||actual>=timeline()-.015){
   video.pause();mode='paused';rate=.35;return;
  }
  // Forward frames are decoded normally. Proportional correction catches up
  // to a scroll target and slows before it; no currentTime writes per rAF.
  const velocity=now-lastCommandAt<100?Math.max(0,targetVelocity):0;
  const desired=clamp(remaining*3.8+velocity*.2,.25,options.maxPlaybackRate??2.5);
  rate+=(desired-rate)*(1-Math.exp(-dt/.13));
  video.playbackRate=clamp(rate,.25,options.maxPlaybackRate??2.5);mode='forward';
  if(video.paused)void play();
 }
 function cameraAt(time=sourceTime()){
  const samples=data?.samples;if(!samples?.length)return null;
  let t=clamp(time,0,timeline());
  if(options.quantizeCamera)t=Math.floor((t+1e-7)*(data.sourceUniqueFps||8))/(data.sourceUniqueFps||8);
  let lo=0,hi=samples.length-1;
  while(lo+1<hi){const mid=(lo+hi)>>1;if(samples[mid].time<=t)lo=mid;else hi=mid;}
  const a=samples[lo],b=samples[Math.min(lo+1,samples.length-1)],u=clamp((t-a.time)/Math.max(1e-9,b.time-a.time));
  const aq=a.qWXYZ??a.q,bq=b.qWXYZ??b.q;
  const q=new THREE.Quaternion(aq[1],aq[2],aq[3],aq[0]).slerp(new THREE.Quaternion(bq[1],bq[2],bq[3],bq[0]),u);
  return {time:t,p:a.p.map((v,i)=>v+(b.p[i]-v)*u),qWXYZ:[q.w,q.x,q.y,q.z],
   horizontalFov:(a.horizontalFov??data.horizontalFov??48)+((b.horizontalFov??data.horizontalFov??48)-(a.horizontalFov??data.horizontalFov??48))*u,
   shift:(a.shift??[0,0]).map((v,i)=>v+((b.shift??[0,0])[i]-v)*u)};
 }
 function ensureActorRenderer(){
  if(renderer)return;
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,premultipliedAlpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(1);renderer.setSize(1280,720,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000,0);actorScene=new THREE.Scene();actorCamera=new THREE.PerspectiveCamera(30,16/9,.05,1200);
  actorCamera.up.set(0,0,1);
 }
 function windowOpacity(time,windows){
  let opacity=0;for(const [a,b] of windows){const edge=Math.min(.28,(b-a)/3);opacity=Math.max(opacity,smooth((time-a)/edge)*smooth((b-time)/edge));}return opacity;
 }
 async function actorConfigs(){
  if(options.actors!==undefined)return options.actors;
  const read=async path=>{const r=await fetch(asset(path));if(!r.ok)throw Error(`${path}: ${r.status}`);return r.json();};
  const results=await Promise.allSettled([read('film-first/extras-metadata.json'),read('film-first/merchant-loop.json')]);
  const configs=[];
  if(results[0].status==='fulfilled')for(const item of results[0].value.actors??[]){
   const id=item.anchor??item.sourceRoot;
   const sourceAnchor=data.anchors?.find(a=>a.id===id)??{id,p:item.worldPosition,sourceFloorZ:item.worldPosition?.[2],heightMetres:item.id==='sweeper'?1.4:1.6};
   const registration=PLATE_ACTOR_REGISTRATION[id];
   const anchor=registration?{...sourceAnchor,sourcePosition:sourceAnchor.p.slice(),p:registration.p.slice(),sourceFloorZ:registration.p[2],registration:'Fixed roadside placement matching generated plate'}:sourceAnchor;
   configs.push({...item,kind:item.kind??item.id,url:item.url??asset('film-first/'+item.file),anchor,windows:registration?.windows,loop:true});
  }else actorErrors.push({kind:'extras-manifest',error:String(results[0].reason)});
  if(results[1].status==='fulfilled'){
   const item=results[1].value;configs.push({...item,kind:'merchant',url:asset('film-first/'+item.file),height:1.86,loop:true,
    anchor:{id:'Jegeumru merchant',p:[22,-19,2.0691163539886475],sourceFloorZ:2.0691163539886475},windows:[[13,17.5]]});
  }else actorErrors.push({kind:'merchant-manifest',error:String(results[1].reason)});
  return configs;
 }
 async function setupActors(){
  const configs=await actorConfigs();if(!configs.length)return [];
  ensureActorRenderer();
  return Promise.allSettled(configs.map(async config=>{
   const anchor=typeof config.anchor==='string'?data.anchors?.find(a=>a.id===config.anchor):config.anchor;
   if(!anchor||anchor.replaced)throw Error(`Missing or replaced actor anchor: ${config.anchor}`);
   const windows=config.windows??anchor.visibleWindows??SAFE_WINDOWS[anchor.id]??[];
   const actor=createVideoActor(THREE,new URL(config.url??config.src,import.meta.url).href,{...config,autoplay:ambientEnabled,height:config.height??anchor.heightMetres??1.6});
   const row={actor,anchor,windows,kind:config.kind??anchor.role,loaded:false,opacity:0};actors.push(row);
   const feet=anchor.p.slice();feet[2]=anchor.sourceFloorZ??feet[2];actor.mesh.position.fromArray(feet);actor.mesh.up.set(0,0,1);actorScene.add(actor.mesh);
   try{await actor.ready;row.loaded=true;if(ambientEnabled)void actor.play();else actor.pause();return row;}
   catch(error){actorErrors.push({kind:row.kind,error:String(error)});actor.mesh.visible=false;throw error;}
  }));
 }
 function drawActors(ctx,dest,time){
  if(!renderer||!actors.length)return;
  const pose=cameraAt(time);if(!pose)return;
  actorCamera.position.fromArray(pose.p);const q=pose.qWXYZ;actorCamera.quaternion.set(q[1],q[2],q[3],q[0]);
  actorCamera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(pose.horizontalFov/2))/(16/9)));
  actorCamera.updateProjectionMatrix();actorCamera.updateMatrixWorld();
  let visible=0;
  for(const row of actors){
   row.opacity=row.loaded?windowOpacity(time,row.windows):0;row.actor.mesh.visible=row.opacity>.001;
   if(!row.actor.mesh.visible)continue;
   row.actor.setOpacity(row.opacity);const mesh=row.actor.mesh;
   // Upright billboard around the fixed source feet. Footage itself contains
   // the hand/head movement; no sprite sway or procedural limb deformation.
   mesh.lookAt(actorCamera.position.x,actorCamera.position.y,mesh.position.z);
   visible++;
  }
  if(!visible)return;
  renderer.render(actorScene,actorCamera);ctx.drawImage(renderer.domElement,dest.x,dest.y,dest.width,dest.height);
 }
 function draw(ctx,rect,time){
  if(time!==undefined)command(time);
  tick(performance.now());if(!loaded||video.readyState<2||disposed)return false;
  const x=rect?.x??0,y=rect?.y??0,w=rect?.width??rect?.w??ctx.canvas.width,h=rect?.height??rect?.h??ctx.canvas.height;
  if(!(w>0&&h>0))return false;
  const scale=Math.max(w/16,h/9),dest={x:x+(w-scale*16)/2,y:y+(h-scale*9)/2,width:scale*16,height:scale*9};
  const vw=video.videoWidth,vh=video.videoHeight,sw=Math.min(vw,vh*16/9),sh=sw*9/16;
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  ctx.drawImage(video,(vw-sw)/2,(vh-sh)/2,sw,sh,dest.x,dest.y,dest.width,dest.height);
  const shown=sourceTime();drawActors(ctx,dest,shown);ctx.restore();lastDrawTime=shown;lastRect=dest;return true;
 }
 function setAmbient(enabled){ambientEnabled=Boolean(enabled);for(const {actor} of actors)if(ambientEnabled)void actor.play();else actor.pause();}
 function pause(){target=controllerTime();video.pause();mode='paused';}
 function unlock(){if(target>controllerTime()+.024)void play();if(ambientEnabled)for(const {actor}of actors)void actor.play();}
 const gestures=['pointerdown','touchstart','wheel','keydown'];gestures.forEach(type=>document.addEventListener(type,unlock,{passive:true}));
 function onVisibility(){if(document.hidden){video.pause();for(const {actor}of actors)actor.pause();}else if(ambientEnabled){for(const {actor}of actors)void actor.play();}}
 document.addEventListener('visibilitychange',onVisibility);
 let cancelVideoReady=()=>{},actorsReady=Promise.resolve([]);
 const videoReady=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>fail(Error('Background film did not load within 45 seconds')),45000);
  function cleanup(){clearTimeout(timeout);video.removeEventListener('loadeddata',success);video.removeEventListener('error',fail);}
  function success(){cleanup();loaded=true;if(video.requestVideoFrameCallback)frameRequest=video.requestVideoFrameCallback(onFrame);resolve(video);}
  function fail(error){cleanup();lastError=error instanceof Error?error.message:video.error?.message||'Background film failed to load';reject(Error(lastError));}
  cancelVideoReady=()=>{cleanup();if(!loaded)reject(Error('Background film disposed before loading'));};
  video.addEventListener('loadeddata',success,{once:true});video.addEventListener('error',fail,{once:true});
 });
 video.src=options.url?new URL(options.url,import.meta.url).href:asset('film-first/journey.mp4');video.load();
 const dataReady=(options.cameraData?Promise.resolve(options.cameraData):fetch(options.cameraUrl?new URL(options.cameraUrl,import.meta.url):asset('film-first/camera.json')).then(r=>{if(!r.ok)throw Error(`Camera track ${r.status}`);return r.json();})).then(value=>{data=value;duration=Number(data.duration)||17;actorsReady=setupActors();return data;});
 const ready=Promise.all([videoReady,dataReady]).then(()=>{mode='paused';return api;});
 const api={video,ready,command,draw,cameraAt,play,pause,unlock,setAmbient,actor(kind){return actors.find(row=>row.kind===kind)?.actor??null;},
  get sourceTime(){return sourceTime();},get targetTime(){return target;},get duration(){return timeline();},get actorsReady(){return actorsReady;},
  proof(){return {method:'continuous-recorded-background',loaded,mode,targetTime:target,sourceTime:sourceTime(),mediaTime:video.currentTime,mediaDuration:mediaDuration(),sourceDuration:timeline(),presentedMediaTime,decodedFrames,paused:video.paused,seeking:video.seeking,playbackRate:video.playbackRate,seeks,forwardSeeks,reverseSeeks,playCalls,lastDrawTime,rect:lastRect,error:lastError||null,
   actorOcclusion:'Conservative visibility windows; no reconstructed depth',actors:actors.map(row=>({kind:row.kind,anchor:row.anchor.id,worldPosition:row.anchor.p,sourcePosition:row.anchor.sourcePosition??row.anchor.p,registration:row.anchor.registration??'Source world anchor',opacity:row.opacity,windows:row.windows,...row.actor.proof()})),actorErrors};},
  dispose(){if(disposed)return;disposed=true;cancelVideoReady();if(frameRequest!==null&&video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(frameRequest);gestures.forEach(type=>document.removeEventListener(type,unlock));document.removeEventListener('visibilitychange',onVisibility);video.removeEventListener('seeked',onSeeked);video.pause();video.removeAttribute('src');video.load();for(const {actor}of actors)actor.dispose();renderer?.dispose();}
 };
 return api;
}
export const createFilm=createSpatialFilm;
