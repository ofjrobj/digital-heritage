// Picture positioning and caption safety use the same source landmarks.
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function dialogueFrame(scene,W,H,sw,sh){
 const cover=Math.max(W/sw,H/sh),f=scene.framing;
 if(!f){const w=sw*cover,h=sh*cover;return{x:(W-w)/2,y:H-h,w,h,neckY:H-h+(scene.neckSafeY||.77)*h};}
 const headSpan=Math.max(.1,f.neckY-f.headY),desired=H*.44/(headSpan*sh);
 const groupLimit=W*.88/(Math.max(.01,f.maxX-f.minX)*sw);
 // Preserve every face when a group needs more horizontal room.
 const scale=groupLimit<cover?groupLimit:Math.max(cover,Math.min(desired,groupLimit));
 const w=sw*scale,h=sh*scale;
 const x=clamp(W*.5-f.cx*w,Math.min(0,W-w),Math.max(0,W-w));
 const headMargin=Math.min(H*.1,f.headY*h);
 const y=clamp(Math.max(H*.58-f.neckY*h,headMargin-f.headY*h),Math.min(0,H-h),Math.max(0,H-h));
 return{x,y,w,h,neckY:y+f.neckY*h};
}
