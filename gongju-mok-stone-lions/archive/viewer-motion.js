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
