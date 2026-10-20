// A narrow viewport must retain both lions and all four visitors in the source.
// Returning null preserves the existing wide-screen camera and drawing path.
export function seasonsFrame(width,height,sourceWidth,sourceHeight,insets={}){
 if(width/height>=1.55)return null;
 const top=Math.max(0,Number(insets.top)||0),bottom=Math.max(0,Number(insets.bottom)||0);
 const availableHeight=Math.max(1,height-top-bottom);
 const scale=Math.min(width/sourceWidth,availableHeight/sourceHeight);
 const w=sourceWidth*scale,h=sourceHeight*scale;
 return {x:(width-w)/2,y:top+(availableHeight-h)/2,w,h};
}
