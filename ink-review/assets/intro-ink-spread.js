import {normalizePaperPixels, samplePaperWhite, PAPER_RGB, PAPER_CSS} from './paper-color.js?v=archive-paper-1';
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const dims=im=>[im.naturalWidth||im.videoWidth||im.width,im.naturalHeight||im.videoHeight||im.height];
const dynamicFrame=im=>!!im&&(typeof im.getContext==='function'||typeof im.currentTime==='number');
const canvas=(w,h)=>{const c=typeof document!=='undefined'?document.createElement('canvas'):new OffscreenCanvas(w,h);c.width=w;c.height=h;return c;};
function rasterBudget(w,h){
 const ratio=Number(globalThis.devicePixelRatio),memory=Number(globalThis.navigator?.deviceMemory);
 const compact=Math.min(w,h)<600||(memory>0&&memory<=4);
 // Per-plate cap: each mountain layer uses at most 1080p's pixel count.
 return{dpr:Number.isFinite(ratio)&&ratio>0?Math.min(ratio,2):1,pixels:compact?1024*1024:1920*1080,edge:compact?2048:4096};
}
function rasterSize(w,h,nativeDensity,budget){
 const scale=Math.min(budget.dpr,nativeDensity,Math.sqrt(budget.pixels/(w*h)),budget.edge/Math.max(w,h));
 return{width:Math.max(1,Math.floor(w*scale)),height:Math.max(1,Math.floor(h*scale))};
}
function cssContext(surface,w,h,read=false){
 const context=surface.getContext('2d',read?{willReadFrequently:true}:undefined);
 context.setTransform(surface.width/w,0,0,surface.height/h,0,0);return context;
}
function splitMountainInk(plate,w,h,mw,mh,paper){
 // Find the painted silhouette on a small raster, close gaps between strokes,
 // and fill its enclosed paper. The mountain interior remains fully opaque.
 const pw=plate.width,ph=plate.height,gw=Math.min(640,pw),gh=Math.round(ph*gw/pw);
 const probe=canvas(gw,gh),pc=probe.getContext('2d',{willReadFrequently:true});pc.drawImage(plate,0,0,gw,gh);
 let data;try{data=pc.getImageData(0,0,gw,gh).data;}catch{return null;}
 let mask=new Uint8Array(gw*gh);
 for(let i=0;i<mask.length;i++)mask[i]=Math.max(paper[0]-data[i*4],paper[1]-data[i*4+1],paper[2]-data[i*4+2])>10?1:0;
 function morph(src,r,dilate){
  const stride=gw+1,area=new Uint32Array(stride*(gh+1)),out=new Uint8Array(src.length);
  for(let y=0;y<gh;y++){let row=0;for(let x=0;x<gw;x++){row+=src[y*gw+x];area[(y+1)*stride+x+1]=area[y*stride+x+1]+row;}}
  for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){
   const x0=Math.max(0,x-r),y0=Math.max(0,y-r),x1=Math.min(gw,x+r+1),y1=Math.min(gh,y+r+1);
   const sum=area[y1*stride+x1]-area[y0*stride+x1]-area[y1*stride+x0]+area[y0*stride+x0];
   out[y*gw+x]=dilate?+(sum>0):+(sum===(x1-x0)*(y1-y0));
  }return out;
 }
 mask=morph(morph(mask,3,true),3,false);
 const outside=new Uint8Array(mask.length),queue=new Int32Array(mask.length);let first=0,last=0;
 function add(i){if(!mask[i]&&!outside[i]){outside[i]=1;queue[last++]=i;}}
 for(let x=0;x<gw;x++){add(x);add((gh-1)*gw+x);}for(let y=0;y<gh;y++){add(y*gw);add(y*gw+gw-1);}
 while(first<last){const i=queue[first++],x=i%gw,y=(i-x)/gw;if(x)add(i-1);if(x+1<gw)add(i+1);if(y)add(i-gw);if(y+1<gh)add(i+gw);}
 for(let i=0;i<mask.length;i++)if(!outside[i])mask[i]=1;
 const plates=[];
 for(let side=0;side<2;side++){
  const matte=canvas(gw,gh),mc=matte.getContext('2d'),pixels=mc.createImageData(gw,gh);
  for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){const i=y*gw+x;if((x<gw/2)===(side===0)&&mask[i])pixels.data[i*4+3]=255;}
  mc.putImageData(pixels,0,0);const layer=canvas(pw,ph),ctx=layer.getContext('2d');ctx.drawImage(plate,0,0);ctx.globalCompositeOperation='destination-in';ctx.drawImage(matte,0,0,pw,ph);plates.push(layer);
 }
 return plates;
}
function paintMountainDepth(context,w,h,plates,progress,paper,village){
 context.globalCompositeOperation='source-over';context.fillStyle=paper;context.fillRect(0,0,w,h);
 const approach=smooth((progress-.43)/.57),reveal=smooth((progress-.45)/.35);
 if(village){const [vw,vh]=dims(village);if(vw&&vh){
  // Only the distant village emerges. Solid mountain silhouettes stay in front.
  const zoom=.94+.06*approach,k=Math.max(w/vw,h/vh)*zoom;
  context.globalAlpha=reveal;context.drawImage(village,(w-vw*k)/2,(h-vh*k)/2,vw*k,vh*k);
 }}
 const pass=smooth((progress-.44)/.56);
 context.globalAlpha=1;

 const veil=smooth((progress-.43)/.20)*(1-smooth((progress-.76)/.24));
 if(village&&veil>0){const drift=smooth((progress-.43)/.57);const banks=[[.18+.17*drift,.66-.09*drift,.62,.24,.76],[.87-.16*drift,.39+.12*drift,.59,.28,.80],[.48,.71-.10*drift,.70,.23,.56]];
  for(const[x,y,rx,ry,opacity]of banks){context.save();context.translate(w*x,h*y);context.scale(w*rx,h*ry);const fog=context.createRadialGradient(0,0,0,0,0,1);fog.addColorStop(0,'rgba(232,232,230,1)');fog.addColorStop(.35,'rgba(232,232,230,.91)');fog.addColorStop(1,'rgba(232,232,230,0)');context.globalAlpha=veil*opacity;context.fillStyle=fog;context.fillRect(-1,-1,2,2);context.restore();}}
 context.globalAlpha=1;context.globalCompositeOperation='source-over';
 plates.forEach((plate,i)=>context.drawImage(plate,(i===0?-1:1)*w*.56*pass,h*.10*pass,w,h));
}

