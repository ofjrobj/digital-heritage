// User-supplied rolling fog: luminance keys preserve curls against pale paper.
export function createFootageFog({stage,world,mist}){
 const video=document.createElement('video');video.className='tr-source';video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='auto';video.setAttribute('aria-hidden','true');video.src=new URL('./fog-rolling-cloud.mp4',import.meta.url).href;stage.append(video);
 const surface=document.createElement('canvas');surface.className='tr-footage-fog';surface.setAttribute('aria-hidden','true');stage.append(surface);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let active=false,amount=0,generation=0,pending=false,failed=false,started=false,phase='idle',backdropOpacity=1,lastDraw=-Infinity,draws=0;
 let gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false});let program,texture,level,aspect;
 try{
  if(!gl)throw Error('WebGL unavailable');
  const shader=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}'));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;
   varying vec2 uv;uniform sampler2D footage;uniform float amount;uniform float aspect;
   vec2 fog(vec2 p){
    vec2 edge=smoothstep(vec2(0.),vec2(.10),p)*smoothstep(vec2(0.),vec2(.10),vec2(1.)-p);
    return vec2(texture2D(footage,clamp(p,vec2(0.),vec2(1.))).r,edge.x*edge.y);
   }
   void main(){vec2 p=uv;float nativeAspect=1.777778;
    if(aspect>nativeAspect)p.y=(p.y-.5)*nativeAspect/aspect+.5;else p.x=(p.x-.5)*aspect/nativeAspect+.5;
    float drift=(1.-amount)*.26;
    vec2 left=fog(vec2(p.x+drift,p.y));
    vec2 bank=mat2(.978148,-.207912,.207912,.978148)*vec2((1.-p.x-.5)*.86,(p.y-.5)*.62)+vec2(.43,.58);
    bank+=vec2(drift*.65,(1.-amount)*.045);
    vec2 right=fog(bank);
    float leftAlpha=smoothstep(.02,.70,pow(left.x,.72))*left.y;
    float rightAlpha=smoothstep(.02,.70,pow(right.x,.72))*right.y*.66;
    float coverage=leftAlpha+rightAlpha-leftAlpha*rightAlpha;
    float alpha=coverage*amount*.98;
    vec3 shadow=vec3(.65,.70,.67),highlight=vec3(.94,.95,.92);
    vec3 leftColor=mix(shadow,highlight,smoothstep(.07,.95,left.x));
    vec3 rightColor=mix(shadow,highlight,smoothstep(.07,.95,right.x));
    vec3 inkPaper=(leftColor*leftAlpha+rightColor*rightAlpha*(1.-leftAlpha))/max(coverage,.0001);
    gl_FragColor=vec4(inkPaper,alpha);
   }`));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Fog shader link');gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);level=gl.getUniformLocation(program,'amount');aspect=gl.getUniformLocation(program,'aspect');
 }catch{gl=null;failed=true;}
 const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;surface.width=Math.max(1,Math.min(1280,w));surface.height=Math.max(1,Math.round(surface.width*h/w));};new ResizeObserver(resize).observe(stage);resize();
 function backdrop(value){backdropOpacity=value;world.style.opacity=String(value);}
 function suspend(){video.pause();}
 function stop(){active=false;amount=0;phase='idle';generation++;suspend();surface.style.opacity='0';backdrop(1);mist.classList.remove('tr-footage-active');}
 function start(enabled){stop();if(!enabled)return;active=true;phase='in';started=false;failed=!gl;lastDraw=-Infinity;mist.classList.add('tr-footage-active');try{video.currentTime=0;}catch{}video.playbackRate=1;}
 function midpoint(){if(!active)return;phase='out';backdrop(0);}
 function update(p){
  amount=Math.max(0,Math.min(1,p));if(!active)return;mist.style.opacity='0';
  // Let rolling banks cover the intact scene before fading scenery underneath.
  // The midpoint stays hidden; only the new scene reveals as the banks recede.
  const fade=Math.max(0,Math.min(1,(amount-.60)/.37));
  backdrop(1-fade*fade*(3-2*fade));
 }
 function tick(now,paused){
  if(!active)return;
  if(paused||document.hidden){suspend();return;}
  if(amount<=.001){surface.style.opacity='0';suspend();return;}
  if(reduced.matches&&!video.paused)video.pause();
  if(!reduced.matches&&!failed&&video.readyState>=2&&video.paused&&!video.ended&&!pending){const token=generation;pending=true;video.play().then(()=>{if(token!==generation||!active||document.hidden)video.pause();else started=true;}).catch(error=>{if(token===generation&&error?.name!=='AbortError')failed=true;}).finally(()=>pending=false);}
  if(failed||!gl||video.readyState<2){surface.style.opacity='0';return;}
  if(now-lastDraw<1000/24)return;lastDraw=now;
  try{gl.viewport(0,0,surface.width,surface.height);gl.useProgram(program);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);gl.uniform1f(level,amount);gl.uniform1f(aspect,surface.width/surface.height);gl.drawArrays(gl.TRIANGLES,0,6);surface.style.opacity='1';draws++;}catch{failed=true;surface.style.opacity='0';suspend();}
 }
 video.addEventListener('error',()=>{failed=true;surface.style.opacity='0';suspend();});document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});addEventListener('pagehide',stop);
 return{start,midpoint,update,tick,stop,suspend,proof:()=>({active,amount,phase,backdropOpacity,ready:video.readyState>=2,started,failed,muted:video.muted,paused:video.paused,playbackRate:video.playbackRate,source:video.currentSrc,draws,reduced:reduced.matches})};
}
