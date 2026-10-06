import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
const host=document.querySelector('#lionViewport'),intro=document.querySelector('#intro'),status=document.querySelector('#lionStatus');
const backButton=document.querySelector('#lionBack'),lens=document.querySelector('#lionLens');
const choice=document.querySelector('#experienceChoice'),hint=document.querySelector('#lionHoverHint');
let experience=null;
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
document.addEventListener('story-pose',e=>guidedPose=e.detail);
document.addEventListener('story-home',()=>guidedPose=null);
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:location.hash.includes("figmacapture")});}catch(error){status.textContent='이 기기에서는 3D 화면을 표시할 수 없습니다.';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.append(renderer.domElement);
const camera=new THREE.OrthographicCamera(-2,2,2,-2,.01,100),controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.09;controls.enablePan=false;controls.enabled=false;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI-.12;
scene.add(new THREE.HemisphereLight(0xe7e6e0,0x302821,.65));
const studioLights=[];
function light(color,power,p){const l=new THREE.DirectionalLight(color,power);l.position.set(...p);scene.add(l);studioLights.push(l);}
light(0xffedd2,3.6,[-3,4,3]);light(0xdce6ec,.55,[3,1,3]);light(0xf6ead9,3,[2,3,-3]);
function clearPointer(){pointer=null;hovered=false;hint.classList.remove('visible');lens.classList.remove('visible');host.style.cursor='default';}
function home(){const center=new THREE.Vector3(),box=new THREE.Box3();
 for(const [name,o] of subjects)if(o.visible)box.union(new THREE.Box3().setFromObject(o));
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
const loader=new GLTFLoader(),surfaceMaterials=[];
const textureLoader=new THREE.TextureLoader();
function loadHeight(name){return textureLoader.loadAsync(new URL(`./${name}-height.jpg`,import.meta.url).href).then(t=>{t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;});}
function surface(original){for(const item of surfaceMaterials)item.mesh.material=original?item.original:item.height;}

function load(name,url){return Promise.all([loadHeight(name),loader.loadAsync(new URL(url,import.meta.url).href)]).then(([heightMap,gltf])=>{
 const root=gltf.scene,box=new THREE.Box3().setFromObject(root);root.position.sub(box.getCenter(new THREE.Vector3()));
 root.traverse(mesh=>{if(!mesh.isMesh)return;const original=mesh.material;
  const makeHeight=m=>{const gray=m.clone();gray.map=null;gray.color.set(0xc4c3b5);gray.roughness=.82;gray.metalness=0;return gray;};
  (Array.isArray(original)?original:[original]).forEach(snowMaterial);
  surfaceMaterials.push({mesh,original,height:Array.isArray(original)?original.map(makeHeight):makeHeight(original)});
 });
 const pivot=new THREE.Group();pivot.add(root);pivot.rotation.y=-Math.PI/4;scene.add(pivot);subjects.set(name,pivot);
});}
Promise.all([load('male','./stone-lion.glb'),load('female','./stone-lion-female.glb')]).then(()=>{
 loaded=true;intro.dataset.lionReady='true';subjects.get('female').position.set(-.64,0,0);subjects.get('male').position.set(.64,0,0);home();readyAt=performance.now()+3000;
 status.textContent='';document.dispatchEvent(new CustomEvent('lion-ready'));
}).catch(e=>{console.error(e);status.textContent='석사자를 불러오지 못했습니다. 새로고침해 주세요.';});
function selectSubject(name){const unchanged=active===name;active=name;clearPointer();
 for(const [key,o] of subjects){o.visible=name==='both'||key===name;o.position.x=name==='both'?(key==='female'?-.64:.64):0;o.position.z=0;}
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
async function playObservation(subject){subject='female';cancelFilm();guidedPose=null;clearPointer();filmPlaying=true;document.body.classList.add('cinematic-observation');filmSubject=subject;intro.dataset.observationPhase='film';intro.dataset.observationSubject=subject;filmLayer.hidden=false;filmLayer.style.background='transparent';filmLayer.style.pointerEvents='none';filmLayer.querySelector('.film-back').style.pointerEvents='auto';film.hidden=true;selectSubject(subject);subjects.get(subject).rotation.y=0;home();surface(true);backButton.hidden=true;filmPart.textContent='전체 · 스크롤하여 살펴보기';filmTarget=0;filmFinished=false;film.style.width='52%';film.pause();film.removeAttribute('src');filmClock=0;updateFilm();}

film.addEventListener('timeupdate',()=>{const t=film.currentTime;filmPart.textContent=(t<4?'전체':t<7?'얼굴':t<10?'머리':t<13?'등':'갈퀴')+' · 스크롤하여 살펴보기';});
function showPairObservation(){cancelFilm();guidedPose=null;setMode(true,'both');for(const o of subjects.values())o.rotation.y=-Math.PI/4;home();camera.zoom=.78;camera.updateProjectionMatrix();intro.dataset.observationPhase='magnifier';intro.dataset.observationSubject='both';status.textContent='';backButton.hidden=true;document.dispatchEvent(new CustomEvent('lion-pair-ready'));}
function finishObservation(){if(filmFinished)return;filmFinished=true;intro.dataset.observationPhase='waiting';filmPart.textContent='';filmDelay=setTimeout(showPairObservation,900);}
document.addEventListener('lion-pair-observe',showPairObservation);
function scrubFilm(delta){if(!filmPlaying||!true)return;filmTarget=Math.max(0,Math.min(filmDuration,filmTarget+delta));filmLayer.dataset.scrollTime=String(filmTarget);updateFilm();if(filmFinished&&filmTarget<filmDuration-.1){clearTimeout(filmDelay);filmFinished=false;intro.dataset.observationPhase='film';}}
window.addEventListener('wheel',e=>{if(!filmPlaying)return;e.preventDefault();e.stopImmediatePropagation();scrubFilm(Math.max(-180,Math.min(180,e.deltaY))*.012);},{capture:true,passive:false});
let filmTouchY=null;
intro.addEventListener('touchstart',e=>{if(filmPlaying)filmTouchY=e.touches[0]?.clientY;},{passive:true});
intro.addEventListener('touchmove',e=>{if(!filmPlaying||filmTouchY===null)return;e.preventDefault();e.stopImmediatePropagation();const y=e.touches[0].clientY;scrubFilm((filmTouchY-y)*.035);filmTouchY=y;},{capture:true,passive:false});
window.addEventListener('keydown',e=>{if(!filmPlaying)return;const step={ArrowDown:1,PageDown:2,ArrowUp:-1,PageUp:-2,' ':2}[e.key];if(step!==undefined){e.preventDefault();e.stopImmediatePropagation();scrubFilm(step);}else if(e.key==='Escape'){e.preventDefault();returnToPair();}},{capture:true});
film.addEventListener('seeked',()=>{if(filmPlaying)requestAnimationFrame(updateFilm);});
let filmClock=0;
// One full orbit with slow detail passes and quicker, wider connecting arcs.
const filmDuration=192;
// [seconds, zoom, focus, [unwrapped azimuth, elevation], label]
const cinematicKeys=[
 [0,.70,[0,.06,0],[-.7853981633974483,.18],'전체'],
 [5,1.60,[.40,.21,-.12],[-.24,.16],'얼굴'],
 [16,2.20,[.43,.22,.10],[.22,.16],'눈 · 입'],
 [22,1.25,[.24,.20,.10],[.65,.40],'머리'],
 [30,2.05,[.23,.34,.10],[.95,.70],'머리 윗면'],
 [39,2.15,[.02,.30,.15],[1.25,.54],'등 · 표면의 결'],
 [45,1.10,[-.12,.12,0],[1.90,.26],'옆면'],
 [51,1.90,[-.35,.17,.10],[2.70,.24],'뒷면'],
 [61,2.10,[-.38,.10,-.10],[3.30,.14],'뒷면 · 굴곡'],
 [67,1.15,[-.15,.12,-.08],[3.90,.36],'반대쪽 옆면'],
 [74,1.95,[.02,.20,-.20],[4.35,.33],'갈기'],
 [84,2.10,[.25,.19,-.18],[4.85,.22],'갈기의 선'],
 [90,1.20,[.20,.13,-.05],[5.30,.38],'얼굴로 이어지는 윤곽'],
 [96,.85,[0,.06,0],[5.497787143782138,.18],'전체']
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
function updateFilm(){if(!filmPlaying||!loaded)return;filmClock+=(filmTarget-filmClock)*.085;if(Math.abs(filmTarget-filmClock)<.008)filmClock=filmTarget;
 const subject=filmClock<96?'female':'male';
 if(filmSubject!==subject){filmSubject=subject;intro.dataset.observationSubject=subject;selectSubject(subject);subjects.get(subject).rotation.y=0;home();clearPointer();}
 const localTime=Math.min(96,filmClock<96?filmClock:filmClock-96);
 const size=new THREE.Box3().setFromObject(subjects.get(filmSubject)).getSize(new THREE.Vector3());
 const focus=baseFocus.clone().add(new THREE.Vector3(cameraSample(localTime,2,0)*size.x,cameraSample(localTime,2,1)*size.y,cameraSample(localTime,2,2)*size.z));
 const azimuth=cameraSample(localTime,3,0),elevation=cameraSample(localTime,3,1);
 const direction=new THREE.Vector3(Math.cos(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.sin(azimuth)*Math.cos(elevation));
 camera.position.copy(focus).addScaledVector(direction,8);controls.target.copy(focus);const zoom=cameraSample(localTime,1);camera.zoom=zoom*(1+.30*THREE.MathUtils.smoothstep(zoom,1.35,1.95));camera.updateProjectionMatrix();
 const key=[...cinematicKeys].reverse().find(k=>localTime>=k[0])||cinematicKeys[0];
 filmPart.textContent=(subject==='female'?'암사자':'수사자')+' · '+key[4];filmLayer.dataset.scrollTime=filmClock.toFixed(2);filmLayer.dataset.shot=filmPart.textContent;
 const seam=Math.max(0,1-Math.abs(filmClock-96)/1.7);host.style.opacity=String(1-seam*.95);
 if(filmTarget>=filmDuration-.01&&filmClock>=filmDuration-.06){host.style.opacity='1';finishObservation();}
}
function cinematicLight(){if(!filmPlaying)return;const side=new THREE.Vector3().subVectors(camera.position,controls.target).normalize();studioLights[0].position.copy(controls.target).addScaledVector(side,3).add(new THREE.Vector3(-3,3,0));studioLights[0].intensity=2.7;studioLights[1].intensity=.3;studioLights[2].position.copy(controls.target).addScaledVector(side,-3).add(new THREE.Vector3(2,3,0));studioLights[2].intensity=3.3;}
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
const regions=[['eyes','눈',[.44,.27,.12]],['mouth','입',[.46,.10,.12]],['head','머리',[.32,.35,.06]],['mane','갈기',[.18,.12,.30]],['back','등',[-.22,.29,.12]]];
const hotspotLayer=document.createElement('div');hotspotLayer.className='lion-hotspots';host.append(hotspotLayer);
const hotspotStyle=document.createElement('style');hotspotStyle.textContent='.lion-hotspots{position:absolute;inset:0;pointer-events:none}.lion-hotspot{position:absolute;width:34px;height:34px;border:1px solid #c6c6b680;border-radius:50%;background:#0002;color:#dedfd2;transform:translate(-50%,-50%);pointer-events:auto;cursor:zoom-in;padding:0}.lion-hotspot:after{content:"+"}.lion-hotspot:hover,.lion-hotspot:focus-visible{border-color:#dedfd2;background:#0006}.lion-hotspot[hidden]{display:none}';document.head.append(hotspotStyle);
let regionHover=null;
const regionButtons=['female','male'].flatMap(subject=>regions.map(([region,label,anchor])=>{const id=subject+'-'+region;const button=document.createElement('button');button.type='button';button.className='lion-hotspot';button.setAttribute('aria-label',(subject==='female'?'암사자 ':'수사자 ')+label+' 확대 관찰');button.hidden=true;hotspotLayer.append(button);
 button.addEventListener('pointerenter',()=>{regionHover=id;});button.addEventListener('pointerleave',()=>{regionHover=null;clearPointer();});
 button.addEventListener('focus',()=>{regionHover=id;});button.addEventListener('blur',()=>{regionHover=null;clearPointer();});
 button.addEventListener('click',e=>{e.stopPropagation();clearPointer();regionHover=null;intro.dataset.selectedRegion=region;intro.dataset.selectedSubject=subject;intro.dataset.observationPhase='complete';document.dispatchEvent(new CustomEvent('stage-navigate',{detail:'terrain'}));});
 return {button,anchor,id,subject};}));
function updateHotspots(){const enabled=inspecting&&!filmPlaying&&document.body.dataset.stage==='intro'&&intro.dataset.observationPhase==='magnifier';
 for(const item of regionButtons){const pivot=subjects.get(item.subject);item.button.hidden=!enabled||!pivot?.visible;if(item.button.hidden)continue;
 const root=pivot.children[0];pivot.updateWorldMatrix(true,true);
 const localBox=pivot.userData.anchorBounds||new THREE.Box3();if(!pivot.userData.anchorBounds)root.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.computeBoundingBox();localBox.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld.clone().premultiply(pivot.matrixWorld.clone().invert())));}});pivot.userData.anchorBounds=localBox;
 const localSize=localBox.getSize(new THREE.Vector3()),localCenter=localBox.getCenter(new THREE.Vector3());
 const world=localCenter.clone().add(new THREE.Vector3(...item.anchor).multiply(localSize)).applyMatrix4(pivot.matrixWorld),screen=world.clone().project(camera);
 item.x=(screen.x+1)*width/2;item.y=(1-screen.y)*height/2;item.button.style.left=item.x+'px';item.button.style.top=item.y+'px';
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
const lensCamera=camera.clone();
function tick(now){requestAnimationFrame(tick);const delta=Math.min((now-last)/1000,.05);last=now;updateFilm();if(!visible||document.hidden)return;
 if(guidedPose&&loaded){camera.zoom+=(guidedPose.zoom-camera.zoom)*.07;camera.updateProjectionMatrix();const nextY=baseFocus.y+(guidedPose.height||0);const dy=(nextY-controls.target.y)*.07;controls.target.y+=dy;camera.position.y+=dy;for(const o of subjects.values())o.rotation.y+=(guidedPose.yaw-o.rotation.y)*.07;}
 if(!filmPlaying&&!guidedPose&&loaded&&experience&&!intro.classList.contains('story-playing')&&intro.dataset.observationPhase!=='magnifier'&&!reduced.matches&&!document.body.classList.contains('choosing-experience')&&now>=readyAt){for(const o of subjects.values())if(o.visible)o.rotation.y-=delta*.075;}
 weather(now);cinematicLight();controls.update();scene.updateMatrixWorld(true);renderer.render(scene,camera);updateHotspots();
 if(pointer&&loaded&&!down&&!filmPlaying){if(now-lastHit>90){lastHit=now;hovered=(inspecting&&document.body.dataset.stage==='intro')?regionHover:hit(pointer.x,pointer.y);host.style.cursor=hovered?(inspecting?'none':'pointer'):'default';lens.classList.toggle('visible',inspecting&&hovered);hint.classList.toggle('visible',!inspecting&&Boolean(hovered));}
  if(inspecting&&hovered&&now-lastLens>50){lastLens=now;
   if(!lensRenderer){lensRenderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:location.hash.includes("figmacapture")});lensRenderer.setPixelRatio(Math.min(devicePixelRatio,2));lensRenderer.setSize(144,144);lensRenderer.outputColorSpace=renderer.outputColorSpace;lensRenderer.toneMapping=renderer.toneMapping;lensRenderer.toneMappingExposure=renderer.toneMappingExposure;lensRenderer.setClearColor(0x000000);lens.prepend(lensRenderer.domElement);}
   const size=lens.clientWidth;const r=lens.parentElement.getBoundingClientRect(),h=host.getBoundingClientRect();lens.style.transform=`translate(${h.left-r.left+pointer.x-size/2}px,${h.top-r.top+pointer.y-size/2}px)`;
   lensCamera.position.copy(camera.position);lensCamera.quaternion.copy(camera.quaternion);lensCamera.left=camera.left;lensCamera.right=camera.right;lensCamera.top=camera.top;lensCamera.bottom=camera.bottom;lensCamera.zoom=camera.zoom;lensCamera.setViewOffset(width,height,pointer.x-size/4,pointer.y-size/4,size/2,size/2);surface(true);lensRenderer.render(scene,lensCamera);surface(false);
  }
 }else lens.classList.remove('visible');
}
requestAnimationFrame(tick);reduced.addEventListener('change',()=>{readyAt=performance.now()+3000;});

