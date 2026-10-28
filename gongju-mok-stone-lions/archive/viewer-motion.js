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

// Move around the object, not through it. Each retarget starts at the displayed
// viewpoint; the shortest rotation and a zero-slope ease avoid a fast initial whip.
export function createFramingTransition(THREE, position, target) {
 const origin=target.clone(),offset=position.clone().sub(target),radius=offset.length();
 const direction=offset.normalize(),rotation=new THREE.Quaternion(),turn=new THREE.Quaternion();
 let elapsed=0;
 return {
  sample(goal, seconds, reducedMotion=false) {
   const destination=goal.position.clone().sub(goal.target),distance=destination.length();
   destination.normalize();
   const angle=Math.acos(THREE.MathUtils.clamp(direction.dot(destination),-1,1));
   const duration=.9+.35*angle/Math.PI;
   elapsed+=Math.max(0,Math.min(.1,seconds));
   const progress=reducedMotion?1:Math.min(1,elapsed/duration);
   const eased=progress*progress*progress*(progress*(progress*6-15)+10);
   rotation.setFromUnitVectors(direction,destination);
   turn.identity().slerp(rotation,eased);
   const nextTarget=origin.clone().lerp(goal.target,eased);
   const nextPosition=direction.clone().applyQuaternion(turn).multiplyScalar(radius+(distance-radius)*eased).add(nextTarget);
   return {position:nextPosition,target:nextTarget,done:progress===1};
  }
 };
}
