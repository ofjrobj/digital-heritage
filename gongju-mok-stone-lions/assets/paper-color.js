// Match the archive's neutral paper. Only pale, nearly neutral areas are adapted;
// dark ink and stronger pigments retain their original RGB values.
export const PAPER_RGB=Object.freeze([232,232,230]);
export const PAPER_CSS='#e8e8e6';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const luminance=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
const dimensions=s=>[s.videoWidth||s.naturalWidth||s.width,s.videoHeight||s.naturalHeight||s.height];

export function samplePaperWhite(source){
 const probe=document.createElement('canvas');probe.width=160;probe.height=90;
 const p=probe.getContext('2d',{willReadFrequently:true});p.drawImage(source,0,0,160,90);
 const data=p.getImageData(0,0,160,90).data,candidates=[];
 for(let i=0;i<data.length;i+=4){const c=[data[i],data[i+1],data[i+2]];if(data[i+3]>240&&Math.min(...c)>190&&Math.max(...c)-Math.min(...c)<45)candidates.push(c);}
 if(candidates.length<80)return [240,238,232];
 candidates.sort((a,b)=>luminance(a)-luminance(b));
 const bright=candidates.slice(Math.floor(candidates.length*.60),Math.ceil(candidates.length*.90));
 return [0,1,2].map(ch=>bright.map(c=>c[ch]).sort((a,b)=>a-b)[Math.floor(bright.length/2)]);
}

export function paperPixel(rgb,white,target=PAPER_RGB){
 const relative=rgb.map((v,i)=>v/white[i]),light=luminance(relative),chroma=Math.max(...relative)-Math.min(...relative);
 const balance=smooth(.50,.93,light)*(1-smooth(.07,.22,chroma));
 const paper=smooth(.76,.98,light)*(1-smooth(.045,.13,chroma));
 return rgb.map((v,i)=>{
  const balanced=v+(v*target[i]/white[i]-v)*balance;
  const neutral=target[i]*(1+Math.min(0,light-1)*.22);
  return Math.max(0,Math.min(255,balanced+(neutral-balanced)*paper));
 });
}

export function normalizePaperPixels(context,w,h,white,target=PAPER_RGB){
 const pixels=context.getImageData(0,0,w,h),d=pixels.data;
 for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const c=paperPixel([d[i],d[i+1],d[i+2]],white,target);d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];}
 context.putImageData(pixels,0,0);
}

export function gradePixel(rgb,grade={}){
 const c=rgb.map(v=>v/255),l=luminance(c),weight=smooth(.04,.16,l)*(1-smooth(.72,.92,l));
 const shadow=1-smooth(.2,.65,l);
 return c.map((v,ch)=>{
  let tone=(l+(v-l)*(grade.saturation??1))*(grade.gain?.[ch]??1);
  tone=tone*(1+((grade.shadowGain?.[ch]??1)-1)*shadow)+(grade.shadowLift?.[ch]??0)*shadow;
  return Math.max(0,Math.min(255,(v+(tone-v)*weight)*255));
 });
}

