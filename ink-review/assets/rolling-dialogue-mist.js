export {createRouteFilm} from './spatial-route-film.js?v=background-ui-1';
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};

// Fully cover the existing .48 camera cut, with soft advancing fog fronts.
export function createDialogueMist(stage){
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;opacity:0';stage.append(canvas);
 const ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,field=document.createElement('canvas');field.width=240;field.height=135;
 const fc=field.getContext('2d'),px=fc.createImageData(240,135),noise=new Float32Array(256*256);
 const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7+13*93.3)*43758.5453;return n-Math.floor(n);};
 const value=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);return(hash(ix,iy)*(1-fx)+hash(ix+1,iy)*fx)*(1-fy)+(hash(ix,iy+1)*(1-fx)+hash(ix+1,iy+1)*fx)*fy;};
 for(let y=0;y<256;y++)for(let x=0;x<256;x++)noise[y*256+x]=value(x/40,y/35)*.68+value(x/18,y/15)*.24+value(x/8,y/7)*.08;
 for(let i=0;i<px.data.length;i+=4)px.data[i]=px.data[i+1]=px.data[i+2]=255;
 let last=-1,lastKind='',coverage=0,opaque=false;
 return {draw(kind,progress){
  const p=clamp(progress);coverage=p<.4?smooth(p/.4):p>.52?1-smooth((p-.52)/.48):1;opaque=p>=.4&&p<=.52;
  canvas.hidden=coverage<=.001;canvas.style.opacity=canvas.hidden?'0':'1';canvas.dataset.progress=String(p);canvas.dataset.transition=kind;
  if(canvas.hidden||p===last&&kind===lastKind)return coverage;last=p;lastKind=kind;ctx.clearRect(0,0,960,540);
  if(opaque){ctx.fillStyle='#fff';ctx.fillRect(0,0,960,540);return coverage;}
  const drift=reduced?0:p*33,dir=kind==='dialogue-in'?1:-1;
  for(let y=0;y<135;y++)for(let x=0;x<240;x++){
   const u=x/239,v=y/134,nx=(Math.floor(x+drift*dir)+512)%256,ny=(Math.floor(y+drift*.42)+256)%256,billow=noise[ny*256+nx];
   const distance=Math.min(u*.94+.055*Math.sin(v*11+p*3),(1-u)*1.02+.055*Math.cos(v*9-p*2),(1-v)*.78+.07*Math.sin(u*10+p*2.4),v*1.32+.10);
   const arrival=clamp(.08+distance*1.28+(billow-.5)*.27,.02,.70);
   px.data[(y*240+x)*4+3]=Math.round(smooth((coverage-arrival)/.27)*255);
  }
  fc.putImageData(px,0,0);ctx.save();ctx.imageSmoothingEnabled=true;ctx.filter='blur(7px)';ctx.drawImage(field,-24,-18,1008,576);ctx.restore();return coverage;
 },clear(){canvas.hidden=true;canvas.style.opacity='0';last=-1;coverage=0;opaque=false;},proof(){return {kind:canvas.dataset.transition,progress:Number(canvas.dataset.progress)||0,opacity:coverage,fullyOccluded:opaque,rollingWhiteFog:true};}};
}
