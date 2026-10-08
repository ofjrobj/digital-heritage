import {storyStops} from './story-sequence.js?v=story-flow-70';
import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
const host=document.querySelector('#lionViewport'),intro=document.querySelector('#intro'),status=document.querySelector('#lionStatus');
const backButton=document.querySelector('#lionBack'),lens=document.querySelector('#lionLens');
const choice=document.querySelector('#experienceChoice'),hint=document.querySelector('#lionHoverHint');
let experience=null;let cinemaDriven=false,cinemaShot='';let nextStoryStop=0;
document.addEventListener('story-restart',()=>nextStoryStop=0);
document.addEventListener('episode-complete',()=>nextStoryStop=Math.min(storyStops.length,nextStoryStop+1));
const backgroundUI=[intro,document.querySelector('#journey'),document.querySelector('.book-index-button')];
function blockBackground(block){backgroundUI.forEach(el=>{if(el)el.inert=block;});}
blockBackground(true);
choice.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const buttons=[...choice.querySelectorAll('button')];if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}});
choice.querySelector('button').focus();
document.body.classList.add('choosing-experience');
document.querySelectorAll('[data-experience]').forEach(b=>b.addEventListener('click',()=>{experience=b.dataset.experience;document.body.dataset.experience=experience;document.body.classList.remove('choosing-experience');choice.hidden=true;blockBackground(false);readyAt=performance.now()+3000;document.dispatchEvent(new CustomEvent('experience-selected',{detail:experience}));requestAnimationFrame(resize);host.focus({preventScroll:true});}));
document.querySelector('#experienceSwitch').addEventListener('click',()=>{choice.hidden=false;blockBackground(true);document.body.classList.add('choosing-experience');clearPointer();choice.querySelector('button').focus();});
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),scene=new THREE.Scene(),subjects=new Map();
let renderer,lensRenderer,inspecting=false,visible=true,readyAt=Infinity,pointer=null,down=null,width=1,height=1,active='both',loaded=false,hovered=false,last=performance.now(),lastHit=0,lastLens=0,savedView=null;
let filmPlaying=false,filmDelay=null,filmSubject=null,filmTarget=0,filmFinished=false;
let guidedPose=null,baseFocus=new THREE.Vector3();
let pairHalfSpacing=.64;
document.addEventListener('story-pose',e=>guidedPose=e.detail);
document.addEventListener('story-home',()=>guidedPose=null);
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}catch(error){status.textContent='이 기기에서는 3D 화면을 표시할 수 없습니다.';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.append(renderer.domElement);
const camera=new THREE.OrthographicCamera(-2,2,2,-2,.01,100),controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.09;controls.enablePan=false;controls.enabled=false;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI-.12;
scene.add(new THREE.HemisphereLight(0xe7e6e0,0x302821,.65));
const studioLights=[];
function light(color,power,p){const l=new THREE.DirectionalLight(color,power);l.position.set(...p);scene.add(l);studioLights.push(l);}
light(0xffedd2,3.6,[-3,4,3]);light(0xdce6ec,.55,[3,1,3]);light(0xf6ead9,3,[2,3,-3]);
function clearPointer(){pointer=null;hovered=false;hint.classList.remove('visible');lens.classList.remove('visible');host.style.cursor='default';}
function home(){const center=new THREE.Vector3(),box=new THREE.Box3();
 for(const [name,o] of subjects)if(o.visible){
  // A yaw-invariant envelope keeps both rotating silhouettes separated and framed.
  if(active==='both'&&o.userData.turnRadius){const r=o.userData.turnRadius,h=o.userData.turnHalfHeight;box.expandByPoint(o.position.clone().add(new THREE.Vector3(-r,-h,-r)));box.expandByPoint(o.position.clone().add(new THREE.Vector3(r,h,r)));}
  else box.union(new THREE.Box3().setFromObject(o));
 }
 if(box.isEmpty())return;box.getCenter(center);const radius=box.getBoundingSphere(new THREE.Sphere()).radius;
 const size=box.getSize(new THREE.Vector3()),aspect=width/height;
 const frameHeight=Math.max(size.y+size.z*.18,size.x/aspect)*1.2;
 camera.left=-frameHeight*aspect/2;camera.right=frameHeight*aspect/2;camera.top=frameHeight/2;camera.bottom=-frameHeight/2;camera.zoom=1;camera.updateProjectionMatrix();
 camera.position.copy(center).add(new THREE.Vector3(0,.18,1).normalize().multiplyScalar(8));controls.target.copy(center);baseFocus.copy(center);controls.minZoom=.65;controls.maxZoom=5;controls.update();
}
function resize(){width=host.clientWidth;height=host.clientHeight;renderer.setSize(width,height,false);if(loaded){savedView=null;home();}clearPointer();}
new ResizeObserver(resize).observe(host);resize();
new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(!visible)clearPointer();}).observe(intro);
document.addEventListener('visibilitychange',()=>{last=performance.now();clearPointer();});
const scanTraces=[];
function addScanTrace(mesh){const pos=mesh.geometry.getAttribute('position'),normal=mesh.geometry.getAttribute('normal'),index=mesh.geometry.index;if(!pos||!normal)return;const points=[],traceNormals=[],count=index?index.count:pos.count,v1=new THREE.Vector3(),v2=new THREE.Vector3(),n1=new THREE.Vector3(),n2=new THREE.Vector3(),d=new THREE.Vector3();
 for(let i=0;i<count-2;i+=Math.max(3,Math.ceil(count/90000)*3)){for(const [a,b] of [[0,1],[1,2],[2,0]]){const x=index?index.getX(i+a):i+a,y=index?index.getX(i+b):i+b;v1.fromBufferAttribute(pos,x);v2.fromBufferAttribute(pos,y);n1.fromBufferAttribute(normal,x);n2.fromBufferAttribute(normal,y);d.subVectors(v2,v1);if(!d.length()||(d.dot(n1)-d.dot(n2))/d.length()<.025)continue;points.push(...v1.toArray(),...v2.toArray());traceNormals.push(...n1.toArray(),...n2.toArray());if(points.length>540000)break;}if(points.length>540000)break;}
 if(!points.length)return;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(traceNormals,3));const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,uniforms:{scanFocus:{value:new THREE.Vector3()},scanAxis:{value:new THREE.Vector3()},scanTime:{value:0}},vertexShader:'varying vec3 worldPoint; void main(){worldPoint=(modelMatrix*vec4(position,1.)).xyz+normalize(mat3(modelMatrix)*normal)*.0015;gl_Position=projectionMatrix*viewMatrix*vec4(worldPoint,1.);}',fragmentShader:'varying vec3 worldPoint;uniform vec3 scanFocus;uniform vec3 scanAxis;uniform float scanTime;void main(){float nearFocus=1.-smoothstep(.20,.60,distance(worldPoint,scanFocus));float p=fract(scanTime*.10-dot(worldPoint-scanFocus,scanAxis)*1.7);float ink=smoothstep(0.,.06,p)*(1.-smoothstep(.32,.65,p));float opacity=nearFocus*ink*.78;if(opacity<.01)discard;gl_FragColor=vec4(1.,1.,1.,opacity);}'});const line=new THREE.LineSegments(geometry,material);line.name='Independent concave-edge tracing';line.visible=false;line.raycast=()=>{};mesh.add(line);scanTraces.push(line);
}
const loader=new GLTFLoader(),surfaceMaterials=[];
const textureLoader=new THREE.TextureLoader();
function loadHeight(name){return textureLoader.loadAsync(new URL(`./${name}-height.jpg`,import.meta.url).href).then(t=>{t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;});}
function surface(original){for(const item of surfaceMaterials)item.mesh.material=original?item.original:item.height;}

