import {assetURL} from './asset-url.js';
/* Registered ending compositor. Architecture is revealed only inside masks
 * rendered from the same Blender camera as the illustrated plates. The lion
 * scan silhouette and the camera remain fixed throughout the time passage.
 * Story seconds drive seasons; ambient seconds drive weather and child loops.
 */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const ramp=(t,a,b)=>smooth((t-a)/(b-a));
const pulse=(t,a,b,c,d)=>ramp(t,a,b)*(1-ramp(t,c,d));
export const endingDuration=20;
export const endingTiming=Object.freeze({settle:1,seasons:17,fade:2,removal:[40.52,42.45],construction:[43.2,44.6],dawn:[52,59],day:[59,66],musicFade:[66,72]});

export function endingState(seconds){
 const local=clamp(Number(seconds)||0,0,endingDuration),t=clamp((local-endingTiming.settle)/endingTiming.seasons,0,1)*72;
 const spring=pulse(t,1,4,7,9),autumn=pulse(t,21,25,43,48),bare=pulse(t,26,34,43,49),winter=pulse(t,34,37,42,45);
 const rain=pulse(t,12,14,17,19),earlyNight=pulse(t,28,30,33,35),enter=ramp(t,42,45),dawn=ramp(t,52,59),day=ramp(t,59,66);
 const fade=ramp(local,18,20),musicGain=1-ramp(t,66,72);
 return {local,t,spring,autumn,bare,winter,rain,earlyNight,enter,dawn,day,night:Math.max(earlyNight,enter*(1-dawn)),moon:enter*(1-ramp(t,52,57)),sun:ramp(t,54,59),fade,musicGain,finished:local>=endingDuration,phase:local<1?'settle':local>=18?'fade':t<3?'stillness':t<8?'spring':t<13?'summer':t<18?'rain':t<23?'sunshine':t<29?'autumn':t<34?'night':t<40.52?'winter':t<42.45?'dismantling':t<43.2?'cleared-site':t<44.6?'construction':t<52?'modern-night':t<59?'dawn':'day'};
}

// Times reproduce ending-timelapse.js, including the clear-site interval.
export function componentAmount(t,kind){
 const ranges={historicRoof:[40.52,40.84],historicWalls:[40.93,41.25],historicSupports:[41.33,41.65],historicBase:[41.8,42.13],historicSitework:[42.1,42.45],modernFoundation:[43.2,43.52],modernShell:[43.55,43.99],modernRoof:[44.1,44.6]};
 const r=ranges[kind];return r?(kind.startsWith('historic')?1-ramp(t,...r):ramp(t,...r)):1;
}

const defaults={
 images:{historic:'ending-historic.webp',historicBare:null,cleared:'ending-cleared.webp',modern:'ending-modern.webp',pair:null},
 masks:{historicRoof:'ending-masks/historic-roof.png',historicWalls:'ending-masks/historic-walls.png',historicSupports:'ending-masks/historic-supports.png',historicBase:'ending-masks/historic-base.png',historicSitework:'ending-masks/historic-sitework.png',modernFoundation:'ending-masks/modern-foundation.png',modernShell:'ending-masks/modern-shell.png',modernRoof:'ending-masks/modern-roof.png',canopy:'ending-masks/deciduous-canopy.png',sky:'ending-masks/sky.png',pair:'ending-masks/pair.png',branches:null}
};
const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453123;return x-Math.floor(x);};
const colour=(a,b,c,u,v)=>'rgb('+a.map((x,i)=>Math.round((x+(b[i]-x)*u)*(1-v)+c[i]*v)).join(',')+')';

