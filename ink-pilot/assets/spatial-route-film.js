import * as THREE from '../../assets/vendor/three.module.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};

// The camera clock controls only this background. Character videos have their
// own clocks and are never sought when the viewer stops, reverses, or scrolls.
export function createRouteFilm(url,track){
 const video=document.createElement('video');
 video.crossOrigin='anonymous';video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='auto';video.loop=false;
 video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');
 const duration=track.duration,texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;
 let loaded=false,target=0,presented=0,hasPresented=false,pending=null,playing=false,lastPlay=-Infinity,rate=.3,mode='loading',seeks=0,frames=0,error=null;
 const mediaDuration=()=>Number.isFinite(video.duration)?video.duration:4;
 const sourceTime=()=>Math.min(duration,(hasPresented?presented:video.currentTime)/mediaDuration()*duration);
 const controlTime=()=>video.currentTime/mediaDuration()*duration;
 const onFrame=(_now,metadata)=>{presented=metadata.mediaTime;hasPresented=true;frames=metadata.presentedFrames;video.requestVideoFrameCallback(onFrame);};
 async function play(){if(playing||performance.now()-lastPlay<250)return;playing=true;lastPlay=performance.now();try{await video.play();error=null;}catch(e){error=String(e);}finally{playing=false;}}
 function seek(time){video.pause();if(video.seeking){pending=time;return;}pending=null;if(Math.abs(controlTime()-time)<.012)return;seeks++;video.currentTime=Math.min(time/duration*mediaDuration(),Math.max(0,mediaDuration()-.001));}
 video.addEventListener('seeked',()=>{if(!video.requestVideoFrameCallback){presented=video.currentTime;hasPresented=true;}if(pending!==null){const next=pending;pending=null;seek(next);}});
 const ready=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Route film load timed out: '+url)),45000);
  video.addEventListener('loadeddata',()=>{clearTimeout(timer);loaded=true;mode='paused';if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(onFrame);resolve();},{once:true});
  video.addEventListener('error',()=>{clearTimeout(timer);error=video.error?.message||'Route film failed';reject(Error(error+': '+url));},{once:true});
 });
 video.src=url;video.load();
 function update(time,{active=true,snap=false,dt=.016}={}){
  target=clamp(time,0,duration);if(!loaded)return;
  if(snap){mode='seek';seek(target);return;}
  if(!active||document.hidden){video.pause();mode='inactive';return;}
  const remaining=target-controlTime();
  if(remaining<-.055){mode='reverse';seek(target);return;}
  if(video.seeking){mode='seeking';return;}
  if(remaining<=.025||target===0||controlTime()>=duration-.015){video.pause();mode='paused';return;}
  // Four seconds of generated media are presented over the complete original
  // path's travel time. Decoding normally keeps forward motion video-like.
  const desired=clamp((1+remaining*3.5)*mediaDuration()/duration,.1,2);
  rate+=(desired-rate)*(1-Math.exp(-dt/.16));video.playbackRate=rate;mode='forward';if(video.paused)void play();
 }
 function cameraAt(time=sourceTime()){
  const f=clamp(time/duration)*(track.samples.length-1),i=Math.min(track.samples.length-2,Math.floor(f)),u=f-i;
  const a=track.samples[i],b=track.samples[i+1],aq=a.q,bq=b.q;
  const q=new THREE.Quaternion(aq[1],aq[2],aq[3],aq[0]).slerp(new THREE.Quaternion(bq[1],bq[2],bq[3],bq[0]),u);
  return {p:a.p.map((v,n)=>v+(b.p[n]-v)*u),q:[q.w,q.x,q.y,q.z],horizontalFov:track.horizontalFov};
 }
 return {video,texture,ready,update,cameraAt,get sourceTime(){return sourceTime();},get duration(){return duration;},
  get ended(){return loaded&&!video.seeking&&sourceTime()>=duration-(duration/mediaDuration()/24+.025);},
  proof(){return {sourceTime:sourceTime(),targetTime:target,duration,mediaTime:video.currentTime,mediaDuration:mediaDuration(),paused:video.paused,seeking:video.seeking,mode,seeks,decodedFrames:frames,error,completeSourcePath:true};}
 };
}

// The original v071 dialogue mist has an opaque .40..52 plateau. Both camera
// cuts occur at .48, so incompatible backgrounds never crossfade visibly.
export function createDialogueMist(stage){
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;opacity:0';stage.append(canvas);
 const ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 function noiseTexture(seed){
  const c=document.createElement('canvas');c.width=384;c.height=216;const context=c.getContext('2d'),pixels=context.createImageData(c.width,c.height);
  const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7+seed*93.3)*43758.5453;return n-Math.floor(n);};
  const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y);let fx=smooth(x-ix),fy=smooth(y-iy);return(hash(ix,iy)*(1-fx)+hash(ix+1,iy)*fx)*(1-fy)+(hash(ix,iy+1)*(1-fx)+hash(ix+1,iy+1)*fx)*fy;};
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
   let n=0;for(let octave=0;octave<5;octave++)n+=noise(x/100*2**octave,y/75*2**octave)*.5**(octave+1);
   const i=(y*c.width+x)*4,edge=Math.sin(Math.PI*x/(c.width-1))**.35*Math.sin(Math.PI*y/(c.height-1))**.35;
   pixels.data[i]=224;pixels.data[i+1]=230;pixels.data[i+2]=219;pixels.data[i+3]=clamp((n-.27)*720,0,255)*edge;
  }context.putImageData(pixels,0,0);return c;
 }
 const textures=[noiseTexture(13),noiseTexture(37)];let last=-1,lastKind='';
 return {draw(kind,progress){
  const p=clamp(progress),strength=smooth(p/.40)*(1-smooth((p-.52)/.48));
  canvas.style.opacity=String(strength);canvas.hidden=strength<=.001;canvas.dataset.progress=String(p);canvas.dataset.transition=kind;
  if(canvas.hidden||p===last&&kind===lastKind)return strength;last=p;lastKind=kind;ctx.clearRect(0,0,960,540);
  ctx.fillStyle=`rgba(220,226,215,${strength})`;ctx.fillRect(0,0,960,540);
  const shift=reduced?0:(p-.5)*160,direction=kind==='dialogue-in'?1:-1;
  ctx.globalAlpha=.92;ctx.drawImage(textures[0],-230+shift*direction,-90,1440,810);
  ctx.globalAlpha=.64;ctx.drawImage(textures[1],-240-shift*direction*.6,-180,1440,810);ctx.globalAlpha=1;return strength;
 },clear(){canvas.hidden=true;canvas.style.opacity='0';last=-1;},proof(){return {kind:canvas.dataset.transition,progress:Number(canvas.dataset.progress)||0,opacity:Number(canvas.style.opacity),fullyOccluded:Number(canvas.style.opacity)===1};}};
}
