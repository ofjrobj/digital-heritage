const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function daylightState(t){
 const enter=smooth(42,45,t),dawn=smooth(52,59,t),day=smooth(59,66,t);
 return {enter,dawn,day,night:enter*(1-dawn),moon:enter*(1-smooth(52,57,t)),sun:smooth(54,59,t)};
}
export function prepareEndingDaylight(scene,camera,sun,sky,THREE){
 const disc=(color,r)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),new THREE.MeshBasicMaterial({color,fog:false,transparent:true,depthWrite:false}));m.visible=false;scene.add(m);return m;};
 const moon=disc('#e3eaff',1.05),sunDisc=disc('#ffe7ac',1.4);
 const forward=new THREE.Vector3(),right=new THREE.Vector3(),anchor=new THREE.Vector3();
 return {reset(){moon.visible=sunDisc.visible=false;sky.intensity=1.1;sky.color.set('#f5f1df');scene.fog.color.set('#b6bcb5');},update(t){
  const s=daylightState(t);moon.visible=t>=42&&s.moon>.001;sunDisc.visible=t>=54;
  if(t<42){sky.intensity=1.1;return;}
  camera.getWorldDirection(forward);forward.y=0;forward.normalize();right.crossVectors(forward,new THREE.Vector3(0,1,0));anchor.copy(camera.position).addScaledVector(forward,95);
  moon.position.copy(anchor).addScaledVector(right,18);moon.position.y=camera.position.y+19-s.dawn*8;moon.material.opacity=s.moon;
  sunDisc.position.copy(anchor).addScaledVector(right,-22);sunDisc.position.y=camera.position.y+4+smooth(54,66,t)*19;sunDisc.material.opacity=s.sun*(1-smooth(65,70,t)*.55);
  const night=new THREE.Color('#101c35'),morning=new THREE.Color('#d7aa8b'),day=new THREE.Color('#bdcfd6');
  const color=night.lerp(morning,s.dawn).lerp(day,s.day);scene.background.lerp(color,s.enter);scene.fog.color.copy(scene.background);
  sky.intensity=1.1*(1-s.enter)+s.enter*(.65+s.dawn*.15+s.day*.3);
  sky.color.set('#829bcd').lerp(new THREE.Color('#fff2d8'),s.dawn).lerp(new THREE.Color('#f5f1df'),s.day);
  sun.intensity=s.enter*(.6+s.dawn*.45+s.day*.85)+(1-s.enter)*1.4;
  sun.color.set('#9bb8ed').lerp(new THREE.Color('#ffc38a'),s.dawn).lerp(new THREE.Color('#fff1dc'),s.day);
  sun.position.copy(sunDisc.position);sun.position.y=8+s.day*55;
 }};
}
