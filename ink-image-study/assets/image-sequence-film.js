import * as THREE from '../../assets/vendor/three.module.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
// This fork uses immutable illustrations. It does not decode generated travel
// video or morph architecture between frames. Camera motion is a 2D pan/dolly;
// white mist covers each change of viewpoint. Source Blender track is retained
// for timing and handoff metadata, not claimed as reconstructed 3D geometry.
export function createSpatialFilm(){
 const shots=[
  {id:'aerial',path:'locked-style/aerial-korean-ink.webp',a:0,b:3.2,z:[1,1.13],cx:[.5,.56],cy:[.5,.54]},
  {id:'descent',path:'image-sequence/descent.webp',a:3.2,b:8.5,z:[1,1.16],cx:[.5,.61],cy:[.5,.57]},
  {id:'entry',path:'image-sequence/entry.webp',a:8.5,b:11.5,z:[1,1.12],cx:[.5,.5],cy:[.5,.52]},
  {id:'street',path:'image-sequence/street.webp',a:11.5,b:14,z:[1,1.10],cx:[.5,.46],cy:[.5,.5]},
  {id:'merchant',path:'image-sequence/merchant.webp',a:14,b:17,z:[1.05,1],cx:[.5,.5],cy:[.5,.5]}
 ];
 let target=0,data=null,draws=0,shown='aerial',veil=0;
 const ready=Promise.all([
  ...shots.map(async s=>{const im=new Image();im.src=new URL(s.path,import.meta.url).href;await im.decode();s.image=im;}),
  fetch(new URL('film-third/opening-camera-hq.json',import.meta.url)).then(r=>r.json()).then(v=>data=v)
 ]);
 function cameraAt(t=target){
  const samples=data?.samples;if(!samples?.length)return null;
  let lo=0,hi=samples.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(samples[m].time<=t)lo=m;else hi=m;}
  const a=samples[lo],b=samples[Math.min(lo+1,samples.length-1)],u=clamp((t-a.time)/Math.max(.001,b.time-a.time)),aq=a.qWXYZ??a.q,bq=b.qWXYZ??b.q;
  const q=new THREE.Quaternion(aq[1],aq[2],aq[3],aq[0]).slerp(new THREE.Quaternion(bq[1],bq[2],bq[3],bq[0]),u);
  return {time:t,p:a.p.map((v,i)=>v+(b.p[i]-v)*u),qWXYZ:[q.w,q.x,q.y,q.z],horizontalFov:48,shift:[0,0]};
 }
 function draw(ctx,rect={},time=target){
  target=clamp(time,0,17);const s=shots.find(s=>target<s.b)||shots.at(-1);if(!s.image)return false;
  const u=ease((target-s.a)/(s.b-s.a)),z=s.z[0]+(s.z[1]-s.z[0])*u,cx=s.cx[0]+(s.cx[1]-s.cx[0])*u,cy=s.cy[0]+(s.cy[1]-s.cy[0])*u;
  const x=rect.x??0,y=rect.y??0,w=rect.width??ctx.canvas.width,h=rect.height??ctx.canvas.height,im=s.image;
  let sw=im.width/z,sh=sw*h/w;if(sh>im.height/z){sh=im.height/z;sw=sh*w/h;}
  const sx=clamp(im.width*cx-sw/2,0,im.width-sw),sy=clamp(im.height*cy-sh/2,0,im.height-sh);
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.filter="url('#spatialOpeningPaperBalance')";ctx.drawImage(im,sx,sy,sw,sh,x,y,w,h);ctx.filter='none';
  veil=0;for(const cut of [3.2,8.5,11.5,14])veil=Math.max(veil,1-ease((Math.abs(target-cut)-.07)/.5));
  if(veil>0){ctx.fillStyle=`rgba(255,255,255,${veil})`;ctx.fillRect(x,y,w,h);}
  ctx.restore();shown=s.id;draws++;return true;
 }
 return {ready,actorsReady:Promise.resolve([]),actor:()=>null,video:{seeking:false,paused:true},command(t){target=clamp(t,0,17);},draw,cameraAt,pause(){},play:async()=>false,unlock(){},setAmbient(){},dispose(){},get sourceTime(){return target;},get targetTime(){return target;},get duration(){return 17;},get ended(){return target>=17;},proof(){return {method:'chatgpt-illustrations-pan-and-mist',sourceTime:target,targetTime:target,sourceDuration:17,shot:shown,transitionOpacity:veil,draws,generatedTravelVideos:0,immutableFrames:true,resolution:shots.find(s=>s.id===shown)?.image?[shots.find(s=>s.id===shown).image.width,shots.find(s=>s.id===shown).image.height]:null};}};
}