function load(name,url){return loader.loadAsync(new URL(url,import.meta.url).href).then(gltf=>{
 const root=gltf.scene,box=new THREE.Box3().setFromObject(root);root.position.sub(box.getCenter(new THREE.Vector3()));
 root.traverse(mesh=>{if(!mesh.isMesh)return;const original=mesh.material;
  const makeHeight=m=>{const gray=m.clone();gray.map=null;gray.color.set(0xc4c3b5);gray.roughness=.82;gray.metalness=0;return gray;};
  (Array.isArray(original)?original:[original]).forEach(snowMaterial);
  surfaceMaterials.push({mesh,original,height:Array.isArray(original)?original.map(makeHeight):makeHeight(original)});
 });
 const pivot=new THREE.Group();pivot.add(root);const extent=box.getSize(new THREE.Vector3());pivot.userData.turnRadius=Math.hypot(extent.x,extent.z)/2;pivot.userData.frontHalfWidth=extent.z/2;pivot.userData.turnHalfHeight=extent.y/2;pivot.rotation.y=-Math.PI/4;scene.add(pivot);subjects.set(name,pivot);
});}
let resolveModels, rejectModels;
const modelReady=new Promise((resolve,reject)=>{resolveModels=resolve;rejectModels=reject;});
modelReady.catch(()=>{});
let loadStarted=false;
function startModels(){if(loadStarted)return;loadStarted=true;status.textContent='석사자를 불러오는 중';Promise.all([load('male','./stone-lion.glb'),load('female','./stone-lion-female.glb')]).then(()=>{
 loaded=true;intro.dataset.lionReady='true';pairHalfSpacing=(subjects.get('female').userData.frontHalfWidth+subjects.get('male').userData.frontHalfWidth+.16)/2;subjects.get('female').position.set(-pairHalfSpacing,0,0);subjects.get('male').position.set(pairHalfSpacing,0,0);home();readyAt=performance.now()+3000;
 status.textContent='';resolveModels();document.dispatchEvent(new CustomEvent('lion-ready'));
}).catch(e=>{console.error(e);status.textContent='석사자를 불러오지 못했습니다. 새로고침해 주세요.';rejectModels(e);});}
document.addEventListener('experience-selected',startModels);
export async function archiveModels(){startModels();await modelReady;return [...subjects].map(([name,pivot])=>({name,model:pivot.children[0].clone(true)}));}
function selectSubject(name){const unchanged=active===name;active=name;clearPointer();
 for(const [key,o] of subjects){o.visible=name==='both'||key===name;o.position.x=name==='both'?(key==='female'?-pairHalfSpacing:pairHalfSpacing):0;o.position.z=0;}
 // Keep a full turn within the frame, including the broad side silhouette.
 const yaw=subjects.get(name==='both'?'male':name).rotation.y;
 if(!unchanged){for(const o of subjects.values())o.rotation.y=0;home();for(const o of subjects.values())o.rotation.y=yaw;}
}
function setMode(detail,subject='male'){if(!loaded)return;
 if(detail&&document.body.dataset.stage==='intro'&&subject!=='both')document.dispatchEvent(new CustomEvent('lion-explored',{detail:subject}));document.dispatchEvent(new CustomEvent('lion-observation',{detail}));inspecting=detail;controls.enabled=false;surface(!detail);host.classList.toggle('inspecting',detail);backButton.hidden=!detail||document.body.dataset.stage!=='intro';
 selectSubject(detail?subject:'both');readyAt=performance.now();status.textContent='';
 backButton.setAttribute('aria-label',detail?`${subject==='both'?'두 사자':subject==='male'?'수사자':'암사자'} 관찰에서 뒤로가기`:'뒤로가기');
}
const filmLayer=document.createElement('div');filmLayer.id='lionObservationFilm';filmLayer.hidden=true;
filmLayer.innerHTML='<video muted playsinline preload="metadata" aria-label="석사자 표면 관찰 영상"></video><span class="film-part"></span><button type="button" class="film-back">← 뒤로가기</button>';
intro.append(filmLayer);
const film=filmLayer.querySelector('video'),filmPart=filmLayer.querySelector('.film-part');
const filmCSS=document.createElement('style');filmCSS.textContent='body.cinematic-observation #introVideoSlot{inset:0!important}#lionObservationFilm{position:absolute;inset:0;z-index:8;background:#000;display:grid;place-items:center}#lionObservationFilm[hidden]{display:none}#lionObservationFilm video{width:min(88%,1000px);height:82%;object-fit:contain}.film-part{position:absolute;bottom:8vh;color:#a7b6a2;font-size:13px;letter-spacing:.15em}.film-back{position:absolute;bottom:3vh;left:50%;transform:translateX(-50%);background:none;border:0;color:#c6c6b6;font:inherit;cursor:pointer}body[data-experience=mobile] #lionObservationFilm{max-width:480px;left:50%;transform:translateX(-50%);width:100%}';document.head.append(filmCSS);
function cancelFilm(){host.style.opacity='1';document.body.classList.remove('cinematic-observation');clearTimeout(filmDelay);filmDelay=null;film.pause();filmLayer.hidden=true;filmPlaying=false;filmSubject=null;filmTarget=0;studioLights[1].intensity=.55;studioLights[2].intensity=3;filmFinished=false;delete intro.dataset.observationPhase;}
function returnToPair(){cancelFilm();guidedPose=null;setMode(false);home();}
async function playObservation(subject){if(entryStart)return;subject='female';cancelFilm();guidedPose=null;clearPointer();filmPlaying=true;document.body.classList.add('cinematic-observation');filmSubject=subject;intro.dataset.observationPhase='film';intro.dataset.observationSubject=subject;filmLayer.hidden=false;filmLayer.style.background='transparent';filmLayer.style.pointerEvents='none';filmLayer.querySelector('.film-back').style.pointerEvents='auto';film.hidden=true;selectSubject(subject);subjects.get(subject).rotation.y=0;home();surface(true);backButton.hidden=true;filmPart.textContent='전체 · 스크롤하여 살펴보기';filmTarget=0;filmFinished=false;film.style.width='52%';film.pause();film.removeAttribute('src');filmClock=0;updateFilm();}

