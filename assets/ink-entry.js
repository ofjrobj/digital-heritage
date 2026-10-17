// Preserve the approved brush drawing; its source pixels only received a colour correction.
const art=document.querySelector('.cover-art');
const lionSource=new URL('./cover-lion-original-clear-20261018.png',import.meta.url).href;
const guide=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs></defs><image href="${lionSource}" width="1600" height="900" preserveAspectRatio="xMidYMid meet"/></svg>`;
const svg=guide.replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" aria-hidden="true" ');
art.style.backgroundImage='radial-gradient(ellipse at 50% 25%,#faf7ed88,transparent 70%)';
// Stationary artwork is revealed by an irregular absorption mask, never reshaped.
const reveal=svg.replace('</defs>', '<filter id="coverBleed"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="3" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="65"/><feGaussianBlur stdDeviation="5"/></filter><mask id="coverAbsorb"><rect width="1600" height="900" fill="black"/><g filter="url(#coverBleed)"><circle cx="800" cy="400" r="0" fill="white"/></g></mask></defs>').replace('<image ', '<image mask="url(#coverAbsorb)" ');
art.insertAdjacentHTML('beforeend',reveal);
const blot=art.querySelector('#coverAbsorb circle');let start=performance.now();
function absorb(now){if(document.body.classList.contains('orientation-intro')){start=now;requestAnimationFrame(absorb);return;}const t=Math.min(1,(now-start)/2200);blot.setAttribute('r',String(1100*t*t*(3-2*t)));if(t<1)requestAnimationFrame(absorb);}
requestAnimationFrame(absorb);
// Reveal masks change opacity only. Neither the lion nor the landscape is warped.
const layer=document.createElement('div');layer.id='inkEntryBridge';layer.hidden=true;
const spots=[[800,430,1],[620,370,.85],[970,490,.9],[420,520,.7],[1170,320,.75],[260,270,.65],[1360,620,.7],[800,760,.85]];
layer.innerHTML=`<svg viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="paperBleed" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="11" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="65"/><feGaussianBlur stdDeviation="10"/></filter><mask id="paperReveal"><rect width="1600" height="900" fill="white"/><g filter="url(#paperBleed)">${spots.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="0" fill="black"/>`).join('')}</g></mask></defs><rect width="1600" height="900" fill="#f6f5ef" mask="url(#paperReveal)"/></svg><div class="entry-lion-still" style="position:absolute;inset:0">${svg}</div>`;
document.body.append(layer);
const circles=[...layer.querySelectorAll('circle')],portrait=layer.querySelector('.entry-lion-still');
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
let entered=false;
document.addEventListener('experience-selected',()=>{entered=true;layer.hidden=false;});
document.addEventListener('blender-entry-frame',({detail:{progress:p}})=>{
 if(!entered)return;
 layer.hidden=p>=.48;layer.style.opacity=String(1-smooth((p-.40)/.08));
 // The same fixed artwork dissolves into paper as capillary blooms expose the next scene.
 portrait.style.opacity=String(1-smooth((p-.015)/.12));
 circles.forEach((circle,i)=>circle.setAttribute('r',String(1100*spots[i][2]*smooth((p-.06-i*.009)/.34))));
});
for(const name of ['archive-open','story-home','blender-route-frame','blender-transfer-frame','blender-ending-frame'])document.addEventListener(name,()=>{layer.hidden=true;});
