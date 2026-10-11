import * as THREE from '../../assets/vendor/three.module.js';
import {dialogueCopy} from './dialogue-copy.js';

const $=id=>document.getElementById(id),base=new URL('./spatial-test/',import.meta.url);
const panel=$('cinemaDialogue'),loading=$('loading'),stage=$('stage');
const renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
const loader=new THREE.TextureLoader(),clamp=THREE.MathUtils.clamp;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const tex=name=>loader.loadAsync(new URL(name,base).href).then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;});
const read=name=>fetch(new URL(name,base)).then(r=>{if(!r.ok)throw Error(name);return r.json();});
const vFov=(h,aspect)=>THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(h/2))/aspect));
const setPose=(camera,pose)=>{camera.position.fromArray(pose.p);camera.quaternion.set(pose.q[1],pose.q[2],pose.q[3],pose.q[0]);camera.updateMatrixWorld();};
let target=0,progress=0,auto=false,ambient=true,elapsed=0,last=performance.now(),showGuide=false,currentSpeaker=-1;
const stops=[.40,1],dialogueStarts=[.34,.90];
const labels=['장사꾼에게 다가가기','장사꾼의 이야기','농민에게 다가가기','농민의 이야기'];
const chapters=[0,.40,.56,1];
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;

try{
 const sets=await Promise.all([
  Promise.all([read('scene.json'),tex('painting.webp'),tex('layout-guide.jpg'),tex('merchant.webp')]),
  Promise.all([read('farmer-scene.json'),tex('farmer-painting.webp'),tex('farmer-layout-guide.jpg'),tex('farmer.webp')])
 ]);
 const encounters=sets.map(([manifest,plate,guide,portrait],index)=>{
  const scene=new THREE.Scene();scene.background=new THREE.Color('#f0f1ed');
  const camera=new THREE.PerspectiveCamera(30,1,.08,700);camera.up.set(0,0,1);
  const reference=new THREE.PerspectiveCamera(vFov(manifest.projectionHFov,16/9),16/9,.08,700);
  setPose(reference,manifest.reference);
  const inverseProjector=new THREE.Matrix4().multiplyMatrices(reference.projectionMatrix,reference.matrixWorldInverse).invert();
  const uniforms={painting:{value:plate},guide:{value:guide},useGuide:{value:0},inverseProjector:{value:inverseProjector},referenceOrigin:{value:reference.position.clone()}};
  // Immutable registered image layers; this test does not reconstruct all building depth.
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2,64,36),new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms,
   vertexShader:`uniform mat4 inverseProjector;uniform vec3 referenceOrigin;varying vec2 imageUV;void main(){imageUV=uv;vec4 p=inverseProjector*vec4(uv*2.-1.,.5,1.);p/=p.w;vec3 world=referenceOrigin+normalize(p.xyz-referenceOrigin)*14.;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
   fragmentShader:`uniform sampler2D painting;uniform sampler2D guide;uniform float useGuide;varying vec2 imageUV;void main(){gl_FragColor=mix(texture2D(painting,imageUV),texture2D(guide,imageUV),useGuide);gl_FragColor.a=1.;\n#include <colorspace_fragment>\n}`
  }));backdrop.frustumCulled=false;scene.add(backdrop);
  const height=1.86,width=height*portrait.image.width/portrait.image.height;
  const geo=new THREE.PlaneGeometry(width,height,8,24);geo.translate(0,height/2,0);
  const material=new THREE.MeshBasicMaterial({map:portrait,transparent:true,alphaTest:.78,side:THREE.DoubleSide});
  const breathe={value:0};
  material.onBeforeCompile=shader=>{shader.uniforms.ambientTime=breathe;shader.vertexShader='uniform float ambientTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nfloat torso=smoothstep(.55,1.18,position.y);float breath=sin(ambientTime*1.45);transformed.x+=(sin(ambientTime*.72)*.012+sin(ambientTime*.31)*.004)*torso;transformed.y+=breath*.007*torso;float chest=exp(-pow((position.y-1.15)/.24,2.));transformed.x+=position.x*breath*.009*chest;`);};
  const hero=new THREE.Mesh(geo,material);hero.position.fromArray(manifest.hero);hero.up.set(0,0,1);hero.lookAt(reference.position.x,reference.position.y,hero.position.z);scene.add(hero);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d'),g=ctx.createRadialGradient(64,64,2,64,64,62);g.addColorStop(0,'rgba(43,49,40,.18)');g.addColorStop(1,'rgba(43,49,40,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.9,.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.position.copy(hero.position);shadow.position.z+=.008;scene.add(shadow);
  const direction=new THREE.Vector3(reference.position.x-hero.position.x,reference.position.y-hero.position.y,0).normalize();
  const closeCamera=new THREE.PerspectiveCamera();closeCamera.up.set(0,0,1);
  return {manifest,scene,camera,reference,uniforms,hero,shadow,breathe,direction,closeCamera,index,height};
 });
 const renderTargets=[new THREE.WebGLRenderTarget(1,1),new THREE.WebGLRenderTarget(1,1)];
 const blendScene=new THREE.Scene(),blendCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const blendUniforms={a:{value:renderTargets[0].texture},b:{value:renderTargets[1].texture},amount:{value:0}};
 blendScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:blendUniforms,depthTest:false,depthWrite:false,
  vertexShader:'varying vec2 imageUV;void main(){imageUV=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:'uniform sampler2D a;uniform sampler2D b;uniform float amount;varying vec2 imageUV;void main(){gl_FragColor=mix(texture2D(a,imageUV),texture2D(b,imageUV),amount);\n#include <colorspace_fragment>\n}'
 })));
 function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);
  for(const e of encounters){e.camera.aspect=w/h;e.camera.fov=vFov(e.manifest.viewHFov,w/h);e.camera.updateProjectionMatrix();
   // Off-axis composition keeps the camera horizontal at face height while placing
   // the whole topknot below navigation. No low-angle upward tilt is introduced.
   const visibleHeight=h<=500?1.48:1.36;
   const distance=Math.max(2.55,visibleHeight*e.camera.aspect/(2*Math.tan(THREE.MathUtils.degToRad(e.manifest.viewHFov/2))));
   e.closeCamera.position.copy(e.hero.position).addScaledVector(e.direction,distance);e.closeCamera.position.z=e.hero.position.z+1.55;
   e.closeCamera.lookAt(e.hero.position.x,e.hero.position.y,e.closeCamera.position.z);e.closeCamera.updateMatrixWorld();
  }
  const size=renderer.getDrawingBufferSize(new THREE.Vector2());renderTargets.forEach(t=>t.setSize(size.x,size.y));
 }
 resize();addEventListener('resize',resize);
 const qa=new THREE.Quaternion(),qb=new THREE.Quaternion(),pa=new THREE.Vector3(),pb=new THREE.Vector3();
 function poseEncounter(e,walk,close){const path=e.manifest.path,f=clamp(walk,0,1)*(path.length-1),i=Math.min(path.length-2,Math.floor(f)),t=f-i,A=path[i],B=path[i+1],c=e.camera;
  c.position.copy(pa.fromArray(A.p).lerp(pb.fromArray(B.p),t));qa.set(A.q[1],A.q[2],A.q[3],A.q[0]);qb.set(B.q[1],B.q[2],B.q[3],B.q[0]);c.quaternion.copy(qa.slerp(qb,t));
  c.position.lerp(e.closeCamera.position,close);c.quaternion.slerp(e.closeCamera.quaternion,close);
  c.setViewOffset(innerWidth,innerHeight,0,innerHeight*.14*close,innerWidth,innerHeight);c.updateMatrixWorld();
  e.breathe.value=elapsed+(e.index?1.8:0);
 }
 function stopAuto(){auto=false;$('run').textContent='이동 재생';}
 function go(value,play=false){target=clamp(value,0,1);auto=play;$('run').textContent=auto?'이동 멈춤':'이동 재생';}
 const change=delta=>{stopAuto();target=clamp(target+delta,0,1);};
 $('run').onclick=()=>{if(auto){stopAuto();return;}if(target>.998){progress=target=0;}if(target>=.395&&target<.44)target=.441;auto=true;$('run').textContent='이동 멈춤';};
 $('progress').oninput=e=>go(Number(e.target.value));
 $('chapter').onchange=e=>go(chapters[Number(e.target.value)]);
 $('dialogue').onclick=()=>go(progress<.5?.40:1);
 $('next').onclick=()=>{if(currentSpeaker===0){go(.56,true);}else{go(0);}};
 $('compare').onclick=()=>{showGuide=!showGuide;encounters.forEach(e=>{e.uniforms.useGuide.value=Number(showGuide);e.hero.visible=e.shadow.visible=!showGuide;});$('compare').setAttribute('aria-pressed',String(showGuide));$('compare').textContent=showGuide?'한국화 보기':'기준 구도 비교';};
 $('ambience').onclick=()=>{ambient=!ambient;$('ambience').textContent=ambient?'인물 움직임 켜짐':'인물 움직임 꺼짐';$('ambience').setAttribute('aria-pressed',String(ambient));};
 stage.addEventListener('wheel',e=>{if(e.target.closest('#testTools,#cinemaDialogue,nav'))return;e.preventDefault();change(clamp(e.deltaY,-140,140)/2500);},{passive:false});
 let drag=null;$('world').addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};$('world').setPointerCapture(e.pointerId);});
 $('world').addEventListener('pointermove',e=>{if(!drag)return;change(((drag.y-e.clientY)+(e.clientX-drag.x)*.3)/1600);drag={x:e.clientX,y:e.clientY};});
 ['pointerup','pointercancel'].forEach(type=>$('world').addEventListener(type,()=>drag=null));
 addEventListener('keydown',e=>{if(e.target.matches('input,button,a,summary,select'))return;if(['ArrowDown','ArrowRight','PageDown'].includes(e.key)){e.preventDefault();change(.04);}if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();change(-.04);}});
 function showDialogue(index){if(currentSpeaker===index)return;currentSpeaker=index;panel.hidden=index<0;
  if(index>=0){panel.querySelector('h2').textContent=index?'농민':'장사꾼';panel.querySelector('p').textContent=dialogueCopy[index].testimony;$('next').textContent=index?'처음으로':'농민에게 이동';}
 }
 $('storyLink').onclick=e=>{e.preventDefault();go(0);};
 $('indexLink').onclick=()=>{sessionStorage.setItem('spatial-test-resume',String(target));sessionStorage.setItem('ink-pilot-return','spatial-test.html');};
 const saved=sessionStorage.getItem('spatial-test-resume');if(saved!==null){progress=target=clamp(Number(saved)||0,0,1);sessionStorage.removeItem('spatial-test-resume');}
 if(matchMedia('(pointer:coarse) and (orientation:portrait)').matches){$('rotate').hidden=false;setTimeout(()=>$('rotate').hidden=true,3000);}
 loading.hidden=true;document.body.dataset.ready='true';
 function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(ambient)elapsed+=dt;
  if(auto){const nextStop=target<.40?.40:1;target=Math.min(nextStop,target+dt/30);if(target===nextStop)stopAuto();}
  progress=THREE.MathUtils.lerp(progress,target,1-Math.exp(-dt/(reduced?.08:.32)));if(Math.abs(progress-target)<.00001)progress=target;
  const merchantWalk=clamp(progress/.24,0,1),merchantClose=smooth((progress-.24)/.10)*(1-smooth((progress-.44)/.055));
  const farmerWalk=clamp((progress-.56)/.24,0,1),farmerClose=smooth((progress-.80)/.10);
  poseEncounter(encounters[0],merchantWalk,merchantClose);poseEncounter(encounters[1],farmerWalk,farmerClose);
  const mix=smooth((progress-.46)/.10);
  if(mix>0&&mix<1){encounters.forEach((e,i)=>{renderer.setRenderTarget(renderTargets[i]);renderer.render(e.scene,e.camera);});renderer.setRenderTarget(null);blendUniforms.amount.value=mix;renderer.render(blendScene,blendCamera);}
  else {renderer.setRenderTarget(null);const e=encounters[mix>=1?1:0];renderer.render(e.scene,e.camera);}
  showDialogue(progress>=.337&&progress<=.44?0:progress>=.898?1:-1);
  $('hint').hidden=currentSpeaker>=0;$('hint').textContent=progress>.44&&progress<.56?'마당 너머, 농민에게':'스크롤하거나 드래그하여 다가가세요';
  $('progress').value=String(progress);const chapter=progress<.337?0:progress<.46?1:progress<.898?2:3;
  $('chapter').value=String(chapter);
  const active=encounters[mix>=.5?1:0],hair=new THREE.Vector3(0,1.81,0);active.hero.localToWorld(hair);hair.project(active.camera);
  document.body.dataset.proof=JSON.stringify({progress,target,chapter:labels[chapter],speaker:currentSpeaker,ambientSeconds:elapsed,camera:active.camera.matrixWorld.toArray(),actorSeconds:active.breathe.value,headTopScreenY:(1-hair.y)/2,renderMethod:'registered-2.5D-layer',cameraSource:active.manifest.cameraSource,transition:'Two local authored encounters with courtyard dissolve; full 59m traversal not reconstructed',drawCalls:renderer.info.render.calls});
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}catch(error){loading.innerHTML='풍경을 불러오지 못했습니다. <a href="https://ofjrobj.github.io/digital-heritage/ink-pilot/spatial-test.html">공유 페이지에서 열기</a>';document.body.dataset.error=String(error);console.error(error);}