film.addEventListener('timeupdate',()=>{const t=film.currentTime;filmPart.textContent=(t<4?'전체':t<7?'얼굴':t<10?'머리':t<13?'등':'갈퀴')+' · 스크롤하여 살펴보기';});
function showPairObservation(){cancelFilm();guidedPose=null;setMode(true,'both');for(const o of subjects.values())o.rotation.y=-Math.PI/4;home();camera.zoom=.78;camera.updateProjectionMatrix();intro.dataset.observationPhase='magnifier';intro.dataset.observationSubject='both';status.textContent='';backButton.hidden=true;document.dispatchEvent(new CustomEvent('lion-pair-ready'));}
function finishObservation(){if(filmFinished)return;filmFinished=true;intro.dataset.observationPhase='waiting';filmPart.textContent='';filmDelay=setTimeout(showPairObservation,900);}
document.addEventListener('lion-pair-observe',showPairObservation);
function scrubFilm(delta){if(!filmPlaying||!true)return;filmTarget=Math.max(0,Math.min(filmDuration,filmTarget+delta));filmLayer.dataset.scrollTime=String(filmTarget);updateFilm();if(filmFinished&&filmTarget<filmDuration-.1){clearTimeout(filmDelay);filmFinished=false;intro.dataset.observationPhase='film';}}
window.addEventListener('wheel',e=>{if(cinemaDriven)return;if(!filmPlaying)return;e.preventDefault();e.stopImmediatePropagation();scrubFilm(Math.max(-180,Math.min(180,e.deltaY))*.012);},{capture:true,passive:false});
let filmTouchY=null;
intro.addEventListener('touchstart',e=>{if(filmPlaying)filmTouchY=e.touches[0]?.clientY;},{passive:true});
intro.addEventListener('touchmove',e=>{if(!filmPlaying||filmTouchY===null)return;e.preventDefault();e.stopImmediatePropagation();const y=e.touches[0].clientY;scrubFilm((filmTouchY-y)*.035);filmTouchY=y;},{capture:true,passive:false});
window.addEventListener('keydown',e=>{if(!filmPlaying)return;const step={ArrowDown:1,PageDown:2,ArrowUp:-1,PageUp:-2,' ':2}[e.key];if(step!==undefined){e.preventDefault();e.stopImmediatePropagation();scrubFilm(step);}else if(e.key==='Escape'){e.preventDefault();returnToPair();}},{capture:true});
film.addEventListener('seeked',()=>{if(filmPlaying)requestAnimationFrame(updateFilm);});
let filmClock=0;
// One full orbit with slow detail passes and quicker, wider connecting arcs.
const filmDuration=264;
// [seconds, zoom, focus, [unwrapped azimuth, elevation], label]
let blenderScans=null;fetch(new URL('./blender-scans-v030.json',import.meta.url)).then(r=>r.json()).then(v=>blenderScans=v);
const cinematicKeys=[
 [0,.70,[0,.06,0],[-.7853981633974483,.18],'전체'],
 [8,1.60,[.40,.21,-.12],[-.24,.16],'얼굴'],
 [24,2.20,[.43,.22,.10],[.22,.16],'눈 · 입'],
 [31,1.25,[.24,.20,.10],[.65,.40],'머리'],
 [43,2.05,[.23,.34,.10],[.95,.70],'머리 윗면'],
 [57,2.15,[.02,.30,.15],[1.25,.54],'등 · 표면의 결'],
 [66,1.10,[-.12,.12,0],[1.90,.26],'옆면'],
 [74,1.90,[-.35,.17,.10],[2.70,.24],'뒷면'],
 [88,2.10,[-.38,.10,-.10],[3.30,.14],'뒷면 · 굴곡'],
 [97,1.15,[-.15,.12,-.08],[3.90,.36],'반대쪽 옆면'],
 [107,1.95,[.02,.20,-.20],[4.35,.33],'갈기'],
 [121,2.10,[.25,.19,-.18],[4.85,.22],'갈기의 선'],
 [127,1.20,[.20,.13,-.05],[5.30,.38],'얼굴로 이어지는 윤곽'],
 [132,.85,[0,.06,0],[5.497787143782138,.18],'전체']
];
// Non-uniform cubic Hermite interpolation preserves velocity through every key.
function cameraSample(t,column,component){
 let i=0;while(i<cinematicKeys.length-2&&t>cinematicKeys[i+1][0])i++;
 const a=cinematicKeys[i],b=cinematicKeys[i+1],prev=cinematicKeys[Math.max(0,i-1)],next=cinematicKeys[Math.min(cinematicKeys.length-1,i+2)];
 const val=k=>component===undefined?k[column]:k[column][component];
 const span=b[0]-a[0],u=THREE.MathUtils.clamp((t-a[0])/span,0,1),u2=u*u,u3=u2*u;
 const slope=(x,y)=>(val(y)-val(x))/(y[0]-x[0]);
 const d=slope(a,b),left=i===0?0:slope(prev,a),right=i+1===cinematicKeys.length-1?0:slope(b,next);
 const tangent=(x,y)=>x*y<=0?0:2*x*y/(x+y);
 const m0=tangent(left,d),m1=tangent(d,right);
 return (2*u3-3*u2+1)*val(a)+(u3-2*u2+u)*span*m0+(-2*u3+3*u2)*val(b)+(u3-u2)*span*m1;
}
function updateFilm(){if(!filmPlaying||!loaded)return;if(!cinemaDriven)filmClock+=(filmTarget-filmClock)*.065;if(Math.abs(filmTarget-filmClock)<.008)filmClock=filmTarget;
 const subject=filmClock<132?'female':'male';
 if(filmSubject!==subject){filmSubject=subject;intro.dataset.observationSubject=subject;selectSubject(subject);subjects.get(subject).rotation.y=0;home();clearPointer();}
 const localTime=Math.min(132,filmClock<132?filmClock:filmClock-132);
 if(blenderScans){const frames=blenderScans[subject],f=localTime/132*96*24+1,i=Math.min(frames.length-2,Math.floor((f-1)/4)),a=frames[i],b=frames[i+1],u=Math.max(0,Math.min(1,(f-a.frame)/(b.frame-a.frame)));const cv=v=>new THREE.Vector3(v[0],v[2],-v[1]);camera.position.copy(cv(a.position).lerp(cv(b.position),u));controls.target.copy(cv(a.target).lerp(cv(b.target),u));camera.lookAt(controls.target);const w=a.width+(b.width-a.width)*u,aspect=width/height;camera.left=-w/2;camera.right=w/2;camera.top=w/aspect/2;camera.bottom=-w/aspect/2;camera.zoom=1;camera.updateProjectionMatrix();for(let j=0;j<studioLights.length;j++)studioLights[j].position.copy(cv(a.lights[j]).lerp(cv(b.lights[j]),u));}
 const key=[...cinematicKeys].reverse().find(k=>localTime>=k[0])||cinematicKeys[0];
 filmPart.textContent=(subject==='female'?'암사자':'수사자')+' · '+key[4];filmLayer.dataset.scrollTime=filmClock.toFixed(2);filmLayer.dataset.shot=filmPart.textContent;
 const seam=Math.max(0,1-Math.abs(filmClock-132)/1.7);host.style.opacity=String(1-seam*.95);
 if(!cinemaDriven&&filmTarget>=filmDuration-.01&&filmClock>=filmDuration-.06){host.style.opacity='1';finishObservation();}
}
function cinematicLight(){if(cinemaDriven&&cinemaShot==='relief-trace')return;if(blenderScans&&filmPlaying)return;if(!filmPlaying){for(const item of scanTraces)item.visible=false;return;}const side=camera.position.clone().sub(controls.target).normalize(),right=new THREE.Vector3().crossVectors(side,camera.up).normalize(),up=new THREE.Vector3().crossVectors(right,side).normalize();studioLights[0].position.copy(controls.target).addScaledVector(side,.65).addScaledVector(right,3.2).addScaledVector(up,1.8);studioLights[0].intensity=2.35;studioLights[1].position.copy(camera.position);studioLights[1].intensity=.85;studioLights[2].position.copy(controls.target).addScaledVector(side,-2.5).addScaledVector(right,-1.4).addScaledVector(up,2);studioLights[2].intensity=2.2;for(const item of scanTraces){if(item.userData.relief){item.visible=false;continue;}item.visible=true;item.material.uniforms.scanFocus.value.copy(controls.target);item.material.uniforms.scanAxis.value.copy(right);item.material.uniforms.scanTime.value=filmClock+performance.now()*.00035;}}