document.addEventListener('lion-return-prep',()=>{cancelFilm();guidedPose=null;selectSubject('both');for(const o of subjects.values())o.rotation.y=-Math.PI/4;home();surface(true);});
document.addEventListener('surface-transition-pose',e=>{if(!loaded)return;surface(true);guidedPose=null;const p=Math.max(0,Math.min(1,e.detail/.30)),ease=p*p*(3-2*p);const pivot=subjects.get(intro.dataset.selectedSubject||'male');const region=regions.find(r=>r[0]===intro.dataset.selectedRegion)||regions[3];const box=new THREE.Box3().setFromObject(pivot),size=box.getSize(new THREE.Vector3());const local=pivot.userData.anchorBounds;const target=local?local.getCenter(new THREE.Vector3()).add(new THREE.Vector3(...region[2]).multiply(local.getSize(new THREE.Vector3()))).applyMatrix4(pivot.matrixWorld):box.getCenter(new THREE.Vector3()).add(new THREE.Vector3(...region[2]).multiply(size));const focus=baseFocus.clone().lerp(target,ease);const offset=new THREE.Vector3().subVectors(camera.position,controls.target);controls.target.copy(focus);camera.position.copy(focus).add(offset);camera.zoom=.78+ease*4.2;camera.updateProjectionMatrix();});

window.addEventListener('wheel',e=>{if(!loaded||document.body.dataset.stage!=='intro'||intro.dataset.observationPhase||document.body.classList.contains('choosing-experience')||document.querySelector('dialog[open]')||e.deltaY<=0)return;e.preventDefault();e.stopImmediatePropagation();playObservation('female');},{capture:true,passive:false});

window.addEventListener('keydown',e=>{if(loaded&&document.body.dataset.stage==='intro'&&!intro.dataset.observationPhase&&!document.body.classList.contains('choosing-experience')&&!document.querySelector('dialog[open]')&&['ArrowDown','PageDown',' '].includes(e.key)&&!e.target.closest('button,input,dialog')){e.preventDefault();e.stopImmediatePropagation();playObservation('female');}},{capture:true});
intro.addEventListener('touchmove',e=>{if(loaded&&document.body.dataset.stage==='intro'&&!intro.dataset.observationPhase&&!document.body.classList.contains('choosing-experience')){e.preventDefault();playObservation('female');}},{passive:false});
