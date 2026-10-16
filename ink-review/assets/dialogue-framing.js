// Shared portrait and caption landmarks, measured on the native dialogue frames.
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const LANDMARKS={
 merchant:{headY:.40,chestY:.92,minX:.30,maxX:.67,cx:.487},
 farmer:{headY:.075,chestY:.74,minX:.28,maxX:.72,cx:.50},
 cook:{headY:.39,chestY:.79,minX:.33,maxX:.63,cx:.49},
 trio:{headY:.37,chestY:.80,minX:.01,maxX:.98,cx:.50},
 woodcutter:{headY:.34,chestY:.82,minX:.32,maxX:.67,cx:.50}
};
export function dialogueFrame(scene,W,H,sw,sh){
 const cover=Math.max(W/sw,H/sh),original=scene.framing;
 const f=LANDMARKS[scene.id]||original;
 if(!f){const w=sw*cover,h=sh*cover,y=H-h;return{x:(W-w)/2,y,w,h,neckY:y+(scene.neckSafeY||.77)*h,chestY:H*.64};}
 const chest=Number(f.chestY)||Math.min(.98,f.neckY+.17);
 const span=Math.max(.1,chest-f.headY);
 // A visible head-to-chest area takes priority over filling the viewport.
 // The remaining perimeter uses the same paper, without moving world objects.
 const desired=H*.50/(span*sh),groupLimit=W*.94/(Math.max(.01,f.maxX-f.minX)*sw);
 const scale=Math.min(desired,groupLimit),w=sw*scale,h=sh*scale;
 const x=clamp(W*.5-f.cx*w,Math.min(0,W-w),Math.max(0,W-w));
 const groupOffset=Math.max(0,H*.50-span*h)*.5;
 const y=H*.14+groupOffset-f.headY*h;
 return{x,y,w,h,headY:y+f.headY*h,chestY:y+chest*h,
  neckY:y+(original?.neckY||f.neckY||chest-.15)*h,framing:'head-and-chest-1'};
}