film.addEventListener('error',()=>{filmPart.textContent='영상을 불러오지 못했습니다. 뒤로가기로 다시 시도해 주세요.';});
filmLayer.querySelector('.film-back').addEventListener('click',returnToPair);
backButton.addEventListener('click',returnToPair);
document.addEventListener('story-home',cancelFilm);
document.addEventListener('experience-selected',cancelFilm);
document.addEventListener('story-home',()=>setMode(false));
document.addEventListener('story-scan',e=>{setMode(true,e.detail.subject||'male');if(!e.detail.guided)guidedPose={zoom:e.detail.part==='whole'?1.05:e.detail.part==='face'?1.8:1.5,yaw:e.detail.part==='whole'?-Math.PI/4:e.detail.part==='face'?-.2:-Math.PI/2,height:e.detail.part==='head'?.24:e.detail.part==='whole'?0:.08};});
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
function hit(x,y){ndc.set(x/width*2-1,-y/height*2+1);ray.setFromCamera(ndc,camera);return [...subjects.entries()].find(([name,o])=>o.visible&&ray.intersectObject(o,true).length>0)?.[0]||null;}
// Proposal names forms, not screen coordinates; anchors follow the actual mesh.
const regions=[['eyes','눈',[.46,.22,0]],['mouth','입',[.46,.02,0]],['head','머리',[.32,.38,-.24]],['mane','갈기',[.18,.24,-.28]],['back','등',[-.22,.29,.12]]];
const hotspotLayer=document.createElement('div');hotspotLayer.className='lion-hotspots';host.append(hotspotLayer);
const hotspotStyle=document.createElement('style');hotspotStyle.textContent='.lion-hotspots{position:absolute;inset:0;pointer-events:none}.lion-hotspot{position:absolute;width:34px;height:34px;border:1px solid #c6c6b680;border-radius:50%;background:#0002;color:#dedfd2;transform:translate(-50%,-50%);pointer-events:auto;cursor:zoom-in;padding:0}.lion-hotspot:after{content:"+"}.lion-hotspot:hover,.lion-hotspot:focus-visible{border-color:#dedfd2;background:#0006}.lion-hotspot[hidden]{display:none}.lion-hotspot.seen{border-color:transparent;background:transparent}.lion-hotspot.seen:after{opacity:0}';document.head.append(hotspotStyle);
let regionHover=null;const observedRegions=new Set();
document.addEventListener('story-restart',()=>{observedRegions.clear();for(const r of regionButtons)r.button.classList.remove('seen');});
const lensInfo=document.createElement('div');lensInfo.className='lens-analysis';lens.append(lensInfo);
const traceCanvas=document.createElement('canvas');traceCanvas.width=192;traceCanvas.height=192;traceCanvas.className='lens-trace';lens.append(traceCanvas);const traceCtx=traceCanvas.getContext('2d');
const sampleCanvas=document.createElement('canvas');sampleCanvas.width=192;sampleCanvas.height=192;const sampleCtx=sampleCanvas.getContext('2d',{willReadFrequently:true});let traceRegion='',traceStarted=0,tracePaths=[];
const lensStyle=document.createElement('style');lensStyle.textContent=`#lionLens{width:264px!important;height:264px!important;overflow:visible!important}#lionLens .lens-cross{display:none}#lionLens>canvas{width:100%;height:100%;border-radius:50%}.lens-trace{position:absolute;inset:0;pointer-events:none}.lens-analysis{position:absolute;top:calc(100% + 14px);left:50%;transform:translateX(-50%);box-sizing:border-box;width:252px;padding:10px 14px;background:#080a08e8;color:#889f8a;border-top:1px solid #889f8a80;font:12px 'KoPub World Batang';line-height:1.7;pointer-events:none}.lens-analysis strong{color:#ecebe6;font-weight:400}@media(max-width:650px){#lionLens{width:210px!important;height:210px!important}}`;document.head.append(lensStyle);
function extractCarving(canvas){sampleCtx.clearRect(0,0,192,192);sampleCtx.filter='blur(1.8px)';sampleCtx.drawImage(canvas,0,0,192,192);sampleCtx.filter='none';const data=sampleCtx.getImageData(0,0,192,192).data,n=96,g=new Float32Array(n*n),mask=new Uint8Array(n*n);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const k=((y*2)*192+x*2)*4;g[y*n+x]=(data[k]+data[k+1]+data[k+2])/3;}for(let y=3;y<n-3;y++)for(let x=3;x<n-3;x++){const k=y*n+x,v=g[k];if(v<35||Math.hypot(x-48,y-48)>44)continue;const a=(g[k-2]+g[k+2])/2,b=(g[k-n*2]+g[k+n*2])/2;if(Math.max(a-v,b-v)>10&&v<185)mask[k]=1;}const paths=[];for(let k=0;k<mask.length;k++){if(!mask[k])continue;const queue=[k],points=[];mask[k]=0;while(queue.length){const i=queue.pop(),x=i%n,y=Math.floor(i/n);points.push([x*2,y*2]);for(const d of [-n-1,-n,-n+1,-1,1,n-1,n,n+1])if(mask[i+d]){mask[i+d]=0;queue.push(i+d);}}if(points.length>22)paths.push(points);}return paths.sort((a,b)=>b.length-a.length).slice(0,18);}
function drawCarving(now){traceCtx.clearRect(0,0,192,192);const t=(now-traceStarted)/1000;if(t>4.4&&traceRegion){observedRegions.add(traceRegion);regionButtons.find(r=>r.id===traceRegion)?.button.classList.add('seen');}const alpha=t<2.8?1:Math.max(0,1-(t-2.8)/1.6);traceCtx.strokeStyle=`rgba(255,255,255,${alpha})`;traceCtx.lineWidth=1.1;traceCtx.shadowColor='white';traceCtx.shadowBlur=5;for(const path of tracePaths){const count=Math.floor(path.length*Math.min(1,t/2.4));traceCtx.beginPath();for(let i=0;i<count;i++){const pt=path[i],prev=path[i-1];if(!prev||Math.hypot(pt[0]-prev[0],pt[1]-prev[1])>6)traceCtx.moveTo(...pt);else traceCtx.lineTo(...pt);}traceCtx.stroke();}}

const regionButtons=['female','male'].flatMap(subject=>regions.filter(([region])=>subject==='female'?['head','eyes'].includes(region):['back','mane','mouth'].includes(region)).map(([region,label,anchor])=>{if(subject==='female'&&(region==='eyes'||region==='mouth'))anchor=[.46,region==='eyes'?.22:.02,-.12];const id=subject+'-'+region;const button=document.createElement('button');button.type='button';button.className='lion-hotspot';button.setAttribute('aria-label',(subject==='female'?'암사자 ':'수사자 ')+label+' 확대 관찰');button.hidden=true;hotspotLayer.append(button);
 button.addEventListener('pointerenter',()=>{regionHover=id;traceRegion='';});button.addEventListener('pointerleave',()=>{regionHover=null;clearPointer();});
 button.addEventListener('focus',()=>{regionHover=id;});button.addEventListener('blur',()=>{regionHover=null;clearPointer();});
 button.addEventListener('click',e=>{e.stopPropagation();observedRegions.add(id);document.dispatchEvent(new CustomEvent('capture-story-motif',{detail:{subject,region}}));clearPointer();regionHover=null;intro.dataset.selectedRegion=region;intro.dataset.selectedSubject=subject;intro.dataset.observationPhase='complete';document.dispatchEvent(new CustomEvent('stage-navigate',{detail:'terrain'}));});
 return {button,anchor,id,subject,region};}));
