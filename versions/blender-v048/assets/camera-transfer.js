// Grid routing keeps the test camera outside building footprints.
export function planTransfer(start,end,boxes){
 const pad=.9,blocked=(x,z)=>boxes.some(b=>x>b.min.x-pad&&x<b.max.x+pad&&z>b.min.z-pad&&z<b.max.z+pad);
 const clear=(a,b)=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4);for(let i=0;i<=n;i++){const u=n?i/n:0;if(blocked(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u))return false;}return true;};
 const nearest=p=>{for(let r=0;r<8;r++)for(let x=-r;x<=r;x++)for(let z=-r;z<=r;z++){const q=[Math.round(p[0])+x,Math.round(p[1])+z];if(!blocked(...q)&&clear(p,q))return q;}throw Error('Camera endpoint has no clear exit');};
 const a=nearest(start),b=nearest(end),key=p=>p.join(','),goal=key(b),open=[a],cost=new Map([[key(a),0]]),parent=new Map(),closed=new Set();
 while(open.length){open.sort((p,q)=>(cost.get(key(q))+Math.hypot(q[0]-b[0],q[1]-b[1]))-(cost.get(key(p))+Math.hypot(p[0]-b[0],p[1]-b[1])));const p=open.pop(),pk=key(p);if(closed.has(pk))continue;if(pk===goal){const path=[end,b];let k=pk;while(parent.has(k)){k=parent.get(k);path.push(k.split(',').map(Number));}path.push(start);path.reverse();const reduced=[path[0]];for(let i=0;i<path.length-1;){let j=path.length-1;while(j>i+1&&!clear(path[i],path[j]))j--;reduced.push(path[j]);i=j;}return reduced;}
 closed.add(pk);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const q=[p[0]+dx,p[1]+dz],qk=key(q);if(Math.abs(q[0])>120||Math.abs(q[1])>120||closed.has(qk)||!clear(p,q))continue;const g=cost.get(pk)+Math.hypot(dx,dz);if(g<(cost.get(qk)??Infinity)){cost.set(qk,g);parent.set(qk,pk);open.push(q);}}}
 throw Error('No collision-free camera connection');
}
