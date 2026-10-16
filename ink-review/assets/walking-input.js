// Positive wheel delta moves forward. Every accepted packet contributes distance.
export function createWalkingInput({pixelsPerStep = 100} = {}) {
  const pixelStep = Number.isFinite(pixelsPerStep) && pixelsPerStep > 0 ? pixelsPerStep : 100;

  function wheelGestureSteps(event, now) {
    const y = Number(event.deltaY), x = Number(event.deltaX) || 0;
    if (event.ctrlKey || !Number.isFinite(now) || !Number.isFinite(y) ||
        y === 0 || Math.abs(x) > Math.abs(y)) return 0;
    const mode = Number(event.deltaMode) || 0;
    if (mode === 1) return y / 3; // Common mouse setting: three lines per detent.
    if (mode === 2) return y * 6; // A page is one complete six-step walking scene.
    if (mode !== 0) return 0;
    // Browsers use either convention for one discrete Windows mouse detent.
    // Pixel packets otherwise stay continuous, without a gesture threshold or lockout.
    if (x === 0 && (Math.abs(y) === 100 || Math.abs(y) === 120)) return Math.sign(y);
    return y / pixelStep;
  }

  // Kept for scene-boundary callers; there is no accumulated gesture state to clear.
  return {wheelGestureSteps, reset() {}};
}

// Apply once to the target, in source seconds; do not also scale by walk speed.
export function walkingTargetDelta(duration, steps) {
  return Number.isFinite(duration) && duration > 0 && Number.isFinite(steps)
    ? duration * steps / 6 : 0;
}

// A larger queued distance requests a proportionally faster rate, up to 4x.
// The brief response smooths acceleration/deceleration without a long catch-up tail.
// Reverse movement remains caller-owned.
export function walkingPlaybackRate(error, dt, currentRate = 0) {
  if (!Number.isFinite(error) || error <= .008 || !Number.isFinite(dt) || dt <= 0) return 0;
  const seconds = Math.min(dt, .25), maximum = 4, minimum = 1 / 16;
  const desired = Math.min(maximum, Math.max(minimum, error / .2));
  const previous = Number.isFinite(currentRate) ? Math.max(0, Math.min(maximum, currentRate)) : 0;
  const response = desired < previous ? .12 : .1;
  const smoothed = previous + (desired - previous) * (1 - Math.exp(-seconds / response));
  const ceiling = Math.min(maximum, error / dt);
  // Zero means pause; avoid unsupported extremely small positive playback rates.
  return ceiling < minimum ? 0 : Math.min(ceiling, Math.max(minimum, smoothed));
}
