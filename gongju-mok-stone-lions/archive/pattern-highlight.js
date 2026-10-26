// Retired: observation views show only the scan surface and user-controlled light.
// Keep the old API inert for older entry points that still import this URL.
// No trace data, extra geometry, emissive materials, timers, or animation are loaded.
export function createPatternHighlight() {
  return {
    bind() { return false; },
    focus() {},
    update() { return false; },
    setEnabled() {},
    dispose() {},
    get available() { return false; }
  };
}
