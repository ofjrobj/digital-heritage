// Roll a conventional Windows mouse wheel away/up to move forward (negative DOM delta).
// Every accepted packet contributes distance.
export function createWalkingInput({pixelsPerStep = 100, oneStepPerGesture = false, gestureIdleMs = 220} = {}) {
  const pixelStep = Number.isFinite(pixelsPerStep) && pixelsPerStep > 0 ? pixelsPerStep : 100;
  const idle = Number.isFinite(gestureIdleMs) && gestureIdleMs > 0 ? gestureIdleMs : 220;
  let lastPacketAt = -Infinity, lastDirection = 0;

  function wheelGestureSteps(event, now) {
    const y = Number(event.deltaY), x = Number(event.deltaX) || 0;
    if (event.ctrlKey || !Number.isFinite(now) || !Number.isFinite(y) ||
        y === 0 || Math.abs(x) > Math.abs(y)) return 0;
    const mode = Number(event.deltaMode) || 0;
    if (mode !== 0 && mode !== 1 && mode !== 2) return 0;
    if (oneStepPerGesture) {
      const direction = -Math.sign(y);
      const newGesture = now - lastPacketAt >= idle || direction !== lastDirection;
      lastPacketAt = now;
      lastDirection = direction;
      return newGesture ? direction : 0;
    }
    if (mode === 1) return -y / 3; // Common mouse setting: three lines per detent.
    if (mode === 2) return -y * 6; // A page is one complete six-step walking scene.
    if (mode !== 0) return 0;
    // Browsers use either convention for one discrete Windows mouse detent.
    // Pixel packets otherwise stay continuous, without a gesture threshold or lockout.
    if (x === 0 && (Math.abs(y) === 100 || Math.abs(y) === 120)) return -Math.sign(y);
    return -y / pixelStep;
  }

  // Preserve the burst lock across scene changes: trackpad inertia must not
  // spend another step in the next scene. A quiet interval rearms naturally.
  return {wheelGestureSteps, reset() {}};
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