export function createPaperColor(){
 const surface=document.createElement('canvas'),profiles=new Map(),stillCache=new WeakMap(),videoFrames=new WeakMap();
 let gl,program,texture,lastKey='',lastTime=-1,lastSource=null,lastTextureSource=null,lastTextureTime=-1,lastWhite=null,backend='initializing';
 const vertex='attribute vec2 position; varying vec2 uv; void main(){uv=(position+1.0)*.5;gl_Position=vec4(position,0.,1.);}';
 const fragment=`precision highp float;
 varying vec2 uv; uniform sampler2D source; uniform vec3 white; uniform vec3 paper; uniform vec3 gradeGain; uniform float gradeSaturation; uniform float preserveSource; uniform vec3 shadowGain; uniform vec3 shadowLift;
 void main(){
  vec4 c=texture2D(source,uv);
  float sourceLight=dot(c.rgb,vec3(.2126,.7152,.0722));
  float gradeWeight=smoothstep(.04,.16,sourceLight)*(1.-smoothstep(.72,.92,sourceLight));
  vec3 tone=mix(vec3(sourceLight),c.rgb,gradeSaturation)*gradeGain;
  float shadowWeight=1.-smoothstep(.2,.65,sourceLight);
  tone=tone*mix(vec3(1.),shadowGain,shadowWeight)+shadowLift*shadowWeight;
  c.rgb=mix(c.rgb,tone,gradeWeight);
  if(preserveSource>.5){gl_FragColor=c;return;}
  vec3 relative=c.rgb/white;
  float light=dot(relative,vec3(.2126,.7152,.0722));
  float chroma=max(max(relative.r,relative.g),relative.b)-min(min(relative.r,relative.g),relative.b);
  float balance=smoothstep(.50,.93,light)*(1.-smoothstep(.07,.22,chroma));
  float amount=smoothstep(.76,.98,light)*(1.-smoothstep(.045,.13,chroma));
  vec3 balanced=mix(c.rgb,c.rgb*paper/white,balance);
  vec3 neutral=paper*(1.+min(0.,light-1.)*.22);
  gl_FragColor=vec4(mix(balanced,neutral,amount),c.a);
 }`;
 try{
  gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false});if(!gl)throw Error('WebGL unavailable');
  function shader(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Paper shader link');gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.uniform3fv(gl.getUniformLocation(program,'paper'),PAPER_RGB.map(v=>v/255));backend='webgl';
 }catch{gl=null;backend='canvas';}
 const whiteUniform=gl?gl.getUniformLocation(program,'white'):null;
 const gradeUniforms=gl?Object.fromEntries(['shadowGain','shadowLift','gradeGain','gradeSaturation','preserveSource'].map(name=>[name,gl.getUniformLocation(program,name)])):null;
 surface.addEventListener('webglcontextlost',e=>{e.preventDefault();gl=null;backend='canvas';lastKey='';});
 const fallback=document.createElement('canvas');const fc=fallback.getContext('2d',{willReadFrequently:true});
 function frameTime(source){
  if(source.tagName!=='VIDEO'||typeof source.requestVideoFrameCallback!=='function')return source.currentTime??-1;
  let state=videoFrames.get(source);
  if(!state){
   state={revision:0,callback:null};videoFrames.set(source,state);
   // currentTime is a playback clock, not a decoded-frame identity. Upload the
   // texture only when the browser presents new pixels; the main canvas can
   // still composite its transitions on every animation frame.
   const watch=()=>{if(state.callback===null)state.callback=source.requestVideoFrameCallback(()=>{state.callback=null;state.revision++;watch();});};
   const invalidate=()=>{state.revision++;watch();};
   source.addEventListener('loadeddata',invalidate);
   source.addEventListener('seeked',invalidate);
   source.addEventListener('emptied',()=>{
    state.revision++;
    if(state.callback!==null)source.cancelVideoFrameCallback(state.callback);
    state.callback=null;
   });
   watch();
  }
  return state.revision;
 }
 function render(source,grade=null,preserveSource=false){
  if(preserveSource&&!grade)return source;
  const [w,h]=dimensions(source);if(!w||!h)return source;
  const sourceKey=source.currentSrc||source.src||source;
  const key=String(sourceKey)+'|'+JSON.stringify(grade)+'|'+preserveSource,time=frameTime(source);
  try{
   // White belongs to the raw footage, independently of its animated grade.
   // A changing departure grade must not resample/read back pixels every RAF.
   if(!profiles.has(sourceKey))profiles.set(sourceKey,samplePaperWhite(source));
   const white=profiles.get(sourceKey);lastWhite=white;
   if(gl){
    backend='webgl';
    if(!source.seeking&&lastSource===source&&lastKey===key&&lastTime===time)return surface;
    if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;gl.viewport(0,0,w,h);}
    gl.bindTexture(gl.TEXTURE_2D,texture);
    if(source.seeking||lastTextureSource!==source||lastTextureTime!==time){
     gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
     lastTextureSource=source;lastTextureTime=time;
    }
    gl.uniform3fv(gradeUniforms.shadowGain,grade?.shadowGain||[1,1,1]);gl.uniform3fv(gradeUniforms.shadowLift,grade?.shadowLift||[0,0,0]);gl.uniform3fv(gradeUniforms.gradeGain,grade?.gain||[1,1,1]);gl.uniform1f(gradeUniforms.gradeSaturation,grade?.saturation??1);gl.uniform1f(gradeUniforms.preserveSource,preserveSource?1:0);gl.uniform3fv(whiteUniform,white.map(v=>v/255));gl.drawArrays(gl.TRIANGLES,0,6);lastKey=source.seeking?'':key;lastTime=time;lastSource=source;return surface;
   }
   backend='canvas';
   if(source.tagName!=='VIDEO'&&stillCache.has(source))return stillCache.get(source);
   if(!source.seeking&&lastSource===source&&lastKey===key&&lastTime===time)return fallback;
   const scale=Math.min(1,1920/w);fallback.width=Math.round(w*scale);fallback.height=Math.round(h*scale);fc.drawImage(source,0,0,fallback.width,fallback.height);if(grade){const pixels=fc.getImageData(0,0,fallback.width,fallback.height),d=pixels.data;for(let i=0;i<d.length;i+=4){const c=gradePixel([d[i],d[i+1],d[i+2]],grade);for(let ch=0;ch<3;ch++)d[i+ch]=c[ch];}fc.putImageData(pixels,0,0);}if(!preserveSource)normalizePaperPixels(fc,fallback.width,fallback.height,white);
   lastKey=source.seeking?'':key;lastTime=time;lastSource=source;
   if(source.tagName!=='VIDEO'){const copy=document.createElement('canvas');copy.width=fallback.width;copy.height=fallback.height;copy.getContext('2d').drawImage(fallback,0,0);stillCache.set(source,copy);return copy;}return fallback;
  }catch{backend='source-fallback';return source;}
 }
 return {render,proof:()=>({target:PAPER_RGB,backend,sourceWhite:lastWhite,profiles:profiles.size,scope:'pale paper; ink and pigments protected'})};
}
