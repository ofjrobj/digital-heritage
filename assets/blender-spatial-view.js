import {chestProjection} from './journey-input.js?v=20261018-4';
import * as THREE from 'three';
import {prepareEndingDaylight} from './ending-daylight.js?v=74-route4';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {syncCinemaFrame} from './cinema-frame.js?v=74-route4';
import {prepareTownAmbience} from './town-ambience.js?v=74-route4';
const cv=p=>new THREE.Vector3(p[0],p[2],-p[1]);
const conversion=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
const quat=q=>conversion.clone().multiply(new THREE.Quaternion(q[1],q[2],q[3],q[0]));
const clamp=p=>Math.max(0,Math.min(1,p)),smooth=p=>{p=clamp(p);return p*p*(3-2*p);};
const host=document.createElement('div');host.id='blenderSpatialView';host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2;display:none';document.body.append(host);
const css=document.createElement('style');css.textContent=`body[data-stage=terrain] #terrain,body[data-stage=terrain] .terrain-stage,body[data-stage=village] #village,body[data-stage=memory] #memory{background:transparent!important;z-index:3}body[data-stage=terrain] #terrain svg,#villageCanvas,#episodeFilm,#villageInkBackdrop,#terrainTransitionFilm,#endingFilm,#endingPlay{display:none!important}`;document.head.append(css);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;host.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#dedfd1');scene.fog=new THREE.Fog('#dedfd1',95,360);
const skyLight=new THREE.HemisphereLight(0xfff7e6,0x65705d,1.1);scene.add(skyLight);const sun=new THREE.DirectionalLight(0xfff2dd,1.65);sun.position.set(-50,100,25);scene.add(sun);
const camera=new THREE.PerspectiveCamera(42,1,.08,1400);const daylight=prepareEndingDaylight(scene,camera,sun,skyLight,THREE);let route=0,mode='entry',lastPose=null,endingTime=0;
const data=await fetch('./assets/town-camera.json?v=74-route4').then(r=>{if(!r.ok)throw Error('Camera data');return r.json();});
const manifest=await fetch('./assets/town-model.json?v=74-route4').then(r=>{if(!r.ok)throw Error('Model manifest');return r.json();});
const chunks=await Promise.all(manifest.parts.map(async p=>{const r=await fetch('./assets/'+p+'?v='+manifest.sourceSha256.slice(0,12));if(!r.ok)throw Error('Model part '+p);return new Uint8Array(await r.arrayBuffer());}));
const packed=new Uint8Array(chunks.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of chunks){packed.set(p,offset);offset+=p.length;}
const bytes='DecompressionStream' in window?await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():(await import('./vendor/fflate.js')).gunzipSync(packed).buffer;
const loaded=await new GLTFLoader().parseAsync(bytes,'./assets/');const town=loaded.scene;scene.add(town);
const canonical=n=>n.replace(/[^\p{L}\p{N}]/gu,'');const byName=new Map(),modern=[],guesthouse=[],leaves=[],lions=[],seasonSurfaces=[];
town.traverse(o=>{if(o.userData.review_id?.startsWith('Original unchanged')||o.name.startsWith('Originalunchanged')){lions.push(o);o.visible=false;}byName.set(canonical(o.name),o);if(o.userData.present_era){modern.push(o);o.visible=false;o.userData.fullScale=o.scale.clone();o.userData.fullPosition=o.position.clone();o.userData.groundY=new THREE.Box3().setFromObject(o).min.y;}if(o.userData.building_id==='Gongju guesthouse photo study')guesthouse.push(o);if(o.isMesh){const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){m.side=THREE.DoubleSide;m.roughness=.9;m.metalness=0;if(/roof|thatch|지붕/i.test(o.name)){m.transparent=false;m.opacity=1;m.depthWrite=true;}}if(/leaf|leav|canopy|수관/i.test(o.name)){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();leaves.push({o,colors:(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.color.clone())});}}});
town.traverse(root=>{if(root.userData.heritage_reference)root.traverse(o=>{if(!o.isMesh)return;const clean=m=>new THREE.MeshStandardMaterial({map:m.map,color:m.color.clone(),roughness:.9,metalness:0,side:THREE.DoubleSide});o.material=Array.isArray(o.material)?o.material.map(clean):clean(o.material);});});
town.traverse(o=>{
 if(!o.isMesh)return;const current=Array.isArray(o.material)?o.material:[o.material];
 const snowy=/v074web(?:land|roof|guesthouseroof)/i.test(canonical(o.name))||current.some(m=>/roof|tile|기와|sand paths/i.test(m.name));
 if(!snowy)return;o.material=Array.isArray(o.material)?current.map(m=>m.clone()):current[0].clone();
 const materials=Array.isArray(o.material)?o.material:[o.material],snow={value:0};
 for(const m of materials){m.onBeforeCompile=shader=>{shader.uniforms.seasonSnow=snow;shader.fragmentShader='uniform float seasonSnow;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.82,0.85,0.84),seasonSnow);');};m.customProgramCacheKey=()=> 'season-snow-v074';}
 seasonSurfaces.push({o,colors:materials.map(m=>m.color.clone()),snow});
});
const motion=await fetch('./assets/town-motion.json?v=74-route4').then(r=>r.json());const tracks=motion.tracks.map(t=>({...t,o:byName.get(canonical(t.name))})).filter(t=>t.o);
const walkers=(motion.walkers||[]).map(t=>({...t,o:byName.get(canonical(t.name))})).filter(t=>t.o);
const ambience=prepareTownAmbience(camera,walkers);
const seasonalGeometry=new THREE.BufferGeometry();const seasonalPositions=new Float32Array(560*3),seasonalSeeds=[];
for(let i=0;i<560;i++)seasonalSeeds.push({x:16+((i*17.719)%33),z:-77-((i*9.719)%26),phase:(i*.618)%1});
seasonalGeometry.setAttribute('position',new THREE.BufferAttribute(seasonalPositions,3));
const seasonalMaterial=new THREE.PointsMaterial({color:'#f0e8dd',size:.08,transparent:true,opacity:0,depthWrite:false});
const weather=new THREE.Points(seasonalGeometry,seasonalMaterial);weather.frustumCulled=false;weather.visible=false;scene.add(weather);
function seasons(t){
 const spring=smooth(t/4)*(1-smooth((t-9)/4)),autumn=smooth((t-19)/6)*(1-smooth((t-29)/5)),winter=smooth((t-31)/5)*(1-smooth((t-41)/4));
 for(const {o,colors} of leaves){o.visible=winter<.96;(Array.isArray(o.material)?o.material:[o.material]).forEach((m,i)=>m.color.copy(colors[i]).lerp(new THREE.Color('#ccb5ac'),spring*.42).lerp(new THREE.Color('#a97632'),autumn*.72));}
 for(const {snow} of seasonSurfaces)snow.value=winter*.92;
 weather.visible=spring+autumn+winter>.01;seasonalMaterial.color.set(winter>.1?'#fffdf6':autumn>.1?'#b47731':'#e4c3c2');seasonalMaterial.opacity=Math.max(winter*.9,spring*.65,autumn*.75);seasonalMaterial.size=winter>.1?.13:.11;
 host.dataset.season=JSON.stringify({time:t.toFixed(2),spring,autumn,winter});
 if(weather.visible){for(let i=0;i<seasonalSeeds.length;i++){const a=seasonalSeeds[i];seasonalPositions[i*3]=a.x+.3*Math.sin(time*.6+i);seasonalPositions[i*3+1]=4.1+(1-((time*.055+a.phase)%1))*11;seasonalPositions[i*3+2]=a.z;}seasonalGeometry.attributes.position.needsUpdate=true;}
 daylight.update(t);
}