export const introInkTiming=Object.freeze({sourceStart:.35,sourceSpan:5.65,spreadStart:.576,secondBurst:.946,thirdBurst:1.436,burstGap:.37,duration:4.8,mountainTrimStart:1.8,handoff:4.75,aerialPreplay:3});
export function introVisualTime(time){
 const t=Math.max(0,Number(time)||0),start=introInkTiming.mountainTrimStart,end=introInkTiming.handoff;
 // Preserve the three ink impacts, then compress the mountain pass smoothly.
 // The last decoded frame is already the live aerial, before scene advance.
 return t+(6-end)*smooth((t-start)/(end-start));
}
export const maneOrigins=Object.freeze([[.20,.48,0],[.79,.55,.37],[.49,.82,.86]].map(Object.freeze));
export function createIntroInkSpread(options={}){
 let c=null;
 function prepare(w,h,lion,mountains,budget){
  const [iw,ih]=dims(lion),[mw,mh]=dims(mountains);if(!iw||!ih||!mw||!mh)return null;
  const crop=ih*(options.lionCropBottom??.72);
  // Give the face more presence in square windows while preserving title clearance.
  const square=Math.max(0,Math.min(1,(1.6-w/h)/.5));
  const fit=Math.min(w*(.96+.20*square)/iw,h*(.51+.06*square)/crop);
  const r=typeof options.lionRect==='function'?options.lionRect(w,h,lion):options.lionRect||{x:(w-iw*fit)/2,y:h*(.395-.015*square)-crop*fit/2,w:iw*fit,h:crop*fit};
  const lionSize=rasterSize(w,h,Math.min(iw/r.w,crop/r.h),budget),lionWhite=samplePaperWhite(lion);
  function makeLionPlate(size){
  const plate=canvas(size.width,size.height),lp=cssContext(plate,w,h,true);
  lp.filter=options.lionFilter||'none';lp.drawImage(lion,0,0,iw,crop,r.x,r.y,r.w,r.h);lp.filter='none';normalizePaperPixels(lp,plate.width,plate.height,lionWhite,PAPER_RGB);
  lp.globalCompositeOperation='destination-in';
  let g=lp.createLinearGradient(0,r.y,0,r.y+r.h);
  for(const [p,v]of[[0,'transparent'],[.09,'white'],[.83,'white'],[1,'transparent']])g.addColorStop(p,v);
  lp.fillStyle=g;lp.fillRect(0,0,w,h);
  g=lp.createLinearGradient(r.x,0,r.x+r.w,0);
  for(const [p,v]of[[0,'transparent'],[.12,'white'],[.88,'white'],[1,'transparent']])g.addColorStop(p,v);
  lp.fillStyle=g;lp.fillRect(0,0,w,h);lp.globalCompositeOperation='source-over';
  return plate;
  }
  const lionPlate=makeLionPlate(lionSize),k=Math.max(w/mw,h/mh),mountainSize=rasterSize(w,h,1/k,budget);
  const mountainPlate=canvas(mountainSize.width,mountainSize.height),mp=cssContext(mountainPlate,w,h,true);
  mp.filter=options.mountainFilter||'none';mp.drawImage(mountains,(w-mw*k)/2,(h-mh*k)/2,mw*k,mh*k);normalizePaperPixels(mp,mountainPlate.width,mountainPlate.height,samplePaperWhite(mountains),PAPER_RGB);
  const mountainLayers=splitMountainInk(mountainPlate,w,h,mw,mh,PAPER_RGB);
  const mountainScene=canvas(mountainSize.width,mountainSize.height),ms=cssContext(mountainScene,w,h);
  const scale=Math.min(384/w,384/h),gw=Math.max(1,Math.round(w*scale)),gh=Math.max(1,Math.round(h*scale));
  // Keep the original 1x seed raster, so DPR never changes the ink-growth field.
  const seedPlate=lionPlate.width===w&&lionPlate.height===h?lionPlate:makeLionPlate({width:w,height:h});
  const probe=canvas(gw,gh),pc=probe.getContext('2d',{willReadFrequently:true});pc.drawImage(seedPlate,0,0,gw,gh);
  let rgb=null;try{rgb=pc.getImageData(0,0,gw,gh).data;}catch{}
  if(seedPlate!==lionPlate){seedPlate.width=1;seedPlate.height=1;}
  const field=new Float32Array(gw*gh),origins=[],drops=[];
  // Three connected pigment blooms, each anchored to an existing painted mark.
  // Their asymmetry comes from continuous lobes and paper-scale edge variation.
  const shapes=[[1.08,.86,-.28,1.7],[.83,1.12,.35,3.6],[1.16,.79,-.14,5.2]];
  for(const[u,v,delay]of options.origins||maneOrigins){
   let cx=(r.x+r.w*u)/w*gw,cy=(r.y+r.h*v)/h*gh;
   const rx=Math.max(2,r.w/w*gw*.06),ry=Math.max(2,r.h/h*gh*.12);let found=0,best=Infinity,inkX=cx,inkY=cy;
   for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(gh-1,Math.ceil(cy+ry));y++)for(let x=Math.max(0,Math.floor(cx-rx));x<=Math.min(gw-1,Math.ceil(cx+rx));x++){
    const d=((x-cx)/rx)**2+((y-cy)/ry)**2,j=(y*gw+x)*4;if(d>1)continue;
    if(rgb&&rgb[j+3]>100&&(rgb[j]*.213+rgb[j+1]*.715+rgb[j+2]*.072)<190){found++;if(d<best){best=d;inkX=x;inkY=y;}}
   }
   cx=inkX;cy=inkY;
   const shape=shapes[drops.length%shapes.length],[sx,sy,rotation,phase]=shape,cs=Math.cos(rotation),sn=Math.sin(rotation);
   const radius=Math.max(2,Math.min(gw,gh)*.034)*(drops.length===1?.87:drops.length===2?1.12:1);
   const distance=new Float32Array(field.length),core=new Float32Array(field.length);
   for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){
    const i=y*gw+x,dx=x-cx,dy=y-cy,px=(dx*cs+dy*sn)/sx,py=(-dx*sn+dy*cs)/sy;
    const angle=Math.atan2(py,px),radial=Math.hypot(px,py);
    const lobes=1+(.19*Math.sin(angle*3+phase)+.11*Math.sin(angle*5-phase)+.065*Math.sin(angle*9+phase*.7))*Math.exp(-radial/(radius*7));
    const fiber=(.6*Math.sin(x*.73+y*.31+phase)+.4*Math.sin(y*.91-x*.27))*smooth(radial/(radius*2));
    const tide=(Math.sin(x*.075+y*.042+phase)+.55*Math.sin(x*.14-y*.10+phase*.5))*Math.min(radial*.055,4.5);
    const edge=radial/lobes+tide+fiber;
    distance[i]=Math.max(0,edge-radius);
    core[i]=1-smooth((edge/radius-.22)/.95);
   }
   drops.push({distance,core,delay:Math.max(0,Number(delay)||0),sourceStart:introInkTiming.spreadStart+Math.max(0,Number(delay)||0)});
   origins.push({x:cx/gw,y:cy/gh,detectedInkPixels:found,delaySeconds:delay,shape:'irregular-pigment-bloom'});
  }
  let max=0;
  for(let i=0;i<field.length;i++){let nearest=Infinity;for(const drop of drops)nearest=Math.min(nearest,drop.distance[i]);max=Math.max(max,nearest);}
  for(let i=0;i<field.length;i++){
   let arrival=Infinity;
   for(const drop of drops){
    const distance=drop.distance[i]/(max||1),delay=drop.delay*1.065/(introInkTiming.sourceSpan*.94);
    arrival=Math.min(arrival,distance+delay*(1-smooth((distance-.65)/.25)));
   }
   field[i]=arrival;
  }
  const mask=canvas(gw,gh),mc=mask.getContext('2d'),wet=canvas(gw,gh),wc=wet.getContext('2d'),reveal=canvas(mountainSize.width,mountainSize.height),rc=cssContext(reveal,w,h);
  return{w,h,lion,mountains,budget,r,lionPlate,mountainPlate,mountainLayers,mountainScene,ms,field,drops,mask,mc,wet,wc,pixels:mc.createImageData(gw,gh),wetPixels:wc.createImageData(gw,gh),reveal,rc,origins,last:-1};
 }
 function draw(ctx,w,h,progress,lion,mountains,village){
  if(!ctx||!(w>0&&h>0)||!lion||!mountains)return false;w=Math.round(w);h=Math.round(h);
  const sourceProgress=clamp(Number(progress)||0);
  const sourceTime=introInkTiming.sourceStart+sourceProgress*introInkTiming.sourceSpan;
  const visualTime=introVisualTime(sourceTime),p=clamp((visualTime-introInkTiming.sourceStart)/introInkTiming.sourceSpan);
  // At the hand-off, paint the live frame directly with the player's exact cover.
  // No cached raster, mountain, ink mask, veil or residual opacity remains.
  if(p>=1&&village){const[vw,vh]=dims(village);if(vw>0&&vh>0){
   const k=Math.max(w/vw,h/vh);ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
   ctx.fillStyle=options.paper||PAPER_CSS;ctx.fillRect(0,0,w,h);
   ctx.drawImage(village,(w-vw*k)/2,(h-vh*k)/2,vw*k,vh*k);ctx.restore();
   if(c){c.last=p;c.lastVillage=village;}return true;
  }}
  const budget=rasterBudget(w,h);
  if(!c||c.w!==w||c.h!==h||c.lion!==lion||c.mountains!==mountains||c.budget.dpr!==budget.dpr||c.budget.pixels!==budget.pixels)c=prepare(w,h,lion,mountains,budget);if(!c)return false;
  const u=clamp((p-.04)/.94)*1.065,progressChanged=c.last!==p;
  if(progressChanged){
   const d=c.pixels.data,wet=c.wetPixels.data,gain=smooth((p-.04)/.08)*(1-smooth((p-.78)/.22));
   const pulses=c.drops.map(drop=>{const age=visualTime-drop.sourceStart;return smooth(age/.065)*(1-smooth((age-.16)/.56));});
   for(let i=0;i<c.field.length;i++){const j=i*4,a=p>=1?1:smooth((u-c.field[i])/.065),front=smooth((u+.035-c.field[i])/.055)*(1-a)*gain;
    let pigment=0;for(let k=0;k<c.drops.length;k++)pigment=Math.max(pigment,c.drops[k].core[i]*pulses[k]);
    d[j]=d[j+1]=d[j+2]=255;d[j+3]=Math.round(a*255);wet[j]=69;wet[j+1]=78;wet[j+2]=71;wet[j+3]=Math.round(front*15+pigment*130);
   }
   c.mc.putImageData(c.pixels,0,0);c.wc.putImageData(c.wetPixels,0,0);
  }
  // Canvas and video identity can stay unchanged while their pixels advance.
  if(progressChanged||c.lastVillage!==village||dynamicFrame(village)){
   if(c.mountainLayers)paintMountainDepth(c.ms,w,h,c.mountainLayers,p,options.paper||PAPER_CSS,village);
   c.rc.clearRect(0,0,w,h);c.rc.drawImage(c.mountainLayers?c.mountainScene:c.mountainPlate,0,0,w,h);c.rc.globalCompositeOperation='destination-in';c.rc.drawImage(c.mask,0,0,w,h);c.rc.globalCompositeOperation='source-over';c.last=p;c.lastVillage=village;
  }
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.fillStyle=options.paper||PAPER_CSS;ctx.fillRect(0,0,w,h);
  ctx.drawImage(c.lionPlate,0,0,w,h);ctx.drawImage(c.wet,0,0,w,h);ctx.drawImage(c.reveal,0,0,w,h);ctx.restore();return true;
 }
 return{draw,reset(){c=null;},proof(){return c?{type:'local-mane-ink-growth',lionRect:c.r,cropBottom:options.lionCropBottom??.72,origins:c.origins,dropCount:c.drops.length,dropSourceTimes:c.drops.map(drop=>drop.sourceStart),progress:c.last,sourceAssetsModified:false,mountainLayers:c.mountainLayers?c.mountainLayers.length:1,spatialTransform:'opaque foreground ridges pass camera; village grows monotonically to first video frame',villageZoom:.94+.06*smooth((c.last-.43)/.57),mountainComposite:'source-over',mountainOpacity:1,rasterCache:{dpr:c.budget.dpr,maxPixelsPerPlate:c.budget.pixels,lion:[c.lionPlate.width,c.lionPlate.height],mountains:[c.mountainPlate.width,c.mountainPlate.height],mask:[c.mask.width,c.mask.height]}}:null;}};
}
const instances=new WeakMap();
export function draw(ctx,w,h,progress,lion,mountains,village){let instance=instances.get(ctx);if(!instance){instance=createIntroInkSpread();instances.set(ctx,instance);}return instance.draw(ctx,w,h,progress,lion,mountains,village);}


