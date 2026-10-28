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

// Interpolate the complete camera orientation. Rebuilding lookAt from a changing
// direction and a fixed up vector is singular over the back: one small orbit step
// can roll the whole scan by half a turn. The quaternion path has no such pole.
export function createFramingTransition(THREE, position, target, {quaternion,up=new THREE.Vector3(0,1,0)}={}) {
 const origin=target.clone(),radius=position.distanceTo(target),initialUp=up.clone();
 const orientation=quaternion?.clone()??new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position,target,initialUp));
 const destinationOrientation=new THREE.Quaternion(),rotationMatrix=new THREE.Matrix4();
 const cameraBack=new THREE.Vector3(0,0,1),cameraUp=new THREE.Vector3(0,1,0);
 const maxAngularSpeed=THREE.MathUtils.degToRad(95);
 let elapsed=0;
 return {
  sample(goal, seconds, reducedMotion=false) {
   const distance=goal.position.distanceTo(goal.target);
   destinationOrientation.setFromRotationMatrix(rotationMatrix.lookAt(goal.position,goal.target,goal.up??initialUp));
   const angle=orientation.angleTo(destinationOrientation);
   // Quintic easing peaks at 1.875 times the average speed. Large orientation
   // changes therefore get the time they need; neighbouring close-ups stay quick.
   const duration=Math.max(.9,1.875*angle/maxAngularSpeed);
   elapsed+=Math.max(0,Math.min(.1,seconds));
   const progress=reducedMotion?1:Math.min(1,elapsed/duration);
   const eased=progress*progress*progress*(progress*(progress*6-15)+10);
   const nextOrientation=orientation.clone().slerp(destinationOrientation,eased);
   const nextTarget=origin.clone().lerp(goal.target,eased);
   const nextPosition=cameraBack.clone().applyQuaternion(nextOrientation).multiplyScalar(radius+(distance-radius)*eased).add(nextTarget);
   if(progress===1)nextPosition.copy(goal.position);
   return {position:nextPosition,target:nextTarget,quaternion:nextOrientation,up:cameraUp.clone().applyQuaternion(nextOrientation),done:progress===1};
  }
 };
}