let walkFov=42,dialogueMix=0;
function size(){const f=syncCinemaFrame();renderer.setSize(f.width,f.height);camera.aspect=f.width/f.height;camera.fov=Math.min(55,2*Math.atan(Math.tan(24*Math.PI/180)/camera.aspect)*180/Math.PI);walkFov=camera.fov;camera.updateProjectionMatrix();}
window.addEventListener('resize',()=>{size();if(lastPose)applyPose(...lastPose);});size();
function show(){if(document.body.classList.contains('archive-active'))return;host.style.display='block';host.style.opacity='1';}
function setHistorical(){for(const o of lions)o.visible=route===5&&mode==='route';endingTime=0;weather.visible=false;daylight.reset();scene.background.set('#dedfd1');scene.fog.color.set('#dedfd1');sun.intensity=1.65;sun.color.set(0xfff2dd);sun.position.set(-50,100,25);for(const {o} of leaves)o.visible=true;for(const {snow} of seasonSurfaces)snow.value=0;for(const o of modern)o.visible=false;for(const o of guesthouse)o.visible=true;for(const {o,colors} of leaves)(Array.isArray(o.material)?o.material:[o.material]).forEach((m,i)=>m.color.copy(colors[i]));}
function applyPose(track,p,dialogue=false){
 lastPose=[track,p,dialogue];const frames=track.frames||track;const f=clamp(p)*(frames.length-1),i=Math.min(frames.length-2,Math.floor(f)),u=f-i,a=frames[i],b=frames[i+1];
 camera.position.copy(cv(a.p).lerp(cv(b.p),u));camera.quaternion.copy(quat(a.q)).slerp(quat(b.q),u);camera.fov=walkFov;camera.updateProjectionMatrix();
 dialogueMix=Number(dialogue)||0;fitDialogue();
 host.dataset.route=String(route);host.dataset.progress=clamp(p).toFixed(4);host.dataset.mode=mode;
}
function fitDialogue(){
 const d=data.dialogues?.[route],panel=document.querySelector('#cinemaDialogue');
 const rect=panel&&!panel.hidden?panel.getBoundingClientRect():null;
 const panelTop=rect?.height?rect.top:innerHeight*.69;
 renderer.domElement.style.clipPath='none';
 host.style.background='transparent';
 if(!d||!dialogueMix)return;
 camera.updateMatrixWorld(true);const inv=camera.matrixWorldInverse,pts=[];
 for(const subject of d.subjects)for(const kind of ['head','chest','left','right']){const p=cv(subject[kind]).applyMatrix4(inv);pts.push({kind,x:p.x/-p.z,y:p.y/-p.z});}
 const nav=document.querySelector('#storyIndexBar')?.getBoundingClientRect();
 const fit=chestProjection(pts,innerWidth,innerHeight,panelTop,nav?.bottom||70);
 const walkScale=1/Math.tan(walkFov*Math.PI/360),scale=THREE.MathUtils.lerp(walkScale,fit.scale,dialogueMix);
 camera.fov=2*Math.atan(1/scale)*180/Math.PI;camera.updateProjectionMatrix();camera.projectionMatrix.elements[9]=fit.offset*dialogueMix;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
 host.dataset.framing=JSON.stringify({route,mix:dialogueMix,panelTop,fov:camera.fov,headTop:Math.min(...pts.filter(p=>p.kind==='head').map(p=>(1-(scale*p.y-fit.offset*dialogueMix))*innerHeight/2)),chestBottom:Math.max(...pts.filter(p=>p.kind==='chest').map(p=>(1-(scale*p.y-fit.offset*dialogueMix))*innerHeight/2))});
}
function sample(index,p,dialogue=false){route=Math.min(5,Math.max(0,index));mode='route';setHistorical();scene.fog.near=100;scene.fog.far=360;applyPose(data.routes[route],dialogue?1:p,dialogue);show();}
document.addEventListener('blender-route-frame',e=>{sample(e.detail.index??route,(e.detail.time??0)/150,e.detail.dialogue??false);});
document.addEventListener('blender-departure-frame',e=>{
 route=e.detail.from;mode='route';setHistorical();
 const u=smooth(e.detail.progress),a=data.routes[route].frames.at(-1),b=data.routes[e.detail.to].frames[0];
 // Fit the stationary dialogue pose first; rotating subjects must not change the lens fit.
 applyPose({frames:[a,a]},0,1);const startScale=1/Math.tan(camera.fov*Math.PI/360),startOffset=camera.projectionMatrix.elements[9];
 applyPose({frames:[a,{p:a.p,q:b.q}]},u,false);
 camera.fov=2*Math.atan(1/THREE.MathUtils.lerp(startScale,1/Math.tan(walkFov*Math.PI/360),u))*180/Math.PI;
 camera.updateProjectionMatrix();camera.projectionMatrix.elements[9]=startOffset*(1-u);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();show();
});
document.addEventListener('blender-transfer-frame',e=>sample(e.detail.to??e.detail.from+1,e.detail.progress));
document.addEventListener('blender-entry-frame',e=>{mode='entry';setHistorical();const p=clamp(e.detail.progress);applyPose(data.entry,p);scene.fog.near=THREE.MathUtils.lerp(160,100,smooth(p));scene.fog.far=THREE.MathUtils.lerp(600,360,smooth(p));show();});
document.addEventListener('blender-ending-frame',e=>{
 mode='ending';for(const o of lions)o.visible=true;endingTime=clamp((e.detail*144-70)/74)*72;route=5;applyPose(data.routes[5],1);show();scene.fog.near=95;scene.fog.far=360;
 const reveal=smooth((endingTime-54)/12);for(const o of guesthouse)o.visible=reveal<.12;
 for(const o of modern){const rank=o.userData.construction_rank||0,u=smooth((endingTime-54-rank*1.1)/4);o.visible=u>0;if(u>0){o.scale.copy(o.userData.fullScale);o.scale.y*=Math.max(.001,u);o.position.copy(o.userData.fullPosition);o.position.y=o.userData.groundY+(o.userData.fullPosition.y-o.userData.groundY)*u;}}
 for(const {o,colors} of leaves){const autumn=smooth((endingTime-19)/8)*(1-smooth((endingTime-34)/8));(Array.isArray(o.material)?o.material:[o.material]).forEach((m,i)=>m.color.copy(colors[i]).lerp(new THREE.Color('#a97632'),autumn*.55));}
});
document.addEventListener('story-home',()=>{host.style.display='none';ambience.stop();});
document.addEventListener('archive-open',()=>{host.style.display='none';ambience.stop();});
document.addEventListener('archive-story',()=>{if(lastPose)show();});
let last=0,time=0;
function tick(now){requestAnimationFrame(tick);const dt=last?Math.min(.08,(now-last)/1000):0;last=now;if(document.hidden||host.style.display==='none'||document.body.classList.contains('archive-active'))return;time+=dt;
 for(const t of tracks){const f=((time+(t.phase||0))%motion.period)/motion.period*(t.frames.length-1),i=Math.min(t.frames.length-2,Math.floor(f)),u=f-i,a=t.frames[i],b=t.frames[i+1];if(t.location)t.o.position.copy(cv(a.p).lerp(cv(b.p),u));if(t.rotation){const q1=new THREE.Quaternion(a.q[1],a.q[3],-a.q[2],a.q[0]),q2=new THREE.Quaternion(b.q[1],b.q[3],-b.q[2],b.q[0]);t.o.quaternion.copy(q1).slerp(q2,u);}}
 for(const w of walkers){const f=((time+w.phase)%w.period)/w.period*(w.frames.length-1),i=Math.min(w.frames.length-2,Math.floor(f)),u=f-i,a=w.frames[i],b=w.frames[i+1];w.o.position.copy(cv(a.p).lerp(cv(b.p),u));w.o.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),a.yaw+(b.yaw-a.yaw)*u);w.walking=!!a.walking;}
 if(dialogueMix)fitDialogue();host.dataset.lionsVisible=String(lions.filter(o=>o.visible).length);if(mode==='ending')seasons(endingTime);ambience.update(time,dt);renderer.render(scene,camera);host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);host.dataset.motionTime=time.toFixed(2);
}
requestAnimationFrame(tick);
document.body.dataset.spatialReady='true';document.body.dataset.endingReady='true';document.body.dataset.townVersion='v074-town';host.dataset.houses=String(manifest.houses);host.dataset.residents=String(manifest.residents);host.dataset.motionTracks=String(tracks.length);host.dataset.walkers=String(walkers.length);host.dataset.protectedChanged=String(manifest.protectedChanged);document.dispatchEvent(new CustomEvent('spatial-ready'));
