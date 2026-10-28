// Keep UI-only JavaScript animation in step with ui-motion.css.
export const UI_MOTION_MS=1000;
export const UI_MOTION_SECONDS=UI_MOTION_MS/1000;
export const UI_MOTION_EASING='cubic-bezier(.22,.75,.25,1)';

// A CSS cubic-bezier's input is its x coordinate, not its curve parameter.
// Bisect x so canvas-driven controls follow the same easing as CSS panels.
export function uiMotionEase(progress){
 const x=Math.max(0,Math.min(1,progress));
 if(x===0||x===1)return x;
 const curve=(t,a,b)=>3*(1-t)*(1-t)*t*a+3*(1-t)*t*t*b+t*t*t;
 let low=0,high=1;
 for(let i=0;i<24;i++){
  const middle=(low+high)/2;
  if(curve(middle,.22,.25)<x)low=middle;
  else high=middle;
 }
 return curve((low+high)/2,.75,1);
}
