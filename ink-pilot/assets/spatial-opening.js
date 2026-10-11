import {createSpatialFilm} from "./spatial-film.js?v=3";
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
 .spatial-cover-copy>div{position:absolute;top:75%;left:8%;right:8%;transform:translateY(-50%)}
 .spatial-cover-copy h1{margin:0;font-size:27px;font-weight:500;letter-spacing:.015em;line-height:1.6}
 .spatial-cover-copy p{margin:13px 0 0;font-family:var(--story-sans,'Space Grotesk',sans-serif);font-size:9px;letter-spacing:.17em;color:#62625d}
 .spatial-opening-copy{position:absolute;top:43%;left:12%;right:12%;margin:0;padding:24px;text-align:center;white-space:pre-line;color:#373734;font-family:var(--story-serif,'Noto Serif KR',serif);font-size:17px;line-height:1.9;word-break:keep-all;background:radial-gradient(ellipse,rgba(250,250,248,.88),rgba(250,250,248,.64) 45%,transparent 74%)}
 @media(orientation:landscape) and (max-height:500px){.spatial-cover-copy>span{top:13%;font-size:8px}.spatial-cover-copy h1{font-size:24px}.spatial-cover-copy p{font-size:8px;margin-top:7px}.spatial-cover-copy>div{top:73%}.spatial-opening-copy{font-size:14px;padding:14px;top:42%}}
 @media(orientation:portrait) and (max-width:700px){.spatial-cover-copy h1{font-size:24px}.spatial-opening-copy{left:5%;right:5%;font-size:14px;padding:20px 10px}}
 `;document.head.append(style);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;pointer-events:none';
 // Identical display-only white balance on every opening plate. The originals
 // and the UI remain untouched. Paper is neutral rather than sepia yellow.
 svg.innerHTML='<defs><filter id="spatialOpeningPaperBalance" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".98 0 0 0 0  0 1 0 0 0  0 0 1.08 0 0  0 0 0 1 0"/><feColorMatrix type="saturate" values=".94"/></filter></defs>';
 root.append(svg);stage.append(root);
 const canvas=root.querySelector('.spatial-opening-art'),ctx=canvas.getContext('2d',{alpha:false}),ambientCanvas=root.querySelector('.spatial-opening-ambient'),ambient=ambientCanvas.getContext('2d'),title=root.querySelector('.spatial-cover-copy'),copy=root.querySelector('.spatial-opening-copy');
 const layer=document.createElement('canvas'),lc=layer.getContext('2d');
 const paths={cover:'cover.png',mountains:'locked-style/mountains.webp'};
 const images={},mask=document.createElement('canvas'),mw=384,mh=216;mask.width=mw;mask.height=mh;
 const mc=mask.getContext('2d',{willReadFrequently:true}),field=new Float32Array(mw*mh),coverField=new Float32Array(mw*mh);let pixels,prepared=false,lastProgress=-1,lastMist=-1,coverStarted=null,previousProgress=0;
 const film=createSpatialFilm();
 const residentRegions={};
 function prepare(){
  mc.drawImage(images.cover,0,0,mw,mh);const d=mc.getImageData(0,0,mw,mh).data;
  for(let i=0;i<field.length;i++)field[i]=(d[i*4]+d[i*4+1]+d[i*4+2])/3<181?0:1000;
  for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){const i=y*mw+x;if(x)field[i]=Math.min(field[i],field[i-1]+1);if(y)field[i]=Math.min(field[i],field[i-mw]+1);if(x&&y)field[i]=Math.min(field[i],field[i-mw-1]+1.414);}
  for(let y=mh-1;y>=0;y--)for(let x=mw-1;x>=0;x--){const i=y*mw+x;if(x<mw-1)field[i]=Math.min(field[i],field[i+1]+1);if(y<mh-1)field[i]=Math.min(field[i],field[i+mw]+1);if(x<mw-1&&y<mh-1)field[i]=Math.min(field[i],field[i+mw+1]+1.414);}
  for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){const grain=Math.sin(x*.39+Math.sin(y*.24)*2)*1.2+Math.sin(y*.65+x*.13)*.8+Math.sin(x*.117+y*.17)*2.3;field[y*mw+x]=Math.max(0,field[y*mw+x]+grain);coverField[y*mw+x]=Math.hypot(x-mw*.5,y-mh*(400/900))+grain*1.6;}
  pixels=mc.createImageData(mw,mh);prepared=true;
 }
 const ready=Promise.all(Object.entries(paths).map(async([name,path])=>{const im=new Image();im.src=new URL(path,import.meta.url).href;await im.decode();images[name]=im;})).then(async()=>{prepare();await film.ready;return root;});
 function resize(){const scale=Math.min(devicePixelRatio||1,1.6),w=Math.min(2560,Math.round(stage.clientWidth*scale)),h=Math.round(w*stage.clientHeight/Math.max(1,stage.clientWidth));if(canvas.width!==w||canvas.height!==h){canvas.width=layer.width=ambientCanvas.width=w;canvas.height=layer.height=ambientCanvas.height=h;lastProgress=-1;}}
 function plate(context,name,zoom=1,cx=.5,cy=.5,alpha=1){const im=images[name],w=canvas.width,h=canvas.height;if(!im||alpha<=0)return;const ratio=w/h;let sh=im.height/zoom,sw=sh*ratio;if(sw>im.width/zoom){sw=im.width/zoom;sh=sw/ratio;}const x=clamp(im.width*cx-sw/2,0,im.width-sw),y=clamp(im.height*cy-sh/2,0,im.height-sh);context.save();context.filter="url('#spatialOpeningPaperBalance')";context.globalAlpha=alpha;context.drawImage(im,x,y,sw,sh,0,0,w,h);context.restore();}
 function absorption(p,initial=false){const distances=initial?coverField:field,radius=initial?smooth(p)*264:smooth(p)*180-4;for(let i=0;i<field.length;i++){const j=i*4;pixels.data[j]=pixels.data[j+1]=pixels.data[j+2]=255;pixels.data[j+3]=Math.round(smooth((radius-distances[i]+3)/6)*255);}mc.putImageData(pixels,0,0);}
 function fog(amount,clock){if(amount<=.001||options.ambientFog===false)return;const w=canvas.width,h=canvas.height;ambient.save();for(let i=0;i<8;i++){const x=(i/7+.085*Math.sin(i*2.1+clock*.13))*w,y=(.23+(i%3)*.25+.035*Math.sin(clock*.2+i))*h;ambient.save();ambient.translate(x,y);ambient.scale(1,.37);const g=ambient.createRadialGradient(0,0,0,0,0,w*.43);g.addColorStop(0,`rgba(241,241,237,${amount*.65})`);g.addColorStop(.5,`rgba(241,241,237,${amount*.3})`);g.addColorStop(1,'rgba(241,241,237,0)');ambient.fillStyle=g;ambient.fillRect(-w*.5,-h*3,w,h*6);ambient.restore();}ambient.restore();}
 function maskToLayer(){lc.globalCompositeOperation='destination-in';const r=canvas.width/canvas.height;let sh=mh,sw=sh*r;if(sw>mw){sw=mw;sh=sw/r;}lc.drawImage(mask,(mw-sw)/2,(mh-sh)/2,sw,sh,0,0,canvas.width,canvas.height);lc.globalCompositeOperation='source-over';}

 function sequenceShot(name,u,z0=1,z1=1.04,x=.5,y=.5){plate(ctx,name,z0+(z1-z0)*smooth(u),x,y);}
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
  ambient.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#f1f1ed';ctx.fillRect(0,0,canvas.width,canvas.height);
  if(t<3.4){
   // The original page draws the fixed lion through a 2.2-second capillary bloom
   // on load. A first scroll completes this reveal before the landscape bridge.
   const initial=p>1e-7?1:clamp((elapsed-coverStarted)/2.2);root.dataset.coverReveal=initial.toFixed(3);
   if(initial<1){lc.clearRect(0,0,canvas.width,canvas.height);plate(lc,'cover');absorption(initial,true);maskToLayer();ctx.drawImage(layer,0,0);}else plate(ctx,'cover');
   const reveal=clamp((t-.12)/3.1);if(reveal>0){lc.clearRect(0,0,canvas.width,canvas.height);plate(lc,'mountains');absorption(reveal);maskToLayer();ctx.drawImage(layer,0,0);}
  }
  else if(t<6.6){sequenceShot('mountains',(t-3.4)/3.2,1,1.15,.5,.56);fog(.10,elapsed);}
  else if(t<9){const f=smooth((t-6.6)/2.4);film.command(0);film.draw(ctx,{x:0,y:0,width:canvas.width,height:canvas.height},0);plate(ctx,'mountains',1.15+.06*f,.5,.56,1-f);fog(Math.sin(f*Math.PI)*.83+.08*(1-f),elapsed);}
  else {const filmTime=clamp(t-13,0,17);film.command(filmTime);film.draw(ctx,{x:0,y:0,width:canvas.width,height:canvas.height},filmTime);fog(t<13?.028:.018,elapsed);}
  if(t<6.6)film.command(0);
  root.dataset.residentAnimation='independent-recorded-video';
  root.dataset.film=JSON.stringify(film.proof());
  options.onFrame?.({root,canvas,ambientCanvas,progress:p,phase,elapsed,residentRegions});
 }
 function hide(){root.hidden=true;copy.hidden=true;film.pause();}
 return {root,canvas,ambientCanvas,ready,update,hide,film,residentRegions,duration:openingDuration,stops:openingStops,phase:openingPhase,destroy(){film.dispose?.();root.remove();style.remove();}};
}