function updateHotspots(){const enabled=inspecting&&!filmPlaying&&document.body.dataset.stage==='intro'&&intro.dataset.observationPhase==='magnifier';
 for(const item of regionButtons){const pivot=subjects.get(item.subject);const next=storyStops[nextStoryStop];item.button.hidden=!enabled||!next||item.subject!==next.subject||item.region!==next.region||(observedRegions.has(item.id)&&regionHover!==item.id)||!pivot?.visible;if(item.button.hidden)continue;
 const root=pivot.children[0];pivot.updateWorldMatrix(true,true);
 const localBox=pivot.userData.anchorBounds||new THREE.Box3();if(!pivot.userData.anchorBounds)root.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.computeBoundingBox();localBox.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld.clone().premultiply(pivot.matrixWorld.clone().invert())));}});pivot.userData.anchorBounds=localBox;
 const localSize=localBox.getSize(new THREE.Vector3()),localCenter=localBox.getCenter(new THREE.Vector3());
 const world=localCenter.clone().add(new THREE.Vector3(...item.anchor).multiply(localSize)).applyMatrix4(pivot.matrixWorld),screen=world.clone().project(camera);
 item.world=world;item.radius=localSize.y*({eyes:.19,mouth:.24,head:.32,mane:.32,back:.38}[item.region]||.30);item.x=(screen.x+1)*width/2;item.y=(1-screen.y)*height/2;item.button.style.left=item.x+'px';item.button.style.top=item.y+'px';
 item.button.hidden=screen.z<-1||screen.z>1||item.x<0||item.x>width||item.y<0||item.y>height;
 if(regionHover===item.id)pointer={x:item.x,y:item.y};
 }
}
host.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
host.addEventListener('pointerup',e=>{if(!down)return;const distance=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;const r=host.getBoundingClientRect();const subject=distance<6?hit(e.clientX-r.left,e.clientY-r.top):null;if(subject&&!inspecting&&!filmPlaying)playObservation(subject);if(e.pointerType==='touch'&&inspecting){pointer={x:e.clientX-r.left,y:e.clientY-r.top};}});
host.addEventListener('pointercancel',()=>{down=null;clearPointer();});
host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();pointer={x:e.clientX-r.left,y:e.clientY-r.top};});
host.addEventListener('pointerleave',clearPointer);
// UI uses the normal system pointer; clear the magnifier immediately on entering any control.
document.querySelectorAll('.lion-interface,.intro-controls,.intro-scroll,.book-index-button').forEach(el=>el.addEventListener('pointerenter',clearPointer));
host.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.dataset.stage==='intro')returnToPair();});
let weatherTime=0;const snowUniform={value:0};
document.addEventListener('intro-weather',e=>{weatherTime=e.detail;if(weatherTime>0&&weatherTime<.01){for(const o of subjects.values())o.rotation.y=-Math.PI/4;home();}});
const precipitation=new THREE.Group();scene.add(precipitation);
const rainPositions=new Float32Array(240*6),snowPositions=new Float32Array(220*3);
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xbacbd0,transparent:true,opacity:.35}));precipitation.add(rain);
const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(snowPositions,3));
const flakes=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:0xffffff,size:.035,transparent:true,opacity:.85}));precipitation.add(flakes);
const seeds=Array.from({length:240},(_,i)=>({x:Math.sin(i*127.1)*3.6,z:Math.cos(i*31.7)*1.5,y:(i*.371)%4,speed:.8+(i%7)*.16}));
function weather(now){
 const t=weatherTime,playing=intro.classList.contains('story-playing');rain.visible=playing&&t>=5&&t<11;flakes.visible=playing&&t>=15&&t<23;
 snowUniform.value=playing?(t<15?0:t<22?Math.min(1,(t-15)/5):Math.max(0,1-(t-22)/5)):0;
 for(let i=0;i<240;i++){const seed=seeds[i],y=2.6-((now*.001*seed.speed+seed.y)%4),x=seed.x+Math.sin(now*.0004+i)*.07;rainPositions.set([x,y,seed.z,x-.025,y-.16,seed.z],i*6);if(i<220)snowPositions.set([seed.x+Math.sin(now*.0005+i)*.18,2.6-((now*.00025*seed.speed+seed.y)%4),seed.z],i*3);}
 rainGeo.attributes.position.needsUpdate=true;snowGeo.attributes.position.needsUpdate=true;
 if(playing){const day=1+Math.sin(t*.43)*.13;studioLights[0].intensity=3.6*day;studioLights[0].color.set(t<10?0xe4f0df:t<15?0xffd6ad:t<23?0xdbe7f5:0xffedd2);}else{studioLights[0].intensity=3.6;studioLights[0].color.set(0xffedd2);}
}
function snowMaterial(m){m.onBeforeCompile=shader=>{shader.uniforms.snowAmount=snowUniform;shader.vertexShader='varying float vSnowUp; varying vec3 vSnowPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvSnowUp = normalize(mat3(modelMatrix)*objectNormal).y;');shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSnowPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');shader.fragmentShader='uniform float snowAmount; varying float vSnowUp; varying vec3 vSnowPosition;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grain=fract(sin(dot(floor(vSnowPosition.xz*65.0),vec2(12.9898,78.233)))*43758.5453);float coat=smoothstep(0.24,0.7,vSnowUp)*snowAmount*(0.8+grain*0.2);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.9,0.94,0.96),coat);');};m.customProgramCacheKey=()=> 'heritage-snow';m.needsUpdate=true;}
// Temporary point-cloud layer: samples the scan without modifying its geometry or material.
let entryStart=0,entryPending=false,entryRenderer=null,entryClouds=[];
const entryScene=new THREE.Scene();
function finishEntry(){entryStart=0;renderer.domElement.style.opacity='1';for(const c of entryClouds){entryScene.remove(c);c.geometry.dispose();c.material.dispose();}entryClouds=[];if(entryRenderer){entryRenderer.domElement.remove();entryRenderer.dispose();entryRenderer=null;}delete intro.dataset.entryPhase;}
function beginEntry(){if(experience!=='desktop')return;entryPending=!loaded;if(!loaded)return;finishEntry();if(reduced.matches)return;
 scene.updateMatrixWorld(true);entryRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true});entryRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));entryRenderer.setClearColor(0x000000,0);entryRenderer.domElement.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:3';host.append(entryRenderer.domElement);
 for(const pivot of subjects.values()){pivot.traverse(mesh=>{if(!mesh.isMesh)return;const a=mesh.geometry.getAttribute('position');if(!a)return;const n=Math.min(14000,a.count),positions=new Float32Array(n*3),scatter=new Float32Array(n*3),v=new THREE.Vector3();
 for(let i=0;i<n;i++){const j=Math.floor(i*a.count/n);v.fromBufferAttribute(a,j).applyMatrix4(mesh.matrixWorld);positions.set([v.x,v.y,v.z],i*3);const angle=i*2.399963,rad=1.2+(i%97)/97*2.8;scatter.set([Math.cos(angle)*rad,Math.sin(i*1.73)*1.7,Math.sin(angle)*rad],i*3);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('scatter',new THREE.BufferAttribute(scatter,3));const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{gather:{value:0},fade:{value:1}},vertexShader:'attribute vec3 scatter; uniform float gather; void main(){vec3 p=position+scatter*(1.0-gather);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);gl_PointSize=1.7;}',fragmentShader:'uniform float fade; void main(){float d=length(gl_PointCoord-vec2(.5));if(d>.5)discard;gl_FragColor=vec4(vec3(.79,.79,.74),fade*(1.0-smoothstep(.2,.5,d)));}'});const c=new THREE.Points(g,m);entryScene.add(c);entryClouds.push(c);
 });}entryStart=performance.now();entryPending=false;intro.dataset.entryPhase='gathering';renderer.domElement.style.opacity='0';clearPointer();readyAt=entryStart+4300;
}
function updateEntry(now){if(!entryStart)return;const t=(now-entryStart)/1000,p=Math.min(1,t/2.8),ease=1-Math.pow(1-p,3),reveal=Math.max(0,Math.min(1,(t-2.2)/1.4));for(const c of entryClouds){c.material.uniforms.gather.value=ease;c.material.uniforms.fade.value=1-reveal;}renderer.domElement.style.opacity=String(reveal*reveal*(3-2*reveal));entryRenderer.setSize(width,height,false);entryRenderer.render(entryScene,camera);if(t>=3.6)finishEntry();}
document.addEventListener('experience-selected',beginEntry);document.addEventListener('lion-ready',()=>{if(entryPending)beginEntry();});document.querySelector('#experienceSwitch').addEventListener('click',finishEntry);
const scanOverlay=document.createElement('canvas');scanOverlay.className='surface-scan-trace';scanOverlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';host.append(scanOverlay);const scanOverlayCtx=scanOverlay.getContext('2d'),scanSample=document.createElement('canvas'),scanSampleCtx=scanSample.getContext('2d',{willReadFrequently:true});let scanLastDraw=0;
function drawSurfaceTrace(now){scanOverlay.hidden=!filmPlaying;if(!filmPlaying||now-scanLastDraw<65)return;scanLastDraw=now;const w=384,h=Math.max(1,Math.round(384*height/width));scanSample.width=w;scanSample.height=h;scanOverlay.width=w;scanOverlay.height=h;
 surface(false);renderer.render(scene,camera);scanSampleCtx.filter='blur(1.6px)';scanSampleCtx.drawImage(renderer.domElement,0,0,w,h);scanSampleCtx.filter='none';surface(true);renderer.render(scene,camera);
 const rgba=scanSampleCtx.getImageData(0,0,w,h).data,g=new Float32Array(w*h),mask=new Uint8Array(w*h);for(let k=0;k<g.length;k++)g[k]=(rgba[k*4]+rgba[k*4+1]+rgba[k*4+2])/3;
 for(let y=4;y<h-4;y++)for(let x=4;x<w-4;x++){const k=y*w+x,v=g[k];if(v<50||v>190)continue;const horizontal=(g[k-3]+g[k+3])/2-v,vertical=(g[k-w*3]+g[k+w*3])/2-v;if(Math.max(horizontal,vertical)>12&&Math.min(g[k-3],g[k+3],g[k-w*3],g[k+w*3])>35)mask[k]=1;}
 const sweep=((now*.00010+filmClock*.005)%1)*(w+100)-50;scanOverlayCtx.fillStyle='white';scanOverlayCtx.shadowColor='white';scanOverlayCtx.shadowBlur=2;
 for(let k=0;k<mask.length;k++){if(!mask[k])continue;const queue=[k],component=[];mask[k]=0;while(queue.length){const p=queue.pop();component.push(p);for(const d of [-w-1,-w,-w+1,-1,1,w-1,w,w+1])if(mask[p+d]){mask[p+d]=0;queue.push(p+d);}}if(component.length<12)continue;for(const p of component){const x=p%w,y=Math.floor(p/w),age=sweep-x;scanOverlayCtx.globalAlpha=Math.max(0,1-Math.abs(age-12)/65)*.85;if(scanOverlayCtx.globalAlpha>.02)scanOverlayCtx.fillRect(x,y,1,1);}}
}

