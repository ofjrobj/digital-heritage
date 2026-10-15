// Source-space landmarks are shared by the picture and its caption safe area.
export function dialogueFrame(scene, W, H, sw, sh) {
 const f=scene.framing;
 if(!f){const scale=Math.max(W/sw,H/sh);return{x:(W-sw*scale)/2,y:H-sh*scale,w:sw*scale,h:sh*scale,neckY:H-sh*scale+(scene.neckSafeY||.77)*sh*scale};}
 const headSpan=Math.max(.1,f.neckY-f.headY), desired=H*.44/(headSpan*sh);
 const headLimit=H*.47/(headSpan*sh), groupLimit=W*.88/((f.maxX-f.minX)*sw);
 const scale=Math.min(Math.max(Math.max(W/sw,H/sh),desired),headLimit,groupLimit);
 const w=sw*scale,h=sh*scale,neckY=H*.58;
 return{x:W*.5-f.cx*w,y:neckY-f.neckY*h,w,h,neckY};
}
