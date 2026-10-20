// Standard Windows wheel down and an upward drag both advance along the route.
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
// A normal three-line mouse detent matches the common 120px wheel event.
export function wheelPixels(e,height=800){return (e.deltaY||0)*(e.deltaMode===1?40:e.deltaMode===2?height:1);}
export const WALK_SPEED = 6.75; // 1.5 × the previous 4.5 m/s.
export function inputDistance(pixels,kind='wheel'){return pixels*(kind==='drag'?.01:.015);}
// Distance alone drives translation: turns cannot change movement speed.
export function motionCosts(frames,speed=WALK_SPEED){
 const costs=[0];for(let i=1;i<frames.length;i++)costs.push(costs[i-1]+Math.hypot(...frames[i].p.map((v,k)=>v-frames[i-1].p[k]))/speed);return costs;
}
export function limitedProgress(costs,from,to,dt){
 const n=costs.length-1,at=p=>{const f=clamp(p)*n,i=Math.min(n-1,Math.floor(f));return costs[i]+(costs[i+1]-costs[i])*(f-i);};
 const a=at(from),b=at(to),c=a+Math.sign(b-a)*Math.min(Math.abs(b-a),dt);let lo=0,hi=n;
 while(lo+1<hi){const m=(lo+hi)>>1;if(costs[m]<=c)lo=m;else hi=m;}
 return (lo+(c-costs[lo])/Math.max(1e-9,costs[hi]-costs[lo]))/n;
}
export function distanceProgress(costs,from,metres){return limitedProgress(costs,from,metres>=0?1:0,Math.abs(metres)/WALK_SPEED);}
// Projected eye-level landmarks: keep all heads and shoulders in the free area.
export function chestProjection(points,width,height,panelTop,navBottom=70){
 const heads=points.filter(p=>p.kind==='head'),chests=points.filter(p=>p.kind==='chest');
 const minY=Math.min(...chests.map(p=>p.y)),maxY=Math.max(...heads.map(p=>p.y));
 const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
 const top=Math.min(panelTop-60,navBottom+Math.max(12,height*.025));
 const scale=Math.min(2*(panelTop-top)/height/Math.max(.001,maxY-minY),1.72*(width/height)/Math.max(.001,maxX-minX));
 return {fov:2*Math.atan(1/scale)*180/Math.PI,offset:scale*minY-(1-2*panelTop/height),scale,top};
}