// Frame a complete anatomical region inside the circular lens, with margin.
// Bounds are in the lion's local bounding-box coordinates; main view is untouched.
const lensRegions={
 eyes:{min:[.23,.08,-.42],max:[.51,.46,.42],direction:[1,.12,0]},
 mouth:{min:[.23,-.08,-.42],max:[.51,.40,.42],direction:[1,.03,0]},
 head:{min:[.20,.28,-.34],max:[.51,.51,.34],direction:[.08,1,.04]},
 mane:{min:[-.20,-.10,-.48],max:[.48,.51,.48],direction:[.12,.16,-1]},
 back:{min:[-.51,.08,-.43],max:[.32,.51,.43],direction:[-.08,1,.35]}
};
function frameLens(item){
 const pivot=subjects.get(item.subject);pivot.updateWorldMatrix(true,true);if(!pivot.userData.anchorBounds){const box=new THREE.Box3();pivot.children[0].traverse(mesh=>{if(mesh.isMesh){mesh.geometry.computeBoundingBox();box.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld.clone().premultiply(pivot.matrixWorld.clone().invert())));}});pivot.userData.anchorBounds=box;}const bounds=pivot.userData.anchorBounds,part=lensRegions[item.region];
 const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const points=[];for(const x of [part.min[0],part.max[0]])for(const y of [part.min[1],part.max[1]])for(const z of [part.min[2],part.max[2]])points.push(center.clone().add(new THREE.Vector3(x,y,z).multiply(size)).applyMatrix4(pivot.matrixWorld));
 const focus=new THREE.Vector3();for(const p of points)focus.add(p);focus.multiplyScalar(1/points.length);
 const direction=new THREE.Vector3(...part.direction).normalize().transformDirection(pivot.matrixWorld);
 lensCamera.up.set(0,1,0);if(item.region==='head'||item.region==='back')lensCamera.up.set(0,0,-1).transformDirection(pivot.matrixWorld);lensCamera.clearViewOffset();lensCamera.position.copy(focus).addScaledVector(direction,5);lensCamera.lookAt(focus);lensCamera.updateMatrixWorld(true);
 let radius=0;for(const p of points){const v=p.clone().applyMatrix4(lensCamera.matrixWorldInverse);radius=Math.max(radius,Math.hypot(v.x,v.y));}
 radius*=1.22;lensCamera.left=-radius;lensCamera.right=radius;lensCamera.top=radius;lensCamera.bottom=-radius;lensCamera.zoom=1;lensCamera.updateProjectionMatrix();
}
function renderLensWithRakingLight(item){
 // Temporary lens-only light rig; restore the main scene before its next frame.
 const saved=studioLights.map(l=>({position:l.position.clone(),intensity:l.intensity}));
 const right=new THREE.Vector3(1,0,0).applyQuaternion(lensCamera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(lensCamera.quaternion),front=new THREE.Vector3(0,0,1).applyQuaternion(lensCamera.quaternion);
 const center=subjects.get(item.subject).getWorldPosition(new THREE.Vector3());
 studioLights[0].position.copy(center).addScaledVector(right,-4).addScaledVector(up,2).addScaledVector(front,1.2);studioLights[0].intensity=2.1;
 const settle=Math.min(1,(performance.now()-traceStarted)/1800);studioLights[0].intensity=1.45+.8*settle;
 studioLights[1].position.copy(center).addScaledVector(front,4);studioLights[1].intensity=.52;
 studioLights[2].intensity=.35;
 lensRenderer.render(scene,lensCamera);
 studioLights.forEach((l,i)=>{l.position.copy(saved[i].position);l.intensity=saved[i].intensity;});
}
const lensCamera=camera.clone();
function tick(now){requestAnimationFrame(tick);const delta=Math.min((now-last)/1000,.05);last=now;if(!visible||document.hidden||!experience||document.body.classList.contains('archive-active')||!['intro','observe'].includes(document.body.dataset.stage))return;updateFilm();host.classList.toggle('motif-focus',!!regionHover);
 if(guidedPose&&loaded){camera.zoom+=(guidedPose.zoom-camera.zoom)*.07;camera.updateProjectionMatrix();const nextY=baseFocus.y+(guidedPose.height||0);const dy=(nextY-controls.target.y)*.07;controls.target.y+=dy;camera.position.y+=dy;for(const o of subjects.values())o.rotation.y+=(guidedPose.yaw-o.rotation.y)*.07;}
 if(document.body.dataset.cameraTest!=='village'&&!cinemaDriven&&document.body.dataset.stage==='intro'&&!filmPlaying&&!guidedPose&&loaded&&experience&&!intro.classList.contains('story-playing')&&intro.dataset.observationPhase!=='magnifier'&&!reduced.matches&&!document.body.classList.contains('choosing-experience')&&now>=readyAt){for(const o of subjects.values())if(o.visible)o.rotation.y-=delta*.075;}
 weather(now);cinematicLight();controls.update();scene.updateMatrixWorld(true);renderer.render(scene,camera);drawSurfaceTrace(now);updateEntry(now);updateHotspots();
 if(pointer&&loaded&&!down&&!filmPlaying){if(now-lastHit>90){lastHit=now;hovered=(inspecting&&document.body.dataset.stage==='intro')?regionHover:hit(pointer.x,pointer.y);host.style.cursor=hovered?(inspecting?'none':'pointer'):'default';lens.classList.toggle('visible',inspecting&&hovered);hint.classList.toggle('visible',!inspecting&&Boolean(hovered));}
  if(inspecting&&hovered&&now-lastLens>50){lastLens=now;
   if(!lensRenderer){lensRenderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});lensRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));lensRenderer.setSize(264,264);lensRenderer.outputColorSpace=renderer.outputColorSpace;lensRenderer.toneMapping=renderer.toneMapping;lensRenderer.toneMappingExposure=renderer.toneMappingExposure;lensRenderer.setClearColor(0x000000);lens.prepend(lensRenderer.domElement);}
   const size=lens.clientWidth,item=regionButtons.find(r=>r.id===hovered);if(item?.world){
   const r=lens.parentElement.getBoundingClientRect(),h=host.getBoundingClientRect();const px=Math.max(size/2+8,Math.min(width-size/2-8,pointer.x)),py=Math.max(size/2+8,Math.min(height-size/2-95,pointer.y));lens.style.transform=`translate(${h.left-r.left+px-size/2}px,${h.top-r.top+py-size/2}px)`;
   frameLens(item);
   const hiddenForLens=[];for(const [name,o] of subjects)if(name!==item.subject&&o.visible){o.visible=false;hiddenForLens.push(o);}
   if(traceRegion!==hovered){surface(false);lensRenderer.render(scene,lensCamera);tracePaths=[]; /* Do not mislabel shadows and silhouettes as carved motifs. */traceRegion=hovered;traceStarted=now;const key=hovered.split('-')[1],label=regions.find(r=>r[0]===key)[1];const notes={eyes:'눈꼬리와 눈 둘레의 음각',mouth:'입의 윤곽과 얼굴 표면',head:'정수리에 말려 올라간 곱슬 머리털의 무늬와 굴곡',mane:'갈기의 선과 반복되는 굴곡',back:'등의 곡면과 새겨진 선'};if(key==='mouth')notes.mouth=item.subject==='female'?'W형 입 윤곽과 올라간 입꼬리':'앞니와 입 주변의 윤곽';if(key==='back')notes.back='목 뒤부터 등으로 이어지는 털 무늬';lensInfo.innerHTML='<strong>'+ (item.subject==='female'?'암사자':'수사자')+' · '+(key==='head'?'정수리':label)+'</strong><br>조형 관찰 ─ '+notes[key];}
   surface(true);renderLensWithRakingLight(item);surface(false);for(const o of hiddenForLens)o.visible=true;drawCarving(now);}

  }
 }else lens.classList.remove('visible');
}
requestAnimationFrame(tick);reduced.addEventListener('change',()=>{readyAt=performance.now()+3000;});

