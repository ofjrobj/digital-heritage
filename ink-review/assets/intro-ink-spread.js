const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const dims=im=>[im.naturalWidth||im.videoWidth||im.width,im.naturalHeight||im.videoHeight||im.height];
const canvas=(w,h)=>{const c=typeof document!=='undefined'?document.createElement('canvas'):new OffscreenCanvas(w,h);c.width=w;c.height=h;return c;};
const mountainRidges={nearLeft:[[0,.66],[.10,.62],[.23,.73],[.40,.94],[.55,1.12]],nearRight:[[.45,1.12],[.59,.99],[.72,.85],[.87,.66],[1,.60]],middleLeft:[[0,.41],[.10,.44],[.20,.51],[.31,.62],[.45,.80],[.57,.94]],middleRight:[[.43,.94],[.59,.80],[.73,.67],[.88,.48],[1,.43]]};
const ridgeY=(points,x)=>{let i=1;while(i<points.length-1&&x>points[i][0])i++;const[a,b]=[points[i-1],points[i]],t=clamp((x-a[0])/(b[0]-a[0]));return a[1]+(b[1]-a[1])*t;};
function splitMountainInk(plate,w,h,mw,mh,paper){
 const k=Math.max(w/mw,h/mh),ox=(w-mw*k)/2,oy=(h-mh*k)/2;
 const scale=Math.min(1,960/Math.max(w,h)),pw=Math.max(1,Math.round(w*scale)),ph=Math.max(1,Math.round(h*scale));
 const probe=canvas(pw,ph),pc=probe.getContext('2d',{willReadFrequently:true});pc.drawImage(plate,0,0,pw,ph);
 let source;try{source=pc.getImageData(0,0,pw,ph).data;}catch{return null;}
 const plates=Array.from({length:5},()=>canvas(pw,ph)),contexts=plates.map(p=>p.getContext('2d')),pixels=contexts.map(p=>p.createImageData(pw,ph));
 for(let y=0;y<ph;y++)for(let x=0;x<pw;x++){
  const u=((x+.5)/pw*w-ox)/(mw*k),v=((y+.5)/ph*h-oy)/(mh*k),i=(y*pw+x)*4;
  const left=1-smooth((u-.47)/.10),right=smooth((u-.43)/.10);
  const masks=[left*smooth((v-ridgeY(mountainRidges.nearLeft,u)+.035)/.07),right*smooth((v-ridgeY(mountainRidges.nearRight,u)+.035)/.07),left*smooth((v-ridgeY(mountainRidges.middleLeft,u)+.045)/.09),right*smooth((v-ridgeY(mountainRidges.middleRight,u)+.045)/.09)];
  const weights=[0,0,0,0,0];let remaining=1;
  for(let j=0;j<4;j++){const weight=remaining*masks[j];weights[[3,4,1,2][j]]=weight;remaining-=weight;}weights[0]=remaining;
  for(let j=0;j<5;j++){const d=pixels[j].data,a=weights[j];if(a<.0001)continue;for(let ch=0;ch<3;ch++)d[i+ch]=Math.round(255*Math.pow(clamp(source[i+ch]/paper[ch]),a));d[i+3]=255;}
 }
 contexts.forEach((p,i)=>p.putImageData(pixels[i],0,0));return plates;
}
function paintMountainDepth(context,w,h,plates,progress,paper,village){
 context.globalCompositeOperation='source-over';context.fillStyle=paper;context.fillRect(0,0,w,h);
 const land=smooth((progress-.50)/.45);
 if(village){const [vw,vh]=dims(village);if(vw&&vh){const zoom=1+.055*(1-land),k=Math.max(w/vw,h/vh)*zoom;context.globalAlpha=land;context.drawImage(village,(w-vw*k)/2+w*.028*(1-land),(h-vh*k)/2+h*.012*(1-land),vw*k,vh*k);context.globalAlpha=1;}}
 context.globalCompositeOperation='multiply';
 const near=smooth((progress-.40)/.60),middle=smooth((progress-.55)/.45);
 const offsets=[[0,0],[-w*.23*middle,h*.035*middle],[w*.23*middle,h*.035*middle],[-w*.57*near,h*.09*near],[w*.57*near,h*.09*near]];
 plates.forEach((plate,i)=>{const from=[.61,.72,.72,.83,.83][i];context.globalAlpha=village?1-smooth((progress-from)/(1-from)):1;context.drawImage(plate,offsets[i][0],offsets[i][1],w,h);});
 context.globalAlpha=1;context.globalCompositeOperation='source-over';
 const veil=smooth((progress-.43)/.20)*(1-smooth((progress-.76)/.24));
 if(village&&veil>0){const drift=smooth((progress-.43)/.57);const banks=[[.18+.17*drift,.66-.09*drift,.62,.24,.76],[.87-.16*drift,.39+.12*drift,.59,.28,.80],[.48,.71-.10*drift,.70,.23,.56]];
  for(const[x,y,rx,ry,opacity]of banks){context.save();context.translate(w*x,h*y);context.scale(w*rx,h*ry);const fog=context.createRadialGradient(0,0,0,0,0,1);fog.addColorStop(0,'rgba(240,240,238,1)');fog.addColorStop(.35,'rgba(240,240,238,.91)');fog.addColorStop(1,'rgba(240,240,238,0)');context.globalAlpha=veil*opacity;context.fillStyle=fog;context.fillRect(-1,-1,2,2);context.restore();}}
 context.globalAlpha=1;context.globalCompositeOperation='source-over';
}

