import * as THREE from '../../assets/vendor/three.module.js';
import {createVideoActor} from './spatial-video-actor.js?v=final-second-2';

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
 'v064 cloth folder':{p:[-38,-25.4,.2],windows:[[6.9,10.65]]},
 'v071 resident 15 grain provisions':{p:[-45,-29,.2],windows:[[6.8,10.4]]}
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
 * Entry extras are composited behind measured foreground gate silhouettes.
 * These are decoded-frame masks, not a reconstructed whole-scene depth map.
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
 let renderer=null,actorScene=null,actorCamera=null,actorComposite=null,actorCompositeCtx=null;
 let occlusionData=null,occlusionFrames=new Map(),occlusionFrame=null,occlusionPolygons=0;
 const timeline=()=>Math.max(.001,duration);
 const mediaDuration=()=>Number.isFinite(video.duration)&&video.duration>0?video.duration:timeline();
 const toMedia=t=>clamp(t,0,timeline())/timeline()*mediaDuration();
 const fromMedia=t=>clamp(t/mediaDuration()*timeline(),0,timeline());
 const finalFramePresented=()=>{
  const fps=data?.registration?.mediaFps,frames=data?.registration?.mediaFrames;
  return video.ended||(hasPresented&&fps>0&&frames>0&&presentedMediaTime>=(frames-1)/fps-.0001);
 };
 // A decoded frame denotes its whole display interval. The last frame holds
 // the exact final source pose, including the final 1/fps before media EOF.
 const sourceTime=()=>finalFramePresented()?timeline():fromMedia(hasPresented?presentedMediaTime:video.currentTime||0);
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
  // Controller rates are source-timeline seconds per second. A short test
  // render still traverses the full 17-second route, so scale its media rate.
  video.playbackRate=clamp(rate*mediaDuration()/timeline(),.0625,16);mode='forward';
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
  renderer.setPixelRatio(1);renderer.setSize(1920,1080,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000,0);actorScene=new THREE.Scene();actorCamera=new THREE.PerspectiveCamera(30,16/9,.05,1200);
  actorCamera.up.set(0,0,1);
  actorComposite=document.createElement('canvas');actorComposite.width=1920;actorComposite.height=1080;
  actorCompositeCtx=actorComposite.getContext('2d');
 }
 function windowOpacity(time,windows){
  let opacity=0;for(const [a,b] of windows){const edge=Math.min(.28,(b-a)/3);opacity=Math.max(opacity,smooth((time-a)/edge)*smooth((b-time)/edge));}return opacity;
 }
 async function actorConfigs(){
  if(options.actors!==undefined)return options.actors;
  const read=async path=>{const r=await fetch(asset(path));if(!r.ok)throw Error(`${path}: ${r.status}`);return r.json();};
  const results=await Promise.allSettled([read('film-first/extras-metadata.json'),read('film-third/merchant-loop.json')]);
  const configs=[];
  if(results[0].status==='fulfilled')for(const item of results[0].value.actors??[]){
   const id=item.anchor??item.sourceRoot;
   const sourceAnchor=data.anchors?.find(a=>a.id===id)??{id,p:item.worldPosition,sourceFloorZ:item.worldPosition?.[2],heightMetres:item.id==='sweeper'?1.4:1.6};
   const registration=PLATE_ACTOR_REGISTRATION[id];
   const anchor=registration?{...sourceAnchor,sourcePosition:sourceAnchor.p.slice(),p:registration.p.slice(),sourceFloorZ:registration.p[2],registration:'Fixed roadside placement matching generated plate'}:sourceAnchor;
   configs.push({...item,kind:item.kind??item.id,url:item.url??asset('film-first/'+item.file),anchor,windows:registration?.windows,loop:true});
  }else actorErrors.push({kind:'extras-manifest',error:String(results[0].reason)});
  if(results[1].status==='fulfilled'){
   const item=results[1].value;configs.push({...item,kind:'merchant',url:asset('film-third/'+item.file),height:1.86,loop:true,
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
   const actor=createVideoActor(THREE,new URL(config.url??config.src,import.meta.url).href,{...config,autoplay:config.kind==='merchant'&&ambientEnabled,height:config.height??anchor.heightMetres??1.6});
   // Background residents hold a grounded pose; prioritize architectural scale
   // and contact over motion in the small distant sprites.
   if(config.kind!=='merchant'){actor.play=()=>{actor.pause();return Promise.resolve(false);};actor.video.addEventListener('play',()=>actor.pause());}
   const row={actor,anchor,windows,kind:config.kind??anchor.role,loaded:false,opacity:0,shadow:null};actors.push(row);
   const feet=anchor.p.slice();feet[2]=anchor.sourceFloorZ??feet[2];actor.mesh.position.fromArray(feet);actor.mesh.up.set(0,0,1);actorScene.add(actor.mesh);
   if(row.kind!=='merchant'){
    // Ground-plane contact follows the same immutable feet anchor, never the
    // actor's independently animated hands/head. No whole-sprite bobbing.
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(.21,24),new THREE.MeshBasicMaterial({color:0x333832,transparent:true,opacity:.15,depthWrite:false,side:THREE.DoubleSide}));
    shadow.position.fromArray(feet);shadow.position.z+=.004;shadow.scale.set(1,.58,1);shadow.renderOrder=-1;
    actorScene.add(shadow);row.shadow=shadow;
   }
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
   if(row.shadow){row.shadow.visible=row.actor.mesh.visible;row.shadow.material.opacity=.15*row.opacity;}
   if(!row.actor.mesh.visible)continue;
   row.actor.setOpacity(row.opacity);const mesh=row.actor.mesh;
   // Upright billboard around the fixed source feet. Footage itself contains
   // the hand/head movement; no sprite sway or procedural limb deformation.
   mesh.lookAt(actorCamera.position.x,actorCamera.position.y,mesh.position.z);
   visible++;
  }
  if(!visible)return;
  // Use the displayed frame, not the requested scroll position. The film has
  // repeated/held frames, so interpolating silhouettes would expose columns.
  const mediaTime=hasPresented?presentedMediaTime:video.currentTime;
  occlusionFrame=occlusionData?Math.floor(mediaTime/mediaDuration()*occlusionData.duration*occlusionData.fps+1e-4):null;
  const maskPosition=mediaTime/mediaDuration()*occlusionData.duration*occlusionData.fps;
  const aMask=occlusionFrames.get(Math.floor(maskPosition)),bMask=occlusionFrames.get(Math.floor(maskPosition)+1),blend=maskPosition%1;
  const interpolate=(a,b)=>a?.map((polygon,i)=>b?.[i]?.length===polygon.length?polygon.map((point,j)=>point.map((v,k)=>v+(b[i][j][k]-v)*blend)):polygon)??[];
  // Track foreground silhouettes between original annotations at higher FPS.
  // Do not invent topology when a post exits the frame or masks change shape.
  const foreground=aMask&&bMask?{polygons:interpolate(aMask.polygons,bMask.polygons),actorPolygons:Object.fromEntries(Object.entries(aMask.actorPolygons??{}).map(([key,value])=>[key,interpolate(value,bMask.actorPolygons?.[key])]))}:aMask;
  occlusionPolygons=(foreground?.polygons?.length??0)+Object.values(foreground?.actorPolygons??{}).reduce((n,polygons)=>n+polygons.length,0);
  if(foreground&&actorCompositeCtx){
   const visibility=actors.map(row=>({row,actor:row.actor.mesh.visible,shadow:row.shadow?.visible??false}));
   const composite=(polygons)=>{
    renderer.render(actorScene,actorCamera);
    const layer=actorCompositeCtx;layer.clearRect(0,0,actorComposite.width,actorComposite.height);layer.drawImage(renderer.domElement,0,0);
    layer.save();layer.globalCompositeOperation='destination-out';layer.fillStyle='#000';
    layer.scale(actorComposite.width/1280,actorComposite.height/720);
    for(const polygon of polygons){
     layer.beginPath();polygon.forEach(([x,y],i)=>i?layer.lineTo(x,y):layer.moveTo(x,y));layer.closePath();layer.fill();
    }
    layer.restore();ctx.drawImage(actorComposite,dest.x,dest.y,dest.width,dest.height);
   };
   if(foreground.actorPolygons){
    // The garden fence is between the cloth folder and the lens, while the
    // sweeper is on its near side. Keep these depth relationships separate.
    for(const current of visibility){
     if(!current.actor)continue;
     for(const state of visibility){const selected=state===current;state.row.actor.mesh.visible=selected&&state.actor;if(state.row.shadow)state.row.shadow.visible=selected&&state.shadow;}
     composite([...(foreground.polygons??[]),...(foreground.actorPolygons[current.row.anchor.id]??[])]);
    }
   }else{
    composite(foreground.polygons??[]);
   }
   for(const state of visibility){state.row.actor.mesh.visible=state.actor;if(state.row.shadow)state.row.shadow.visible=state.shadow;}

  }else{
   renderer.render(actorScene,actorCamera);ctx.drawImage(renderer.domElement,dest.x,dest.y,dest.width,dest.height);
  }
 }
 function draw(ctx,rect,time){
  if(time!==undefined)command(time);
  tick(performance.now());if(!loaded||video.readyState<2||disposed)return false;
  const x=rect?.x??0,y=rect?.y??0,w=rect?.width??rect?.w??ctx.canvas.width,h=rect?.height??rect?.h??ctx.canvas.height;
  if(!(w>0&&h>0))return false;
  const scale=Math.max(w/16,h/9),dest={x:x+(w-scale*16)/2,y:y+(h-scale*9)/2,width:scale*16,height:scale*9};
  const vw=video.videoWidth,vh=video.videoHeight,sw=Math.min(vw,vh*16/9),sh=sw*9/16;
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  ctx.filter="url('#spatialFilmNeutral')";
  ctx.drawImage(video,(vw-sw)/2,(vh-sh)/2,sw,sh,dest.x,dest.y,dest.width,dest.height);
  ctx.filter='none';
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
 video.src=options.url?new URL(options.url,import.meta.url).href:'https://d8j0ntlcm91z4.cloudfront.net/user_3GnUBQ5Hr05qllQJ2NH8rbiaT3p/hf_20261013_025317_40ca510a-8b2c-4f3f-b69d-da31465c0fa5.mp4';video.load();
 const occlusionReady=(options.occlusionData?Promise.resolve(options.occlusionData):fetch(options.occlusionUrl?new URL(options.occlusionUrl,import.meta.url):asset('film-third/entry-occlusion.json')).then(r=>{if(!r.ok)throw Error(`Entry occlusion ${r.status}`);return r.json();})).then(value=>{occlusionData=value;occlusionFrames=new Map(value.frames.map(row=>[row.frame,row]));return value;});
 const dataReady=(options.cameraData?Promise.resolve(options.cameraData):fetch(options.cameraUrl?new URL(options.cameraUrl,import.meta.url):asset('film-third/opening-camera-hq.json?v=final-second-2')).then(r=>{if(!r.ok)throw Error(`Camera track ${r.status}`);return r.json();})).then(value=>{data=value;duration=Number(data.duration)||17;actorsReady=setupActors();return data;});
 const ready=Promise.all([videoReady,dataReady,occlusionReady]).then(()=>{mode='paused';return api;});
 const api={video,ready,command,draw,cameraAt,play,pause,unlock,setAmbient,actor(kind){return actors.find(row=>row.kind===kind)?.actor??null;},
  get sourceTime(){return sourceTime();},get ended(){return finalFramePresented();},get targetTime(){return target;},get duration(){return timeline();},get actorsReady(){return actorsReady;},
  proof(){return {resolution:[video.videoWidth,video.videoHeight],mediaFps:data?.registration?.mediaFps,method:'continuous-recorded-background',loaded,mode,targetTime:target,sourceTime:sourceTime(),mediaTime:video.currentTime,mediaDuration:mediaDuration(),sourceDuration:timeline(),presentedMediaTime,decodedFrames,paused:video.paused,seeking:video.seeking,playbackRate:video.playbackRate,seeks,forwardSeeks,reverseSeeks,playCalls,lastDrawTime,rect:lastRect,error:lastError||null,
   actorOcclusion:'Decoded-frame gate, plinth and adjacent-wall masks, with actor-specific garden-fence depth; not whole-scene depth',occlusion:{loaded:!!occlusionData,frame:occlusionFrame,polygons:occlusionPolygons,trackedFrames:occlusionFrames.size},actors:actors.map(row=>({kind:row.kind,anchor:row.anchor.id,worldPosition:row.anchor.p,sourcePosition:row.anchor.sourcePosition??row.anchor.p,registration:row.anchor.registration??'Source world anchor',opacity:row.opacity,windows:row.windows,contactShadow:!!row.shadow,...row.actor.proof()})),actorErrors};},
  dispose(){if(disposed)return;disposed=true;cancelVideoReady();if(frameRequest!==null&&video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(frameRequest);gestures.forEach(type=>document.removeEventListener(type,unlock));document.removeEventListener('visibilitychange',onVisibility);video.removeEventListener('seeked',onSeeked);video.pause();video.removeAttribute('src');video.load();for(const {actor,shadow}of actors){actor.dispose();shadow?.geometry.dispose();shadow?.material.dispose();}renderer?.dispose();}
 };
 return api;
}
export const createFilm=createSpatialFilm;
