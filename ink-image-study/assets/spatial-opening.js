import {createSpatialFilm} from "./image-sequence-film.js?v=image-study-1";
/* Original opening choreography, followed by a continuous Blender-route film.
 * Sources: v071 ink-entry.js, storyboard-opening.js, blender-spatial-view.js,
 * mountain-entry.json; see spatial-opening-notes.json for the exact mapping.
 * The original lion remains fixed and is revealed with an absorption mask.
 */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const openingDuration=30;
export const openingStops=Object.freeze({cover:0,ink:.015,mountains:3.4/30,mist:6.6/30,aerial:10/30,descent:15/30,entrance:22/30,street:25/30,gate:28/30});
export function openingPhase(progress){const t=clamp(progress)*openingDuration;return t<.04?'cover':t<3.4?'ink':t<6.6?'mountains':t<9?'mist':t<13?'aerial':t<21.5?'descent':t<23?'entrance':t<27?'street':'gate';}

export function createOpening(stage,options={}){
 const root=document.createElement('div');root.className='spatial-opening';root.setAttribute('aria-hidden','true');
 root.innerHTML='<canvas class="spatial-opening-art"></canvas><canvas class="spatial-opening-ambient"></canvas><div class="spatial-cover-copy"><span>GONGJU MOK</span><div><h1>돌에 새긴 선, 풍경이 되다.</h1><p>FROM STONE CARVINGS TO LANDSCAPES</p></div></div><p class="spatial-opening-copy"></p>';
 const style=document.createElement('style');style.textContent=`
 .spatial-opening{position:absolute;inset:0;z-index:2;overflow:hidden;pointer-events:none;background:#f1f1ed}
 .spatial-opening[hidden]{display:none}.spatial-opening-ambient{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.spatial-opening-art{display:block;width:100%;height:100%;filter:none}
 .spatial-cover-copy{position:absolute;inset:0;text-align:center;color:#373734;font-family:var(--story-serif,'Noto Serif KR',serif)}
 .spatial-cover-copy>span{position:absolute;top:9%;left:0;right:0;font-family:var(--story-sans,'Space Grotesk',sans-serif);font-size:10px;letter-spacing:.25em}
 .spatial-cover-copy>div{position:absolute;bottom:calc(max(100px,18dvh) + var(--cover-footer-space,0px));left:8%;right:8%}
 .spatial-cover-copy h1{margin:0;font-size:27px;font-weight:500;letter-spacing:.015em;line-height:1.6}
 .spatial-cover-copy p{margin:13px 0 0;font-family:var(--story-sans,'Space Grotesk',sans-serif);font-size:9px;letter-spacing:.17em;color:#62625d}
 .spatial-opening-copy{position:absolute;top:43%;left:12%;right:12%;margin:0;padding:24px;text-align:center;white-space:pre-line;color:#373734;font-family:var(--story-serif,'Noto Serif KR',serif);font-size:17px;line-height:1.9;word-break:keep-all;background:radial-gradient(ellipse,rgba(250,250,248,.88),rgba(250,250,248,.64) 45%,transparent 74%)}
 @media(orientation:landscape) and (max-height:500px){.spatial-cover-copy>span{top:13%;font-size:8px}.spatial-cover-copy h1{font-size:24px}.spatial-cover-copy p{font-size:8px;margin-top:7px}.spatial-cover-copy>div{bottom:calc(max(88px,18dvh) + var(--cover-footer-space,0px))}.spatial-opening-copy{font-size:14px;padding:14px;top:42%}}
 @media(orientation:portrait) and (max-width:700px){.spatial-cover-copy h1{font-size:24px}.spatial-opening-copy{left:5%;right:5%;font-size:14px;padding:20px 10px}}
 `;document.head.append(style);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;pointer-events:none';
 // Identical display-only white balance on every opening plate. The originals
 // and the UI remain untouched. Paper is neutral rather than sepia yellow.
 svg.innerHTML='<defs><filter id="spatialOpeningPaperBalance" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".98 0 0 0 0  0 1 0 0 0  0 0 1.08 0 0  0 0 0 1 0"/><feColorMatrix type="saturate" values=".94"/></filter><filter id="spatialFilmNeutral" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.97318 0 0 0 0  0 1.02503 0 0 0  0 0 1.09690 0 0  0 0 0 1 0"/></filter></defs>';
 root.append(svg);stage.append(root);
 const canvas=root.querySelector('.spatial-opening-art'),ctx=canvas.getContext('2d',{alpha:false}),ambientCanvas=root.querySelector('.spatial-opening-ambient'),ambient=ambientCanvas.getContext('2d'),title=root.querySelector('.spatial-cover-copy'),copy=root.querySelector('.spatial-opening-copy');
 const layer=document.createElement('canvas'),lc=layer.getContext('2d');
 const paths={cover:'cover.png',mountains:'locked-style/mountains.webp',aerial:'locked-style/aerial-korean-ink.webp'};
 const images={},mountainLayers=[],fogSheets=[],mask=document.createElement('canvas'),mw=384,mh=216;mask.width=mw;mask.height=mh;
 const mc=mask.getContext('2d',{willReadFrequently:true}),field=new Float32Array(mw*mh),coverField=new Float32Array(mw*mh);let pixels,prepared=false,lastProgress=-1,lastMist=-1,coverStarted=null,previousProgress=0;
 const film=createSpatialFilm();
 const residentRegions={};
 function prepare(){
  mc.drawImage(images.cover,0,0,mw,mh);const d=mc.getImageData(0,0,mw,mh).data;
  for(let i=0;i<field.length;i++)field[i]=(d[i*4]+d[i*4+1]+d[i*4+2])/3<181?0:1000;
  for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){const i=y*mw+x;if(x)field[i]=Math.min(field[i],field[i-1]+1);if(y)field[i]=Math.min(field[i],field[i-mw]+1);if(x&&y)field[i]=Math.min(field[i],field[i-mw-1]+1.414);}
  for(let y=mh-1;y>=0;y--)for(let x=mw-1;x>=0;x--){const i=y*mw+x;if(x<mw-1)field[i]=Math.min(field[i],field[i+1]+1);if(y<mh-1)field[i]=Math.min(field[i],field[i+mw]+1);if(x<mw-1&&y<mh-1)field[i]=Math.min(field[i],field[i+mw+1]+1.414);}
  for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){const grain=Math.sin(x*.39+Math.sin(y*.24)*2)*1.2+Math.sin(y*.65+x*.13)*.8+Math.sin(x*.117+y*.17)*2.3;field[y*mw+x]=Math.max(0,field[y*mw+x]+grain);coverField[y*mw+x]=Math.hypot(x-mw*.5,y-mh*(400/900))+grain*1.6;}
  pixels=mc.createImageData(mw,mh);prepareMountains();prepareFog();prepared=true;
 }
 const ready=Promise.all(Object.entries(paths).map(async([name,path])=>{const im=new Image();im.src=new URL(path,import.meta.url).href;await im.decode();images[name]=im;})).then(async()=>{prepare();await film.ready;return root;});
 function resize(){const scale=Math.min(devicePixelRatio||1,2),w=Math.min(3840,Math.round(stage.clientWidth*scale)),h=Math.round(w*stage.clientHeight/Math.max(1,stage.clientWidth));if(canvas.width!==w||canvas.height!==h){canvas.width=layer.width=ambientCanvas.width=w;canvas.height=layer.height=ambientCanvas.height=h;lastProgress=-1;}}
 function plate(context,name,zoom=1,cx=.5,cy=.5,alpha=1){const im=images[name],w=canvas.width,h=canvas.height;if(!im||alpha<=0)return;const ratio=w/h;let sh=im.height/zoom,sw=sh*ratio;if(sw>im.width/zoom){sw=im.width/zoom;sh=sw/ratio;}const x=clamp(im.width*cx-sw/2,0,im.width-sw),y=clamp(im.height*cy-sh/2,0,im.height-sh);context.save();context.filter="url('#spatialOpeningPaperBalance')";context.globalAlpha=alpha;context.drawImage(im,x,y,sw,sh,0,0,w,h);context.restore();}
 // Fit the lion's ink bounds into the space above the actual title, including
 // the review toolbar allowance. The absorption mask uses this same mapping.
 function coverRect(){
  const w=canvas.width,h=canvas.height,scale=w/stage.clientWidth;
  const footer=parseFloat(getComputedStyle(document.body).getPropertyValue('--cover-footer-space'))||0;
  const short=stage.clientHeight<=500&&stage.clientWidth>stage.clientHeight;
  const top=h*(short?.20:.18),bottom=h-Math.max(short?88:100,stage.clientHeight*.18)*scale-footer*scale-(short?55:75)*scale-20*scale;
  const iw=images.cover.width,ih=images.cover.height;
  const fit=Math.max(.01,Math.min(w*.88/(iw*.90),Math.max(32*scale,bottom-top)/(ih*.44)));
  const dw=iw*fit,dh=ih*fit,x=(w-dw)/2,inkTop=top+Math.max(0,bottom-top-ih*.44*fit)/2,y=inkTop-ih*.20*fit;
  root.dataset.coverInkBounds=JSON.stringify({top:inkTop/scale,bottom:(y+ih*.64*fit)/scale});
  return {x,y,w:dw,h:dh};
 }
 function coverPlate(context){const r=coverRect();context.save();context.filter="url('#spatialOpeningPaperBalance')";context.drawImage(images.cover,r.x,r.y,r.w,r.h);context.restore();}
 function absorption(p,initial=false){const distances=initial?coverField:field,radius=initial?smooth(p)*264:smooth(p)*180-4;for(let i=0;i<field.length;i++){const j=i*4;pixels.data[j]=pixels.data[j+1]=pixels.data[j+2]=255;pixels.data[j+3]=Math.round(smooth((radius-distances[i]+3)/6)*255);}mc.putImageData(pixels,0,0);}
 // Each ridge is a disjoint region of the existing painting, never a mirrored
 // or repeated mountain. The pale painted mist supplies the feathered edges.
 // This follows the original four flanking entry masses and forward camera;
 // it does not alter any village geometry or the subsequent camera film.
 function prepareMountains(){
  const source=images.mountains,w=Math.min(1920,source.width),h=Math.round(w*source.height/source.width),work=document.createElement('canvas');work.width=w;work.height=h;
  const c=work.getContext('2d',{willReadFrequently:true});c.drawImage(source,0,0,w,h);const input=c.getImageData(0,0,w,h).data;
  const specs=[
   {id:'distant-valley',depth:.12,side:0,box:[.39,.39,.35,.25]},
   {id:'left-back',depth:.25,side:-1,box:[0,.17,.62,.57]},
   {id:'right-back',depth:.30,side:1,box:[.53,.26,.47,.50]},
   {id:'left-middle',depth:.48,side:-1,box:[0,.40,.62,.59]},
   {id:'right-middle',depth:.54,side:1,box:[.53,.46,.47,.54]},
   {id:'left-near',depth:.76,side:-1,box:[0,.58,.62,.42]},
   {id:'right-near',depth:.81,side:1,box:[.53,.65,.47,.35]}
  ];
  for(const [layerIndex,spec] of specs.entries()){
   const [bx,by,bw,bh]=spec.box,sx=Math.floor(bx*w),sy=Math.floor(by*h),sw=Math.min(w-sx,Math.ceil(bw*w)),sh=Math.min(h-sy,Math.ceil(bh*h));
   const sheet=document.createElement('canvas');sheet.width=sw;sheet.height=sh;const out=sheet.getContext('2d'),pixels=out.createImageData(sw,sh);
   for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
    const nx=(x+sx)/w,ny=(y+sy)/h,j=((y+sy)*w+x+sx)*4,k=(y*sw+x)*4;
    const left=1-smooth((nx-.45)/.13),right=smooth((nx-.58)/.10),middle=1-left-right;
    const irregular=.017*Math.sin(nx*31+.8)+.010*Math.sin(nx*79+1.7)+.004*Math.sin(nx*173);
    const leftMid=smooth((ny-(.40+.56*nx+irregular))/.085),leftNear=smooth((ny-(.56+.64*nx-irregular))/.10);
    const rightMid=smooth((ny-(.45+.43*(1-nx)-irregular))/.085),rightNear=smooth((ny-(.62+.58*(1-nx)+irregular))/.10);
    const weights=[middle,left*(1-leftMid),right*(1-rightMid),left*(leftMid-leftNear),right*(rightMid-rightNear),left*leftNear,right*rightNear];
    const weight=clamp(weights[layerIndex]),light=(input[j]*.2126+input[j+1]*.7152+input[j+2]*.0722);
    // Remove only the pale paper behind the ridge. Dark ink and tree details
    // keep their original RGB; no face, building or image asset is repainted.
    const ink=smooth((240-light)/20);pixels.data[k]=input[j];pixels.data[k+1]=input[j+1];pixels.data[k+2]=input[j+2];pixels.data[k+3]=Math.round(255*weight*ink);
   }
   out.putImageData(pixels,0,0);mountainLayers.push({...spec,sheet,sx:sx/w,sy:sy/h,sw:sw/w,sh:sh/h});
  }
 }
 function prepareFog(){
  const hash=(x,y,seed)=>{const n=Math.sin(x*127.1+y*311.7+seed*71.3)*43758.5453;return n-Math.floor(n);};
  const noise=(x,y,seed)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);return (hash(ix,iy,seed)*(1-fx)+hash(ix+1,iy,seed)*fx)*(1-fy)+(hash(ix,iy+1,seed)*(1-fx)+hash(ix+1,iy+1,seed)*fx)*fy;};
  for(let seed=0;seed<3;seed++){
   const sheet=document.createElement('canvas');sheet.width=384;sheet.height=192;const c=sheet.getContext('2d'),d=c.createImageData(sheet.width,sheet.height);
   for(let y=0;y<sheet.height;y++)for(let x=0;x<sheet.width;x++){
    const u=x/sheet.width,v=y/sheet.height;let n=0,weight=0;
    for(let octave=0;octave<4;octave++){const f=2**octave,a=.5**octave;n+=noise(u*5*f,v*3*f,seed)*a;weight+=a;}
    const edge=smooth(u/.11)*smooth((1-u)/.11)*smooth(v/.18)*smooth((1-v)/.18),a=smooth((n/weight-.18)/.64)*edge,j=(y*sheet.width+x)*4;
    d.data[j]=255;d.data[j+1]=255;d.data[j+2]=255;d.data[j+3]=Math.round(a*255);
   }
   c.putImageData(d,0,0);fogSheets.push(sheet);
  }
 }
 function fog(amount,clock,part=0){
  if(amount<=.001||options.ambientFog===false)return;const w=canvas.width,h=canvas.height;
  ambient.save();
  // Different depths, speeds and vertical scales create passing fog banks.
  // Clock is independent of route progress, so stopped travel retains drift.
  for(let i=0;i<7;i++){
   const depth=i/6,side=i%2?-1:1,drift=Math.sin(clock*(.065+depth*.035)+i*1.71)*(.065+depth*.025),width=w*(1.35+depth*.35),height=h*(.48+depth*.38);
   const x=w*(.5+drift+side*part*(.14+depth*.21))-width/2,y=h*(.30+(i%3)*.18+Math.sin(clock*.09+i)*.035)-height/2;
   ambient.globalAlpha=clamp(amount*(.48+depth*.22));ambient.drawImage(fogSheets[i%3],x,y,width,height);
  }
  const veil=ambient.createRadialGradient(w*.5,h*.52,0,w*.5,h*.52,w*.78);veil.addColorStop(0,`rgba(255,255,255,${amount*.42*(1-part*.7)})`);veil.addColorStop(1,'rgba(255,255,255,0)');ambient.globalAlpha=1;ambient.fillStyle=veil;ambient.fillRect(0,0,w,h);ambient.restore();
 }
 function mountainPass(context,t,alpha=1){
  const travel=smooth((t-3.4)/4.3),w=canvas.width,h=canvas.height,aspect=images.mountains.width/images.mountains.height,scale=Math.max(w/images.mountains.width,h/images.mountains.height),iw=images.mountains.width*scale,ih=iw/aspect,ox=(w-iw)/2,oy=(h-ih)/2,vx=w*.53,vy=h*.47;
  const fade=smooth((t-3.4)/.52);if(fade<1)plate(context,'mountains',1,.5,.5,alpha*(1-fade));
  context.save();context.filter="url('#spatialOpeningPaperBalance')";context.globalAlpha=alpha*fade;
  for(const ridge of mountainLayers){const magnify=1/(1-ridge.depth*travel*.92),side=ridge.side*travel*ridge.depth*w*.045;context.save();context.translate(vx+side,vy);context.scale(magnify,magnify);context.drawImage(ridge.sheet,ox+ridge.sx*iw-vx,oy+ridge.sy*ih-vy,ridge.sw*iw,ridge.sh*ih);context.restore();}
  context.restore();root.dataset.mountainTravel=travel.toFixed(4);root.dataset.mountainLayers=String(mountainLayers.length);
 }
 function maskToLayer(cover=false){lc.globalCompositeOperation='destination-in';if(cover){const r=coverRect();lc.drawImage(mask,0,0,mw,mh,r.x,r.y,r.w,r.h);lc.globalCompositeOperation='source-over';return;}const r=canvas.width/canvas.height;let sh=mh,sw=sh*r;if(sw>mw){sw=mw;sh=sw/r;}lc.drawImage(mask,(mw-sw)/2,(mh-sh)/2,sw,sh,0,0,canvas.width,canvas.height);lc.globalCompositeOperation='source-over';}

 function update(progress,elapsed=0,opacity=1){
  if(!prepared||!stage.clientWidth||!stage.clientHeight)return;root.hidden=false;root.style.opacity=String(clamp(opacity));resize();const p=clamp(progress),t=p*openingDuration,phase=openingPhase(p);if(coverStarted===null||p<1e-7&&previousProgress>1e-7)coverStarted=elapsed;previousProgress=p;
  root.dataset.phase=phase;root.dataset.progress=p.toFixed(4);root.dataset.ambientTime=elapsed.toFixed(3);
  title.style.opacity=String(1-smooth(t/1.7));title.hidden=t>=1.7;
  const aerialCopy=smooth((t-9.05)/.65)*(1-smooth((t-12.45)/.55));
  const welcome=smooth((t-22)/.55)*(1-smooth((t-24)/.65));
  copy.hidden=aerialCopy+welcome<=.001;copy.style.opacity=String(Math.max(aerialCopy,welcome));copy.textContent=aerialCopy>welcome?'어느 옛날, 공주목 관아와 주변 읍치에는\n신묘한 두 사자에 대한 이야기가 떠돌고 있습니다.':'공주목 관아와 주변 읍치에 오신 것을 환영합니다.\n길을 따라 마을 사람들의 이야기를 만나보세요.';
  // Video decoding must keep ticking while its target is fixed, including a
  // final-frame handoff wait or when ambient motion is explicitly disabled.
  const mistFrame=Math.floor(t>=6.6?performance.now()/1000*24:elapsed*15);if(Math.abs(p-lastProgress)<1e-7&&mistFrame===lastMist)return;lastProgress=p;lastMist=mistFrame;
  ambient.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle=t<3.4?'#ececea':'#f1f1ed';ctx.fillRect(0,0,canvas.width,canvas.height);
  if(t<3.4){
   // The original page draws the fixed lion through a 2.2-second capillary bloom
   // on load. A first scroll completes this reveal before the landscape bridge.
   const initial=p>1e-7?1:clamp((elapsed-coverStarted)/2.2);root.dataset.coverReveal=initial.toFixed(3);
   if(initial<1){lc.clearRect(0,0,canvas.width,canvas.height);coverPlate(lc);absorption(initial,true);maskToLayer(true);ctx.drawImage(layer,0,0);}else coverPlate(ctx);
   const reveal=clamp((t-.12)/3.1);if(reveal>0){lc.clearRect(0,0,canvas.width,canvas.height);plate(lc,'mountains');absorption(reveal);maskToLayer();ctx.drawImage(layer,0,0);}
  }
  else if(t<6.6){mountainPass(ctx,t);fog(.10+.64*smooth((t-4.5)/2.1),elapsed);}
  else if(t<9){const clearing=smooth((t-7.05)/1.95),reveal=smooth((t-6.85)/2.15);film.command(0);plate(ctx,'aerial');ctx.save();ctx.globalAlpha=1-reveal;ctx.fillStyle='#f1f1ed';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();mountainPass(ctx,t,1-reveal);fog((.74+.26*smooth((t-6.6)/.45))*(1-clearing),elapsed,clearing);}
  else if(t<13){film.command(0);plate(ctx,'aerial');fog(.028,elapsed);}
  else {const filmTime=clamp(t-13,0,17);film.command(filmTime);film.draw(ctx,{x:0,y:0,width:canvas.width,height:canvas.height},filmTime);if(t<13.8)plate(ctx,'aerial',1,.5,.5,1-smooth((t-13)/.8));fog(t<13?.028:.018,elapsed);}
  if(t<6.6)film.command(0);
  root.dataset.residentAnimation='background-film-only';
  root.dataset.film=JSON.stringify(film.proof());
  options.onFrame?.({root,canvas,ambientCanvas,progress:p,phase,elapsed,residentRegions});
 }
 function hide(){root.hidden=true;copy.hidden=true;film.pause();}
 return {root,canvas,ambientCanvas,ready,update,hide,film,residentRegions,duration:openingDuration,stops:openingStops,phase:openingPhase,destroy(){film.dispose?.();root.remove();style.remove();}};
}
