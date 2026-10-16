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
 const f=scene.deliveryFraming||LANDMARKS[scene.id]||scene.framing||{cx:.5,headY:.2,chestY:.75};
 const scale=Math.max(W/sw,H/sh),w=sw*scale,h=sh*scale;
 const x=clamp(W*.5-(f.cx||.5)*w,W-w,0);
 const y=clamp(H*.13-(f.headY||0)*h,H-h,0);
 const chest=Number(f.chestY)||Math.min(.98,(f.neckY||.6)+.17);
 return {x,y,w,h,headY:y+(f.headY||0)*h,chestY:y+chest*h,
  neckY:y+(scene.framing?.neckY||f.neckY||chest-.15)*h,framing:'viewport-cover-1'};
}
