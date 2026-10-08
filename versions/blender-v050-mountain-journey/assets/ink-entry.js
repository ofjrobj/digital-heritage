// Shared vector guide: swap this layer for a text-free Higgsfield sequence later.
const art=document.querySelector('.cover-art');
const lion=[
[530,218,670,207,751,304,766,404],[1065,217,927,213,852,301,834,404],
[556,239,615,305,670,310,710,302],[1041,239,983,305,930,310,890,302],
[80,469,290,320,481,388,679,495],[123,504,342,365,510,435,639,508],
[1520,469,1310,320,1119,388,921,495],[1477,504,1258,365,1090,435,961,508]];
// The mane and the mountain share the SAME curves: only a uniform scale and translation.
// Facial features dissolve; no unrelated mountain contour is substituted.
const ridge=lion.map((curve,i)=>i<4?curve:curve.map((value,j)=>j%2===0?800+(value-800)*1.18:450+(value-450)*1.18-130));
const path=a=>`M${a[0]} ${a[1]} C${a.slice(2).join(' ')}`;
const svg=`<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#666b5d" stroke-width="7" stroke-linecap="round" opacity=".48">${lion.map(a=>`<path d="${path(a)}"/>`).join('')}<path class="nose" d="M766 404 Q800 430 834 404 M800 445 V493 M765 467 H835"/></g></svg>`;
art.style.backgroundImage='radial-gradient(ellipse at 50% 25%,#faf7ed88,transparent 70%)';art.insertAdjacentHTML('beforeend',svg);
const layer=document.createElement('div');layer.id='inkEntryBridge';layer.hidden=true;layer.innerHTML='<div class="ink-paper"></div>'+svg;document.body.append(layer);
const paths=[...layer.querySelectorAll('path:not(.nose)')];
const clamp=x=>Math.max(0,Math.min(1,x));const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
let entered=false;
document.addEventListener('experience-selected',()=>{entered=true;layer.hidden=false;});
document.addEventListener('blender-entry-frame',e=>{
 if(!entered)return;
 const p=e.detail.progress,t=smooth((p-.035)/.18),fade=smooth((p-.19)/.13);
 layer.hidden=p>=.32;layer.style.opacity=String(1-fade);
 layer.querySelector('.ink-paper').style.opacity=String(1-smooth((p-.14)/.16));
 layer.querySelector('.nose').style.opacity=String(1-smooth(t*2));
 paths.forEach((el,i)=>{el.setAttribute('d',path(lion[i].map((v,j)=>v+(ridge[i][j]-v)*t)));el.style.opacity=i<4?String(1-smooth(t*1.7)):'1';});
 layer.querySelector('svg').style.transform=`scale(${1+t*.08})`;
});
document.addEventListener('archive-open',()=>layer.hidden=true);
document.addEventListener('story-home',()=>layer.hidden=true);

document.addEventListener('blender-route-frame',e=>{if(e.detail.dialogue||e.detail.index>0)layer.hidden=true;});
document.addEventListener('blender-transfer-frame',()=>layer.hidden=true);
