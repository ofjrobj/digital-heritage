// Grid routing keeps the test camera outside building footprints.
export function planTransfer(start,end,boxes){
 const blocked=(x,z)=>{const distance=Math.min(Math.hypot(x-start[0],z-start[1]),Math.hypot(x-end[0],z-end[1]));const pad=.9+Math.min(1,distance/12)*.8;return boxes.some(b=>x>b.min.x-pad&&x<b.max.x+pad&&z>b.min.z-pad&&z<b.max.z+pad);};
 const clear=(a,b)=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4);for(let i=0;i<=n;i++){const u=n?i/n:0;if(blocked(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u))return false;}return true;};
 const nearest=p=>{for(let r=0;r<8;r++)for(let x=-r;x<=r;x++)for(let z=-r;z<=r;z++){const q=[Math.round(p[0])+x,Math.round(p[1])+z];if(!blocked(...q)&&clear(p,q))return q;}throw Error('Camera endpoint has no clear exit '+JSON.stringify(p)+' '+boxes.filter(b=>p[0]>b.min.x-pad&&p[0]<b.max.x+pad&&p[1]>b.min.z-pad&&p[1]<b.max.z+pad).map(b=>b.name).join(','));};
 const a=nearest(start),b=nearest(end),key=p=>p.join(','),goal=key(b),open=[a],cost=new Map([[key(a),0]]),parent=new Map(),closed=new Set();
 while(open.length){open.sort((p,q)=>(cost.get(key(q))+Math.hypot(q[0]-b[0],q[1]-b[1]))-(cost.get(key(p))+Math.hypot(p[0]-b[0],p[1]-b[1])));const p=open.pop(),pk=key(p);if(closed.has(pk))continue;if(pk===goal){const path=[end,b];let k=pk;while(parent.has(k)){k=parent.get(k);path.push(k.split(',').map(Number));}path.push(start);path.reverse();const reduced=[path[0]];for(let i=0;i<path.length-1;){let j=path.length-1;while(j>i+1&&!clear(path[i],path[j]))j--;reduced.push(path[j]);i=j;}return reduced;}
 closed.add(pk);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const q=[p[0]+dx,p[1]+dz],qk=key(q);if(Math.abs(q[0])>140||Math.abs(q[1])>140||closed.has(qk)||!clear(p,q))continue;const g=cost.get(pk)+Math.hypot(dx,dz);if(g<(cost.get(qk)??Infinity)){cost.set(qk,g);parent.set(qk,pk);open.push(q);}}}
 throw Error('No collision-free camera connection');
}

// Rounded corners stay within a verified clear corridor; no unconstrained spline overshoot.
export function roundedTransfer(T,points,boxes){
 const clear=(p)=>!boxes.some(b=>p.x>b.min.x-.75&&p.x<b.max.x+.75&&p.z>b.min.z-.75&&p.z<b.max.z+.75);
 const curve=new T.CurvePath();let previous=points[0];
 for(let i=1;i<points.length-1;i++){
  const p=points[i],before=points[i-1],after=points[i+1];let radius=Math.min(8,p.distanceTo(before)*.4,p.distanceTo(after)*.4),arc,a,b;
  for(let tries=0;tries<10;tries++){a=p.clone().lerp(before,radius/p.distanceTo(before));b=p.clone().lerp(after,radius/p.distanceTo(after));arc=new T.QuadraticBezierCurve3(a,p,b);if(arc.getPoints(40).every(clear))break;radius*=.5;}
  if(previous.distanceTo(a)>1e-5)curve.add(new T.LineCurve3(previous,a));curve.add(arc);previous=b;
 }
 curve.add(new T.LineCurve3(previous,points.at(-1)));return curve;
}
export function transferObstacles(root,T,excludeLions=true){
 root.updateMatrixWorld(true);const boxes=[];
 root.traverse(o=>{const name=o.name.replaceAll('_',' ');if((o.isMesh&&/wall|pillar|trunk|paper door/i.test(name))||(/placement/.test(name)&&!o.isMesh)){
 const b=new T.Box3().setFromObject(o);if(!b.isEmpty()){b.name=o.name;if(/wall|pillar|paper door/i.test(name)){b.min.x-=1;b.max.x+=1;b.min.z-=1;b.max.z+=1;}boxes.push(b);}}
 });
 if(excludeLions){const b=new T.Box3(new T.Vector3(-33,-100,-22),new T.Vector3(-14,100,-5));b.name='Lion forecourt exclusion';boxes.push(b);}
 return boxes;
}
export function tourCurve(T,start,end,gates,boxes){
 const safeGate=p=>{for(let r=0;r<15;r++)for(let x=-r;x<=r;x++)for(let z=-r;z<=r;z++){const q=[p[0]+x,p[1]+z];if(!boxes.some(b=>q[0]>b.min.x-1.5&&q[0]<b.max.x+1.5&&q[1]>b.min.z-1.5&&q[1]<b.max.z+1.5))return q;}throw Error('No clear tour gate');};
 let waypoints=[[start.x,start.z],...gates.map(safeGate),[end.x,end.z]],points=[];
 for(let i=1;i<waypoints.length;i++){const part=planTransfer(waypoints[i-1],waypoints[i],boxes);points.push(...(i===1?part:part.slice(1)));}
 return roundedTransfer(T,points.filter((p,i)=>!i||Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1])>1e-5).map(([x,z])=>new T.Vector3(x,0,z)),boxes);
}
