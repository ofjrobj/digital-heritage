import * as THREE from '../../assets/vendor/three.module.js';

const $=id=>document.getElementById(id), base=new URL('./spatial-test/',import.meta.url);
const loading=$('loading'), scene=new THREE.Scene();scene.background=new THREE.Color('#f0f2ed');
const renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
const camera=new THREE.PerspectiveCamera(40,1,.08,700);camera.up.set(0,0,1);
const textureLoader=new THREE.TextureLoader();
const tex=name=>textureLoader.loadAsync(new URL(name,base).href).then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;});
let target=0,progress=0,auto=false,ambient=true,elapsed=0,last=performance.now(),dialogue=false;
try{
 const [manifest,plate,guide,portrait]=await Promise.all([
  fetch(new URL('scene.json',base)).then(r=>{if(!r.ok)throw Error('장면 자료');return r.json();}),
  tex('painting.webp'),tex('layout-guide.jpg'),tex('merchant.webp')
 ]);
 const projectionCamera=new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(manifest.projectionHFov/2))/(16/9))),16/9,.08,700);
 projectionCamera.position.fromArray(manifest.reference.p);const pq=manifest.reference.q;projectionCamera.quaternion.set(pq[1],pq[2],pq[3],pq[0]);projectionCamera.updateMatrixWorld(true);
 const inverseProjector=new THREE.Matrix4().multiplyMatrices(projectionCamera.projectionMatrix,projectionCamera.matrixWorldInverse).invert();
 const uniforms={painting:{value:plate},guide:{value:guide},useGuide:{value:0},inverseProjector:{value:inverseProjector},referenceOrigin:{value:projectionCamera.position.clone()}};
 // Registered 2.5D plate, fixed in world space. This proof deliberately does not claim
 // reconstructed building depth. The exact-mesh projection experiments are kept locally.
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2,64,36),new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms,
 vertexShader:`uniform mat4 inverseProjector;uniform vec3 referenceOrigin;varying vec2 imageUV;void main(){imageUV=uv;vec4 p=inverseProjector*vec4(uv*2.-1.,.5,1.);p/=p.w;vec3 world=referenceOrigin+normalize(p.xyz-referenceOrigin)*14.;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
 fragmentShader:`uniform sampler2D painting;uniform sampler2D guide;uniform float useGuide;varying vec2 imageUV;void main(){gl_FragColor=mix(texture2D(painting,imageUV),texture2D(guide,imageUV),useGuide);gl_FragColor.a=1.;
 #include <colorspace_fragment>
 }`}));backdrop.frustumCulled=false;scene.add(backdrop);
 // One immutable portrait texture: facial features and mouth never get regenerated or animated.
 const height=1.86, width=height*portrait.image.width/portrait.image.height;
 const figureGeo=new THREE.PlaneGeometry(width,height,8,24);figureGeo.translate(0,height/2,0);
 const figureMaterial=new THREE.MeshBasicMaterial({map:portrait,transparent:true,alphaTest:.78,side:THREE.DoubleSide,depthWrite:true});
 const breathe={value:0};
 figureMaterial.onBeforeCompile=shader=>{shader.uniforms.ambientTime=breathe;shader.vertexShader='uniform float ambientTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 float torso=smoothstep(.18,.9,position.y);transformed.x+=sin(ambientTime*1.15)*.007*torso;transformed.y+=sin(ambientTime*1.6)*.003*torso;`);};
 const hero=new THREE.Mesh(figureGeo,figureMaterial);hero.position.fromArray(manifest.hero);hero.up.set(0,0,1);
 hero.lookAt(manifest.reference.p[0],manifest.reference.p[1],manifest.hero[2]);scene.add(hero);
 // Separate fixed character anchor. Full architectural occlusion is outside this plate proof.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const ctx=shadowCanvas.getContext('2d');const g=ctx.createRadialGradient(64,64,2,64,64,62);g.addColorStop(0,'rgba(43,49,40,.2)');g.addColorStop(1,'rgba(43,49,40,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.9,.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));shadow.position.copy(hero.position);shadow.position.z+=.008;scene.add(shadow);
 const resize=()=>{const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;
  // Keep the authored 48-degree horizontal lens; do not stretch or letterbox the canvas.
  camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(manifest.viewHFov/2))/camera.aspect));camera.updateProjectionMatrix();};
 resize();addEventListener('resize',resize);
 $('run').onclick=()=>{auto=!auto;if(auto&&progress>.998)target=0;$('run').textContent=auto?'이동 멈춤':'이동 재생';};
 const stopAuto=()=>{auto=false;$('run').textContent='이동 재생';};
 $('progress').oninput=e=>{stopAuto();target=Number(e.target.value);};
 const change=delta=>{stopAuto();target=THREE.MathUtils.clamp(target+delta,0,1);};
 $('stage').addEventListener('wheel',e=>{if(e.target.closest('#testTools'))return;e.preventDefault();change(THREE.MathUtils.clamp(e.deltaY,-140,140)/1700);},{passive:false});
 let drag=null;$('world').addEventListener('pointerdown',e=>{drag={y:e.clientY,x:e.clientX};$('world').setPointerCapture(e.pointerId);});
 $('world').addEventListener('pointermove',e=>{if(!drag)return;change(((drag.y-e.clientY)+(e.clientX-drag.x)*.3)/1000);drag={y:e.clientY,x:e.clientX};});
 $('world').addEventListener('pointerup',()=>drag=null);$('world').addEventListener('pointercancel',()=>drag=null);
 addEventListener('keydown',e=>{if(e.target.matches('input,button,a,summary'))return;if(['ArrowDown','ArrowRight','PageDown'].includes(e.key)){e.preventDefault();change(.08);}if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();change(-.08);}});
 $('compare').onclick=()=>{uniforms.useGuide.value=1-uniforms.useGuide.value;hero.visible=!uniforms.useGuide.value;shadow.visible=hero.visible;$('compare').setAttribute('aria-pressed',String(!!uniforms.useGuide.value));$('compare').textContent=uniforms.useGuide.value?'한국화 보기':'기준 구도 비교';};
 $('ambience').onclick=()=>{ambient=!ambient;$('ambience').textContent=ambient?'인물 움직임 켜짐':'인물 움직임 꺼짐';$('ambience').setAttribute('aria-pressed',String(ambient));};
 $('dialogue').onclick=()=>{dialogue=!dialogue;$('cinemaDialogue').hidden=!dialogue;$('hint').hidden=dialogue;$('dialogue').setAttribute('aria-pressed',String(dialogue));};
 if(matchMedia('(pointer:coarse) and (orientation:portrait)').matches){$('rotate').hidden=false;setTimeout(()=>$('rotate').hidden=true,3000);}
 loading.hidden=true;document.body.dataset.ready='true';
 const q1=new THREE.Quaternion(),q2=new THREE.Quaternion(),a=new THREE.Vector3(),b=new THREE.Vector3();
 function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(ambient)elapsed+=dt;
  if(auto){target=Math.min(1,target+dt/10);if(target===1)stopAuto();}
  progress=THREE.MathUtils.lerp(progress,target,1-Math.exp(-dt/0.13));if(Math.abs(target-progress)<.00001)progress=target;
  const f=progress*(manifest.path.length-1),i=Math.min(manifest.path.length-2,Math.floor(f)),t=f-i,A=manifest.path[i],B=manifest.path[i+1];
  camera.position.copy(a.fromArray(A.p).lerp(b.fromArray(B.p),t));q1.set(A.q[1],A.q[2],A.q[3],A.q[0]);q2.set(B.q[1],B.q[2],B.q[3],B.q[0]);camera.quaternion.copy(q1.slerp(q2,t));camera.updateMatrixWorld();
  breathe.value=elapsed;renderer.render(scene,camera);$('progress').value=String(progress);
  // Read-only diagnostics for repeatability/paused-camera validation.
  document.body.dataset.proof=JSON.stringify({progress,target,ambientSeconds:elapsed,camera:camera.matrixWorld.toArray(),actorSeconds:breathe.value,renderMethod:"registered-2.5D-layer",cameraSource:manifest.cameraSource,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}catch(error){loading.textContent='풍경을 불러오지 못했습니다. 새로고침해 주세요.';document.body.dataset.error=String(error);console.error(error);}