export function createEnding(stage,options={}){
 const base=assetURL(options.base??'./film-ending/',import.meta.url),paths={images:{...defaults.images,...options.images},masks:{...defaults.masks,...options.masks}};
 const root=document.createElement('div');root.className='spatial-ending';root.hidden=true;root.setAttribute('aria-hidden','true');root.style.cssText='position:absolute;inset:0;z-index:4;pointer-events:none;overflow:hidden;background:#f1f1ed';
 const canvas=makeCanvas(1920,1080);canvas.style.cssText='width:100%;height:100%;display:block';root.append(canvas);stage.append(root);
 const ctx=canvas.getContext('2d',{alpha:false}),images={},masks={},layers={},children=[];let width=1920,height=1080,loaded=false,error=null,lastFrame=-1,lastSeconds=-1,lastZoom=-1,lastState=endingState(0),visible=false,ambientTime=0,skyAlpha=null;
 const celestialCache=new Map();
 const scratch=makeCanvas(width,height),sc=scratch.getContext('2d'),skyLayer=makeCanvas(width,height),skyContext=skyLayer.getContext('2d'),scene=makeCanvas(width,height),paint=scene.getContext('2d',{alpha:false});
 function url(path){return assetURL(path,base).href;}
 async function image(path){const im=new Image();im.crossOrigin='anonymous';im.src=url(path);await im.decode();return im;}
 function alphaMask(im){
  const c=makeCanvas(width,height),a=c.getContext('2d',{willReadFrequently:true});a.drawImage(im,0,0,width,height);const p=a.getImageData(0,0,width,height);let transparent=false;
  for(let i=3;i<p.data.length;i+=4)if(p.data[i]<250){transparent=true;break;}
  let minX=width,minY=height,maxX=-1,maxY=-1;
  for(let i=0;i<p.data.length;i+=4){const alpha=transparent?p.data[i]:Math.round((p.data[i]+p.data[i+1]+p.data[i+2])/3);p.data[i]=p.data[i+1]=p.data[i+2]=255;p.data[i+3]=alpha;if(alpha>8){const n=i/4,x=n%width,y=Math.floor(n/width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
  a.putImageData(p,0,0);return {canvas:c,bounds:{x:minX,y:minY,width:Math.max(0,maxX-minX+1),height:Math.max(0,maxY-minY+1)}};
 }
 function cutout(source,mask){const c=makeCanvas(width,height),p=c.getContext('2d');p.drawImage(source,0,0,width,height);p.globalCompositeOperation='destination-in';p.drawImage(mask.canvas,0,0);return c;}
 async function prepareChild(config,index){
  const video=document.createElement('video');video.muted=true;video.defaultMuted=true;video.playsInline=true;video.loop=true;video.preload='auto';video.crossOrigin='anonymous';video.setAttribute('playsinline','');
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Summer child video timed out')),30000);video.addEventListener('loadeddata',()=>{clearTimeout(timeout);resolve();},{once:true});video.addEventListener('error',()=>{clearTimeout(timeout);reject(Error('Summer child video failed'));},{once:true});video.src=url(config.url);video.load();});
  const rgbHeight=video.videoHeight/2,crop=config.crop??[0,0,1,1],source=[crop[0]*video.videoWidth,crop[1]*rgbHeight,crop[2]*video.videoWidth,crop[3]*rgbHeight],w=Math.min(320,Math.round(source[2])),h=Math.round(w*source[3]/source[2]),sheet=makeCanvas(w,h),matte=makeCanvas(w,h);
  const child={config,index,video,sheet,matte,source,context:sheet.getContext('2d',{willReadFrequently:true}),matteContext:matte.getContext('2d',{willReadFrequently:true}),frame:-1,videoTime:0};children.push(child);return child;
 }
 const ready=Promise.all([
  ...Object.entries(paths.images).map(async([key,path])=>{if(path)images[key]=await image(path);}),
  ...Object.entries(paths.masks).map(async([key,path])=>{if(path)masks[key]=alphaMask(await image(path));}),
  ...(options.children??[]).map(prepareChild)
 ]).then(()=>{
  for(const key of Object.keys(masks))if(key.startsWith('historic')||key.startsWith('modern'))layers[key]=cutout(key.startsWith('modern')?images.modern:(images.historicBare??images.historic),masks[key]);
  layers.canopy=cutout(images.historic,masks.canopy);layers.pair=images.pair??cutout(images.historic,masks.pair);
  if(options.pairRegistration&&images.pair){
   // Generated ink art is registered to original scan foot baselines. Draw each
   // animal uniformly, preserving its image aspect; never stretch a sprite.
   const pair=makeCanvas(width,height),c=pair.getContext('2d');
   for(const item of [{src:[710,554,129,106],foot:[880.5,745],bodyHeight:94},{src:[861,572,113,108],foot:[1042.5,770],bodyHeight:106}]){
    const [sx,sy,sw,sh]=item.src,scale=item.bodyHeight/(sh-4),dw=sw*scale,dh=sh*scale;
    c.save();c.translate(item.foot[0],item.foot[1]-2);c.scale(1,.22);const g=c.createRadialGradient(0,0,2,0,0,dw*.52);g.addColorStop(0,'rgba(48,47,39,.16)');g.addColorStop(1,'rgba(48,47,39,0)');c.fillStyle=g;c.fillRect(-dw,-dw,dw*2,dw*2);c.restore();
    c.drawImage(images.pair,sx,sy,sw,sh,item.foot[0]-dw/2,item.foot[1]-dh+2*scale,dw,dh);
   }
   layers.pair=pair;
  }
if(masks.branches)layers.branches=cutout(images.cleared,masks.branches);skyAlpha=masks.sky.canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,width,height).data;loaded=true;return root;
 }).catch(e=>{error=e.message;throw e;});

 function resize(){const dpr=Math.min(devicePixelRatio||1,1.6),w=Math.min(2560,Math.max(1,Math.round(stage.clientWidth*dpr))),h=Math.max(1,Math.round(w*stage.clientHeight/Math.max(1,stage.clientWidth)));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;lastFrame=-1;celestialCache.clear();}}
 function sourceRect(){const ratio=canvas.width/canvas.height;let sw=width,sh=width/ratio;if(sh>height){sh=height;sw=height*ratio;}return {x:(width-sw)/2,y:0,w:sw,h:sh};}
 function skyPosition(u,v,r){
  const key=[u,v,r].join(',');if(celestialCache.has(key))return celestialCache.get(key);
  const view=sourceRect(),preferred={x:view.x+view.w*u,y:view.y+view.h*v};let best=preferred,bestScore=Infinity;
  // A phone's wider crop removes the very top of the plate. Choose a visible
  // opening in the actual sky mask so the moon/sun cannot vanish behind a
  // roof or outside the screen while the architectural camera stays fixed.
  for(let y=Math.ceil(view.y+r+9);y<view.y+view.h*.44;y+=16)for(let x=Math.ceil(view.x+r+12);x<view.x+view.w-r-12;x+=24){
   let clear=true;for(let i=0;i<9;i++){const a=i*Math.PI/4,xx=Math.round(x+(i===8?0:Math.cos(a)*r)),yy=Math.round(y+(i===8?0:Math.sin(a)*r));if(skyAlpha[(yy*width+xx)*4+3]<230){clear=false;break;}}
   if(!clear)continue;const nx=(x-view.x)/view.w,ny=(y-view.y)/view.h,score=(nx-u)**2+(ny-v)**2+(nx>.4&&nx<.6&&ny<.16?.3:0);if(score<bestScore){bestScore=score;best={x,y};}
  }
  celestialCache.set(key,best);return best;
 }
 function drawPart(key,amount){
  const layer=layers[key],bounds=masks[key]?.bounds;if(!layer||!bounds||amount<=.001)return;
  const surface=key==='historicRoof'&&lastState.winter>.001?(()=>{sc.clearRect(0,0,width,height);sc.drawImage(layer,0,0);sc.globalCompositeOperation='source-atop';sc.fillStyle=`rgba(234,239,236,${lastState.winter*.56})`;sc.fillRect(0,0,width,height);sc.globalCompositeOperation='source-over';return scratch;})():layer;
  if(amount>=.999){paint.drawImage(surface,0,0);return;}
  // A vertical architectural section wipe, never a transparent ghost image.
  // The source object mask provides the silhouette and depth ordering.
  paint.save();const cut=bounds.y+bounds.height*(1-amount);paint.beginPath();paint.rect(0,cut,width,height-cut);paint.clip();paint.drawImage(surface,0,0);paint.restore();
 }
 function sky(state,clock){
  skyContext.clearRect(0,0,width,height);if(state.enter<.001&&state.earlyNight<.001)return;
  const g=skyContext.createLinearGradient(0,0,0,height*.72);g.addColorStop(0,colour([24,41,66],[186,194,205],[191,203,208],state.dawn,state.day));g.addColorStop(1,colour([71,83,103],[229,211,195],[230,232,225],state.dawn,state.day));skyContext.globalAlpha=Math.max(state.enter,state.earlyNight)*.92;skyContext.fillStyle=g;skyContext.fillRect(0,0,width,height);skyContext.globalAlpha=1;
  if(state.moon>.001){const r=height*.018,{x,y}=skyPosition(.80,.10,r);skyContext.globalAlpha=state.moon;const glow=skyContext.createRadialGradient(x,y,r*.4,x,y,r*3.4);glow.addColorStop(0,'rgba(235,241,247,.34)');glow.addColorStop(1,'rgba(235,241,247,0)');skyContext.fillStyle=glow;skyContext.fillRect(x-r*4,y-r*4,r*8,r*8);skyContext.fillStyle='#e3e8ed';skyContext.beginPath();skyContext.arc(x,y,r,0,Math.PI*2);skyContext.fill();}
  // Rise through the native ridge silhouette. The reframed guesthouse fills
  // the right half, so the previous low sun/moon coordinates were occluded.
  if(state.sun>.001){const r=height*.021,position=skyPosition(.28,.12,r),x=position.x,y=position.y+(1-ramp(state.t,54,66))*height*.14;skyContext.globalAlpha=state.sun*(1-ramp(state.t,65,70)*.35);skyContext.fillStyle='#f3dfbd';skyContext.beginPath();skyContext.arc(x,y,r,0,Math.PI*2);skyContext.fill();}
  skyContext.globalAlpha=1;skyContext.globalCompositeOperation='destination-in';skyContext.drawImage(masks.sky.canvas,0,0);skyContext.globalCompositeOperation='source-over';paint.drawImage(skyLayer,0,0);
 }
 function tintCanopy(state){
  const alpha=1-state.bare*.985;if(alpha<.02)return;
  sc.clearRect(0,0,width,height);sc.drawImage(layers.canopy,0,0);
  sc.globalCompositeOperation='source-atop';sc.fillStyle=state.autumn>.1?`rgba(169,90,28,${state.autumn*.80})`:`rgba(58,101,63,${.32*(1-state.spring)})`;sc.fillRect(0,0,width,height);
  if(state.winter>.001){sc.fillStyle=`rgba(230,235,231,${state.winter*.75})`;sc.fillRect(0,0,width,height);}
  sc.globalCompositeOperation='source-over';paint.save();paint.globalAlpha=alpha;paint.drawImage(scratch,0,0);paint.restore();
  if(state.spring>.001){paint.save();paint.globalAlpha=state.spring*.9;paint.fillStyle='#e4bcc4';for(const p of canopyPoints){paint.beginPath();paint.ellipse(p.x,p.y,p.size*1.5,p.size,.4,0,Math.PI*2);paint.fill();}paint.restore();}
 }
 const canopyPoints=[];
 ready.then(()=>{const data=masks.canopy.canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,width,height).data;for(let i=0;i<900;i++){const x=Math.floor(hash(i+10)*width),y=Math.floor(hash(i+700)*height);if(data[(y*width+x)*4+3]>150)canopyPoints.push({x,y,size:1.4+hash(i+1900)*2.8});}}).catch(()=>{});

 const cameraPosition=options.camera?.position??options.camera?.p??[-8.74,-1.08,4.2],cameraTarget=options.camera?.target??[-15.85,9.8,2.8],horizontalFov=options.camera?.horizontalFov??55;
 const normalize=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);};
 const forward=normalize(cameraTarget.map((x,i)=>x-cameraPosition[i])),right=normalize([forward[1],-forward[0],0]),up=[right[1]*forward[2],-right[0]*forward[2],right[0]*forward[1]-right[1]*forward[0]],dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),tan=Math.tan(horizontalFov*.5*Math.PI/180);
 function project(p){const d=p.map((v,i)=>v-cameraPosition[i]),z=dot(d,forward);return {x:width*(.5+dot(d,right)/(2*z*tan)),y:height*(.5-dot(d,up)/(2*z*tan/(16/9))),z};}
 function drawChildren(state,clock){
  const visible=pulse(state.t,8,8.6,12.4,13);if(visible<.001){for(const c of children)c.video.pause();return;}
  for(const child of children){
   if(child.video.paused)void child.video.play().catch(()=>{});
   const {config,video,sheet,matteContext,context,source}=child,w=sheet.width,h=sheet.height,frame=Math.floor(video.currentTime*12);
   if(child.frame!==frame){context.clearRect(0,0,w,h);context.drawImage(video,...source,0,0,w,h);matteContext.drawImage(video,source[0],source[1]+video.videoHeight/2,source[2],source[3],0,0,w,h);const rgb=context.getImageData(0,0,w,h),a=matteContext.getImageData(0,0,w,h);for(let i=3;i<rgb.data.length;i+=4)rgb.data[i]=a.data[i-3];context.putImageData(rgb,0,0);child.frame=frame;child.videoTime=video.currentTime;}
   // This clock is independent of scrolling. Both paths are the original
   // summer walkway, behind the stone pair and clear of the camera position.
   const u=(clock*.085+child.index*.16)%1,path=config.path??[[-34,13+child.index*.7,1.30],[-24,13+child.index*.7,1.24]],f=u*(path.length-1),n=Math.min(path.length-2,Math.floor(f)),s=f-n,point=path[n].map((v,i)=>v+(path[n+1][i]-v)*s),feet=project(point),head=project([point[0],point[1],point[2]+(config.height??1.05)]);
   const bounds={left:0,top:0,right:1,bottom:1,...config.bounds},body=feet.y-head.y,fullH=body/(bounds.bottom-bounds.top),fullW=fullH*w/h,x=feet.x-(bounds.left+bounds.right)*.5*fullW,y=feet.y-bounds.bottom*fullH;
   if(feet.z>0){paint.save();paint.globalAlpha=visible*pulse(u,0,.06,.94,1);paint.drawImage(sheet,x,y,fullW,fullH);paint.restore();}
  }
 }
 function weather(state,clock){
  if(state.rain>.001){paint.save();paint.globalAlpha=state.rain*.3;paint.strokeStyle='#647982';paint.lineWidth=1;paint.beginPath();for(let i=0;i<110;i++){const x=hash(i+30)*width,y=((hash(i+60)+clock*.60)%1)*height;paint.moveTo(x,y);paint.lineTo(x-5,y+20+hash(i)*10);}paint.stroke();paint.restore();}
  if(state.winter>.001){paint.save();paint.globalAlpha=state.winter*.78;paint.fillStyle='#f4f5f1';for(let i=0;i<92;i++){const x=(hash(i+500)*width+Math.sin(clock*.45+i)*14+width)%width,y=((hash(i+760)+clock*(.020+hash(i)*.018))%1)*height;paint.beginPath();paint.arc(x,y,1.2+hash(i+900)*2.2,0,Math.PI*2);paint.fill();}paint.restore();}
  if(state.autumn>.1&&state.t<35){paint.save();paint.globalAlpha=state.autumn*.7;for(let i=0;i<Math.min(30,canopyPoints.length);i++){const p=canopyPoints[i],u=(clock*.11+hash(i+50))%1;paint.fillStyle=i%3?'#a56e36':'#934c34';paint.beginPath();paint.ellipse(p.x+Math.sin(u*9+i)*22,p.y+u*u*height*.27,3.6,1.7,u*5,0,Math.PI*2);paint.fill();}paint.restore();}
 }
 function illuminate(state){
  const night=state.night;if(night>.001){paint.save();paint.globalCompositeOperation='multiply';paint.fillStyle=`rgba(79,105,142,${night*.78})`;paint.fillRect(0,0,width,height);paint.restore();}
  if(state.rain>.001){paint.save();paint.fillStyle=`rgba(96,117,131,${state.rain*.17})`;paint.fillRect(0,0,width,height);paint.restore();}
  if(state.enter>.001&&state.dawn>.001&&state.day<1){paint.save();paint.globalCompositeOperation='soft-light';paint.fillStyle=`rgba(225,178,146,${state.dawn*(1-state.day)*.16})`;paint.fillRect(0,0,width,height);paint.restore();}
 }
 function update(seconds,ambientSeconds=0,zoom=1.065){
  lastState=endingState(seconds);ambientTime=Number(ambientSeconds)||0;if(!loaded||!stage.clientWidth||!stage.clientHeight)return lastState;
  root.hidden=false;visible=true;resize();const frame=Math.floor(ambientTime*60);if(lastFrame===frame&&lastSeconds===lastState.local&&lastZoom===zoom)return lastState;lastFrame=frame;lastSeconds=lastState.local;lastZoom=zoom;
  paint.drawImage(images.cleared,0,0,width,height);sky(lastState,ambientTime);
  for(const key of ['historicSitework','historicBase','historicSupports','historicWalls','historicRoof','modernFoundation','modernShell','modernRoof'])drawPart(key,componentAmount(lastState.t,key));
  drawChildren(lastState,ambientTime);if(layers.branches)paint.drawImage(layers.branches,0,0);tintCanopy(lastState);paint.drawImage(layers.pair,0,0);illuminate(lastState);weather(lastState,ambientTime);
  if(lastState.fade>0){paint.fillStyle=`rgba(241,241,237,${lastState.fade})`;paint.fillRect(0,0,width,height);}
  // A gentle continuous push-in begins at the exact incoming crop. All layers share one transform.
  const view=sourceRect(),push=ramp(lastState.local,0,6);
  // Reframe the whole registered scene together: the lions never slide relative to their ground.
  const closeZoom=Math.min(1.65,view.w/520),cameraZoom=zoom+(Math.max(zoom,closeZoom)-zoom)*push;
  const sw=view.w/cameraZoom,sh=view.h/cameraZoom;
  const drift=16*pulse(lastState.local,6,10,15,18);
  const sx=clamp(view.x+(view.w-sw)/2+drift,0,width-sw);
  const sy=clamp((705-sh*.78)*push,0,height-sh);
  ctx.drawImage(scene,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
  root.dataset.framing=JSON.stringify({zoom:cameraZoom,sourceCrop:[sx,sy,sw,sh],pairFocus:[960,705],wholeScene:true});
  root.dataset.phase=lastState.phase;root.dataset.seconds=lastState.local.toFixed(3);root.dataset.musicGain=lastState.musicGain.toFixed(4);options.onFrame?.(lastState);return lastState;
 }
 function hide(){root.hidden=true;visible=false;for(const c of children)c.video.pause();lastFrame=-1;}
 function proof(){return {ready:loaded,error,visible,duration:endingDuration,...lastState,ambientTime,registeredResolution:[width,height],camera:{position:cameraPosition,target:cameraTarget,horizontalFov},geometryMasks:Object.keys(masks),architecture:Object.fromEntries(Object.keys(masks).filter(k=>k.startsWith('historic')||k.startsWith('modern')).map(k=>[k,componentAmount(lastState.t,k)])),children:children.map(c=>({index:c.index,ready:c.video.readyState>=2,playing:!c.video.paused,videoTime:c.video.currentTime,scrollSeeking:false})),childrenReady:children.length>=2,persistentLions:true,framing:root.dataset.framing?JSON.parse(root.dataset.framing):null,viewTransform:'shared-whole-scene-lion-focus'};}
 return {root,canvas,ready,update,hide,proof,duration:endingDuration,get musicGain(){return lastState.musicGain;},get finished(){return lastState.finished;},destroy(){hide();children.forEach(c=>{c.video.removeAttribute('src');c.video.load();});root.remove();}};
}
