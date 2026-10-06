import {storyStops} from './story-sequence.js?v=story-flow-52';
const emit=(name,detail)=>document.dispatchEvent(new CustomEvent(name,{detail}));
const shots=[];let duration=0;
function shot(kind,seconds,extra={}){shots.push({kind,start:duration,end:duration+seconds,...extra});duration+=seconds;}
shot('entry',4);shot('rotate',8);shot('female-click',2);shot('female-scan',28);shot('male-transition',2);shot('male-scan',28);shot('pair',3);
for(let i=0;i<storyStops.length;i++){const stop=storyStops[i];shot('lens',4,{stop});shot('motif',10,{stop});shot('travel',50,{stop});shot('dialogue',14,{stop});if(i<storyStops.length-1){shot('retreat',12,{stop});shot('pair',3);} }
shot('guesthouse',65);shot('settle',3);shot('seasons',30);shot('closing',6);shot('book',3);
const control=document.createElement('div');control.id='cinemaControls';control.innerHTML=`<button id="cinemaPlay">스토리 재생</button><input id="cinemaSeek" aria-label="스토리 시간" type="range" min="0" max="${duration}" step=".1" value="0" hidden><button id="cinemaStop" hidden>스토리 닫기</button>`;document.body.append(control);
const panel=document.createElement('aside');panel.id='cinemaDialogue';panel.hidden=true;document.body.append(panel);
const style=document.createElement('style');style.textContent=`#cinemaControls{position:fixed;right:24px;bottom:24px;z-index:60;display:flex;gap:8px}#cinemaControls button{background:#18231e;color:#e8e5dc;border:1px solid #829184;border-radius:20px;padding:9px 16px;font:14px 'KoPub World Batang',serif;cursor:pointer}.choosing-experience #cinemaControls{display:none}body.cinema-running #episode,body.cinema-running #stageCue,body.cinema-running .scroll-cue,body.cinema-running #spotList,body.cinema-running #lionObservationFilm{visibility:hidden!important}#cinemaDialogue{position:fixed;left:28px;bottom:48px;width:350px;height:278px;box-sizing:border-box;padding:24px;background:#eeece4;color:#6a826e;z-index:20;font-family:'KoPub World Batang',serif}#cinemaDialogue h2{font-size:21px;line-height:1.5;margin:8px 0 22px;word-break:keep-all}#cinemaDialogue p{font-size:15px;line-height:1.8;word-break:keep-all;margin:0}#cinemaDialogue small{font-size:12px}body.cinema-running #introVideoSlot{inset:0!important}`;document.head.append(style);
const titles=['장사꾼 · 제금루','농민 · 동헌 · 혜의당','찬모 · 객사','주민 삼총사 · 민가','나무꾼 · 뒷산'];
const lines=['그 근처에서 이상한 돌짐승 두 마리를 보았습니다. 얼굴의 크기며 눈꼬리가 서로 다르게 생겼더라고요.','자세히 살필수록 돌짐승의 얼굴 윤곽과 눈, 입이 하나하나 또렷해지더군요.','객사 가까이 돌짐승 둘이 있었습니다. 머리의 말려 올라간 털과 솟아오르고 파인 굴곡이 참 신통했지요.','입꼬리가 살짝 올라간 게 꼭 사람이 씩 웃는 것 같았습니다. 돌로 만든 건데도 표정이 생생했지요.','목 뒤부터 등에 새겨진 털 무늬가 나무 결이나 산등성이 굽이처럼 보였습니다.'];
const introductions=['이 문을 지나면 관아입니다. 나는 장에 물건을 내다 팔러 올 때면 이 앞을 지나곤 하지요.','나는 이곳에 논밭 일로 왔습니다. 내 땅이라고 생각했던 곳의 경계가 달라졌으니, 여기까지 와서 사정을 이야기해야 합니다.','객사에는 왕을 상징하는 궐패를 모시고, 먼 곳에서 온 관리들이 머무릅니다. 손님들 먹을거리를 마련하러 나는 이 앞을 오가지요.','우리에게 하루는 늘 비슷했습니다. 서로 투닥거리며 하루를 보내고 집으로 돌아가지요.','산에 올라 마을을 내려다보면 관아도 집도 길도 한눈에 들어옵니다. 떨어져 보이던 곳들이 하나로 이어지지요.'];