document.addEventListener('lion-return-prep',()=>{cancelFilm();guidedPose=null;selectSubject('both');for(const o of subjects.values())o.rotation.y=-Math.PI/4;home();surface(true);});
document.addEventListener('surface-transition-pose',e=>{if(!loaded)return;surface(true);guidedPose=null;const p=Math.max(0,Math.min(1,e.detail/.12)),ease=p*p*(3-2*p);const pivot=subjects.get(intro.dataset.selectedSubject||'male');const region=regions.find(r=>r[0]===intro.dataset.selectedRegion)||regions[3];const box=new THREE.Box3().setFromObject(pivot),size=box.getSize(new THREE.Vector3());const local=pivot.userData.anchorBounds;const target=local?local.getCenter(new THREE.Vector3()).add(new THREE.Vector3(...region[2]).multiply(local.getSize(new THREE.Vector3()))).applyMatrix4(pivot.matrixWorld):box.getCenter(new THREE.Vector3()).add(new THREE.Vector3(...region[2]).multiply(size));const focus=baseFocus.clone().lerp(target,ease);const offset=new THREE.Vector3().subVectors(camera.position,controls.target);controls.target.copy(focus);camera.position.copy(focus).add(offset);camera.zoom=.78+ease*4.2;camera.updateProjectionMatrix();});

window.addEventListener('wheel',e=>{if(entryStart||!loaded||document.body.dataset.stage!=='intro'||intro.dataset.observationPhase||document.body.classList.contains('choosing-experience')||document.querySelector('dialog[open]')||e.deltaY<=0)return;e.preventDefault();e.stopImmediatePropagation();playObservation('female');},{capture:true,passive:false});

window.addEventListener('keydown',e=>{if(loaded&&document.body.dataset.stage==='intro'&&!intro.dataset.observationPhase&&!document.body.classList.contains('choosing-experience')&&!document.querySelector('dialog[open]')&&['ArrowDown','PageDown',' '].includes(e.key)&&!e.target.closest('button,input,dialog')){e.preventDefault();e.stopImmediatePropagation();playObservation('female');}},{capture:true});
intro.addEventListener('touchmove',e=>{if(loaded&&document.body.dataset.stage==='intro'&&!intro.dataset.observationPhase&&!document.body.classList.contains('choosing-experience')){e.preventDefault();playObservation('female');}},{passive:false});

// Return rotation keeps its leftward direction and is evaluated only by scroll progress.
document.addEventListener('lion-return-progress',e=>{const p=Math.max(0,Math.min(1,(e.detail-.80)/.20));for(const o of subjects.values())o.rotation.y=-Math.PI/4+(1-p)*1.22;camera.zoom=.78;camera.updateProjectionMatrix();});

const motifFocusStyle=document.createElement('style');motifFocusStyle.textContent='#lionViewport>canvas{transition:filter 700ms ease}#lionViewport.motif-focus>canvas{filter:brightness(.60) saturate(.72)}#lionLens>canvas:not(.lens-trace){filter:contrast(1.10);transition:filter 900ms ease}';document.head.append(motifFocusStyle);
document.addEventListener('capture-story-motif',e=>{const item=e.detail;if(document.body.dataset.cameraTest==='village'){renderer.render(scene,camera);document.dispatchEvent(new CustomEvent('motif-capture',{detail:isolatedMotif(renderer.domElement)}));return;}if(!subjects.has(item.subject))return;if(!lensRenderer){lensRenderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});lensRenderer.setSize(768,768);lensRenderer.outputColorSpace=renderer.outputColorSpace;lensRenderer.toneMapping=renderer.toneMapping;lensRenderer.toneMappingExposure=renderer.toneMappingExposure;}const state=[...subjects].map(([name,o])=>[o,o.visible]);for(const [name,o] of subjects)o.visible=name===item.subject;scene.updateMatrixWorld(true);frameLens(item);surface(true);renderLensWithRakingLight(item);document.dispatchEvent(new CustomEvent('motif-capture',{detail:isolatedMotif(lensRenderer.domElement)}));surface(false);for(const [o,v] of state)o.visible=v;});

