import './ink-entry.js?v=original-brush-20261018';
const copy=document.createElement('p');copy.id='villageOpeningCopy';copy.hidden=true;document.body.append(copy);
const welcome='공주목 관아와 주변 읍치에 오신 것을 환영합니다.\n길을 따라 마을 사람들의 이야기를 만나보세요.';
const intro='어느 옛날, 공주목 관아와 주변 읍치에는\n신묘한 두 사자에 대한 이야기가 떠돌고 있습니다.';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
document.addEventListener('higgsfield-frame',({detail:q})=>{
 document.body.classList.toggle('reference-dialogue',q.kind==='dialogue');
 if(q.kind==='landscape-expand'&&q.time>=3&&q.time<8){copy.textContent=intro;copy.hidden=false;copy.style.opacity=String(Math.min(smooth((q.time-3)/.8),smooth((8-q.time)/.8)));}
 else if(q.kind!=='travel')copy.hidden=true;
});
document.addEventListener('village-camera-position',({detail:p})=>{
 if(p.route!==0||p.dialogue){copy.hidden=true;return;}
 const opacity=smooth((p.x+74)/3)*(1-smooth((p.x+63)/5));
 copy.textContent=welcome;copy.hidden=opacity<=.001;copy.style.opacity=String(opacity);
});
for(const name of ['archive-open','story-home'])document.addEventListener(name,()=>{copy.hidden=true;document.body.classList.remove('reference-dialogue');});
