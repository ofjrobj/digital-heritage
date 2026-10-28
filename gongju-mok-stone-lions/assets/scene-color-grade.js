const clamp=value=>Math.max(0,Math.min(1,value));
const ease=value=>value*value*(3-2*value);

// Source time keeps the tonal change attached to the camera turn, including
// pause/backward navigation. Dialogue has its own fixed grade throughout.
export function sceneColorGrade(record){
 const scene=record?.scene,spec=scene?.departureGrade;
 if(!spec)return scene?.colorGrade;
 const time=Math.max(0,(record.video?.currentTime||0)-(record.clipIn||0));
 const start=Math.max(0,Number(spec.start)||0),until=Math.max(start+.001,Number(spec.until)||0);
 if(time>=until)return scene?.colorGrade;
 const progress=ease(clamp((time-start)/(until-start))),target=scene?.colorGrade||{},grade={};
 for(const field of ['gain','shadowGain','shadowLift']){
  if(!spec[field]&&!target[field])continue;
  const neutral=field==='shadowLift'?0:1;
  grade[field]=[0,1,2].map(channel=>{
   const a=spec[field]?.[channel]??neutral,b=target[field]?.[channel]??neutral;
   return a+(b-a)*progress;
  });
 }
 const a=spec.saturation??1,b=target.saturation??1;
 grade.saturation=a+(b-a)*progress;
 return grade;
}
