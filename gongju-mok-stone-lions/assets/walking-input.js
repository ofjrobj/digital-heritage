// Roll a conventional Windows mouse wheel away/up to move forward (negative DOM delta).
// Every accepted packet contributes distance.
export function createWalkingInput({pixelsPerStep = 100, oneStepPerGesture = false, gestureIdleMs = 220, pixelRatio = globalThis.devicePixelRatio || 1} = {}) {
  const pixelStep = Number.isFinite(pixelsPerStep) && pixelsPerStep > 0 ? pixelsPerStep : 100;
  const idle = Number.isFinite(gestureIdleMs) && gestureIdleMs > 0 ? gestureIdleMs : 220;
  const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  // Chromium can report a physical mouse notch in CSS pixels (50 on a 2x
  // screen). Recognize both conventions so Retina/zoom does not turn every
  // notch into a 120ms trackpad burst and repeatedly stop the video decoder.
  const isNotch = (x, magnitude) => x === 0 && [100,120].some(step =>
    Math.abs(magnitude-step)<.01 || Math.abs(magnitude*ratio-step)<.01);
  let lastPacketAt = -Infinity, lastDirection = 0, lastStepAt = -Infinity, lastMagnitude = 0, lastActiveAt = -Infinity, lastDetentAt = -Infinity, momentumTail = false, fallingPackets = 0, decayStart = 0, releaseDelay = 120;

  function wheelGestureSteps(event, now) {
    const y = Number(event.deltaY), x = Number(event.deltaX) || 0;
    if (event.ctrlKey || !Number.isFinite(now) || !Number.isFinite(y) ||
        y === 0 || Math.abs(x) > Math.abs(y)) return 0;
    const mode = Number(event.deltaMode) || 0;
    if (mode !== 0 && mode !== 1 && mode !== 2) return 0;
    if (oneStepPerGesture) {
      const direction = -Math.sign(y), magnitude = Math.abs(y);
      const newGesture = now - lastPacketAt >= idle || direction !== lastDirection;
      // Discrete wheel notches must not be swallowed by the trackpad burst lock.
      const detent = mode !== 0 || isNotch(x,magnitude);
      // A small fluctuation is still direct input. Only a sustained decay
      // of at least 25% identifies momentum; its rounded tail stays blocked until input rises.
      if (newGesture || detent || magnitude > lastMagnitude) {
        momentumTail = false; fallingPackets = 0; decayStart = magnitude;
      } else if (magnitude < lastMagnitude) {
        if (!fallingPackets) decayStart = lastMagnitude;
        if (++fallingPackets >= 3 && magnitude <= decayStart * .75) momentumTail = true;
      } else if (!momentumTail) fallingPackets = 0;
      const held = !momentumTail;
      const continuing = held && now - lastStepAt >= 420;
      // A repeated mouse notch often arrives just after the fixed release
      // deadline. Preserve that measured cadence instead of pausing/restarting
      // the native decoder on every notch. One isolated notch still uses 240ms;
      // trackpads retain their short release and momentum-tail rejection.
      const detentInterval = now - lastDetentAt;
      releaseDelay = detent
        ? detentInterval > 0 && detentInterval <= 450
          ? Math.min(420, Math.max(240, detentInterval + 60)) : 240
        : 120;
      lastDetentAt = detent ? now : -Infinity;
      // Renew the input clock even when a packet shares the current step.
      // Decaying trackpad momentum must not keep a released frame moving.
      if(newGesture||detent||held)lastActiveAt=now;
      lastPacketAt = now;lastDirection = direction;lastMagnitude = magnitude;
      if (newGesture || detent || continuing) {
        lastStepAt = now;return direction;
      }
      return 0;
    }
    lastActiveAt=now;
    if (mode === 1) return -y / 3; // Common mouse setting: three lines per detent.
    if (mode === 2) return -y * 6; // A page is one complete six-step walking scene.
    if (mode !== 0) return 0;
    // Browsers use either convention for one discrete Windows mouse detent.
    // Pixel packets otherwise stay continuous, without a gesture threshold or lockout.
    if (isNotch(x,Math.abs(y))) return -Math.sign(y);
    return -y / pixelStep;
  }

  // Preserve the burst lock across scene changes: trackpad inertia must not
  // spend another step in the next scene. A quiet interval rearms naturally.
  return {wheelGestureSteps, lastActiveAt:()=>lastActiveAt, releaseDelayMs:()=>releaseDelay, reset() {lastActiveAt=-Infinity;lastDetentAt=-Infinity;}};
}

// Apply once to the target, in source seconds; do not also scale by walk speed.
export function walkingTargetDelta(duration, steps) {
  return Number.isFinite(duration) && duration > 0 && Number.isFinite(steps)
    ? duration * steps / 6 : 0;
}

// The same fraction of each reference range advances at the same gentle pace.
// Keep an untrimmed reference after an editorial cut so shorter footage stays shorter.
// The brief response smooths acceleration/deceleration without a long catch-up tail.
// Reverse movement remains caller-owned.
export function walkingPlaybackRate(error, dt, currentRate = 0, referenceDuration = 30, maxPlaybackRate = null) {
  if (!Number.isFinite(error) || error <= .008 || !Number.isFinite(dt) || dt <= 0) return 0;
  const reference = Number.isFinite(referenceDuration) && referenceDuration > 0 ? referenceDuration : 30;
  const seconds = Math.min(dt, .25), minimum = 1 / 16;
  // Browser media elements need a safe positive rate, including very short inputs.
  const configuredCap = Number(maxPlaybackRate);
  const maximum = Math.max(minimum, Math.min(1.6 * reference / 30,
    Number.isFinite(configuredCap) && configuredCap > 0 ? configuredCap : Infinity));
  const desired = Math.min(maximum, Math.max(minimum, error / .28));
  const previous = Number.isFinite(currentRate) ? Math.max(0, Math.min(maximum, currentRate)) : 0;
  const response = desired < previous ? .10 : .12;
  const smoothed = previous + (desired - previous) * (1 - Math.exp(-seconds / response));
  const ceiling = Math.min(maximum, error / dt);
  // Zero means pause; avoid unsupported extremely small positive playback rates.
  return ceiling < minimum ? 0 : Math.min(ceiling, Math.max(minimum, smoothed));
}
