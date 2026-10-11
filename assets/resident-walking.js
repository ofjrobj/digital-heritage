// Distances are metres; gait is driven by travelled distance, not a free-running sine.
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function sampleResident(d,distance){
 const u=clamp(distance/d.length)*(d.samples.length-1),i=Math.min(d.samples.length-2,Math.floor(u)),f=u-i,a=d.samples[i],b=d.samples[i+1];
 const mix=(a,b)=>a.map((x,k)=>x+(b[k]-x)*f);
 return {p:mix(a.p,b.p),yaw:a.yaw+(b.yaw-a.yaw)*f,sides:a.sides.map((v,k)=>({p:mix(v.p,b.sides[k].p),safe:v.safe&&b.sides[k].safe}))};
}
export function footPose(distance,height,side,moving=1){
 // A stance foot travels backwards at body speed; only the swing foot lifts.
 const cycle=.88*height,phase=((distance/cycle+(side? .5:0))%1+1)%1;
 let y,z;
 if(phase<.62){y=-cycle*.31+cycle*phase;z=0;}
 else{const u=(phase-.62)/.38;y=cycle*.31-cycle*.62*smooth(u);z=.11*Math.sin(Math.PI*u);}
 y*=moving;z*=moving;
 // Analytic two-link IK, knee bends forward. The ankle keeps the sole horizontal.
 const dz=-.645+z,dy=y,upper=.355,lower=.35,r=Math.min(.7048,Math.hypot(dy,dz));
 const alpha=Math.acos(clamp((upper*upper+r*r-lower*lower)/(2*upper*r),-1,1));
 const hip=Math.atan2(dy,-dz)-alpha;
 const knee=Math.PI-Math.acos(clamp((upper*upper+lower*lower-r*r)/(2*upper*lower),-1,1));
 return [hip,knee,-hip-knee];
}
export function advanceDistance(distance,speed,remaining,dt){
 const target=speed*Math.min(1,remaining/1.2);return Math.min(remaining,Math.max(0,target)*dt);
}
