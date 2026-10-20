// Camera-time metric: translation, turning and arrivals share one deterministic clock.
export const METRES_PER_SECOND = 4.5;
export const ARRIVAL_METRES = 2;
export function cumulativeDistances(track) {
 const spatial=[0];
 for(let i=1;i<track.length;i++) spatial.push(spatial[i-1]+Math.hypot(...track[i].p.map((v,k)=>v-track[i-1].p[k])));
 return spatial;
}
export function distanceFrame(distances,progress) {
 const target=Math.max(0,Math.min(1,progress))*distances.at(-1);
 let lo=0,hi=distances.length-1;
 while(lo+1<hi){const mid=(lo+hi)>>1;if(distances[mid]<=target)lo=mid;else hi=mid;}
 return lo+(target-distances[lo])/Math.max(1e-9,distances[hi]-distances[lo]);
}
export function arrivalProgress(t){t=Math.max(0,Math.min(1,t));return 1-(1-t)**3;}
