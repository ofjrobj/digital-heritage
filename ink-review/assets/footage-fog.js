// User-supplied side fog: keyed from luminance so pale paper keeps visible wisps.
export function createFootageFog({stage,world,mist}){
 const video=document.createElement('video');video.className='tr-source';video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='auto';video.setAttribute('aria-hidden','true');video.src=new URL('./fog-atmosphere-side.mp4',import.meta.url).href;stage.append(video);
 const surface=document.createElement('canvas');surface.className='tr-footage-fog';surface.setAttribute('aria-hidden','true');stage.append(surface);
 const hold=document.createElement('canvas');hold.className='tr-fog-dissolve';hold.setAttribute('aria-hidden','true');stage.append(hold);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let active=false,amount=0,generation=0,pending=false,failed=false,started=false,swapAt=null,swapElapsed=0,lastTick=null,lastDraw=-Infinity,draws=0;
 let gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false});let program,texture,level,aspect;
 try{
  if(!gl)throw Error('WebGL unavailable');
  const shader=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}'));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;
   varying vec2 uv;uniform sampler2D footage;uniform float amount;uniform float aspect;
   float fog(vec2 p){if(p.x<0.||p.x>1.||p.y<0.||p.y>1.)return 0.;return texture2D(footage,p).r;}
   void main(){vec2 p=uv;float nativeAspect=1.777778;
    if(aspect>nativeAspect)p.y=(p.y-.5)*nativeAspect/aspect+.5;else p.x=(p.x-.5)*aspect/nativeAspect+.5;
    float drift=(1.-amount)*.18;
    float right=fog(vec2(p.x-drift,p.y));
    float left=fog(vec2(1.-p.x-drift,p.y*.88+.09))*.64;
    float density=clamp(right+left-right*left,0.,1.);
    float alpha=smoothstep(.02,.52,density)*amount*.82;
    vec3 inkPaper=mix(vec3(.79,.82,.80),vec3(.94,.95,.92),density);
    gl_FragColor=vec4(inkPaper,alpha);
   }`));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Fog shader link');gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);level=gl.getUniformLocation(program,'amount');aspect=gl.getUniformLocation(program,'aspect');
 }catch{gl=null;failed=true;}
 const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;surface.width=Math.max(1,Math.min(1280,w));surface.height=Math.max(1,Math.round(surface.width*h/w));};new ResizeObserver(resize).observe(stage);resize();
 function suspend(){video.pause();lastTick=null;}
 function stop(){active=false;amount=0;generation++;suspend();surface.style.opacity='0';hold.style.opacity='0';swapAt=null;mist.classList.remove('tr-footage-active');}
 function start(enabled){stop();if(!enabled)return;active=true;started=false;failed=!gl;mist.classList.add('tr-footage-active');try{video.currentTime=0;}catch{}video.playbackRate=.65;}
 function midpoint(){if(!active)return;hold.width=world.width;hold.height=world.height;hold.getContext('2d').drawImage(world,0,0);hold.style.opacity='1';swapAt=performance.now();swapElapsed=0;lastTick=null;}
 function update(p){amount=Math.max(0,Math.min(1,p));if(!active)return;mist.style.opacity='0';}
 function tick(now,paused){
  if(!active)return;
  if(paused||document.hidden){suspend();return;}
  const dt=lastTick===null?0:Math.min(80,Math.max(0,now-lastTick));lastTick=now;
  if(swapAt!==null){swapElapsed+=dt;const t=Math.min(1,swapElapsed/(reduced.matches?250:650));hold.style.opacity=String(1-t*t*(3-2*t));}
  if(amount<=.001){surface.style.opacity='0';suspend();return;}
  if(reduced.matches&&!video.paused)video.pause();
  if(!reduced.matches&&!failed&&video.readyState>=2&&video.paused&&!video.ended&&!pending){const token=generation;pending=true;video.play().then(()=>{if(token!==generation||!active||document.hidden)video.pause();else started=true;}).catch(error=>{if(token===generation&&error?.name!=='AbortError')failed=true;}).finally(()=>pending=false);}
  if(failed||!gl||video.readyState<2){surface.style.opacity='0';return;}
  if(now-lastDraw<1000/24)return;lastDraw=now;
  try{gl.viewport(0,0,surface.width,surface.height);gl.useProgram(program);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);gl.uniform1f(level,amount);gl.uniform1f(aspect,surface.width/surface.height);gl.drawArrays(gl.TRIANGLES,0,6);surface.style.opacity='1';draws++;}catch{failed=true;surface.style.opacity='0';suspend();}
 }
 video.addEventListener('error',()=>{failed=true;surface.style.opacity='0';suspend();});document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});addEventListener('pagehide',stop);
 return{start,midpoint,update,tick,stop,suspend,proof:()=>({active,amount,ready:video.readyState>=2,started,failed,muted:video.muted,paused:video.paused,source:video.currentSrc,draws,reduced:reduced.matches})};
}
