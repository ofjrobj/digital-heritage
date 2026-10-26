const clamp = x => Math.max(0, Math.min(1, x));
export function paperNeed(pixels) {
  let sum=0,dark=0,count=pixels.length/4;
  if(!count)return 0;
  for(let i=0;i<pixels.length;i+=4){
    const y=(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2])/255;
    sum+=y;if(y<.62)dark++;
  }
  const t=clamp(Math.max((.76-sum/count)/.23,(dark/count-.05)/.30));
  return t*t*(3-2*t);
}
export function createAdaptiveNavPaper(stage,canvas,nav){
  const sample=document.createElement('canvas');sample.width=48;sample.height=12;
  const ctx=sample.getContext('2d',{willReadFrequently:true});
  let target=0,opacity=0,lastSample=-Infinity,failed=false,lastFrameKey,hasFrameKey=false,lastOpacity='';
  return {
    tick(now,dt,ready,{visible=true,frameKey}={}){
      if(!nav||!ready)return;
      // Hidden navigation needs neither contrast sampling nor style updates.
      // Recheck on reveal, even when its underlying frame has stayed still.
      if(!visible){lastSample=-Infinity;hasFrameKey=false;return;}
      const sameFrame=frameKey!==undefined&&hasFrameKey&&frameKey===lastFrameKey;
      if(now-lastSample>=400&&!sameFrame){
        lastSample=now;
        lastFrameKey=frameKey;hasFrameKey=frameKey!==undefined;
        try{
          const bounds=stage.getBoundingClientRect(),r=nav.getBoundingClientRect();
          const sx=canvas.width/bounds.width,sy=canvas.height/bounds.height;
          const x=Math.max(0,(r.left-bounds.left-8)*sx),y=Math.max(0,(r.top-bounds.top-4)*sy);
          const w=Math.min(canvas.width-x,(r.width+16)*sx),h=Math.min(canvas.height-y,(r.height+8)*sy);
          if(w>0&&h>0){ctx.drawImage(canvas,x,y,w,h,0,0,48,12);target=paperNeed(ctx.getImageData(0,0,48,12).data);}
        }catch{failed=true;}
      }
      // Exponential response removes threshold flashes; both directions take
      // roughly 1.5 seconds to become visually settled, without moving the text.
      opacity+=(target-opacity)*(1-Math.exp(-Math.min(.1,Math.max(0,dt))/.55));
      if(target===0&&opacity<.001)opacity=0;
      const nextOpacity=opacity.toFixed(3);
      if(nextOpacity!==lastOpacity){stage.style.setProperty('--nav-paper',nextOpacity);lastOpacity=nextOpacity;}
    },
    proof(){return {opacity,target,failed};}
  };
}
