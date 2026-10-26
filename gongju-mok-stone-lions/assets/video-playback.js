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
