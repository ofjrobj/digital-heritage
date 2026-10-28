import {UI_MOTION_SECONDS,uiMotionEase} from './ui-motion.js?v=ui-motion-1s';
const clamp=value=>Math.max(0,Math.min(1,value));
const paper=[232,232,230],muted=[119,119,113],light=[222,222,216];

export function iconTone(pixels,paperCover=0){
 let sum=0,count=0;
 for(let i=0;i<pixels.length;i+=4){
  const alpha=pixels[i+3]/255;
  sum+=.2126*(pixels[i]*alpha+paper[0]*(1-alpha))+.7152*(pixels[i+1]*alpha+paper[1]*(1-alpha))+.0722*(pixels[i+2]*alpha+paper[2]*(1-alpha));count++;
 }
 const luminance=(count?sum/count:232)/255;
 const covered=luminance+(232/255-luminance)*clamp(paperCover);
 const t=clamp((.66-covered)/.28),amount=t*t*(3-2*t);
 return muted.map((value,index)=>value+(light[index]-value)*amount);
}

// Icons read small local background areas; a linked control takes its source
// color after easing, so it cannot lag behind or diverge on a different backdrop.
export function createAdaptiveIcons(canvas,controls,{colorSources={}}={}){
 const doc=canvas.ownerDocument||document,view=doc.defaultView||globalThis;
 const sample=doc.createElement('canvas');sample.width=12;sample.height=12;
 const ctx=sample.getContext('2d',{willReadFrequently:true});
 const entries=controls.filter(Boolean).map(node=>({node,current:[...muted],from:[...muted],target:[...muted],progress:1,lastKey:null,lastColor:'',active:false}));
 const byId=new Map(entries.map(entry=>[entry.node.id,entry]));
 for(const entry of entries)entry.source=byId.get(colorSources[entry.node.id])||null;
 let lastSample=-Infinity,failed=false;
 return {
  tick(now,dt,ready,{visible=true,frameKey,paperCover=0}={}){
   if(!visible||!ready||doc.hidden){lastSample=-Infinity;return;}
   if(now-lastSample>=400&&!failed){
    lastSample=now;
    const bounds=canvas.getBoundingClientRect();
    if(bounds.width>0&&bounds.height>0)for(const entry of entries){
     const {node}=entry,r=node.getBoundingClientRect(),style=view.getComputedStyle(node);
     entry.active=!node.hidden&&r.width>0&&r.height>0&&style.visibility==='visible'&&style.display!=='none'&&Number(style.opacity)>.005;
     if(!entry.active){entry.lastKey=null;continue;}
     if(entry.source)continue;
     const key=frameKey===undefined?null:[frameKey,r.left,r.top,r.width,r.height,bounds.left,bounds.top,bounds.width,bounds.height,paperCover].join(',');
     if(key!==null&&key===entry.lastKey)continue;
     entry.lastKey=key;
     const sx=canvas.width/bounds.width,sy=canvas.height/bounds.height;
     const left=Math.max(0,(r.left-bounds.left+r.width*.15)*sx),top=Math.max(0,(r.top-bounds.top+r.height*.15)*sy);
     const right=Math.min(canvas.width,(r.right-bounds.left-r.width*.15)*sx),bottom=Math.min(canvas.height,(r.bottom-bounds.top-r.height*.15)*sy);
     if(right<=left||bottom<=top)continue;
     try{
      ctx.clearRect(0,0,12,12);ctx.drawImage(canvas,left,top,right-left,bottom-top,0,0,12,12);
      const target=iconTone(ctx.getImageData(0,0,12,12).data,paperCover);
      if(target.some((value,index)=>Math.abs(value-entry.target[index])>.5)){
       entry.from=[...entry.current];entry.target=target;entry.progress=0;
      }
     }catch{failed=true;entry.from=[...entry.current];entry.target=[...muted];entry.progress=0;break;}
    }
   }
   for(const entry of entries){
    if(!entry.active||entry.source)continue;
    entry.progress=Math.min(1,entry.progress+Math.min(.1,Math.max(0,dt))/UI_MOTION_SECONDS);
    const eased=uiMotionEase(entry.progress);
    entry.current=entry.from.map((value,index)=>value+(entry.target[index]-value)*eased);
    const color=`rgb(${entry.current.map(Math.round).join(', ')})`;
    if(color!==entry.lastColor){entry.node.style.setProperty('--scene-icon-color',color);entry.lastColor=color;}
   }
   for(const entry of entries){
    if(!entry.source)continue;
    const color=entry.source.lastColor||`rgb(${muted.join(', ')})`;
    if(color!==entry.lastColor){entry.node.style.setProperty('--scene-icon-color',color);entry.lastColor=color;}
   }
  },
  proof(){return{failed,colors:entries.map(entry=>({id:entry.node.id,color:entry.lastColor,active:entry.active}))};}
 };
}
