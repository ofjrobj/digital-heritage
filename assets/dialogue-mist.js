// Two drifting, cached noise fields give the transition depth without a video download.
export function mistEnvelope(progress){
 const p=Math.max(0,Math.min(1,progress));
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 return smooth(p/.40)*(1-smooth((p-.52)/.48));
}
let layer,ctx,textures,reduced;
function noiseTexture(seed){
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=216;
 const context=canvas.getContext('2d'),pixels=context.createImageData(canvas.width,canvas.height);
 const hash=(x,y)=>{const v=Math.sin(x*127.1+y*311.7+seed*93.3)*43758.5453;return v-Math.floor(v);};
 const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);return (hash(ix,iy)*(1-fx)+hash(ix+1,iy)*fx)*(1-fy)+(hash(ix,iy+1)*(1-fx)+hash(ix+1,iy+1)*fx)*fy;};
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  let n=0;for(let octave=0;octave<5;octave++)n+=noise(x/100*2**octave,y/75*2**octave)*.5**(octave+1);
  const i=(y*canvas.width+x)*4,edge=Math.sin(Math.PI*x/(canvas.width-1))**.35*Math.sin(Math.PI*y/(canvas.height-1))**.35;
  pixels.data[i]=224;pixels.data[i+1]=230;pixels.data[i+2]=219;pixels.data[i+3]=Math.max(0,Math.min(255,(n-.27)*720))*edge;
 }
 context.putImageData(pixels,0,0);return canvas;
}
function prepare(){
 if(layer)return;
 layer=document.createElement('canvas');layer.id='dialogueMist';layer.width=960;layer.height=540;layer.hidden=true;layer.setAttribute('aria-hidden','true');
 layer.style.cssText='position:fixed;pointer-events:none;z-index:18;opacity:0';document.body.append(layer);ctx=layer.getContext('2d');textures=[noiseTexture(13),noiseTexture(37)];reduced=matchMedia('(prefers-reduced-motion:reduce)');
 for(const name of ['archive-open','story-home','cinema-release'])document.addEventListener(name,clearDialogueMist);
}
export function setDialogueMist(kind,progress){
 prepare();const strength=mistEnvelope(progress);layer.hidden=strength<=.001;layer.style.opacity=String(strength);layer.dataset.transition=kind;layer.dataset.progress=progress.toFixed(3);
 ctx.clearRect(0,0,960,540);if(layer.hidden)return;
 // Full occlusion during the plateau hides the camera cut in both directions.
 ctx.fillStyle=`rgba(220,226,215,${strength})`;ctx.fillRect(0,0,960,540);
 const shift=reduced.matches?0:(progress-.5)*160,direction=kind==='dialogue-in'?1:-1;
 ctx.globalAlpha=.92;ctx.drawImage(textures[0],-230+shift*direction,-90,1440,810);
 ctx.globalAlpha=.64;ctx.drawImage(textures[1],-240-shift*direction*.6,-180,1440,810);ctx.globalAlpha=1;
}
export function clearDialogueMist(){if(layer){layer.hidden=true;layer.style.opacity='0';}}
