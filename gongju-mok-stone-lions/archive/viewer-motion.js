// Keep the drawing buffer intact while a CSS grid transition changes the
// viewport. The projection follows its CSS aspect; sharp dimensions are
// committed once at the end, together with a redraw.
export function createViewportBuffer({settleMs = 120} = {}) {
  let pending = null, committed = null;
  return {
    request(width, height, now) {
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
      width = Math.max(1, Math.round(width)); height = Math.max(1, Math.round(height));
      if (!pending || pending.width !== width || pending.height !== height) pending = {width, height, since: now};
    },
    consume(now) {
      if (!pending || committed && committed.width === pending.width && committed.height === pending.height) return null;
      if (committed && now - pending.since < settleMs) return null;
      committed = {width: pending.width, height: pending.height};
      return committed;
    }
  };
}

export function framingBlend(elapsedSeconds, reducedMotion = false) {
  return reducedMotion ? 1 : 1 - Math.exp(-Math.max(0, Math.min(.1, elapsedSeconds)) / .22);
}

// Keep the same pixels per world unit when only the guide or a panel changes
// the canvas height. An actual window-height change still scales the view.
export function createViewportZoom(baseZoom=1){
 let ratio=null;
 return {
  at(height,viewportHeight){
   if(!(height>0&&viewportHeight>0))return baseZoom;
   ratio??=height/viewportHeight;
   return baseZoom*ratio*viewportHeight/height;
  }
 };
}

// YZX derives yaw and roll from screen-right, so looking straight down does not
// exchange yaw with roll. All three angles share one continuous progress value:
// no intermediate viewpoints, stops, fade, or separate turn-and-tilt phases.
export function createFramingTransition(THREE, position, target, {quaternion,up=new THREE.Vector3(0,1,0)}={}) {
 const origin=target.clone(),radius=position.distanceTo(target),initialUp=up.clone();
 const orientation=quaternion?.clone()??new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position,target,initialUp));
 const destinationOrientation=new THREE.Quaternion(),rotationMatrix=new THREE.Matrix4();
 const cameraBack=new THREE.Vector3(0,0,1),cameraUp=new THREE.Vector3(0,1,0);
 const initialAngles=new THREE.Euler().setFromQuaternion(orientation,'YZX');
 const unwrap=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
 const maxAngularSpeed=THREE.MathUtils.degToRad(95);
 const maxRelativeZoomSpeed=1.4;
 let elapsed=0;
 return {
  sample(goal, seconds, reducedMotion=false) {
   const distance=goal.position.distanceTo(goal.target);
   destinationOrientation.setFromRotationMatrix(rotationMatrix.lookAt(goal.position,goal.target,goal.up??initialUp));
   const destinationAngles=new THREE.Euler().setFromQuaternion(destinationOrientation,'YZX');
   const delta=['x','y','z'].map(axis=>unwrap(initialAngles[axis],destinationAngles[axis]));
   const angle=Math.hypot(...delta);
   // Quintic easing peaks at 1.875 times the average speed. Large orientation
   // changes therefore get the time they need; neighbouring close-ups stay quick.
   const zoomTravel=Math.abs(Math.log(Math.max(.001,distance)/Math.max(.001,radius)));
   const duration=Math.max(.9,1.875*angle/maxAngularSpeed,1.875*zoomTravel/maxRelativeZoomSpeed);
   elapsed+=Math.max(0,Math.min(.1,seconds));
   const progress=reducedMotion?1:Math.min(1,elapsed/duration);
   const eased=progress*progress*progress*(progress*(progress*6-15)+10);
   const nextOrientation=progress===1?destinationOrientation.clone():new THREE.Quaternion().setFromEuler(new THREE.Euler(initialAngles.x+delta[0]*eased,initialAngles.y+delta[1]*eased,initialAngles.z+delta[2]*eased,'YZX'));
   const nextTarget=origin.clone().lerp(goal.target,eased);
   const nextRadius=radius+(distance-radius)*eased;
   const nextPosition=cameraBack.clone().applyQuaternion(nextOrientation).multiplyScalar(nextRadius).add(nextTarget);
   if(progress===1)nextPosition.copy(goal.position);
   return {position:nextPosition,target:nextTarget,quaternion:nextOrientation,up:cameraUp.clone().applyQuaternion(nextOrientation),done:progress===1};
  }
 };
}
