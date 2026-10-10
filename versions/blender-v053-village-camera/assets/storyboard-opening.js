// Storyboard describes camera direction, never a raster slide.
import './ink-entry.js';
const copy=document.createElement('p');copy.id='villageOpeningCopy';copy.hidden=true;copy.textContent='어느 옛날, 공주목 마을에는\n신묘한 두 사자에 대한 이야기가 떠돌고 있습니다.';document.body.append(copy);
const hideCopy=()=>{copy.hidden=true;};
document.addEventListener('higgsfield-frame',({detail:q})=>{
 const visible=q.kind==='landscape-expand'&&q.time>=1&&q.time<6;
 copy.hidden=!visible;
 copy.style.opacity=String(Math.min(1,Math.max(0,(q.time-1)/.8),Math.max(0,(6-q.time)/.8)));
 document.body.classList.toggle('reference-dialogue',q.kind==='dialogue');
});
document.addEventListener('archive-open',()=>{hideCopy();document.body.classList.remove('reference-dialogue');});
document.addEventListener('story-home',hideCopy);
