// v052 work copy: opening test films and five static genre-painting dialogue frames.
const root=document.createElement('div');root.id='higgsfieldFilm';root.hidden=true;
root.setAttribute('aria-label','산수화 속 공주목으로 들어가는 영상');
const make=(name,poster)=>{const v=document.createElement('video');v.id='hf-'+name;v.src=new URL(`higgsfield/${name}.mp4?v=clear-2`,import.meta.url);v.poster=new URL(`higgsfield/${poster}.png`,import.meta.url);v.muted=true;v.playsInline=true;v.preload='auto';v.hidden=true;root.append(v);return v;};
const intro=make('intro','cover'),approach=make('approach','village');document.body.append(root);
const portraits=Array.from({length:5},(_,i)=>{const img=document.createElement('img');img.src=new URL(`higgsfield/person-${i+1}.webp`,import.meta.url);img.alt=['제금루 앞 장사꾼','동헌 앞 농민','객사 찬모','민가 주민 삼총사','뒷산 나무꾼'][i];img.hidden=true;root.append(img);return img;});
const message=document.createElement('div');message.id='higgsfieldLoadStatus';message.hidden=true;message.setAttribute('role','status');document.body.append(message);
let started=false,activeVideo=null,lastFrame=null,dialogueActive=false,failed=false;
const videos=[intro,approach];
function readiness(){const ready=Boolean(!activeVideo||activeVideo.readyState>=2||activeVideo.error);document.body.dataset.higgsfieldReady=String(ready);message.hidden=!started||ready;if(!ready&&!failed)message.textContent='풍경을 불러오는 중입니다…';}
for(const v of videos){v.addEventListener('loadeddata',readiness);v.addEventListener('canplay',readiness);v.addEventListener('seeked',readiness);v.addEventListener('loadedmetadata',readiness);v.addEventListener('error',()=>{failed=true;readiness();message.hidden=false;message.textContent='영상 대신 정지 화면으로 이어갑니다. ';const b=document.createElement('button');b.textContent='다시 불러오기';b.onclick=()=>{failed=false;videos.forEach(video=>video.load());readiness();};message.append(b);});}
function hide(){dialogueActive=false;root.hidden=true;document.body.classList.remove('higgsfield-active');videos.forEach(v=>v.pause());}
function show(v){portraits.forEach(img=>img.hidden=true);root.hidden=false;document.body.classList.add('higgsfield-active');if(v!==activeVideo){videos.forEach(video=>{video.hidden=video!==v;video.pause();});activeVideo=v;v.play().then(()=>{v.pause();readiness();seek(v,v._target??0);}).catch(()=>{});}readiness();}
// Serialize seeks: a burst of wheel events only keeps the latest desired frame.
function seek(v,time){v._target=time;if(v.seeking||v.readyState<1)return;const t=Math.min(Math.max(0,time),Math.max(0,v.duration-.06));if(Math.abs(v.currentTime-t)>.045)v.currentTime=t;}
for(const v of [intro,approach])v.addEventListener('seeked',()=>seek(v,v._target??0));
function render(frame){lastFrame=frame;if(document.body.classList.contains('archive-active')||!started)return;const {kind,index,progress}=frame;
 if(kind==='landscape-expand'){dialogueActive=false;show(intro);seek(intro,progress*Math.min(8,intro.duration||8));}
 else if(kind==='travel'&&index===0){dialogueActive=false;show(approach);seek(approach,progress*Math.min(10,approach.duration||10));}
 else if(kind==='dialogue'&&portraits[index]){dialogueActive=false;activeVideo=null;videos.forEach(v=>{v.pause();v.hidden=true;});portraits.forEach((img,i)=>img.hidden=i!==index);root.hidden=false;document.body.classList.add('higgsfield-active');message.hidden=true;document.body.dataset.higgsfieldReady='true';}
 else{dialogueActive=false;hide();}
}
document.addEventListener('experience-selected',()=>{started=true;show(intro);readiness();});
document.addEventListener('higgsfield-frame',e=>render(e.detail));
document.addEventListener('archive-open',()=>{hide();message.hidden=true;});
document.addEventListener('archive-story',()=>{if(lastFrame)render(lastFrame);});
document.addEventListener('story-home',()=>{if(document.body.dataset.stage!=='terrain')hide();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)videos.forEach(v=>v.pause());});
readiness();

// Readiness events can be delayed for hidden video elements. Never gate scroll on them.
setInterval(()=>{if(started&&!root.hidden){readiness();if(activeVideo?.readyState>=1)seek(activeVideo,activeVideo._target??0);}},250);
