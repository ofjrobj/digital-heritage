import {PAPER_RGB} from './paper-color.js?v=archive-paper-1';

// Broad, softly advecting mist. Opacity, not a separate scene fade, hides the cut.
export function createFootageFog({stage,world,mist}){
 let surface=document.createElement('canvas');surface.className='tr-footage-fog';surface.setAttribute('aria-hidden','true');stage.append(surface);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=v=>Math.max(0,Math.min(1,v));
 let active=false,amount=0,phase='idle',elapsed=0,lastTime=null,lastDraw=-Infinity,draws=0,suspended=false;
 let gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false}),ctx=null,program,level,aspect,time;
 try{
  if(!gl)throw Error('WebGL unavailable');
  const shader=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}'));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision highp float;
   varying vec2 uv;uniform float amount;uniform float aspect;uniform float time;uniform vec3 paper;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
   float fbm(vec2 p){float value=0.,weight=.55;mat2 turn=mat2(.8,-.6,.6,.8);for(int i=0;i<4;i++){value+=weight*noise(p);p=turn*p*1.95+vec2(13.4,7.1);weight*=.48;}return value;}
   void main(){
    vec2 p=vec2(uv.x*aspect,uv.y);
    vec2 drift=vec2(time*.027,-time*.011);
    vec2 warp=vec2(fbm(p*1.24+drift),fbm(p*1.19-drift+vec2(7.3,1.6)));
    float field=fbm(p*2.15+warp*.85-drift+vec2(2.1,4.7));
    field=clamp((field-.43)*1.9+.5,0.,1.);
    // Wide feathered density changes avoid hard circles, mirrored smoke and sharp wipes.
    float cloud=smoothstep(-.34,.34,amount*1.6-1.08+field*.55+(1.-uv.y)*.065);
    float haze=amount*.18;
    float alpha=(haze+(1.-haze)*cloud)*smoothstep(0.,.10,amount);
    // The entire frame is covered at the cut, in the site's exact paper colour.
    alpha=mix(alpha,1.,smoothstep(.84,1.,amount));
    gl_FragColor=vec4(paper,alpha);
   }`));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Mist shader link');gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  level=gl.getUniformLocation(program,'amount');aspect=gl.getUniformLocation(program,'aspect');time=gl.getUniformLocation(program,'time');gl.uniform3fv(gl.getUniformLocation(program,'paper'),PAPER_RGB.map(v=>v/255));
 }catch{
  gl=null;const fallback=document.createElement('canvas');fallback.className=surface.className;fallback.setAttribute('aria-hidden','true');surface.replaceWith(fallback);surface=fallback;ctx=surface.getContext('2d');
 }
 function resize(){const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);surface.width=Math.max(1,Math.min(960,w));surface.height=Math.max(1,Math.min(1200,Math.round(surface.width*h/w)));lastDraw=-Infinity;}
 new ResizeObserver(resize).observe(stage);resize();
 function stop(){active=false;amount=0;phase='idle';lastTime=null;suspended=false;surface.style.opacity='0';world.style.opacity='1';mist.classList.remove('tr-footage-active');}
 function start(enabled){stop();if(!enabled)return;active=true;phase='in';elapsed=0;lastDraw=-Infinity;mist.classList.add('tr-footage-active');}
 function midpoint(){if(active)phase='out';}
 function update(p){amount=clamp(p);if(active){mist.style.opacity='0';world.style.opacity='1';}}
 function suspend(){suspended=true;lastTime=null;}
 function fallbackDraw(){
  const w=surface.width,h=surface.height;ctx.clearRect(0,0,w,h);const rgb=PAPER_RGB.join(',');
  ctx.fillStyle=`rgba(${rgb},${amount*.32})`;ctx.fillRect(0,0,w,h);
  for(const [x,y,r] of [[-.1,.7,.85],[.7,-.1,.95],[1.05,.85,.8]]){
   const dx=reduced.matches?0:Math.sin(elapsed*.12+x)*.035;
   const g=ctx.createRadialGradient((x+dx)*w,y*h,0,(x+dx)*w,y*h,Math.max(w,h)*r);
   g.addColorStop(0,`rgba(${rgb},${amount})`);g.addColorStop(.45,`rgba(${rgb},${amount*.72})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }
  const cover=clamp((amount-.70)/.30);ctx.fillStyle=`rgba(${rgb},${cover*cover*(3-2*cover)})`;ctx.fillRect(0,0,w,h);
 }
 function tick(now,paused){
  if(!active)return;
  if(paused||document.hidden){suspend();return;}
  suspended=false;if(lastTime!==null&&!reduced.matches)elapsed+=Math.min(.08,Math.max(0,(now-lastTime)/1000));lastTime=now;
  if(amount<=.0001){surface.style.opacity='0';return;}
  if(now-lastDraw<1000/30&&amount<1)return;lastDraw=now;
  if(gl){gl.viewport(0,0,surface.width,surface.height);gl.useProgram(program);gl.uniform1f(level,amount);gl.uniform1f(aspect,surface.width/surface.height);gl.uniform1f(time,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);}else fallbackDraw();
  surface.style.opacity='1';draws++;
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});addEventListener('pagehide',stop);
 return{start,midpoint,update,tick,stop,suspend,proof:()=>({active,amount,phase,backdropOpacity:1,ready:true,started:active&&draws>0,failed:false,muted:true,paused:suspended,backend:gl?'webgl':'canvas',style:'soft-layered-mist',color:PAPER_RGB,elapsed,draws,reduced:reduced.matches})};
}
