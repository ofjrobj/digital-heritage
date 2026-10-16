// Positive wheel delta moves forward. State is local; callers supply the clock.
export function createWalkingInput({gestureGapMs = 200, pixelThreshold = 40} = {}) {
  const gap = Math.max(160, Math.min(220, gestureGapMs));
  let lastTime = -Infinity, direction = 0, pixels = 0, counted = false;

  function reset() {
    lastTime = -Infinity;
    direction = 0;
    pixels = 0;
    counted = false;
  }

  function wheelGestureSteps(event, now) {
    const y = Number(event.deltaY), x = Number(event.deltaX) || 0;
    if (event.ctrlKey || !Number.isFinite(now) || !Number.isFinite(y) ||
        Math.abs(y) < .01 || Math.abs(x) > Math.abs(y)) return 0;
    const sign = Math.sign(y), mode = Number(event.deltaMode) || 0;
    const newGesture = sign !== direction || now < lastTime || now - lastTime >= gap;
    if (newGesture) { pixels = 0; counted = false; }
    direction = sign;
    lastTime = now;

    // Line/page events and conventional 100/120px Windows detents are discrete.
    const detent = mode === 1 || mode === 2 ||
      (mode === 0 && x === 0 && (Math.abs(y) === 100 || Math.abs(y) === 120));
    if (detent) { pixels = 0; counted = true; return sign; }
    if (counted) return 0;
    pixels += Math.abs(y);
    if (pixels < pixelThreshold) return 0;
    counted = true;
    return sign;
  }

  return {wheelGestureSteps, reset};
}

// Apply once to the target, in source seconds; do not also scale by walk speed.
export function walkingTargetDelta(duration, steps) {
  return Number.isFinite(duration) && duration > 0 && Number.isFinite(steps)
    ? duration * steps / 6 : 0;
}

// Forward playback catches up continuously. Reverse movement remains caller-owned.
export function walkingPlaybackRate(error, dt, currentRate = 0) {
  if (!Number.isFinite(error) || error <= .008 || !Number.isFinite(dt) || dt <= 0) return 0;
  const seconds = Math.min(dt, .25), maximum = 1.15, minimum = 1 / 16;
  const desired = Math.max(minimum, maximum * (1 - Math.exp(-error / .45)));
  const previous = Number.isFinite(currentRate) ? Math.max(0, Math.min(maximum, currentRate)) : 0;
  const response = desired < previous ? .08 : .16;
  const smoothed = previous + (desired - previous) * (1 - Math.exp(-seconds / response));
  const ceiling = Math.min(maximum, error / dt);
  // Zero means pause; avoid unsupported extremely small positive playback rates.
  return ceiling < minimum ? 0 : Math.min(ceiling, Math.max(minimum, smoothed));
}
