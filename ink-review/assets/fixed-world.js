import {assetURL} from './asset-url.js';
import * as THREE from '../../assets/vendor/three.module.js';
import {createFrontActor} from './spatial-front-actor.js';
import {dialogueCopy} from './dialogue-copy.js';
import {gunzipSync} from '../../assets/vendor/fflate.js';

const $=id=>document.getElementById(id), base=assetURL('./spatial-test/',import.meta.url);
const loading=$('loading'), scene=new THREE.Scene();scene.background=new THREE.Color('#f0f2ed');
const renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
const camera=new THREE.PerspectiveCamera(40,1,.08,700);camera.up.set(0,0,1);
const textureLoader=new THREE.TextureLoader();
const tex=name=>textureLoader.loadAsync(assetURL(name,base).href).then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;});
let target=0,progress=0,auto=false,ambient=false,elapsed=0,last=performance.now(),dialogue=false;
try{
 const [manifest,packed,plate,guide,fill]=await Promise.all([
  fetch(assetURL('scene.json',base)).then(r=>{if(!r.ok)throw Error('장면 자료');return r.json();}),
  fetch(assetURL('world-packed.bin.gz',base)).then(r=>{if(!r.ok)throw Error('공간 자료');return r.arrayBuffer();}),
  tex('painting.webp'),tex('layout-guide.jpg'),tex('fill.webp')
 ]);
 const bytes=gunzipSync(new Uint8Array(packed));const buf=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 const n=new DataView(buf).getUint32(0,true),ni=new DataView(buf).getUint32(4,true),indexOffset=Math.ceil((8+n*16)/4)*4;
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(buf,8,n*3),3));const rgba=new Uint8Array(buf,8+n*12,n*4),rgb=new Uint8Array(n*3),kinds=new Uint8Array(n);for(let i=0;i<n;i++){rgb.set(rgba.subarray(i*4,i*4+3),i*3);kinds[i]=rgba[i*4+3];}geo.setAttribute('color',new THREE.BufferAttribute(rgb,3,true));geo.setAttribute('paintKind',new THREE.BufferAttribute(kinds,1));geo.setIndex(new THREE.BufferAttribute(new Uint32Array(buf,indexOffset,ni),1));geo.computeBoundingSphere();
 const projectionCamera=new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(manifest.projectionHFov/2))/(16/9))),16/9,.08,700);
 const putPose=(cam,p)=>{cam.position.fromArray(p.p);cam.quaternion.set(p.q[1],p.q[2],p.q[3],p.q[0]);cam.updateMatrixWorld(true);};
 putPose(projectionCamera,manifest.reference);const projection=new THREE.Matrix4().multiplyMatrices(projectionCamera.projectionMatrix,projectionCamera.matrixWorldInverse);
 const depthTarget=new THREE.WebGLRenderTarget(2048,1152);depthTarget.depthTexture=new THREE.DepthTexture(2048,1152);
 const uniforms={referenceDepth:{value:depthTarget.depthTexture},painting:{value:plate},fill:{value:fill},guide:{value:guide},useGuide:{value:0},projector:{value:projection}};
 const material=new THREE.ShaderMaterial({uniforms,vertexColors:true,side:THREE.FrontSide,
  vertexShader:`uniform mat4 projector;varying vec4 projected;varying vec3 tint;varying float kind;varying vec3 pos;attribute float paintKind;void main(){kind=paintKind;pos=position;vec4 world=modelMatrix*vec4(position,1.);projected=projector*world;tint=color;gl_Position=projectionMatrix*viewMatrix*world;}`,
  fragmentShader:`uniform sampler2D painting;uniform sampler2D fill;uniform sampler2D referenceDepth;uniform sampler2D guide;uniform float useGuide;varying vec4 projected;varying vec3 tint;varying float kind;varying vec3 pos;void main(){vec2 uv=projected.xy/projected.w*.5+.5;vec3 c=mix(vec3(.8,.82,.79),tint,.16);if(projected.w>0.&&min(uv.x,uv.y)>=0.&&max(uv.x,uv.y)<=1.)c=mix(texture2D(painting,uv).rgb,texture2D(guide,uv).rgb,useGuide);float depth=projected.z/projected.w*.5+.5;
 bool occluded=depth>texture2D(referenceDepth,uv).r+.00006;
 if(useGuide<.5&&occluded){float line=sin(pos.x*47.+sin(pos.y*31.))*sin(pos.z*39.);c=texture2D(fill,uv).rgb+line*.003;}
 if(useGuide<.5 && kind>.5 && kind<1.5){
 vec2 grainUV=vec2(.208+.025*fract((pos.x+pos.y)*1.7),.55+.20*fract(pos.z*.24));
 vec3 wood=texture2D(painting,grainUV).rgb;
 if(pos.z<7.6)c=wood;else if(occluded)c=mix(wood,vec3(.15,.16,.15),.45);
 }if(useGuide<.5&&kind<.5&&c.r>c.g*1.16&&c.r>c.b*1.15)c=texture2D(fill,uv).rgb;gl_FragColor=vec4(c,1.);
  #include <colorspace_fragment>
 }`});
 const world=new THREE.Mesh(geo,material);world.matrixAutoUpdate=false;world.updateMatrix();scene.add(world);const savedMaterial=world.material;world.material=new THREE.MeshDepthMaterial();renderer.setRenderTarget(depthTarget);renderer.render(scene,projectionCamera);renderer.setRenderTarget(null);world.material.dispose();world.material=savedMaterial;
 const inverse=projection.clone().invert();
 const distant=new THREE.Mesh(new THREE.PlaneGeometry(2,2,32,18),new THREE.ShaderMaterial({side:THREE.DoubleSide,depthWrite:false,uniforms:{image:{value:fill},inverse:{value:inverse},origin:{value:projectionCamera.position.clone()}},vertexShader:`uniform mat4 inverse;uniform vec3 origin;varying vec2 imageUV;void main(){imageUV=uv;vec4 p=inverse*vec4(uv*2.-1.,.5,1.);p/=p.w;gl_Position=projectionMatrix*viewMatrix*vec4(origin+normalize(p.xyz-origin)*300.,1.);}`,fragmentShader:`uniform sampler2D image;varying vec2 imageUV;void main(){gl_FragColor=texture2D(image,imageUV);
#include <colorspace_fragment>
}`}));distant.frustumCulled=false;distant.renderOrder=-100;scene.add(distant);
 // The approved face and costume remain one immutable texture. Real scene
 // depth, not a hand-drawn screen mask, handles column/actor occlusion.
 const front=await createFrontActor(THREE,assetURL('../film-third/merchant-front-hq.webp',base).href,'merchant',1.79);
 const hero=front.mesh;hero.material.depthWrite=true;hero.material.alphaTest=.5;
 hero.position.fromArray(manifest.hero);hero.up.set(0,0,1);
 hero.lookAt(manifest.reference.p[0],manifest.reference.p[1],manifest.hero[2]);scene.add(hero);
 const breathe={value:0};
 $('cinemaDialogue').querySelector('p').textContent=dialogueCopy[0].testimony;
 // Opaque alpha boundary is handled by the same geometry depth test as the fixed columns/wall.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const ctx=shadowCanvas.getContext('2d');const g=ctx.createRadialGradient(64,64,2,64,64,62);g.addColorStop(0,'rgba(43,49,40,.2)');g.addColorStop(1,'rgba(43,49,40,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.9,.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));shadow.position.copy(hero.position);shadow.position.z+=.008;scene.add(shadow);
 const resize=()=>{const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;
  // Keep the authored 48-degree horizontal lens; do not stretch or letterbox the canvas.
  camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(manifest.viewHFov/2))/camera.aspect));camera.updateProjectionMatrix();};
 resize();addEventListener('resize',resize);
 $('run').textContent='처음 위치';$('run').onclick=()=>{auto=false;dialogue=false;target=0;$('cinemaDialogue').hidden=true;$('hint').hidden=false;};
 const stopAuto=()=>{auto=false;$('run').textContent='처음 위치';};
 $('progress').oninput=e=>{stopAuto();target=Number(e.target.value);};
 const change=delta=>{stopAuto();target=THREE.MathUtils.clamp(target+delta,0,1);};
 $('stage').addEventListener('wheel',e=>{if(e.target.closest('#testTools'))return;e.preventDefault();change(THREE.MathUtils.clamp(e.deltaY,-140,140)/1700);},{passive:false});
 let drag=null;$('world').addEventListener('pointerdown',e=>{drag={y:e.clientY,x:e.clientX};$('world').setPointerCapture(e.pointerId);});
 $('world').addEventListener('pointermove',e=>{if(!drag)return;change(((drag.y-e.clientY)+(e.clientX-drag.x)*.3)/1000);drag={y:e.clientY,x:e.clientX};});
 $('world').addEventListener('pointerup',()=>drag=null);$('world').addEventListener('pointercancel',()=>drag=null);
 addEventListener('keydown',e=>{if(e.target.matches('input,button,a,summary'))return;if(['ArrowDown','ArrowRight','PageDown'].includes(e.key)){e.preventDefault();change(.08);}if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();change(-.08);}});
 $('compare').onclick=()=>{uniforms.useGuide.value=1-uniforms.useGuide.value;hero.visible=!uniforms.useGuide.value;shadow.visible=hero.visible;$('compare').setAttribute('aria-pressed',String(!!uniforms.useGuide.value));$('compare').textContent=uniforms.useGuide.value?'한국화 보기':'Blender 비교';};
 $('ambience').hidden=true;
 $('dialogue').onclick=()=>{stopAuto();dialogue=!dialogue;$('cinemaDialogue').hidden=!dialogue;$('hint').hidden=dialogue;$('dialogue').setAttribute('aria-pressed',String(dialogue));};
 if(matchMedia('(pointer:coarse) and (orientation:portrait)').matches){$('rotate').hidden=false;setTimeout(()=>$('rotate').hidden=true,3000);}
 loading.hidden=true;document.body.dataset.ready='true';
 const q1=new THREE.Quaternion(),q2=new THREE.Quaternion(),a=new THREE.Vector3(),b=new THREE.Vector3();
 function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(ambient)elapsed+=dt;
  if(auto){target=Math.min(1,target+dt/10);if(target===1)stopAuto();}
  progress=THREE.MathUtils.lerp(progress,target,1-Math.exp(-dt/0.13));if(Math.abs(target-progress)<.00001)progress=target;
  const f=progress*(manifest.path.length-1),i=Math.min(manifest.path.length-2,Math.floor(f)),t=f-i,A=manifest.path[i],B=manifest.path[i+1];
  camera.position.copy(a.fromArray(A.p).lerp(b.fromArray(B.p),t));q1.set(A.q[1],A.q[2],A.q[3],A.q[0]);q2.set(B.q[1],B.q[2],B.q[3],B.q[0]);camera.quaternion.copy(q1.slerp(q2,t));camera.updateMatrixWorld();
  if(dialogue){camera.position.copy(hero.position).add(new THREE.Vector3(manifest.reference.p[0]-hero.position.x,manifest.reference.p[1]-hero.position.y,0).normalize().multiplyScalar(Math.max(3.1,2.1/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))))));camera.position.z=hero.position.z+1.35;camera.lookAt(hero.position.x,hero.position.y,hero.position.z+1.15);camera.updateMatrixWorld();} breathe.value=0;renderer.render(scene,camera);$('progress').value=String(progress);
  // Read-only diagnostics for repeatability/paused-camera validation.
  document.body.dataset.proof=JSON.stringify({progress,target,ambientSeconds:elapsed,camera:camera.matrixWorld.toArray(),actorSeconds:breathe.value,mode:'fixed-world-projection',videoCount:document.querySelectorAll('video').length,geometry:manifest.packedGeometry,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}catch(error){loading.textContent='풍경을 불러오지 못했습니다. 새로고침해 주세요.';document.body.dataset.error=String(error);console.error(error);}
