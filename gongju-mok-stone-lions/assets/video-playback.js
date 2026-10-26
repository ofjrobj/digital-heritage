// Avoid reconfiguring the native decoder for imperceptible easing differences.
export function setPlaybackRate(video, rate) {
  if (!Number.isFinite(rate) || rate <= 0) return;
  const next = Math.abs(rate - 1) < .01 ? 1 : rate;
  if (Math.abs(video.playbackRate - next) >= .02 || next === 1 && video.playbackRate !== 1) {
    video.playbackRate = next;
  }
}

// pause() already holds a natively decoded frame. Seeking backwards on every
// wheel release unnecessarily flushes the decoder and delays the next gesture.
// Only cancel a pending reverse/drag seek, whose requested frame is not visible.
export function holdPresentedFrame(record, duration) {
  const video = record.video;
  const cancelSeek = video.seeking;
  video.pause();
  const sourceTime = cancelSeek ? (record.lastDecodedTime ?? video.currentTime) : video.currentTime;
  const time = Math.max(0, Math.min(duration, sourceTime - record.clipIn));
  if (cancelSeek) video.currentTime = record.clipIn + time;
  record.scrubTarget = time;
  return time;
}

// Reverse decoding needs complete source frames, not one seek per display RAF.
// Keep fractional time at normal cadence; discard a stalled decoder's backlog
// instead of jumping over a large part of the camera path when it catches up.
export function reverseFrameStep(time, target, elapsed, rate, fps = 30) {
  const frame = 1 / (Number.isFinite(fps) && fps > 0 ? fps : 30);
  if (!Number.isFinite(elapsed) || elapsed <= 0 || !Number.isFinite(rate) || rate <= 0 || time <= target) {
    return {time, remaining: Math.max(0, Number(elapsed) || 0)};
  }
  const budget = elapsed * rate, frames = Math.floor((budget + 1e-9) / frame);
  if (!frames) return {time, remaining: elapsed};
  const next = Math.max(target, time - Math.min(frames, 2) * frame);
  return {time: next, remaining: next === target ? 0 : Math.max(0, budget - frames * frame) / rate};
}

// Presentation callbacks identify decoded pixels; currentTime keeps advancing
// between those frames. Fall back to that clock on older video implementations.
export function createPresentedFrameClock() {
  const states = new WeakMap();
  return {key(video) {
    if (typeof video.requestVideoFrameCallback !== 'function') return video.currentTime;
    let state = states.get(video);
    if (!state) {
      state = {revision: 0, callback: null}; states.set(video, state);
      const watch = () => {
        if (state.callback === null) state.callback = video.requestVideoFrameCallback(() => {
          state.callback = null; state.revision++; watch();
        });
      };
      video.addEventListener('loadeddata', () => {state.revision++; watch();});
      video.addEventListener('seeked', () => {state.revision++; watch();});
      video.addEventListener('emptied', () => {
        state.revision++;
        if (state.callback !== null) video.cancelVideoFrameCallback(state.callback);
        state.callback = null;
      });
      watch();
    }
    return state.revision;
  }};
}