// Deterministic presentation reuses the same scans, lights and particle layer.
const cinemaFocus=document.createElement('div');cinemaFocus.style.cssText='position:absolute;width:66px;height:66px;border:2px solid #ddd;border-radius:50%;pointer-events:none;display:none;z-index:7;box-shadow:0 0 0 5px #0005';cinemaFocus.innerHTML='<span style="position:absolute;right:-17px;bottom:-10px;width:25px;height:3px;background:#ddd;transform:rotate(45deg)"></span>';host.append(cinemaFocus);
document.addEventListener('cinema-lion-frame',e=>{
 if(!loaded)return;const d=e.detail;cinemaDriven=true;renderer.toneMappingExposure=['pair-reveal','head-push','crown-zoom','relief-trace'].includes(d.kind)?.78:1.15;
 if(cinemaShot!==d.kind){finishEntry();cancelFilm();guidedPose=null;cinemaShot=d.kind;setMode(false);selectSubject('both');for(const o of subjects.values())o.rotation.y=-Math.PI/4;home();if(d.kind==='entry')beginEntry();}
 cinemaFocus.style.display='none';
 if(d.kind==='entry'){if(entryStart)entryStart=performance.now()-d.time*1000;}
 else if(d.kind==='scan'){
  filmPlaying=true;filmTarget=filmClock=d.time;filmSubject=d.time<132?'female':'male';selectSubject(filmSubject);subjects.get(filmSubject).rotation.y=0;surface(true);updateFilm();
 }else{
  filmPlaying=false;surface(true);intro.dataset.observationPhase='cinema';
  for(const o of subjects.values())o.rotation.y=d.kind==='rotate'?-Math.PI/4-d.progress*Math.PI*2:-Math.PI/4;
  home();
  if(['pair-reveal','head-push','crown-zoom','relief-trace'].includes(d.kind)){
   const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*v*(10+v*(-15+6*v));};
   for(const o of subjects.values())o.rotation.y=-Math.PI/2;
   home();scene.updateMatrixWorld(true);frameLens({subject:'female',region:'head'});
   const pivot=subjects.get('female'),bounds=pivot.userData.anchorBounds,size=bounds.getSize(new THREE.Vector3());
   const face=bounds.getCenter(new THREE.Vector3()).add(new THREE.Vector3(.4,.18,0).multiply(size)).applyMatrix4(pivot.matrixWorld);
   const crown=bounds.getCenter(new THREE.Vector3()).add(new THREE.Vector3(.28,.37,0).multiply(size)).applyMatrix4(pivot.matrixWorld);
   const origin=controls.target.clone(),offset=camera.position.clone().sub(origin),u=smooth(d.progress);
   let focus=origin,zoom=1,tilt=0;
   if(d.kind==='head-push'){focus=origin.clone().lerp(face,u);zoom=1+u*1.8;}
   if(d.kind==='crown-zoom'||d.kind==='relief-trace'){const k=d.kind==='relief-trace'?1:u;focus=face.clone().lerp(crown,k);zoom=2.8+k*2.2;tilt=k;}
   offset.lerp(new THREE.Vector3(0,1.8,8),d.kind==='head-push'?u:d.kind==='pair-reveal'?0:1);offset.lerp(new THREE.Vector3(0,6.4,4.8),tilt);camera.position.copy(focus).add(offset);controls.target.copy(focus);camera.zoom=zoom;controls.maxZoom=8;camera.updateProjectionMatrix();camera.lookAt(focus);
   host.style.opacity=d.kind==='pair-reveal'?String(smooth(d.progress/.65)):'1';
   if(d.kind==='relief-trace'){
    if(!pivot.userData.reliefReady){addReliefContours(pivot);pivot.userData.reliefReady=true;}
    for(const line of scanTraces){line.visible=Boolean(line.userData.relief);if(line.userData.relief){line.material.opacity=.9;const count=line.geometry.attributes.position.count;line.geometry.setDrawRange(0,Math.floor(count*Math.min(1,d.progress*1.4)/2)*2);}}
   }
  }
  if(d.kind==='back-zoom'){
   scene.updateMatrixWorld(true);frameLens({subject:'male',region:'back'});
   const pivot=subjects.get('male'),bounds=pivot.userData.anchorBounds;
   const focus=bounds.getCenter(new THREE.Vector3()).add(new THREE.Vector3(-.12,.3,0).multiply(bounds.getSize(new THREE.Vector3()))).applyMatrix4(pivot.matrixWorld);
   const u=d.progress*d.progress*d.progress*(10+d.progress*(-15+6*d.progress));
   const offset=camera.position.clone().sub(controls.target);
   camera.position.lerp(focus.clone().add(offset),u);controls.target.lerp(focus,u);camera.zoom=1+u*5.5;controls.maxZoom=8;camera.updateProjectionMatrix();camera.lookAt(controls.target);
  }
  if(d.kind==='lens'){const item=regionButtons.find(x=>x.subject===d.subject&&x.region===d.region);scene.updateMatrixWorld(true);if(item){frameLens(item);const p=controls.target.clone();const pivot=subjects.get(item.subject),bounds=pivot.userData.anchorBounds;if(bounds){p.copy(bounds.getCenter(new THREE.Vector3())).add(new THREE.Vector3(...item.anchor).multiply(bounds.getSize(new THREE.Vector3()))).applyMatrix4(pivot.matrixWorld);}p.project(camera);cinemaFocus.style.left=((p.x+1)*width/2-33)+'px';cinemaFocus.style.top=((-p.y+1)*height/2-33)+'px';cinemaFocus.style.display='block';cinemaFocus.style.transform=`scale(${d.progress>.8?.88:1})`;}}
 }
});
document.addEventListener('cinema-release',()=>{cinemaDriven=false;cinemaShot='';cinemaFocus.style.display='none';finishEntry();returnToPair();});

function isolatedMotif(source){
 // Extract broad relief only. Texture flecks and the photograph's rectangular
 // background must never become the transition artwork.
 const n=256,c=document.createElement('canvas');c.width=c.height=n;
 const x=c.getContext('2d',{willReadFrequently:true});
 x.filter='blur(3px)';x.drawImage(source,0,0,n,n);x.filter='none';
 const src=x.getImageData(0,0,n,n),out=x.createImageData(n,n),g=new Float32Array(n*n),mask=new Uint8Array(n*n);
 for(let i=0;i<g.length;i++)g[i]=(src.data[i*4]+src.data[i*4+1]+src.data[i*4+2])/3;
 for(let y=8;y<n-8;y++)for(let a=8;a<n-8;a++){
  const i=y*n+a,r=Math.hypot((a-n/2)/(n*.43),(y-n/2)/(n*.43));
  if(r>1||g[i]<50||g[i-4]<40||g[i+4]<40||g[i-4*n]<40||g[i+4*n]<40)continue;
  const relief=Math.max((g[i-4]+g[i+4])/2-g[i],(g[i-4*n]+g[i+4*n])/2-g[i]);
  if(relief>2.8)mask[i]=1;
 }
 const seen=new Uint8Array(n*n);
 for(let i=0;i<mask.length;i++){
  if(!mask[i]||seen[i])continue;
  const group=[i];seen[i]=1;
  for(let k=0;k<group.length;k++){const a=group[k];for(const d of [-n-1,-n,-n+1,-1,1,n-1,n,n+1]){const b=a+d;if(b>=0&&b<mask.length&&mask[b]&&!seen[b]){seen[b]=1;group.push(b);}}}
  if(group.length<30)continue;
  for(const a of group){const r=Math.hypot((a%n-n/2)/(n*.43),(Math.floor(a/n)-n/2)/(n*.43));out.data.set([235,233,223,Math.round(140*Math.min(1,(1-r)*5))],a*4);}
 }
 x.putImageData(out,0,0);const soft=document.createElement('canvas');soft.width=soft.height=1024;const sx=soft.getContext('2d');sx.filter='blur(3px)';sx.drawImage(c,0,0,1024,1024);return soft.toDataURL('image/png');
}

// The transition uses lines from the scanned geometry over the actual Blender village.
const reliefLayer=document.createElement('div');reliefLayer.style.cssText='position:fixed;inset:0;z-index:12;pointer-events:none;display:none;background:#080a08';
const reliefImage=document.createElement('img');reliefImage.style.cssText='width:100%;height:100%;object-fit:cover';reliefLayer.append(reliefImage);document.body.append(reliefLayer);
document.addEventListener('capture-relief-lines',()=>{
 renderer.render(scene,camera);reliefImage.src=renderer.domElement.toDataURL('image/png');
});
document.addEventListener('relief-landscape-frame',e=>{
 const p=e.detail.progress;reliefLayer.style.display=p<1?'block':'none';reliefLayer.style.background=`rgba(8,10,8,${Math.max(0,1-p*2)})`;reliefImage.style.opacity=String(1-p*p*(3-2*p));reliefImage.style.transform=`scale(${1+p*.65})`;
});

function addReliefContours(pivot){
 const bounds=pivot.userData.anchorBounds,size=bounds.getSize(new THREE.Vector3()),points=[],meshes=[];
 pivot.updateWorldMatrix(true,true);const inverse=pivot.matrixWorld.clone().invert();
 pivot.traverse(o=>{if(!o.isMesh)return;const attr=o.geometry.attributes.position,matrix=inverse.clone().multiply(o.matrixWorld),v=new THREE.Vector3(),positions=new Float32Array(attr.count*3);for(let i=0;i<attr.count;i++){v.fromBufferAttribute(attr,i).applyMatrix4(matrix);v.toArray(positions,i*3);}meshes.push({positions,index:o.geometry.index,count:o.geometry.index?.count??attr.count});});
 for(let level=0;level<8;level++){
  const h=bounds.min.y+size.y*(.75+level*.025);
  for(const {positions:p,index,count} of meshes){
   for(let i=0;i<count;i+=3){const ids=[0,1,2].map(k=>(index?index.getX(i+k):i+k)*3);if(ids.every(k=>p[k]<bounds.min.x+size.x*.55))continue;const hits=[];
    for(const [a,b]of [[0,1],[1,2],[2,0]]){const x=ids[a],y=ids[b];if((p[x+1]<h&&p[y+1]>=h)||(p[y+1]<h&&p[x+1]>=h)){const t=(h-p[x+1])/(p[y+1]-p[x+1]);hits.push(p[x]+(p[y]-p[x])*t,h+.001,p[x+2]+(p[y+2]-p[x+2])*t);}}
    if(hits.length===6)points.push(...hits);
   }
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));const line=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xfff6d9,transparent:true,opacity:.9,depthWrite:false,depthTest:false}));line.userData.relief=true;line.name='Back surface height contours';pivot.add(line);scanTraces.push(line);
}
