const bound=(v,a,b)=>Math.max(a,Math.min(b,v));
const NECK=[.77,.77,.67,.69,.71];
export function createDialogueFaceSafe({stage,panel,tools,sound}){
 let dirty=true,lastKey='',lastProof=null,latest=null;
 const safeArea=document.createElement('span');safeArea.setAttribute('aria-hidden','true');safeArea.style.cssText='position:absolute;width:0;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none';stage.append(safeArea);
 const set=(node,key,value)=>node?.style.setProperty(key,value,'important');
 const visible=node=>node&&!node.hidden&&getComputedStyle(node).display!=='none'&&getComputedStyle(node).visibility!=='hidden';
 const ro=new ResizeObserver(()=>{dirty=true;});[stage,tools,sound].filter(Boolean).forEach(n=>ro.observe(n));
 document.fonts?.ready.then(()=>{dirty=true;});
 const invalidate=()=>{dirty=true;if(latest)update(...latest);};
 function update(scene,source){
  latest=[scene,source];if(!panel||!scene||scene.mode!=='dialogue'||panel.hidden)return;
  const sw=source?.videoWidth||source?.naturalWidth,sh=source?.videoHeight||source?.naturalHeight;if(!sw||!sh)return;
  const W=stage.clientWidth,H=stage.clientHeight,title=panel.querySelector('h2'),copy=panel.querySelector('p');if(!W||!H||!title||!copy)return;
  const key=[scene.id,W,H,sw,sh,copy.textContent].join('|');if(!dirty&&key===lastKey)return;dirty=false;lastKey=key;
  const box=stage.getBoundingClientRect(),gap=bound(H*.012,6,10),neck=Number(scene.neckSafeY)||NECK[scene.speaker]||.77;
  const scale=Math.max(W/sw,H/sh),neckY=H-sh*scale+neck*sh*scale,safeTop=Math.max(0,neckY+gap);
  const lower=[tools,sound].filter(visible).map(n=>n.getBoundingClientRect()).filter(r=>r.top-box.top>H*.55);
  const bottom=Math.min(H-Math.max(12,safeArea.getBoundingClientRect().height),...lower.map(r=>r.top-box.top-gap)),available=Math.max(0,bottom-safeTop),panelWidth=Math.min(W*.92,1440),left=(W-panelWidth)/2;
  set(panel,'box-sizing','border-box');set(panel,'left',left+'px');set(panel,'right','auto');set(panel,'width',panelWidth+'px');set(panel,'transform','none');set(panel,'bottom','auto');set(panel,'min-height','0');set(panel,'max-height','none');set(panel,'overflow','hidden');panel.style.removeProperty('display');set(panel,'grid-template-rows','auto minmax(0,1fr)');set(panel,'gap','.4em');set(panel,'padding','.95em 2.1em');
  set(title,'display',available<40?'none':'block');set(title,'margin','0');set(title,'line-height','1.3');set(title,'font-size','calc(var(--safe-font)*1.307692)');set(copy,'margin','0');set(copy,'font-size','var(--safe-font)');set(copy,'line-height','1.65');set(copy,'min-height','0');set(copy,'max-height','none');set(copy,'height','auto');set(copy,'overflow','hidden');set(copy,'overflow-wrap','anywhere');set(copy,'overscroll-behavior','contain');copy.removeAttribute('tabindex');
  const applyFont=f=>{panel.style.setProperty('--safe-font',f+'px');panel.style.setProperty('--reading-copy',f+'px');panel.style.setProperty('--reading-title',(f*1.307692)+'px');set(panel,'font-size',f+'px');};
  const natural=()=>Math.ceil(panel.getBoundingClientRect().height)+1;
  const preferred=bound(Math.min(7.614285714+.00928571429*W,.02708333333*H),11,21)*.85,minimum=Math.min(preferred,3);
  set(panel,'height','auto');applyFont(preferred);let font=preferred,naturalHeight=natural();
  if(naturalHeight>available){let lo=minimum,hi=preferred;for(let i=0;i<12;i++){const mid=(lo+hi)/2;applyFont(mid);if(natural()<=available)lo=mid;else hi=mid;}font=lo;applyFont(font);naturalHeight=natural();}
  const height=Math.min(available,naturalHeight);set(panel,'height',height+'px');set(panel,'max-height',available+'px');set(panel,'top',Math.max(safeTop,bottom-height)+'px');set(panel,'visibility','visible');
  panel.dataset.faceSafe='true';panel.dataset.scrollText='false';document.body.style.setProperty('--dialogue-nav-font',Math.min(23,font*1.12)+'px');
  lastProof={scene:scene.id,neckSourceY:neck,neckY,safeTop,bottom,available,panelTop:Math.max(safeTop,bottom-height),panelHeight:height,font,scrollText:false,textFits:copy.scrollHeight<=copy.clientHeight+1,limitedSpace:available<40};
 }
 return{update,invalidate,proof:()=>lastProof,destroy(){ro.disconnect();safeArea.remove();}};
}
