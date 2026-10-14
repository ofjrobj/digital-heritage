import {assetURL} from './asset-url.js';
// Fixed painted plates, with an authored timeline. No generative interpolation:
// architectural lines and character identity cannot change between video frames.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const paths={cover:'cover.png',entry:'entry.png',merchant:'merchant.png',farmer:'farmer.png'};
for(const name of ['mountains','aerial','descent','street','gate','courtyard'])paths[name]='locked-style/'+name+'.webp';
const images={};
const ready=Promise.all(Object.entries(paths).map(async([name,path])=>{
 const image=new Image();image.src=assetURL(path,import.meta.url).href;await image.decode();images[name]=image;
}));
export const durations={intro:18,travel1:12,travel2:10};
export const introChapters={ink:0,mountains:3.4,mist:6.6,aerial:9,descent:11.5,entrance:15};
// The reveal starts from the existing cover's ink pixels, not a second lion.
const mw=384,mh=216,field=new Float32Array(mw*mh);
const mask=document.createElement('canvas');mask.width=mw;mask.height=mh;
const mc=mask.getContext('2d',{willReadFrequently:true});
let maskPixels;
function prepareInk(){
 mc.drawImage(images.cover,0,0,mw,mh);const data=mc.getImageData(0,0,mw,mh).data;
 for(let i=0;i<field.length;i++)field[i]=(data[i*4]+data[i*4+1]+data[i*4+2])/3<181?0:1000;
 // Distance to the real eyes/nose/whiskers; two-pass chamfer transform.
 for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){const i=y*mw+x;
  if(x)field[i]=Math.min(field[i],field[i-1]+1);
  if(y)field[i]=Math.min(field[i],field[i-mw]+1);
  if(x&&y)field[i]=Math.min(field[i],field[i-mw-1]+1.414);
 }
 for(let y=mh-1;y>=0;y--)for(let x=mw-1;x>=0;x--){const i=y*mw+x;
  if(x<mw-1)field[i]=Math.min(field[i],field[i+1]+1);
  if(y<mh-1)field[i]=Math.min(field[i],field[i+mw]+1);
  if(x<mw-1&&y<mh-1)field[i]=Math.min(field[i],field[i+mw+1]+1.414);
 }
 for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){
  const grain=Math.sin(x*.39+Math.sin(y*.24)*2)*1.2+Math.sin(y*.65+x*.13)*.8+Math.sin(x*.117+y*.17)*2.3;
  field[y*mw+x]=Math.max(0,field[y*mw+x]+grain);
 }
 maskPixels=mc.createImageData(mw,mh);
}
ready.then(prepareInk).catch(()=>{});
function updateMask(progress){
 const radius=ease(progress)*170-3;
 for(let i=0;i<field.length;i++){
  const v=ease((radius-field[i]+3)/6),j=i*4;
  maskPixels.data[j]=maskPixels.data[j+1]=maskPixels.data[j+2]=255;
  maskPixels.data[j+3]=Math.round(v*255);
 }
 mc.putImageData(maskPixels,0,0);
}
function plate(ctx,name,z=1,cx=.5,cy=.5,alpha=1){
 const im=images[name];if(!im)return;
 const w=ctx.canvas.width,h=ctx.canvas.height,ratio=w/h;
 let sh=im.height/z,sw=sh*ratio;if(sw>im.width/z){sw=im.width/z;sh=sw/ratio;}
 const sx=clamp(im.width*cx-sw/2,0,im.width-sw),sy=clamp(im.height*cy-sh/2,0,im.height-sh);
 ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(im,sx,sy,sw,sh,0,0,w,h);ctx.restore();
}
function fog(ctx,amount,time){
 if(amount<=0)return;const w=ctx.canvas.width,h=ctx.canvas.height;
 ctx.save();
 for(let i=0;i<9;i++){
  const x=(i/8+.1*Math.sin(i*2.1+time*.13))*w,y=(.23+(i%3)*.25+.035*Math.sin(time*.2+i))*h;
  ctx.save();ctx.translate(x,y);ctx.scale(1,.35);
  const g=ctx.createRadialGradient(0,0,0,0,0,w*.45);
  g.addColorStop(0,`rgba(243,239,223,${amount*.72})`);g.addColorStop(.5,`rgba(243,239,223,${amount*.4})`);g.addColorStop(1,'rgba(243,239,223,0)');
  ctx.fillStyle=g;ctx.fillRect(-w*.5,-h*3,w,h*6);ctx.restore();
 }
 ctx.restore();
}
function shot(ctx,name,u,start=1,end=1.045,x=.5,y=.5){plate(ctx,name,start+(end-start)*ease(u),x,y);}
export class IllustratedFilm extends EventTarget{
 constructor(key,parent){
  super();this.key=key;this.duration=durations[key];this.readyState=0;this.paused=true;this.seeking=false;this.playbackRate=1;this.dataset={};this._time=0;this._last=0;
  this.canvas=document.createElement('canvas');this.canvas.width=2048;this.canvas.height=1152;this.canvas.className='illustrated-film';this.canvas.dataset.film=key;this.style=this.canvas.style;this.style.opacity='0';parent.append(this.canvas);this.ctx=this.canvas.getContext('2d',{alpha:false});
  this.layer=document.createElement('canvas');this.layer.width=2048;this.layer.height=1152;this.lc=this.layer.getContext('2d');
  this.load();
 }
 async load(){try{await ready;this.readyState=4;this.render();this.dispatchEvent(new Event('loadeddata'));}catch(error){this.error=error;this.dispatchEvent(new Event('error'));}}
 get currentTime(){return this._time;}
 set currentTime(value){this._time=clamp(value,0,this.duration);if(this.readyState){this.render();this.dispatchEvent(new Event('seeked'));}}
 play(){this.paused=false;this._last=performance.now();return Promise.resolve();}
 pause(){this.paused=true;}
 tick(now){
  if(this.paused||!this.readyState){this._last=now;return;}
  this._time=Math.min(this.duration,this._time+Math.min(.05,(now-this._last)/1000)*this.playbackRate);this._last=now;this.render();
  if(this._time>=this.duration){this.pause();this.dispatchEvent(new Event('ended'));}
 }
 render(){
  const c=this.ctx,t=this._time,w=this.canvas.width,h=this.canvas.height;
  c.fillStyle='#f3efdf';c.fillRect(0,0,w,h);
  if(this.key==='intro'){
   if(t<3.4){
    plate(c,'cover');const p=clamp((t-.3)/3.1);if(p>0){
     this.lc.clearRect(0,0,w,h);plate(this.lc,'mountains');updateMask(p);
     this.lc.globalCompositeOperation='destination-in';this.lc.drawImage(mask,0,0,w,h);this.lc.globalCompositeOperation='source-over';c.drawImage(this.layer,0,0);
    }
   }else if(t<6.6){shot(c,'mountains',(t-3.4)/3.2,1,1.18,.5,.58);fog(c,.08,t);}
   else if(t<9){
    const p=ease((t-6.6)/2.4);plate(c,'aerial');plate(c,'mountains',1.18+.1*p,.5,.58,1-p);fog(c,Math.sin(p*Math.PI)*.9,t);
   }else if(t<11.5){shot(c,'aerial',(t-9)/2.5,1,1.035,.53,.55);}
   else if(t<15){
    const p=(t-11.5)/3.5;shot(c,'descent',p,1,1.035,.55,.57);
    if(p<.16){plate(c,'aerial',1.035,.53,.55,1-ease(p/.16));fog(c,.3*Math.sin(p/.16*Math.PI),t);}
   }else{
    const p=(t-15)/3;shot(c,'entry',p,1.035,1);
    if(p<.23){plate(c,'descent',1.035,.55,.57,1-ease(p/.23));fog(c,.32*Math.sin(p/.23*Math.PI),t);}
   }
  }else{
   // Cuts have fixed timecodes. Scroll only advances this one timeline.
   const list=this.key==='travel1'?
    [{a:0,b:3,n:'entry',z:1,e:1.045},{a:3,b:6,n:'street',z:1,e:1.05},{a:6,b:9,n:'gate',z:1,e:1.05,x:.3},{a:9,b:12,n:'merchant',z:1.025,e:1}]:
    [{a:0,b:2,n:'merchant',z:1,e:1.02},{a:2,b:6.8,n:'courtyard',z:1,e:1.075,x:.67},{a:6.8,b:10,n:'farmer',z:1.025,e:1}];
   const i=list.findIndex(s=>t<s.b),idx=i<0?list.length-1:i,s=list[idx];shot(c,s.n,(t-s.a)/(s.b-s.a),s.z,s.e,s.x||.5,.5);
   // A brief optical dissolve joins fixed illustrations; no optical-flow morph.
   if(idx>0&&t-s.a<.32){const prev=list[idx-1];plate(c,prev.n,prev.e,prev.x||.5,.5,1-ease((t-s.a)/.32));}
  }
  this.canvas.dataset.time=t.toFixed(3);this.canvas.dataset.paused=String(this.paused);
 }
}