let running=false,active=false,elapsed=0,last=0,previous=null;
const seek=control.querySelector('#cinemaSeek'),play=control.querySelector('#cinemaPlay'),stop=control.querySelector('#cinemaStop');
seek.oninput=()=>{elapsed=Number(seek.value);previous=null;renderStory();};
play.onclick=()=>{if(!active||elapsed>=duration){active=true;elapsed=0;previous=null;document.body.classList.add('cinema-running');stop.hidden=false;seek.hidden=false;emit('story-restart');}running=!running;play.textContent=running?'일시 정지':'이어서 재생';renderStory();};
stop.onclick=()=>{active=running=false;previous=null;panel.hidden=true;stop.hidden=true;seek.hidden=true;play.textContent='스토리 재생';document.body.classList.remove('cinema-running','surface-morph');emit('cinema-release');emit('story-home');emit('stage-navigate','intro');};
window.addEventListener('wheel',e=>{if(active){e.preventDefault();e.stopImmediatePropagation();}},{capture:true,passive:false});
function renderStory(){
 const q=shots.find(s=>elapsed<s.end)||shots.at(-1),u=Math.min(1,(elapsed-q.start)/(q.end-q.start)),t=elapsed-q.start;const changed=previous!==q;previous=q;
 document.body.dataset.storyShot=q.kind;panel.hidden=true;emit('cinema-closing',{visible:false,book:false});
 if(['entry','rotate','female-click','female-scan','male-transition','male-scan','pair','lens'].includes(q.kind)){
  if(changed){emit('stage-navigate','intro');emit('ink-landscape-frame',{progress:1,index:0});}
  let kind=q.kind==='entry'?'entry':q.kind==='rotate'?'rotate':q.kind==='lens'?'lens':q.kind.endsWith('scan')?'scan':'pair';
  emit('cinema-lion-frame',{kind,time:kind==='scan'?(q.kind==='female-scan'?u*131.9:132+u*131.9):t,progress:u,...q.stop});
 }else if(['motif','travel','dialogue','retreat'].includes(q.kind)){
  if(changed){emit('stage-navigate','terrain');if(q.stop)emit('capture-story-motif',q.stop);}
  const index=q.stop.route;
  if(q.kind==='motif'){emit('ink-landscape-frame',{index,progress:u*.235});emit('blender-route-frame',{index,time:0,opacity:u<.8?0:(u-.8)/.2});}
  else{emit('ink-landscape-frame',{index,progress:1});const time=q.kind==='travel'?u*150:q.kind==='dialogue'?150+u*24:174+u*30;emit('blender-route-frame',{index,time,opacity:1});if(q.kind==='dialogue'){panel.hidden=false;panel.innerHTML='<small>가상 증언</small><h2>'+titles[index]+'</h2><p>'+(u<.5?introductions[index]:lines[index])+'</p>';}}
 }else{
  if(changed){emit('stage-navigate','memory');emit('ink-landscape-frame',{index:0,progress:1});}
  const source=q.kind==='guesthouse'?u*70:q.kind==='settle'?70:q.kind==='seasons'?70+u*74:144;
  emit('blender-ending-frame',source/144);
  emit('cinema-closing',{visible:q.kind==='closing'||q.kind==='book',book:q.kind==='book'});
 }
 if(elapsed>=duration){running=false;play.textContent='다시 재생';}
}
function tick(now){requestAnimationFrame(tick);const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(!running||document.hidden||document.querySelector('#intro').dataset.lionReady!=='true')return;elapsed=Math.min(duration,elapsed+dt);seek.value=elapsed;renderStory();}requestAnimationFrame(tick);