export const maneOrigins=Object.freeze([[.23,.47,0],[.77,.51,.018],[.27,.66,.045],[.75,.70,.065],[.21,.77,.09],[.80,.85,.11]].map(Object.freeze));
export function createIntroInkSpread(options={}){
 let c=null;
 function normalizePaper(context,w,h,source){
  const target=options.paperNormalization?.target;if(!target||!source)return;
  const pixels=context.getImageData(0,0,w,h),d=pixels.data;
  for(let i=0;i<d.length;i+=4)if(d[i+3])for(let ch=0;ch<3;ch++)d[i+ch]=Math.min(255,Math.round(d[i+ch]*target[ch]/source[ch]));
  context.putImageData(pixels,0,0);
 }
 function prepare(w,h,lion,mountains){
  const [iw,ih]=dims(lion),[mw,mh]=dims(mountains);if(!iw||!ih||!mw||!mh)return null;
  const crop=ih*(options.lionCropBottom??.72);
  // Give the face more presence in square windows while preserving title clearance.
  const square=Math.max(0,Math.min(1,(1.6-w/h)/.5));
  const fit=Math.min(w*(.96+.20*square)/iw,h*(.51+.06*square)/crop);
  const r=typeof options.lionRect==='function'?options.lionRect(w,h,lion):options.lionRect||{x:(w-iw*fit)/2,y:h*(.395-.015*square)-crop*fit/2,w:iw*fit,h:crop*fit};
  const lionPlate=canvas(w,h),lp=lionPlate.getContext('2d',{willReadFrequently:true});
  lp.filter=options.lionFilter||'none';lp.drawImage(lion,0,0,iw,crop,r.x,r.y,r.w,r.h);lp.filter='none';normalizePaper(lp,w,h,options.paperNormalization?.lion);
  lp.globalCompositeOperation='destination-in';
  let g=lp.createLinearGradient(0,r.y,0,r.y+r.h);
  for(const [p,v]of[[0,'transparent'],[.09,'white'],[.83,'white'],[1,'transparent']])g.addColorStop(p,v);
  lp.fillStyle=g;lp.fillRect(0,0,w,h);
  g=lp.createLinearGradient(r.x,0,r.x+r.w,0);
  for(const [p,v]of[[0,'transparent'],[.12,'white'],[.88,'white'],[1,'transparent']])g.addColorStop(p,v);
  lp.fillStyle=g;lp.fillRect(0,0,w,h);lp.globalCompositeOperation='source-over';
  const mountainPlate=canvas(w,h),mp=mountainPlate.getContext('2d'),k=Math.max(w/mw,h/mh);
  mp.filter=options.mountainFilter||'none';mp.drawImage(mountains,(w-mw*k)/2,(h-mh*k)/2,mw*k,mh*k);normalizePaper(mp,w,h,options.paperNormalization?.mountains);
  const mountainLayers=splitMountainInk(mountainPlate,w,h,mw,mh,options.paperNormalization?.target||[240,240,238]);
  const mountainScene=canvas(w,h),ms=mountainScene.getContext('2d');
  const scale=Math.min(384/w,384/h),gw=Math.max(1,Math.round(w*scale)),gh=Math.max(1,Math.round(h*scale));
  const probe=canvas(gw,gh),pc=probe.getContext('2d',{willReadFrequently:true});pc.drawImage(lionPlate,0,0,gw,gh);
  let rgb=null;try{rgb=pc.getImageData(0,0,gw,gh).data;}catch{}
  const field=new Float32Array(gw*gh),cost=new Float32Array(gw*gh),origins=[];field.fill(1e6);
  for(let y=0;y<gh;y++)for(let x=0;x<gw;x++)cost[y*gw+x]=.94+.16*(Math.sin(x*.36+Math.sin(y*.12)*2.7)+.5*Math.sin(y*.47+x*.17));
  for(const[u,v,delay]of options.origins||maneOrigins){
   const cx=(r.x+r.w*u)/w*gw,cy=(r.y+r.h*v)/h*gh,rx=Math.max(2,r.w/w*gw*.13),ry=Math.max(2,r.h/h*gh*.055);let found=0;
   for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(gh-1,Math.ceil(cy+ry));y++)for(let x=Math.max(0,Math.floor(cx-rx));x<=Math.min(gw-1,Math.ceil(cx+rx));x++){
    const d=((x-cx)/rx)**2+((y-cy)/ry)**2,i=y*gw+x,j=i*4;if(d>1)continue;
    if(rgb&&rgb[j+3]>100&&(rgb[j]*.213+rgb[j+1]*.715+rgb[j+2]*.072)<190){field[i]=Math.min(field[i],delay*Math.min(gw,gh)*.4+d*2);found++;}
   }
   if(!found){const x=Math.max(0,Math.min(gw-1,Math.round(cx))),y=Math.max(0,Math.min(gh-1,Math.round(cy)));field[y*gw+x]=delay*Math.min(gw,gh)*.4;}
   origins.push({x:cx/gw,y:cy/gh,detectedInkPixels:found});
  }
  for(let pass=0;pass<3;pass++){
   for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){const i=y*gw+x,t=cost[i];if(x)field[i]=Math.min(field[i],field[i-1]+t*.78);if(y)field[i]=Math.min(field[i],field[i-gw]+t*1.26);if(x&&y)field[i]=Math.min(field[i],field[i-gw-1]+t*1.48);if(x+1<gw&&y)field[i]=Math.min(field[i],field[i-gw+1]+t*1.48);}
   for(let y=gh-1;y>=0;y--)for(let x=gw-1;x>=0;x--){const i=y*gw+x,t=cost[i];if(x+1<gw)field[i]=Math.min(field[i],field[i+1]+t*.78);if(y+1<gh)field[i]=Math.min(field[i],field[i+gw]+t*1.26);if(x+1<gw&&y+1<gh)field[i]=Math.min(field[i],field[i+gw+1]+t*1.48);if(x&&y+1<gh)field[i]=Math.min(field[i],field[i+gw-1]+t*1.48);}
  }
  let max=0;for(const d of field)max=Math.max(max,d);
  for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){const i=y*gw+x,n=(.45*Math.sin(x*.049+y*.026)+.25*Math.sin(x*.095-y*.13)+.14*Math.sin(x*.31+y*.19))*.055;field[i]=Math.max(0,field[i]+max*n*smooth(field[i]/20));}
  max=0;for(const d of field)max=Math.max(max,d);for(let i=0;i<field.length;i++)field[i]/=max||1;
  const mask=canvas(gw,gh),mc=mask.getContext('2d'),wet=canvas(gw,gh),wc=wet.getContext('2d'),reveal=canvas(w,h),rc=reveal.getContext('2d');
  return{w,h,lion,mountains,r,lionPlate,mountainPlate,mountainLayers,mountainScene,ms,field,mask,mc,wet,wc,pixels:mc.createImageData(gw,gh),wetPixels:wc.createImageData(gw,gh),reveal,rc,origins,last:-1};
 }
 function draw(ctx,w,h,progress,lion,mountains,village){
  if(!ctx||!(w>0&&h>0)||!lion||!mountains)return false;w=Math.round(w);h=Math.round(h);
  if(!c||c.w!==w||c.h!==h||c.lion!==lion||c.mountains!==mountains)c=prepare(w,h,lion,mountains);if(!c)return false;
  const p=clamp(Number(progress)||0),u=clamp((p-.04)/.94)*1.065;
  if(c.last!==p||c.lastVillage!==village){
   const d=c.pixels.data,wet=c.wetPixels.data,gain=smooth(p/.08)*(1-smooth((p-.78)/.22));
   for(let i=0;i<c.field.length;i++){const j=i*4,a=p>=1?1:smooth((u-c.field[i])/.065),front=smooth((u+.035-c.field[i])/.055)*(1-a)*gain;
    d[j]=d[j+1]=d[j+2]=255;d[j+3]=Math.round(a*255);wet[j]=93;wet[j+1]=101;wet[j+2]=95;wet[j+3]=Math.round(front*15);
   }
   c.mc.putImageData(c.pixels,0,0);c.wc.putImageData(c.wetPixels,0,0);
   if(c.mountainLayers)paintMountainDepth(c.ms,w,h,c.mountainLayers,p,options.paper||'#f0f0ee',village);
   c.rc.clearRect(0,0,w,h);c.rc.drawImage(c.mountainLayers?c.mountainScene:c.mountainPlate,0,0);c.rc.globalCompositeOperation='destination-in';c.rc.drawImage(c.mask,0,0,w,h);c.rc.globalCompositeOperation='source-over';c.last=p;c.lastVillage=village;
  }
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.fillStyle=options.paper||'#f0f0ee';ctx.fillRect(0,0,w,h);
  ctx.drawImage(c.lionPlate,0,0);ctx.drawImage(c.wet,0,0,w,h);ctx.drawImage(c.reveal,0,0);ctx.restore();return true;
 }
 return{draw,reset(){c=null;},proof(){return c?{type:'local-mane-ink-growth',lionRect:c.r,cropBottom:options.lionCropBottom??.72,origins:c.origins,progress:c.last,sourceAssetsModified:false,mountainLayers:c.mountainLayers?5:1,spatialTransform:'original mountain painting; fixed far ridge and outward middle/near layers'}:null;}};
}
const instances=new WeakMap();
export function draw(ctx,w,h,progress,lion,mountains){let instance=instances.get(ctx);if(!instance){instance=createIntroInkSpread();instances.set(ctx,instance);}return instance.draw(ctx,w,h,progress,lion,mountains);}

