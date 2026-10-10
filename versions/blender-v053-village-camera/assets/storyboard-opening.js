// Approved still frames; keep the existing 3D journey after the establishing view.
const layer=document.createElement('section');
layer.id='storyboardOpening';layer.hidden=true;layer.setAttribute('aria-label','공주목 마을 전경');
layer.innerHTML='<img src="./assets/opening-village.png" alt="산과 하천 사이에 자리한 공주목 마을의 수묵화 전경"><p class="opening-copy" hidden></p>';
document.body.append(layer);
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
function hide(){layer.hidden=true;document.body.classList.remove('storyboard-establishing');}
document.addEventListener('higgsfield-frame',({detail:q})=>{
 if(q.kind!=='landscape-expand'){hide();return;}
 layer.hidden=q.time>=9.2;
 document.body.classList.toggle('storyboard-establishing',q.time<8.8);
 layer.style.opacity=String(1-smooth((q.time-8)/1.2));
 // Hold the establishing composition before moving into the existing village camera.
 layer.querySelector('img').style.opacity=String(smooth(q.time/1.4));
});
document.addEventListener('archive-open',hide);
document.addEventListener('story-home',hide);
